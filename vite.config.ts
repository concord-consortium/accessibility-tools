import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    __A11Y_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@concord-consortium/accessibility-tools/hooks": resolve(
        __dirname,
        "src/hooks/index.ts",
      ),
      "@concord-consortium/accessibility-tools/debug": resolve(
        __dirname,
        "src/debug/index.ts",
      ),
      "@concord-consortium/accessibility-tools/audit": resolve(
        __dirname,
        "src/audit/index.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: [
      ...configDefaults.exclude,
      "tests/smoke.test.ts",
      "tests/cli.test.ts",
    ],
  },
});
