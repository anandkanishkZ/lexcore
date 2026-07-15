import { z } from "zod";

// Length matters more than character-class complexity per current guidance
// (NIST 800-63B), but a bare minimum-length-only rule (the previous 6-char
// policy) let an account with full case/client access be secured by
// something like "123456" — requiring at least one letter and one digit
// alongside a longer minimum closes that without demanding symbols/case
// mixing, which mostly just pushes users toward "Password1!"-style patterns.
export const PasswordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one number");

export const UserSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    userType: z.enum(["client", "attorney", "lawyer", "advocate", "paralegal", "judge", "legal consultant"]),
    password: PasswordSchema,
    role: z.enum(["admin", "user"]).default("user"),
});

export type UserType = z.infer<typeof UserSchema>;
