import { z } from "zod";

export const caseSchema = z.object({
    title: z.string().min(1, "Case title is required"),
    type: z.enum(["criminal", "civil", "corporate", "family", "immigration", "real estate", "other"]),
    // No `.default()` here — zod 4 gives a schema with `.default()` a
    // different input type (optional) than output type (required), which
    // `useForm<CaseFormData>`'s single-generic zodResolver can't reconcile
    // (input/output type mismatch on `Resolver<...>`). The default is
    // supplied via `useForm`'s `defaultValues` in CaseForm.tsx instead.
    status: z.enum(["open", "pending", "closed", "on hold"]),
    description: z.string().optional(),
    client: z.string().min(1, "Client is required"),
    assignedAttorney: z.string().optional(),
    openDate: z.string().optional(),
    closeDate: z.string().optional(),
});

export type CaseFormData = z.infer<typeof caseSchema>;

export const CASE_TYPES = [
    "criminal",
    "civil",
    "corporate",
    "family",
    "immigration",
    "real estate",
    "other",
] as const;

export const CASE_STATUSES = ["open", "pending", "closed", "on hold"] as const;
