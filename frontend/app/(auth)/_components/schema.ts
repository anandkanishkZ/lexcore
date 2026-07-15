import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

// Matches the backend's PasswordSchema (types/user.type.ts) — length alone
// used to be the only rule on both sides; this mirrors the same 8-char +
// letter + digit policy so a form that passes client-side validation never
// bounces off the server with a confusing error.
const passwordPolicy = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one number");

export const registerSchema = z
    .object({
        firstName: z.string().min(2, "First name must be at least 2 characters"),
        lastName: z.string().min(2, "Last name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        userType: z.enum(["client", "attorney", "lawyer", "advocate", "paralegal", "judge", "legal consultant"]),
        password: passwordPolicy,
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });
export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        password: passwordPolicy,
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
