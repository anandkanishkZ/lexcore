import { Router, Request, Response } from "express";

const esewaCallbackRouter = Router();

// Unauthenticated by design: eSewa's hosted checkout page navigates the
// mobile WebView here after payment, before the app has any chance to attach
// auth headers. The mobile client always intercepts this navigation and pops
// the WebView before the page finishes loading (see EsewaCheckoutPage's
// NavigationDelegate) — this page only exists as a real http(s) fallback for
// eSewa's own server-side success_url/failure_url validation, and as a
// harmless landing page on the rare chance interception doesn't fire in time.
function renderCallbackPage(outcome: "success" | "failure") {
    const heading = outcome === "success" ? "Payment received" : "Payment not completed";
    const message =
        outcome === "success"
            ? "You can close this window and return to the app."
            : "You can close this window and return to the app to try again.";
    return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F4F5F7;color:#0F213D}
main{text-align:center;padding:24px}h1{font-size:18px;margin:0 0 8px}p{font-size:14px;color:#0F213D99;margin:0}</style>
</head>
<body><main><h1>${heading}</h1><p>${message}</p></main></body>
</html>`;
}

esewaCallbackRouter.get("/success", (req: Request, res: Response) => {
    res.status(200).type("html").send(renderCallbackPage("success"));
});

esewaCallbackRouter.get("/failure", (req: Request, res: Response) => {
    res.status(200).type("html").send(renderCallbackPage("failure"));
});

export default esewaCallbackRouter;
