import { z } from "zod";

export const updateProfileSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const updatePasswordSchema = z
    .object({
        currentPassword: z
            .string()
            .min(6, "Current password must be at least 6 characters"),
        newPassword: z
            .string()
            .min(6, "New password must be at least 6 characters"),
        confirmPassword: z
            .string()
            .min(6, "Confirm password must be at least 6 characters"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
