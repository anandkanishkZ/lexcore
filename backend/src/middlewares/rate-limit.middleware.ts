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
