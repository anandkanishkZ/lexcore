"use server";

import { fetchUsersApi } from "../api/user";
import { getTokenCookie } from "../cookies";

export async function fetchUsersAction(
    page: number = 1,
    size: number = 10,
    search?: string
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchUsersApi(token, page, size, search);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch users";
        return { success: false, message };
    }
}
