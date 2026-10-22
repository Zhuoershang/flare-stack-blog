import { defineConfig } from "vitest/config";
import packageJson from "./package.json";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_ID__: JSON.stringify("test"),
  },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts"],
    // 8GB host: cap concurrency to avoid memory-driven timeouts.
    maxWorkers: 2,
    fileParallelism: false,
  },
});
