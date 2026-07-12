"use server";

import { fetchAuditLogsApi } from "../api/audit-log";
import { getTokenCookie } from "../cookies";

export async function fetchAuditLogsAction(page: number = 1, size: number = 20) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchAuditLogsApi(token, page, size);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch audit log" };
    }
}
