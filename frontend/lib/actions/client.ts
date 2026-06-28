"use server";

import {
    fetchClientsApi,
    fetchClientApi,
    createClientApi,
    updateClientApi,
    deleteClientApi,
} from "../api/client";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchClientsAction(
    page: number = 1,
    size: number = 10,
    search?: string
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchClientsApi(token, page, size, search);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch clients" };
    }
}

export async function fetchClientAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchClientApi(token, id);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch client" };
    }
}

export async function createClientAction(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    type: string;
    companyName?: string;
    address?: string;
}) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createClientApi(token, data);
        if (result.success) {
            revalidatePath("/admin/clients");
        }
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to create client" };
    }
}

export async function updateClientAction(
    id: string,
    data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        type?: string;
        companyName?: string;
        address?: string;
        status?: string;
    }
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateClientApi(token, id, data);
        if (result.success) {
            revalidatePath("/admin/clients");
        }
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to update client" };
    }
}

export async function deleteClientAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteClientApi(token, id);
        if (result.success) {
            revalidatePath("/admin/clients");
        }
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to delete client" };
    }
}
