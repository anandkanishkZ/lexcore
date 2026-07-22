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

// This API's own public origin — used to build eSewa's success_url/failure_url,
// which eSewa validates server-side and rejects unless it's a real http(s) URL
// (a custom scheme like lexcore:// is rejected before the checkout page even
// renders). The mobile WebView still intercepts navigation to these URLs
// before they finish loading, same as it did with the old custom scheme.
export const BACKEND_PUBLIC_URL: string = process.env.BACKEND_PUBLIC_URL || `http://localhost:${PORT}`;

export const SMTP_HOST: string | undefined = process.env.SMTP_HOST || undefined;
export const SMTP_PORT: number = Number(process.env.SMTP_PORT) || 587;
export const SMTP_USER: string | undefined = process.env.SMTP_USER || undefined;
export const SMTP_PASS: string | undefined = process.env.SMTP_PASS || undefined;
export const SMTP_FROM: string = process.env.SMTP_FROM || "Lexcore <no-reply@lexcore.local>";

// Optional, like the SMTP_* vars above — the AI search/summarize feature
// degrades gracefully (503 "not configured") rather than failing startup
// when this is unset.
export const DEEPSEEK_API_KEY: string | undefined = process.env.DEEPSEEK_API_KEY || undefined;

// eSewa "Intent Payment" — a separate integration from the ePay v2 flow
// (EsewaPaymentService/esewaClientId/esewaSecretEncrypted in FirmSettings).
// Unlike ePay v2, eSewa issues one fixed product_code + access key per
// environment tier for Intent (not a per-merchant secret an admin rotates),
// so this lives in .env rather than the admin-configurable FirmSettings
// document. Degrades gracefully (503) when unset, same as DEEPSEEK_API_KEY.
export const ESEWA_INTENT_PRODUCT_CODE: string = process.env.ESEWA_INTENT_PRODUCT_CODE || "INTENT";
export const ESEWA_INTENT_ACCESS_KEY: string | undefined = process.env.ESEWA_INTENT_ACCESS_KEY || undefined;
export const ESEWA_INTENT_BASE_URL: string =
    process.env.ESEWA_INTENT_BASE_URL || "https://rc-checkout.esewa.com.np";
