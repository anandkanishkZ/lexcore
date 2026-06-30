"use server";

import { fetchMembersApi } from "../api/member";
import { getTokenCookie } from "../cookies";

export async function fetchMembersAction(
    page: number = 1,
    size: number = 10,
    search?: string
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchMembersApi(token, page, size, search);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch users";
        return { success: false, message };
    }
}
