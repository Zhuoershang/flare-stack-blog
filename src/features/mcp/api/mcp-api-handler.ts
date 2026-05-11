import { WorkerEntrypoint } from "cloudflare:workers";
import { createMcpHandler } from "agents/mcp";
import { createOAuthPrincipalFromProps } from "@/features/oauth-provider/service/oauth-provider.service";
import { getDb } from "@/lib/db";
import { createMcpServer } from "../service/mcp.server";
import {
  applyMcpOriginPolicy,
  createInvalidOriginResponse,
  isAllowedMcpOrigin,
} from "../utils/mcp-origin";

type OAuthProps = Record<string, unknown>;

function getOAuthProps(ctx: ExecutionContext): OAuthProps {
  const maybeContext = ctx as ExecutionContext & { props?: OAuthProps };
  return maybeContext.props ?? {};
}

// ========== 新增：API Key 认证相关函数 ==========

function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }

  return authHeader; // 直接返回 header 值作为 key
}

function isValidApiKey(apiKey: string, env: Env): boolean {
  const allowedKey = env.MCP_API_KEY;
  if (!allowedKey) return false;

  // timing-safe 比较
  if (apiKey.length !== allowedKey.length) return false;
  let result = 0;
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ allowedKey.charCodeAt(i);
  }
  return result === 0;
}

function createApiKeyPrincipal(env: Env) {
  return {
    id: "api-key-user",
    type: "api_key",
    authenticated: true,
    roles: ["mcp_access"],
  };
}

// ================================================

export class McpApiHandler extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    if (!isAllowedMcpOrigin(request)) {
      return createInvalidOriginResponse();
    }

    const executionCtx = this.ctx as ExecutionContext;

    // 认证方式判断：优先检查 API Key，否则走 OAuth
    let principal: ReturnType<typeof createApiKeyPrincipal> | ReturnType<typeof createOAuthPrincipalFromProps>;
    let authProps: OAuthProps = {};
    let isApiKeyAuth = false;

    const apiKey = extractApiKey(request);

    if (apiKey && isValidApiKey(apiKey, this.env)) {
      // 方式一：API Key 认证
      principal = createApiKeyPrincipal(this.env);
      isApiKeyAuth = true;
    } else {
      // 方式二：OAuth 认证（原有逻辑）
      authProps = getOAuthProps(executionCtx);
      principal = createOAuthPrincipalFromProps(authProps);
    }

    const db = getDb(this.env);
    const server = await createMcpServer({
      db,
      env: this.env,
      executionCtx,
      principal,
    });

    const response = await createMcpHandler(
      server as unknown as Parameters<typeof createMcpHandler>[0],
      {
        authContext: {
          props: isApiKeyAuth ? { apiKey, authMethod: "api_key" } : authProps,
        },
        route: "/mcp",
      },
    )(request, this.env, executionCtx);

    return applyMcpOriginPolicy(request, response);
  }
}
