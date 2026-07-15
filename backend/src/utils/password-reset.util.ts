import crypto from "crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Generates a raw token to email the user and the sha256 hash of it to
 * store — the raw token is never persisted, so a database read alone can
 * never produce a usable reset link. */
export function generateResetToken(): { token: string; hash: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString("hex");
    return { token, hash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) };
}

export function hashResetToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}
