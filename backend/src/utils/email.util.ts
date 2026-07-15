/** Lowercases and trims an email so "Jane@Firm.com" and "jane@firm.com"
 * are always treated as the same address — used on every write and lookup
 * path across User, Client, and FileShare so the unique-email indexes and
 * duplicate checks can't be bypassed by casing alone. */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
