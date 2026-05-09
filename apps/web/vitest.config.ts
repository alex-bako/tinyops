import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  oxc: false,
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
})
