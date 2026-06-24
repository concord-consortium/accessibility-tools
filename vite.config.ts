import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "demo/index.html"),
        iframeTrap: resolve(__dirname, "demo/iframe-trap.html"),
      },
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
