"use server";

import { askAiApi, summarizeCaseApi, summarizeDocumentApi, chatAboutDocumentApi, type ChatTurn } from "../api/ai";
import { getTokenCookie } from "../cookies";

export async function askAiAction(query: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await askAiApi(token, query);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to get an answer" };
    }
}

export async function summarizeCaseAction(caseId: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await summarizeCaseApi(token, caseId);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to summarize case" };
    }
}

export async function summarizeDocumentAction(fileId: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await summarizeDocumentApi(token, fileId);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to summarize document" };
    }
}

export async function chatAboutDocumentAction(fileId: string, query: string, history: ChatTurn[]) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await chatAboutDocumentApi(token, fileId, query, history);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to get an answer" };
    }
}
