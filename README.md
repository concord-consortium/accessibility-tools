# @concord-consortium/accessibility-tools

Accessibility debugging tools, composable React hooks, and CI integrations for React applications.

## Status

**Phase 1: Package Scaffold + Demo App** - in progress.

See [docs/roadmap.md](docs/roadmap.md) for the full implementation plan.

## Development

```bash
npm install
npm run demo        # Start the kitchen sink demo (Vite dev server)
npm run build       # Build the library (tsup)
npm test            # Run unit tests (Vitest)
npm run test:smoke  # Build + run smoke tests against dist/
npm run check       # Lint + format + typecheck
npm run lint        # Biome linting only
npm run format      # Biome formatting only
```

## Package Entry Points

| Entry point | Description | Status |
|---|---|---|
| `@concord-consortium/accessibility-tools/hooks` | React hooks + AccessibilityProvider | Stubbed |
| `@concord-consortium/accessibility-tools/debug` | AccessibilityDebugSidebar component | Stubbed |
| `@concord-consortium/accessibility-tools/audit` | Headless WCAG audit engine | Stubbed |
| `@concord-consortium/accessibility-tools/styles` | Focus ring CSS custom properties | Placeholder |
| `@concord-consortium/accessibility-tools/styles/mixins` | Focus ring SCSS mixin | Placeholder |

## Requirements

- Node.js >= 18
- React >= 17 (peer dependency)
