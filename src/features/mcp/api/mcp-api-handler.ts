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

// ---------- 新增：API Key 认证相关函数 ----------
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  // 不支持其他 scheme，直接返回 null
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function createApiKeyPrincipal() {
  return {
    id: "api-key-user",
    type: "api_key",
    authenticated: true,
    roles: ["mcp_access"],
  };
}
// ------------------------------------------------

export class McpApiHandler extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    // 1. 源检查
    if (!isAllowedMcpOrigin(request)) {
      return createInvalidOriginResponse();
    }

    const executionCtx = this.ctx as ExecutionContext;

    // 2. 尝试提取 API Key
    const apiKey = extractBearerToken(request);
    const hasAuthHeader = request.headers.has("Authorization");

    // 3. API Key 认证分支
    if (hasAuthHeader) {
      // 必须提供有效的 API Key，否则拒绝
      const expectedKey = this.env.MCP_API_KEY;
      if (!expectedKey) {
        console.warn("MCP_API_KEY not set in environment, but Authorization header provided.");
        return new Response("Unauthorized: API Key not configured", { status: 401 });
      }

      if (!apiKey || !timingSafeEqual(apiKey, expectedKey)) {
        return new Response("Unauthorized: Invalid API Key", { status: 401 });
      }

      // 有效 API Key → 使用 API Key 主体
      const principal = createApiKeyPrincipal();
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
            // 不传递原始 API Key，仅传递认证方式元信息
            authMethod: "api_key",
          },
          route: "/mcp",
        },
      )(request, this.env, executionCtx);

      return applyMcpOriginPolicy(request, response);
    }

    // 4. 无 Authorization 头 → 原有 OAuth 流程
    const authProps = getOAuthProps(executionCtx);
    const db = getDb(this.env);
    const server = await createMcpServer({
      db,
      env: this.env,
      executionCtx,
      principal: createOAuthPrincipalFromProps(authProps),
    });

    const response = await createMcpHandler(
      server as unknown as Parameters<typeof createMcpHandler>[0],
      {
        authContext: {
          props: authProps,
        },
        route: "/mcp",
      },
    )(request, this.env, executionCtx);

    return applyMcpOriginPolicy(request, response);
  }
}
