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
});

export type FirmSettingsFormData = z.infer<typeof firmSettingsSchema>;
