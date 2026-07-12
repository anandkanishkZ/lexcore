import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel, IUser } from "../src/models/user.model";
import { SECRET_KEY } from "../src/configs/constant";

let counter = 0;

/**
 * Creates a user directly against the in-memory DB (bypassing the HTTP
 * register flow, which only ever creates userType: "client") and signs a
 * token exactly the way UserService.loginUser does, so tests can get a
 * staff/admin session in one call.
 */
export async function createUserAndToken(overrides: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    userType: IUser["userType"];
    role: "admin" | "user";
}> = {}): Promise<{ user: IUser; token: string }> {
    counter += 1;
    const password = await bcryptjs.hash("Password123!", 4);
    const user = await UserModel.create({
        firstName: overrides.firstName ?? "Test",
        lastName: overrides.lastName ?? "User",
        email: overrides.email ?? `test-user-${counter}@lexcore.local`,
        userType: overrides.userType ?? "client",
        role: overrides.role ?? "user",
        password,
    });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
    return { user, token };
}
