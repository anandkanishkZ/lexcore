"use server";

import { fetchFirmSettingsApi, updateFirmSettingsApi } from "../api/settings";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchFirmSettingsAction() {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchFirmSettingsApi(token);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch firm settings" };
    }
}

export async function updateFirmSettingsAction(data: {
    name: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    currency?: string;
    practiceAreas?: string[];
    esewaEnabled?: boolean;
    esewaEnvironment?: "test" | "live";
    esewaClientId?: string;
    esewaSecret?: string;
}) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateFirmSettingsApi(token, data);
        if (result.success) revalidatePath("/admin/settings");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to update firm settings" };
    }
}
