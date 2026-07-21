"use server";

import { fetchCasesApi, fetchCaseApi, createCaseApi, updateCaseApi, deleteCaseApi } from "../api/case";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchCasesAction(
    page = 1,
    size = 10,
    search?: string,
    status?: string,
    client?: string,
    assignedAttorney?: string
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchCasesApi(token, page, size, search, status, client, assignedAttorney);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch cases" };
    }
}

export async function fetchCaseAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchCaseApi(token, id);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch case" };
    }
}

export async function createCaseAction(data: {
    title: string;
    type: string;
    status?: string;
    description?: string;
    client: string;
    assignedAttorney?: string;
    openDate?: string;
}) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createCaseApi(token, data);
        if (result.success) revalidatePath("/admin/cases");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to create case" };
    }
}

export async function updateCaseAction(
    id: string,
    data: {
        title?: string;
        type?: string;
        status?: string;
        description?: string;
        client?: string;
        assignedAttorney?: string;
        openDate?: string;
        closeDate?: string;
    }
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateCaseApi(token, id, data);
        if (result.success) revalidatePath("/admin/cases");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to update case" };
    }
}

export async function deleteCaseAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteCaseApi(token, id);
        if (result.success) revalidatePath("/admin/cases");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to delete case" };
    }
}
