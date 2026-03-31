// Import version directly from package.json.
// Vite handles JSON imports natively in dev, tsup bundles it at build time.
import pkg from "../../package.json";

export const VERSION: string = pkg.version;
