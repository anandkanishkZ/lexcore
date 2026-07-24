import { z } from "zod";

export const firmSettingsSchema = z.object({
    name: z.string().min(1, "Firm name is required"),
    logoUrl: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    currency: z.string().optional(),
    practiceAreas: z.string().optional(),
    esewaEnabled: z.boolean().optional(),
    esewaEnvironment: z.enum(["test", "live"]).optional(),
    esewaClientId: z.string().optional(),
    // Left blank on submit to keep whatever secret is already saved — see
    // FirmSettingsForm's helper text and the backend's matching behavior.
    esewaSecret: z.string().optional(),
    khaltiEnabled: z.boolean().optional(),
    khaltiEnvironment: z.enum(["test", "live"]).optional(),
    khaltiSecretKey: z.string().optional(),
});

export type FirmSettingsFormData = z.infer<typeof firmSettingsSchema>;
