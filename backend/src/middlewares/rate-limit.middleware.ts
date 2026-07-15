import rateLimit from "express-rate-limit";

// Login/register are the only unauthenticated write paths, so they're the
// only realistic brute-force/spam target — everything else already requires
// a valid Bearer token via authorizedMiddleware.
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many attempts. Please try again later.", data: null },
});

// Every AI route is a billed DeepSeek API call — this isn't about
// brute-force (the routes are already staff-only, authenticated), it's cost
// control against one account (accidentally or otherwise) hammering a paid
// third-party API with no cap.
export const aiRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many AI requests. Please slow down and try again shortly.", data: null },
});

// eSewa verification makes a real outbound call to eSewa per attempt — caps
// how hard one account can hammer that (and our own server) with retries.
export const paymentRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: "Too many payment attempts. Please try again shortly.", data: null },
});
