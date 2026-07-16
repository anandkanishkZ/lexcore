"use client";

/**
 * Optional client-side error reporting — a safe no-op until
 * NEXT_PUBLIC_SENTRY_DSN is set (instrumentation-client.ts only calls
 * Sentry.init() when that's configured), so this never throws or does
 * anything unexpected in an environment without Sentry set up. Kept as its
 * own tiny module rather than importing @sentry/nextjs directly from
 * error.tsx/global-error.tsx, so those files don't need to know whether
 * Sentry is configured at all.
 */
export function captureClientError(error: Error): void {
    if (typeof window === "undefined") return;
    import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() => {
            // Reporting itself failing must never compound the original error.
        });
}
