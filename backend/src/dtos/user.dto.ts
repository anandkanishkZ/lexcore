import { z } from "zod";
import { UserSchema } from "../types/user.type";

export const CreateUserDTO = UserSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    userType: true,
    password: true,
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
