import { z } from "zod";

export const CreateCaseRequestSchema = z.object({
    title: z.string().min(1, "Title is required"),
    type: z.enum(["criminal", "civil", "corporate", "family", "immigration", "real estate", "other"]),
    description: z.string().min(1, "Please describe what you need help with"),
    phone: z.string().min(1, "A contact phone number is required"),
});

export type CreateCaseRequestType = z.infer<typeof CreateCaseRequestSchema>;

export const ApproveCaseRequestSchema = z.object({
    assignedAttorney: z.string().optional(),
    reviewNote: z.string().optional(),
});

export type ApproveCaseRequestType = z.infer<typeof ApproveCaseRequestSchema>;

export const RejectCaseRequestSchema = z.object({
    reviewNote: z.string().min(1, "A reason is required so the client understands why"),
});

export type RejectCaseRequestType = z.infer<typeof RejectCaseRequestSchema>;
