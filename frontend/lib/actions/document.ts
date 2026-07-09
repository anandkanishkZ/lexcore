"use server";

import { fetchDocumentsApi, createFolderApi, deleteDocumentApi, deleteFolderApi } from "../api/document";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export async function fetchDocumentsAction(caseId: string, folderId?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchDocumentsApi(token, caseId, folderId);
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to fetch documents") };
    }
}

export async function createFolderAction(caseId: string, name: string, parent?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createFolderApi(token, { case: caseId, name, parent });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to create folder") };
    }
}

export async function deleteDocumentAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteDocumentApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to delete file") };
    }
}

export async function deleteFolderAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteFolderApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to delete folder") };
    }
}
