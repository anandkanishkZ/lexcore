"use server";

import {
    fetchDocumentsApi,
    fetchTrashApi,
    fetchMoveTargetsApi,
    fetchRecentDocumentsApi,
    fetchStarredDocumentsApi,
    createFolderApi,
    copyDocumentApi,
    updateDocumentApi,
    updateFolderApi,
    restoreDocumentApi,
    restoreFolderApi,
    trashDocumentApi,
    trashFolderApi,
    permanentlyDeleteDocumentApi,
    permanentlyDeleteFolderApi,
    type DocumentListFilters,
} from "../api/document";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export async function fetchDocumentsAction(caseId: string, folderId?: string, filters: DocumentListFilters = {}) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchDocumentsApi(token, caseId, folderId, filters);
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to fetch documents") };
    }
}

export async function fetchTrashAction(caseId: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchTrashApi(token, caseId);
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to fetch trash") };
    }
}

export async function fetchMoveTargetsAction(caseId: string, excludeFolderId?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchMoveTargetsApi(token, caseId, excludeFolderId);
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to fetch folders") };
    }
}

export async function fetchRecentDocumentsAction() {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchRecentDocumentsApi(token);
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to fetch recent documents") };
    }
}

export async function fetchStarredDocumentsAction() {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchStarredDocumentsApi(token);
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to fetch starred documents") };
    }
}

export async function createFolderAction(caseId: string, name: string, parent?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createFolderApi(token, { case: caseId, name, parent });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to create folder") };
    }
}

export async function copyDocumentAction(caseId: string, id: string, folder?: string | null) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await copyDocumentApi(token, id, folder);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to copy file") };
    }
}

export async function renameDocumentAction(caseId: string, id: string, name: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateDocumentApi(token, id, { name });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to rename file") };
    }
}

export async function renameFolderAction(caseId: string, id: string, name: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateFolderApi(token, id, { name });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to rename folder") };
    }
}

export async function moveDocumentAction(caseId: string, id: string, folder: string | null) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateDocumentApi(token, id, { folder });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to move file") };
    }
}

export async function moveFolderAction(caseId: string, id: string, parent: string | null) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateFolderApi(token, id, { parent });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to move folder") };
    }
}

export async function toggleStarDocumentAction(caseId: string, id: string, starred: boolean) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateDocumentApi(token, id, { starred });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to update file") };
    }
}

export async function toggleStarFolderAction(caseId: string, id: string, starred: boolean) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateFolderApi(token, id, { starred });
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to update folder") };
    }
}

export async function restoreDocumentAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await restoreDocumentApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to restore file") };
    }
}

export async function restoreFolderAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await restoreFolderApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to restore folder") };
    }
}

export async function trashDocumentAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await trashDocumentApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to move file to trash") };
    }
}

export async function trashFolderAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await trashFolderApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to move folder to trash") };
    }
}

export async function permanentlyDeleteDocumentAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await permanentlyDeleteDocumentApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to permanently delete file") };
    }
}

export async function permanentlyDeleteFolderAction(caseId: string, id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await permanentlyDeleteFolderApi(token, id);
        if (result.success) revalidatePath(`/admin/cases/${caseId}`);
        return result;
    } catch (error) {
        return { success: false, message: errorMessage(error, "Failed to permanently delete folder") };
    }
}
