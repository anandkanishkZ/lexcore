import { z } from "zod";

export const CreateDocumentRequestSchema = z.object({
    case: z.string().min(1, "Case is required"),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
});

export type CreateDocumentRequestType = z.infer<typeof CreateDocumentRequestSchema>;

export const FulfillDocumentRequestSchema = z.object({
    file: z.string().min(1, "A file id is required"),
});

export type FulfillDocumentRequestType = z.infer<typeof FulfillDocumentRequestSchema>;
