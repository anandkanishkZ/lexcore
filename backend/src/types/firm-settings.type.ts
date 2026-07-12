import { z } from "zod";

export const FirmSettingsSchema = z.object({
    name: z.string().min(1, "Firm name is required"),
    logoUrl: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    currency: z.string().optional(),
    practiceAreas: z.array(z.string()).optional(),
});

export type FirmSettingsType = z.infer<typeof FirmSettingsSchema>;
