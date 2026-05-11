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

// ---------- API Key 认证辅助函数 ----------
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null; // 只支持 Bearer 方案
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
// -------------------------------------------

export class McpApiHandler extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    // 1. 源检查
    if (!isAllowedMcpOrigin(request)) {
      return createInvalidOriginResponse();
    }

    const executionCtx = this.ctx as ExecutionContext;

    // 2. 提取 API Key 并判断是否提供了 Authorization 头
    const apiKey = extractBearerToken(request);
    const hasAuthHeader = request.headers.has("Authorization");

    // 3. API Key 认证分支
    if (hasAuthHeader) {
      const expectedKey = this.env.MCP_API_KEY;
      if (!expectedKey) {
        console.warn("MCP_API_KEY not set, but Authorization header provided.");
        return new Response("Unauthorized: API Key not configured", { status: 401 });
      }

      if (!apiKey || !timingSafeEqual(apiKey, expectedKey)) {
        return new Response("Unauthorized: Invalid API Key", { status: 401 });
      }

      // API Key 有效 → 创建主体验证通过
      const principal = createApiKeyPrincipal();

      // 关键：移除原始请求中的 Authorization 头，避免 createMcpHandler 再次将其作为 OAuth Bearer Token 校验
      const newHeaders = new Headers(request.headers);
      newHeaders.delete("Authorization");
      const newRequest = new Request(request, { headers: newHeaders });

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
            authMethod: "api_key",
            // 可以额外传递一些元信息，但不传递原始密钥
          },
          route: "/mcp",
        },
      )(newRequest, this.env, executionCtx);

      return applyMcpOriginPolicy(request, response);
    }

    // 4. 没有 Authorization 头 → 走原有的 OAuth 流程（保持不变）
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
