"use server";

import { fetchCaseRequestsApi, approveCaseRequestApi, rejectCaseRequestApi } from "../api/case-request";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchCaseRequestsAction(status?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchCaseRequestsApi(token, status);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch case requests" };
    }
}

export async function approveCaseRequestAction(
    id: string,
    data: { assignedAttorney?: string; reviewNote?: string }
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await approveCaseRequestApi(token, id, data);
        if (result.success) revalidatePath("/admin/case-requests");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to approve case request" };
    }
}

export async function rejectCaseRequestAction(id: string, reviewNote: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await rejectCaseRequestApi(token, id, reviewNote);
        if (result.success) revalidatePath("/admin/case-requests");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to reject case request" };
    }
}
