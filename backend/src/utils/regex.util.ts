/** Escapes regex metacharacters so a search term can never be read as a
 * pattern (guards against both a crash on malformed input and ReDoS). */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
