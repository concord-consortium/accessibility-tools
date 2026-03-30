# Package Scaffold + Demo App

**Status**: **Closed**

## Overview

Set up the `@concord-consortium/accessibility-tools` npm package with a Vite-based demo dev server, tsup library build, TypeScript, and React as a peer dependency, along with a standalone demo app that serves as the development testbed and kitchen sink for all future sidebar panels and hooks.

The demo app serves triple duty: development environment (hot reload while building panels), test fixture (intentional a11y gaps for panels to detect), and living documentation (developers read the demo source to learn the APIs). Every future phase of the roadmap develops and validates against this demo app.

## Requirements

### Package Scaffold

- Package uses TypeScript with strict mode
- Vite is used for the demo dev server; tsup is used for the library build (multi-entry ESM+CJS, .d.ts generation, CLI shebang)
- React >= 17 and React DOM >= 17 are peer dependencies (not bundled)
- Package exports multiple entry points via `package.json` `exports` field with `types` condition first
- Entry points stubbed with placeholder exports:
  - `/hooks` - exports `AccessibilityProvider` (no-op context provider)
  - `/debug` - exports `AccessibilityDebugSidebar` (visible placeholder with header bar, theme support, version display)
  - `/audit` - exports `runWcagAudit` (no-op, no React dependency - runs in Node.js)
  - `/standalone.js`, `/playwright`, `/cypress` - deferred to later phases
- `AccessibilityDebugSidebar` accepts optional `theme` prop (`"light" | "dark"`, default `"light"`) via `data-theme` attribute with CSS custom properties
- Sidebar header displays "cc-a11y-tools" title and package version (injected at build time via `define` from package.json)
- Sidebar styles use runtime injection via `<style>` tag with configurable target (document.head vs Shadow Root)
- Focus ring CSS/SCSS exported as raw files via build pipeline
- `sideEffects: ["*.css"]` for tree-shaking
- CLI stub (`cc-a11y-tools`) prints usage banner and exits 0
- `engines: { node: ">=18" }`, `files: ["dist"]`
- Biome for linting/formatting, Vitest for tests
- Scripts: `build`, `demo`, `test`, `test:smoke`, `lint`, `format`, `check`
- Smoke tests import from built `dist/` output and verify exports
- `typesVersions` fallback for older TypeScript resolution modes

### Demo App

- Lives in `demo/` folder, excluded from npm build via `files` field
- Vite dev server root passed via npm script (config stays root-neutral for Vitest)
- TypeScript path aliases map published package paths to source for entry point boundary validation
- Flexbox layout: kitchen sink on left, sidebar placeholder on right
- Prominent banner explaining intentional inaccessibility
- 17 full-content kitchen sink sections with good/bad labels, each containing at least one example of every specified item
- Sticky nav bar with anchor links to all sections, including 2 subtle intentional a11y violations marked with asterisks
- Demo chrome uses proper `<main>` landmark and `<h1>` heading
- Zero React warnings/console errors (intentional violations are DOM/ARIA layer only)

## Technical Notes

### Build Architecture

- **`vite.config.ts`** - Demo dev server + Vitest config (root-neutral, path aliases, `__A11Y_VERSION__` define)
- **`tsup.config.ts`** - Library build: 3 entry points (ESM+CJS+dts) + CLI entry (ESM+shebang), React externalized
- **`scripts/copy-styles.mjs`** - Cross-platform copy of raw CSS/SCSS to `dist/styles/`
- **`vite.standalone.config.ts`** - Future: standalone build (React bundled, IIFE, Shadow DOM)

### Style Systems

1. **Sidebar**: Runtime injection via `<style>` tag (CSS as TypeScript string constant). Injection target configurable for Shadow DOM.
2. **Focus rings**: Raw CSS/SCSS files exported for consumer build pipelines. SCSS shipped uncompiled.
3. **Demo**: Scoped `demo.css`, not published.

### Package Exports

ESM uses `.js` (not `.mjs`) for broad compatibility. CJS uses `.cjs`. `types` condition listed first in each export for TypeScript resolution.

## Out of Scope

- Actual panel implementations (Phase 1, later steps)
- Standalone injectable build (`standalone.js` - Phase 1, later step)
- CLI implementation (`cc-a11y-tools` - Phase 2)
- Playwright/Cypress plugins (Phase 2)
- CI pipeline (Phase 2)
- Hook implementations (`useFocusTrap`, `useKeyboardNav`, etc. - Phase 3)
- Publishing to npm (Phase 4)
- Any consuming app integration (CLUE, CODAP wrappers)
