"use server";

import { loginApi, registerApi } from "../api/auth";
import { setTokenCookie, storeUserData } from "../cookies";

export async function handleLoginUser(data: { email: string; password: string }) {
    try {
        const result = await loginApi(data);
        if (result.success) {
            await setTokenCookie(result.data.token);
            await storeUserData(result.data.user);
        }
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Login failed" };
    }
}

export async function handleRegisterUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    password: string;
}) {
    try {
        const result = await registerApi(data);
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Registration failed" };
    }
}
