import { z } from "zod";
import { UserSchema } from "../types/user.type";

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

export const LoginUserDTO = UserSchema.pick({
    email: true,
    password: true,
});
export type LoginUserDTO = z.infer<typeof LoginUserDTO>;

export const UpdateUserDTO = UserSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    password: true,
}).partial();
export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;

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
