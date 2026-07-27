import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { authorizedMiddleware, staffMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";
import { paymentRateLimiter } from "../middlewares/rate-limit.middleware";

const invoiceRouter = Router();
const invoiceController = new InvoiceController();

invoiceRouter.use(authorizedMiddleware);

// /mine must be registered before /:id, same ordering discipline as
// case.route.ts. GET /mine and GET /:id stay open to any authenticated user
// — the client portal app reads its own invoices this way. Ownership for
// non-admins is enforced in InvoiceService.assertAccess (email match).
invoiceRouter.get("/mine", invoiceController.getMine);
invoiceRouter.get("/:id", invoiceController.getById);
invoiceRouter.get("/:id/payments", invoiceController.listPayments);

// Client-facing, not staff-only: the mobile app calls initiate to get a
// signed eSewa form for its own invoice, then verify after the checkout
// page redirects back. Ownership + double-spend protection live in
// EsewaPaymentService, not this route.
invoiceRouter.post("/:id/esewa/initiate", paymentRateLimiter, invoiceController.initiateEsewaPayment);
invoiceRouter.post("/:id/esewa/verify", paymentRateLimiter, invoiceController.verifyEsewaPayment);

// eSewa "Intent Payment" — a separate flow from ePay v2 above (see
// EsewaIntentPaymentService). The unauthenticated server-to-server callback
// eSewa itself calls lives outside this router, in esewa-callback.route.ts,
// since invoiceRouter requires a Bearer token that eSewa's servers never send.
invoiceRouter.post("/:id/esewa-intent/initiate", paymentRateLimiter, invoiceController.initiateEsewaIntentPayment);
invoiceRouter.get("/:id/esewa-intent/status", paymentRateLimiter, invoiceController.getEsewaIntentStatus);

// Khalti "Web Checkout" — same shape as ePay v2 above (initiate then
// verify), just a plain redirect instead of a signed form POST. The
// unauthenticated GET landing page Khalti's own return_url points at lives
// outside this router, in khalti-callback.route.ts.
invoiceRouter.post("/:id/khalti/initiate", paymentRateLimiter, invoiceController.initiateKhaltiPayment);
invoiceRouter.post("/:id/khalti/verify", paymentRateLimiter, invoiceController.verifyKhaltiPayment);

// Browsing/creating/editing/recording payments is any-staff; deleting is
// admin-only — same tier split as cases.
invoiceRouter.get("/", staffMiddleware, invoiceController.getAll);
invoiceRouter.post("/", staffMiddleware, invoiceController.create);
invoiceRouter.put("/:id", staffMiddleware, invoiceController.update);
invoiceRouter.post("/:id/void", staffMiddleware, invoiceController.voidInvoice);
invoiceRouter.post("/:id/payments", staffMiddleware, invoiceController.recordPayment);
invoiceRouter.delete("/:id", adminMiddleware, invoiceController.delete);

export default invoiceRouter;
