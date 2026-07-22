import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";

const esewaIntentCallbackRouter = Router();
const invoiceController = new InvoiceController();

// Unauthenticated by design: called directly by eSewa's own servers after a
// booking resolves, not by our client — see EsewaIntentPaymentService
// .handleCallback, which verifies the HMAC signature itself before trusting
// anything in the body.
esewaIntentCallbackRouter.post("/", invoiceController.esewaIntentCallback);

export default esewaIntentCallbackRouter;
