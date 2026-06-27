import { z } from "zod";

export const ClientSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    type: z.enum(["individual", "company"]),
    companyName: z.string().optional(),
    address: z.string().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
});

export type ClientType = z.infer<typeof ClientSchema>;
