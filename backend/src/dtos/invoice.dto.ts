import { z } from "zod";
import { InvoiceSchema, PaymentSchema } from "../types/invoice.type";

export const CreateInvoiceDTO = InvoiceSchema;
export type CreateInvoiceDTO = z.infer<typeof CreateInvoiceDTO>;

// Status can only move draft <-> sent here — "paid" is only ever reached by
// recording a real Payment (see InvoiceService.recordPayment), never set
// directly, so an invoice can't be marked paid without a matching payment.
export const UpdateInvoiceDTO = InvoiceSchema.partial();
export type UpdateInvoiceDTO = z.infer<typeof UpdateInvoiceDTO>;

export const RecordPaymentDTO = PaymentSchema;
export type RecordPaymentDTO = z.infer<typeof RecordPaymentDTO>;

export const VerifyEsewaPaymentDTO = z.object({
    transactionUuid: z.string().min(1, "transactionUuid is required"),
});
export type VerifyEsewaPaymentDTO = z.infer<typeof VerifyEsewaPaymentDTO>;

export const InitiateEsewaIntentPaymentDTO = z.object({
    // Merchant-facing deeplink return points — the actual redirect target
    // once the eSewa app hands control back to a browser/webview. Kept
    // optional: EsewaIntentPaymentService supplies sane server-rendered
    // defaults (mirroring the callback pages ePay v2 already uses) when the
    // client doesn't have a specific screen it wants to land on.
    redirectUrl: z.string().optional(),
});
export type InitiateEsewaIntentPaymentDTO = z.infer<typeof InitiateEsewaIntentPaymentDTO>;

// eSewa calls this server-to-server after a booking resolves — see
// EsewaIntentPaymentService.handleCallback for signature verification.
export const EsewaIntentCallbackDTO = z.object({
    product_code: z.string(),
    amount: z.union([z.string(), z.number()]),
    reference_code: z.string(),
    correlation_id: z.string(),
    status: z.string(),
    signature: z.string(),
    signed_field_names: z.string(),
});
export type EsewaIntentCallbackDTO = z.infer<typeof EsewaIntentCallbackDTO>;
