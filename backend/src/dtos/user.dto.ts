import { z } from "zod";
import { UserSchema, PasswordSchema } from "../types/user.type";

// Public self-registration (POST /auth/register) is client-only. Staff
// accounts (attorney/paralegal/etc.) can only be created by an existing
// admin via the admin-gated /admin/users endpoint (AdminCreateUserDTO
// below) — otherwise anyone could self-register claiming to be staff.
export const CreateUserDTO = UserSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    password: true,
}).extend({
    userType: z.literal("client"),
});
export type CreateUserDTO = z.infer<typeof CreateUserDTO>;

// Deliberately NOT UserSchema.pick — login checks a password against an
// existing hash, it doesn't set one, so the strength policy (PasswordSchema)
// must not apply here. A pre-policy account with a shorter/simpler password
// must still be able to log in; only min(1) (non-empty) makes sense.
export const LoginUserDTO = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});
export type LoginUserDTO = z.infer<typeof LoginUserDTO>;

// password is deliberately excluded here — self-service password changes go
// through ChangePasswordDTO below, which requires proving the current
// password first. This endpoint (PUT /auth/update) is profile fields only.
export const UpdateUserDTO = UserSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
}).partial();
export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;

export const ChangePasswordDTO = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: PasswordSchema,
});
export type ChangePasswordDTO = z.infer<typeof ChangePasswordDTO>;

export const ForgotPasswordDTO = z.object({
    email: z.string().email("Invalid email address"),
});
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordDTO>;

export const ResetPasswordDTO = z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: PasswordSchema,
});
export type ResetPasswordDTO = z.infer<typeof ResetPasswordDTO>;

// Admin-only: can also set userType/role, unlike a user's own self-update.
export const AdminCreateUserDTO = UserSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    userType: true,
    password: true,
    role: true,
}).partial({ role: true });
export type AdminCreateUserDTO = z.infer<typeof AdminCreateUserDTO>;

export const AdminUpdateUserDTO = UserSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    userType: true,
    password: true,
    role: true,
}).partial();
export type AdminUpdateUserDTO = z.infer<typeof AdminUpdateUserDTO>;
