"use server";

import {
    fetchCalendarEventsApi,
    createCalendarEventApi,
    updateCalendarEventApi,
    deleteCalendarEventApi,
} from "../api/calendar-event";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchCalendarEventsAction(from?: string, to?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchCalendarEventsApi(token, from, to);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch events" };
    }
}

export async function createCalendarEventAction(data: {
    title: string;
    type?: string;
    date: string;
    time?: string;
    location?: string;
    notes?: string;
    case?: string;
}) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createCalendarEventApi(token, data);
        if (result.success) revalidatePath("/admin/calendar");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to create event" };
    }
}

export async function updateCalendarEventAction(
    id: string,
    data: { title?: string; type?: string; date?: string; time?: string; location?: string; notes?: string; case?: string }
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateCalendarEventApi(token, id, data);
        if (result.success) revalidatePath("/admin/calendar");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to update event" };
    }
}

export async function deleteCalendarEventAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteCalendarEventApi(token, id);
        if (result.success) revalidatePath("/admin/calendar");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to delete event" };
    }
}
