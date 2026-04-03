import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "hooks/index": "src/hooks/index.ts",
      "debug/index": "src/debug/index.ts",
      "audit/index": "src/audit/index.ts",
    },
    format: ["esm", "cjs"],
    dts: {
      tsconfig: "tsconfig.build.json",
    },
    external: ["react", "react-dom", "react/jsx-runtime"],
    outDir: "dist",
    clean: true,
  },
  {
    entry: { "cli/cc-a11y-tools": "src/cli/cc-a11y-tools.ts" },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
    outDir: "dist",
    clean: false,
  },
  {
    entry: { standalone: "src/standalone/index.ts" },
    format: ["iife"],
    platform: "browser",
    globalName: "__a11yDebug",
    noExternal: [/.*/],
    outDir: "dist",
    outExtension: () => ({ js: ".js" }),
    clean: false,
    minify: true,
    sourcemap: true,
  },
]);
