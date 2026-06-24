/**
 * Derive a cross-origin URL for the non-cooperating inner page from the
 * current page's URL, without running a second dev server.
 *
 * Dev: localhost <-> 127.0.0.1 (same Vite server, distinct origins).
 * Prod: models-resources.concord.org <-> models-resources.s3.amazonaws.com
 * (the two URLs the deployed demo is reachable at).
 */

const HOST_PAIRS: Array<[string, string]> = [
  ["models-resources.concord.org", "models-resources.s3.amazonaws.com"],
];

/** Return the sibling host for `host` (may include a port), or null. */
export function siblingOrigin(host: string): string | null {
  if (host.startsWith("localhost"))
    return host.replace("localhost", "127.0.0.1");
  if (host.startsWith("127.0.0.1"))
    return host.replace("127.0.0.1", "localhost");
  for (const [a, b] of HOST_PAIRS) {
    if (host === a) return b;
    if (host === b) return a;
  }
  return null;
}

/**
 * Build a URL for `innerFile` (e.g. "iframe-inner.html") in the same directory
 * as the current page but on the sibling origin. Falls back to the same origin
 * when the host has no known sibling.
 */
export function crossOriginInnerSrc(
  currentHref: string,
  innerFile: string,
): string {
  const url = new URL(currentHref);
  const dir = url.pathname.replace(/[^/]*$/, "");
  const sibling = siblingOrigin(url.host);
  if (!sibling) return `${url.origin}${dir}${innerFile}`;
  return `${url.protocol}//${sibling}${dir}${innerFile}`;
}
