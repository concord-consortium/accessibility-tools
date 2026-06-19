import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "hooks/index": "src/hooks/index.ts",
      "debug/index": "src/debug/index.ts",
      "audit/index": "src/audit/index.ts",
      version: "src/version.ts",
    },
    format: ["esm", "cjs"],
    // Target ES2019 so the published JS is parseable by older bundlers that
    // predate ES2020 syntax (e.g. webpack 4 / acorn 6, used by some downstream
    // consumers). Downlevels optional chaining and nullish coalescing.
    target: "es2019",
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
