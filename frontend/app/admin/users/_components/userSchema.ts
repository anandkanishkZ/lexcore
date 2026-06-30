import { z } from "zod";

const userTypeEnum = z.enum([
    "client",
    "attorney",
    "lawyer",
    "advocate",
    "paralegal",
    "judge",
    "legal consultant",
]);

export const createUserSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    userType: userTypeEnum,
    role: z.enum(["admin", "user"]),
    password: z.string().min(6, "Password must be at least 6 characters"),
});
export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    userType: userTypeEnum,
    role: z.enum(["admin", "user"]),
    password: z.union([z.string().length(0), z.string().min(6, "Password must be at least 6 characters")]).optional(),
});
export type EditUserFormData = z.infer<typeof editUserSchema>;
