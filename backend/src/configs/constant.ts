import dotenv from "dotenv";
dotenv.config();

export const PORT: number = Number(process.env.PORT) || 8089;
export const MONGODB_URL: string = process.env.MONGODB_URL || "mongodb://localhost:27017/lexcore-db";

// No fallback: a guessable default secret would let anyone forge a valid
// (e.g. admin-role) JWT offline. Fail loudly at startup instead.
if (!process.env.SECRET_KEY) {
    throw new Error("SECRET_KEY environment variable is required — set it in .env before starting the server.");
}
export const SECRET_KEY: string = process.env.SECRET_KEY;

// Browsers only — native clients (the mobile app, curl, Postman) aren't
// subject to CORS, so this doesn't gate API access generally, only which
// web origins may call it from client-side JS.
export const CORS_ORIGINS: string[] = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

// The web console's own origin, used to build links that must open in a
// browser (currently just the password-reset email) — distinct from
// CORS_ORIGIN, which can be a comma-separated allowlist.
export const FRONTEND_URL: string = process.env.FRONTEND_URL || "http://localhost:3000";

export const SMTP_HOST: string | undefined = process.env.SMTP_HOST || undefined;
export const SMTP_PORT: number = Number(process.env.SMTP_PORT) || 587;
export const SMTP_USER: string | undefined = process.env.SMTP_USER || undefined;
export const SMTP_PASS: string | undefined = process.env.SMTP_PASS || undefined;
export const SMTP_FROM: string = process.env.SMTP_FROM || "Lexcore <no-reply@lexcore.local>";

// Optional, like the SMTP_* vars above — the AI search/summarize feature
// degrades gracefully (503 "not configured") rather than failing startup
// when this is unset.
export const DEEPSEEK_API_KEY: string | undefined = process.env.DEEPSEEK_API_KEY || undefined;
