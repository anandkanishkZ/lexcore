"use server";

import {
    loginApi,
    registerApi,
    whoamiApi,
    updateProfileApi,
    updatePasswordApi,
} from "../api/auth";
import {
    setTokenCookie,
    storeUserData,
    getTokenCookie,
    clearAuthCookies,
} from "../cookies";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function handleLoginUser(data: {
    email: string;
    password: string;
}) {
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
        return {
            success: false,
            message: error.message || "Registration failed",
        };
    }
}

export async function handleUserDetails() {
    try {
        const token = await getTokenCookie();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }
        const result = await whoamiApi(token);
        return result;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to fetch user details",
        };
    }
}

export async function handleUpdateProfile(formData: FormData) {
    try {
        const token = await getTokenCookie();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }
        const result = await updateProfileApi(token, formData);
        if (result.success) {
            await storeUserData(result.data);
            revalidatePath("/dashboard");
        }
        return result;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to update profile",
        };
    }
}

export async function handleUpdatePassword(data: { password: string }) {
    try {
        const token = await getTokenCookie();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }
        const result = await updatePasswordApi(token, data);
        return result;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to update password",
        };
    }
}

export async function handleLogout() {
    await clearAuthCookies();
    redirect("/login");
}
