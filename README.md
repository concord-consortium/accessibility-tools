# @concord-consortium/accessibility-tools

Accessibility debugging tools, composable React hooks, and CI integrations for React applications.

## Accessibility Debug Sidebar

A drop-in sidebar panel that provides live accessibility auditing for any React application. Attach it alongside your app and use it during development to catch WCAG issues as you build.

### What it does

- **Overview panel** with an aggregate accessibility score across 10 checks, expandable cards with error/warning lists and score breakdowns
- **Check panels** for heading hierarchy, form labels, color contrast, images, links/buttons, ARIA validation, landmarks, duplicate IDs, touch targets, and reduced motion
- **Tool panels** including element inspector, live focus tracker, keyboard event log, screen reader text preview, ARIA tree view, tab order overlay, announcements log, live region inventory, focus history, focus loss detector, focus trap detector, focus order recorder, and WCAG audit report
- **Overlay toggles** for tab order, contrast ratios, touch targets, live regions, text spacing (WCAG 1.4.12), reflow testing, and forced colors simulation
- Light and dark theme support
- All panels update live as the page changes

### Integration

Install the package:

```bash
npm install @concord-consortium/accessibility-tools
```

Import and render the sidebar alongside your app:

```tsx
import { AccessibilityDebugSidebar } from "@concord-consortium/accessibility-tools/debug";

function App() {
  return (
    <>
      <div className="your-app">
        {/* your app content */}
      </div>
      <AccessibilityDebugSidebar />
    </>
  );
}
```

The sidebar renders as a 300px-wide panel. Your app container should use flexbox so the sidebar sits alongside it:

```css
#root {
  display: flex;
  height: 100vh;
}

#root > .your-app {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
```

### Conditional rendering with a query parameter

A common pattern is to only show the sidebar when a URL parameter is present:

```tsx
const showDebugger = new URLSearchParams(window.location.search).has("debugA11y");

function App() {
  return (
    <>
      <div className="your-app">{/* ... */}</div>
      {showDebugger && <AccessibilityDebugSidebar />}
    </>
  );
}
```

Then visit your app with `?debugA11y` to enable it.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `"light" \| "dark"` | `"light"` | Color theme. A toggle button in the sidebar header also allows switching at runtime. |

## Standalone Mode

The standalone build bundles React and renders the sidebar in a Shadow DOM container, so it can be injected into any page without dependencies or style conflicts.

The standalone bundle is not included in the npm package to keep install size small. A hosted version is deployed alongside the demo:

```
https://models-resources.concord.org/accessibility-tools/branch/main/standalone.js
```

Or build it from source:

```bash
npm run build    # outputs dist/standalone.js (~335KB minified)
```

### Hosting

Load the hosted standalone script on any page with a script tag:

```html
<script src="https://models-resources.concord.org/accessibility-tools/branch/main/standalone.js"></script>
```

Or serve `dist/standalone.js` from your own static host. The sidebar will appear on the right side of the page. The page content is shifted left to make room.

### Bookmarklet

Create a bookmarklet that loads the standalone script. To install, create a new bookmark and paste the following as the URL:

```
javascript:void(function(){if(window.__a11yDebugToggle){window.__a11yDebugToggle();return}var s=document.createElement('script');s.src='https://models-resources.concord.org/accessibility-tools/branch/main/standalone.js';document.head.appendChild(s)})()
```

- First click loads the sidebar
- Subsequent clicks toggle it on/off via `window.__a11yDebugToggle()`

### Programmatic control

The standalone script exposes a global toggle function:

```js
// Toggle the sidebar on/off
window.__a11yDebugToggle();
```

### Local development with yalc

To test changes locally in a consuming app:

```bash
# In this repo - build and publish to local yalc store
npm run build
yalc publish

# In the consuming app
yalc add @concord-consortium/accessibility-tools
# After making changes, push updates
# (back in this repo)
yalc publish --push
```

## Package Entry Points

| Entry point | Description |
|---|---|
| `@concord-consortium/accessibility-tools/hooks` | React hooks + AccessibilityProvider |
| `@concord-consortium/accessibility-tools/debug` | AccessibilityDebugSidebar component |
| `@concord-consortium/accessibility-tools/audit` | Headless WCAG audit engine |
| `@concord-consortium/accessibility-tools/styles` | Focus ring CSS custom properties |
| `@concord-consortium/accessibility-tools/styles/mixins` | Focus ring SCSS mixin |

## Development

```bash
npm install             # Install deps + set up git hooks (via lefthook)
npm run demo            # Start the kitchen sink demo (Vite dev server)
npm run build           # Build the library (tsup)
npm test                # Run unit tests (Vitest)
npm run test:smoke      # Build + run smoke tests against dist/
npm run check           # Lint + format + typecheck
npm run lint            # Biome linting only
npm run format          # Biome formatting only
```

### Git hooks

Git hooks are managed by [lefthook](https://github.com/evilmartians/lefthook) and install automatically on `npm install` via the `prepare` script. The pre-commit hook runs `npm run check` (Biome lint + format + TypeScript typecheck) before each commit.

## Requirements

- Node.js >= 18
- React >= 17 (peer dependency)
