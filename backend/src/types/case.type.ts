import { z } from "zod";

export const CaseSchema = z.object({
    title: z.string().min(1, "Case title is required"),
    type: z.enum(["criminal", "civil", "corporate", "family", "immigration", "real estate", "other"]),
    status: z.enum(["open", "pending", "closed", "on hold"]).default("open"),
    description: z.string().optional(),
    client: z.string().min(1, "Client is required"),
    assignedAttorney: z.string().optional(),
    openDate: z.string().optional(),
    closeDate: z.string().optional(),
});

export type CaseType = z.infer<typeof CaseSchema>;
