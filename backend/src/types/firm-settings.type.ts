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
    khaltiEnabled: z.boolean().optional(),
    khaltiEnvironment: z.enum(["test", "live"]).optional(),
    // Same write-only, encrypt-on-save pattern as esewaSecret — Khalti's
    // secret key is the sole credential (passed as the Authorization header
    // on every server-side API call), there's no separate public client id.
    khaltiSecretKey: z.string().optional(),
});

export type FirmSettingsType = z.infer<typeof FirmSettingsSchema>;
