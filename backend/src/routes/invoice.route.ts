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

// Client-facing, not staff-only: the mobile app calls this for the client's
// own invoice after the eSewa SDK reports success. Ownership + double-spend
// protection live in EsewaPaymentService, not this route.
invoiceRouter.post("/:id/esewa/verify", paymentRateLimiter, invoiceController.verifyEsewaPayment);

// Browsing/creating/editing/recording payments is any-staff; deleting is
// admin-only — same tier split as cases.
invoiceRouter.get("/", staffMiddleware, invoiceController.getAll);
invoiceRouter.post("/", staffMiddleware, invoiceController.create);
invoiceRouter.put("/:id", staffMiddleware, invoiceController.update);
invoiceRouter.post("/:id/void", staffMiddleware, invoiceController.voidInvoice);
invoiceRouter.post("/:id/payments", staffMiddleware, invoiceController.recordPayment);
invoiceRouter.delete("/:id", adminMiddleware, invoiceController.delete);

export default invoiceRouter;
