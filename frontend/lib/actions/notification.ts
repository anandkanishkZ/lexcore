"use server";

import { fetchNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from "../api/notification";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchNotificationsAction() {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchNotificationsApi(token);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch notifications" };
    }
}

export async function markNotificationReadAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await markNotificationReadApi(token, id);
        revalidatePath("/admin", "layout");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to mark notification read" };
    }
}

export async function markAllNotificationsReadAction() {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await markAllNotificationsReadApi(token);
        revalidatePath("/admin", "layout");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to mark notifications read" };
    }
}
