import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth, idParam } from "./registry";
import { InvoiceResponseSchema, PaymentResponseSchema } from "./schemas";
import { CreateInvoiceDTO, UpdateInvoiceDTO, RecordPaymentDTO, VerifyEsewaPaymentDTO } from "../dtos/invoice.dto";

const tags = ["Invoices"];
const security = bearerAuth;

const EsewaPaymentIntentSchema = registry.register(
    "EsewaPaymentIntent",
    z.object({
        formUrl: z.string().url().openapi({ description: "POST the fields below here — a real page navigation, e.g. a WebView." }),
        fields: z.object({
            amount: z.string(),
            tax_amount: z.string(),
            total_amount: z.string(),
            transaction_uuid: z.string(),
            product_code: z.string(),
            product_service_charge: z.string(),
            product_delivery_charge: z.string(),
            success_url: z.string(),
            failure_url: z.string(),
            signed_field_names: z.string(),
            signature: z.string(),
        }),
    })
);

registry.registerPath({
    method: "get",
    path: "/invoices/mine",
    tags,
    summary: "Get the signed-in client's own invoices, every status",
    security,
    responses: { 200: envelope(z.array(InvoiceResponseSchema), "The caller's invoices."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/invoices/{id}",
    tags,
    summary: "Get one invoice by id",
    description: "Ownership is enforced server-side — a client requesting someone else's invoice gets a 403.",
    security,
    request: { params: idParam },
    responses: { 200: envelope(InvoiceResponseSchema, "Invoice."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/invoices/{id}/payments",
    tags,
    summary: "Payment history for one invoice",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.array(PaymentResponseSchema), "Payments."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/invoices/{id}/esewa/initiate",
    tags,
    summary: "Build a signed eSewa ePay v2 checkout form for this invoice's outstanding balance",
    description: "Client-facing. Nothing is recorded yet — the caller POSTs the returned fields to formUrl (e.g. inside a WebView), then calls .../esewa/verify.",
    security,
    request: { params: idParam },
    responses: { 200: envelope(EsewaPaymentIntentSchema, "Signed checkout form."), 400: errorEnvelope("Online payment isn't enabled, or the invoice has nothing outstanding."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/invoices/{id}/esewa/verify",
    tags,
    summary: "Verify an eSewa transaction and record it as a payment",
    description: "Independently re-checks the transaction against eSewa's own status API before recording anything — a client-reported outcome alone is never trusted.",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: VerifyEsewaPaymentDTO } } } },
    responses: { 201: envelope(InvoiceResponseSchema, "Payment verified and recorded."), 400: errorEnvelope("eSewa did not confirm this payment as complete, or it was already recorded."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/invoices",
    tags,
    summary: "List invoices, paginated",
    description: "Staff-only.",
    security,
    request: {
        query: z.object({
            page: z.coerce.number().int().min(1).optional(),
            size: z.coerce.number().int().min(1).optional(),
            status: z.enum(["draft", "sent", "paid", "void"]).optional(),
            client: z.string().optional(),
            case: z.string().optional(),
        }),
    },
    responses: { 200: envelope(z.array(InvoiceResponseSchema), "Invoices."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "post",
    path: "/invoices",
    tags,
    summary: "Create an invoice",
    security,
    request: { body: { content: { "application/json": { schema: CreateInvoiceDTO } } } },
    responses: { 201: envelope(InvoiceResponseSchema, "Invoice created."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "put",
    path: "/invoices/{id}",
    tags,
    summary: "Update an invoice",
    description: "Status can only move draft <-> sent here — \"paid\" is only ever reached by recording a real payment.",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: UpdateInvoiceDTO } } } },
    responses: { 200: envelope(InvoiceResponseSchema, "Invoice updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/invoices/{id}/void",
    tags,
    summary: "Void an invoice",
    security,
    request: { params: idParam },
    responses: { 200: envelope(InvoiceResponseSchema, "Invoice voided."), 400: errorEnvelope("Already paid or already void."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/invoices/{id}/payments",
    tags,
    summary: "Record a manual payment (cash, bank transfer, card, cheque, other)",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: RecordPaymentDTO } } } },
    responses: { 201: envelope(InvoiceResponseSchema, "Payment recorded."), 400: errorEnvelope("Validation failed, or the amount exceeds the outstanding balance."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/invoices/{id}",
    tags,
    summary: "Delete an invoice",
    description: "Admin-only.",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "Invoice deleted."), ...commonErrors },
});
