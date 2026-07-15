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
    refId: z.string().min(1, "refId is required"),
});
export type VerifyEsewaPaymentDTO = z.infer<typeof VerifyEsewaPaymentDTO>;
