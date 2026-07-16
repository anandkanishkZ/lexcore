/**
 * Optional error tracking (Sentry). Unconfigured by default — every call
 * here is a safe no-op until SENTRY_DSN is set, the same "optional
 * integration, graceful skip" pattern as SMTP/DeepSeek/eSewa/ClamAV
 * elsewhere in this codebase. This exists specifically to close the "an
 * unexpected error only ever reaches console.error, and is gone the moment
 * the process restarts or logs rotate" gap — errors now have somewhere to
 * go that survives a restart, once a DSN is actually supplied.
 */
import * as Sentry from "@sentry/node";

let initialized = false;

export function initErrorTracking(): void {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: 0,
    });
    initialized = true;
    console.log("[error-tracking] Sentry initialized");
}

/** Safe to call unconditionally — a no-op when Sentry was never
 * initialized, so call sites never need their own "is this configured"
 * check before reporting an unexpected error. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!initialized) return;
    Sentry.captureException(error, context ? { extra: context } : undefined);
}
