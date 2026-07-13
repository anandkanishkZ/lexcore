"use server";

import { fetchDocumentRequestsApi, createDocumentRequestApi, cancelDocumentRequestApi } from "../api/document-request";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchDocumentRequestsAction(caseId?: string, status?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchDocumentRequestsApi(token, caseId, status);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch document requests" };
    }
}

export async function createDocumentRequestAction(
    caseId: string,
    data: { title: string; description?: string }
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createDocumentRequestApi(token, { case: caseId, ...data });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to create document request" };
    }
}

export async function cancelDocumentRequestAction(id: string, caseId: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await cancelDocumentRequestApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to cancel document request" };
    }
}
