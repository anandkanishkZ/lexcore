import { Router, Request, Response } from "express";

const khaltiCallbackRouter = Router();

// Unauthenticated by design: Khalti's checkout page navigates the mobile
// WebView here (return_url) after payment, before the app has any chance to
// attach auth headers — same rationale as esewa-callback.route.ts. The
// mobile client intercepts this navigation (matching on pidx/status query
// params) and pops the WebView before the page finishes loading; this page
// only exists as a real landing target for Khalti's redirect and a harmless
// fallback if interception doesn't fire in time.
khaltiCallbackRouter.get("/", (req: Request, res: Response) => {
    const status = (req.query.status as string) || "";
    const succeeded = status === "Completed";
    const heading = succeeded ? "Payment received" : "Payment not completed";
    const message = succeeded
        ? "You can close this window and return to the app."
        : "You can close this window and return to the app to try again.";

    res.status(200).type("html").send(`<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F4F5F7;color:#0F213D}
main{text-align:center;padding:24px}h1{font-size:18px;margin:0 0 8px}p{font-size:14px;color:#0F213D99;margin:0}</style>
</head>
<body><main><h1>${heading}</h1><p>${message}</p></main></body>
</html>`);
});

export default khaltiCallbackRouter;
