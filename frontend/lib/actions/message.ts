"use server";

import { fetchMessagesApi, sendMessageApi } from "../api/message";
import { getTokenCookie } from "../cookies";

export async function fetchMessagesAction(caseId: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchMessagesApi(token, caseId);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch messages" };
    }
}

export async function sendMessageAction(caseId: string, content: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await sendMessageApi(token, caseId, content);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to send message" };
    }
}

/**
 * Exposes the raw JWT to a client component for the Socket.io handshake
 * only — Socket.io is a persistent connection the browser must authenticate
 * directly (unlike every other backend call, which is proxied through a
 * Server Action reading the httpOnly cookie server-side). This is a
 * deliberate, narrow exception: the token ends up in the page's client
 * bundle for the lifetime of the Messages tab, not the httpOnly cookie
 * itself.
 */
export async function getSocketTokenAction(): Promise<
    { success: true; data: string } | { success: false; message: string }
> {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return { success: true, data: token };
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to get token" };
    }
}
