import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Symmetric encryption for secrets that must be stored (payment gateway API
 * secrets) but never displayed back in full — unlike password hashing, this
 * has to be reversible so the backend can use the real value server-side.
 * Lazily reads ENCRYPTION_KEY (not at module load, unlike SECRET_KEY) so a
 * server with no payment gateway configured never needs to set it — mirrors
 * how DEEPSEEK_API_KEY degrades gracefully instead of failing startup.
 */
function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error(
            "ENCRYPTION_KEY environment variable is required to store payment gateway secrets — set a 64-character hex string (generate with `openssl rand -hex 32`) in .env."
        );
    }
    const buf = Buffer.from(key, "hex");
    if (buf.length !== 32) {
        throw new Error("ENCRYPTION_KEY must decode to 32 bytes — use a 64-character hex string.");
    }
    return buf;
}

export function encryptSecret(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
    const [ivHex, authTagHex, dataHex] = stored.split(":");
    if (!ivHex || !authTagHex || !dataHex) {
        throw new Error("Malformed encrypted value");
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
}
