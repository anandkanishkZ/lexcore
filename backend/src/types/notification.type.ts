import { z } from "zod";

export const RegisterDeviceTokenSchema = z.object({
    token: z.string().min(1, "Device token is required"),
    platform: z.enum(["android", "ios"]),
});

export type RegisterDeviceTokenType = z.infer<typeof RegisterDeviceTokenSchema>;
