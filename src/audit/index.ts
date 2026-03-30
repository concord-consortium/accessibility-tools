export interface WcagAuditResult {
  failures: unknown[];
  warnings: unknown[];
  passes: unknown[];
}

export function runWcagAudit(
  _root?: Element,
  _options?: unknown,
): WcagAuditResult {
  return { failures: [], warnings: [], passes: [] };
}
