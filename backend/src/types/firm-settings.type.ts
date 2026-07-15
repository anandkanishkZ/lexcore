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
    esewaEnabled: z.boolean().optional(),
    esewaEnvironment: z.enum(["test", "live"]).optional(),
    esewaClientId: z.string().optional(),
    // Plaintext on the wire, in and only for this one write path — the
    // service encrypts it before storage and never echoes it back. Omit (or
    // send an empty string) to leave the previously saved secret untouched,
    // so the admin isn't forced to re-enter it on every unrelated settings save.
    esewaSecret: z.string().optional(),
});

export type FirmSettingsType = z.infer<typeof FirmSettingsSchema>;
