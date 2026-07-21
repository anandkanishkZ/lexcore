/**
 * Optional push notifications (Firebase Cloud Messaging). Unconfigured by
 * default — every call here is a safe no-op until a service account key is
 * present, the same "optional integration, graceful skip" pattern as
 * SMTP/DeepSeek/eSewa/Sentry elsewhere in this codebase. A push failure must
 * never break the in-app/email notification flow it's layered alongside, so
 * nothing here ever throws — callers get an empty result on any failure,
 * not an exception to catch.
 */
import { initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";

const SERVICE_ACCOUNT_PATH =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "../../firebase-service-account.json");

// undefined = not yet attempted; null = attempted and unavailable/failed.
let app: App | null | undefined;

function getApp(): App | null {
    if (app !== undefined) return app;

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        app = null;
        return app;
    }
    try {
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
        app = initializeApp({ credential: cert(serviceAccount) });
        console.log("[push] Firebase Admin initialized");
    } catch (error) {
        console.error("[push] Failed to initialize Firebase Admin — push notifications disabled:", error);
        app = null;
    }
    return app;
}

export interface PushPayload {
    title: string;
    body: string;
    /** String-only, per FCM's data-message requirement — the mobile app
     * reads this to deep-link to the relevant case/invoice/etc. */
    data?: Record<string, string>;
}

/**
 * Best-effort push to every given token. Returns the subset of tokens FCM
 * itself reports as no-longer-registered (app uninstalled, token expired),
 * so the caller can prune them from DeviceToken — this is the only signal
 * a server ever gets that a token has gone stale.
 */
export async function sendPush(tokens: string[], payload: PushPayload): Promise<string[]> {
    const firebaseApp = getApp();
    if (!firebaseApp || tokens.length === 0) return [];

    try {
        const response = await getMessaging(firebaseApp).sendEachForMulticast({
            tokens,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
        });

        const staleTokens: string[] = [];
        response.responses.forEach((result, index) => {
            if (!result.success && result.error?.code === "messaging/registration-token-not-registered") {
                staleTokens.push(tokens[index] as string);
            }
        });
        return staleTokens;
    } catch (error) {
        console.error("[push] Send failed:", error);
        return [];
    }
}
