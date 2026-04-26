import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.spec.ts"],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    coverage: {
      reporter: ["text", "html"],
      exclude: [
        "src/test-setup.ts",
        "node_modules/",
        "dist/"
      ]
    }
  },
  resolve: {
    alias: {
      "@app": new URL("./src/app", import.meta.url).pathname,
      "@veriframe/contracts": new URL("../../packages/contracts/src/index.ts", import.meta.url).pathname
    }
  }
});
