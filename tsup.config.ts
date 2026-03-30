import { defineConfig } from "tsup";
import pkg from "./package.json" with { type: "json" };

export default defineConfig([
  {
    define: {
      __A11Y_VERSION__: JSON.stringify(pkg.version),
    },
    entry: {
      "hooks/index": "src/hooks/index.ts",
      "debug/index": "src/debug/index.ts",
      "audit/index": "src/audit/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
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
]);
