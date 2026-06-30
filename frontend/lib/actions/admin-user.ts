"use server";

import {
    fetchAdminUserApi,
    createAdminUserApi,
    updateAdminUserApi,
    deleteAdminUserApi,
} from "../api/admin-user";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export async function fetchAdminUserAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchAdminUserApi(token, id);
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to fetch user") };
    }
}

export async function createAdminUserAction(data: {
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    password: string;
    role: string;
}) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createAdminUserApi(token, data);
        if (result.success) {
            revalidatePath("/admin/users");
        }
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to create user") };
    }
}

export async function updateAdminUserAction(
    id: string,
    data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        userType?: string;
        password?: string;
        role?: string;
    }
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateAdminUserApi(token, id, data);
        if (result.success) {
            revalidatePath("/admin/users");
        }
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to update user") };
    }
}

export async function deleteAdminUserAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteAdminUserApi(token, id);
        if (result.success) {
            revalidatePath("/admin/users");
        }
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to delete user") };
    }
}
