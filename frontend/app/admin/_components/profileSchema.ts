import { z } from "zod";

export const updateProfileSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const updatePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        // Matches the backend's PasswordSchema (types/user.type.ts).
        newPassword: z
            .string()
            .min(8, "New password must be at least 8 characters")
            .regex(/[A-Za-z]/, "New password must include at least one letter")
            .regex(/[0-9]/, "New password must include at least one number"),
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
