// Server-side instrumentation — see Next.js's instrumentation.js
// convention. register() runs once when the server starts; onRequestError
// is called by Next.js itself whenever a Server Component, Route Handler,
// or Server Action throws. Both are optional/inert unless SENTRY_DSN is
// set — previously nothing reported server-rendering errors anywhere but
// the console, which is gone the moment the process restarts.
import type { Instrumentation } from "next";

export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    if (!process.env.SENTRY_DSN) return;

    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0,
    });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
    console.error("[request error]", error, { path: request.path, method: request.method, context });
    if (!process.env.SENTRY_DSN) return;

    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error);
};
