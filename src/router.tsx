import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ErrorPage } from "./components/common/error-page";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { NotFound } from "@/components/common/not-found";

// Create a new router instance
export function getRouter() {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    context: { ...rqContext },
    defaultPreload: "intent",
    // 客户端导航时立即显示 pendingComponent（skeleton），让点击感觉"跟手"
    // 默认值是 1000ms，会导致 loader 执行期间用户看到白屏
    defaultPendingMs: 0,
    // skeleton 至少显示 300ms，避免数据返回太快时闪烁
    defaultPendingMinMs: 300,
    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <TanstackQuery.Provider {...rqContext}>
          {props.children}
        </TanstackQuery.Provider>
      );
    },
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorPage,
    defaultViewTransition: __THEME_CONFIG__.viewTransition,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  return router;
}
