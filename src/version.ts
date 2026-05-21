// Single source of truth for the library version. The committed package.json
// version is "0.0.0-development"; .github/workflows/publish-library.yml stamps
// the real version from the git tag at publish time.
import pkg from "../package.json";

export const version: string = pkg.version;
