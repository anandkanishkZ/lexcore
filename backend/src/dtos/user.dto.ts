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
