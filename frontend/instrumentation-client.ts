// Runs once, client-side, before React hydrates — see Next.js's
// instrumentation-client.js convention. Optional: does nothing unless
// NEXT_PUBLIC_SENTRY_DSN is set (same "absent by default" pattern as every
// other optional integration in this project). NEXT_PUBLIC_ prefix is
// required for this value to actually reach client-side code.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
    Sentry.init({
        dsn,
        tracesSampleRate: 0,
    });
}
