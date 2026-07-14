"use server";

import { fetchCasesByStatusApi, fetchRevenueByMonthApi, fetchTaskCompletionApi } from "../api/report";
import { getTokenCookie } from "../cookies";

export async function fetchCasesByStatusAction() {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchCasesByStatusApi(token);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch cases by status" };
    }
}

export async function fetchRevenueByMonthAction(months?: number) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchRevenueByMonthApi(token, months);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch revenue by month" };
    }
}

export async function fetchTaskCompletionAction() {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchTaskCompletionApi(token);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch task completion" };
    }
}
