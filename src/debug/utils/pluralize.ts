/**
 * Simple pluralization helper.
 *
 * pluralize(1, "error") => "1 error"
 * pluralize(3, "error") => "3 errors"
 * pluralize(2, "entry", "entries") => "2 entries"
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}
