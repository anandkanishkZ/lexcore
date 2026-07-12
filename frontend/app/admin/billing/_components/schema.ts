import { z } from "zod";

export const invoiceItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    rate: z.number().min(0, "Rate cannot be negative"),
});

export const invoiceSchema = z.object({
    client: z.string().min(1, "Client is required"),
    case: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
    taxRate: z.number().min(0).max(100),
    status: z.enum(["draft", "sent"]),
    dueDate: z.string().min(1, "Due date is required"),
    notes: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
