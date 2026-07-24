import { z } from "zod";

export const InvoiceItemInputSchema = z.object({
    description: z.string().min(1, "Item description is required"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    rate: z.number().min(0, "Rate cannot be negative"),
});

export const InvoiceSchema = z.object({
    client: z.string().min(1, "Client is required"),
    case: z.string().optional(),
    items: z.array(InvoiceItemInputSchema).min(1, "At least one line item is required"),
    taxRate: z.number().min(0).max(100).default(0),
    status: z.enum(["draft", "sent"]).default("draft"),
    dueDate: z.string().min(1, "Due date is required"),
    notes: z.string().optional(),
});

export type InvoiceType = z.infer<typeof InvoiceSchema>;

export const PaymentSchema = z.object({
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    method: z.enum(["cash", "bank_transfer", "card", "cheque", "esewa", "khalti", "other"]).default("cash"),
    date: z.string().optional(),
    notes: z.string().optional(),
});

export type PaymentType = z.infer<typeof PaymentSchema>;
