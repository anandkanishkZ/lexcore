const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export interface DocumentListFilters {
    search?: string;
    type?: string;
    sortBy?: "name" | "size" | "createdAt";
    sortOrder?: "asc" | "desc";
}

function authHeaders(token: string, json = false) {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
}

export async function fetchDocumentsApi(token: string, caseId: string, folderId?: string, filters: DocumentListFilters = {}) {
    const params = new URLSearchParams({ case: caseId });
    if (folderId) params.set("folder", folderId);
    if (filters.search) params.set("search", filters.search);
    if (filters.type) params.set("type", filters.type);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

    const res = await fetch(`${API_URL}/api/v1/documents?${params}`, {
        method: "GET",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function fetchTrashApi(token: string, caseId: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/trash?case=${caseId}`, {
        method: "GET",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function fetchMoveTargetsApi(token: string, caseId: string, excludeFolderId?: string) {
    const params = new URLSearchParams({ case: caseId });
    if (excludeFolderId) params.set("exclude", excludeFolderId);

    const res = await fetch(`${API_URL}/api/v1/documents/folders/all?${params}`, {
        method: "GET",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function fetchRecentDocumentsApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/recent`, {
        method: "GET",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function fetchStarredDocumentsApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/starred`, {
        method: "GET",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function createFolderApi(token: string, data: { case: string; name: string; parent?: string }) {
    const res = await fetch(`${API_URL}/api/v1/documents/folders`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function copyDocumentApi(token: string, id: string, folder?: string | null) {
    const res = await fetch(`${API_URL}/api/v1/documents/${id}/copy`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ folder }),
    });
    return res.json();
}

export async function updateDocumentApi(token: string, id: string, data: { name?: string; folder?: string | null; starred?: boolean }) {
    const res = await fetch(`${API_URL}/api/v1/documents/${id}`, {
        method: "PATCH",
        headers: authHeaders(token, true),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateFolderApi(token: string, id: string, data: { name?: string; parent?: string | null; starred?: boolean }) {
    const res = await fetch(`${API_URL}/api/v1/documents/folders/${id}`, {
        method: "PATCH",
        headers: authHeaders(token, true),
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function restoreDocumentApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/${id}/restore`, {
        method: "POST",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function restoreFolderApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/folders/${id}/restore`, {
        method: "POST",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function trashDocumentApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function trashFolderApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/folders/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function permanentlyDeleteDocumentApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/${id}/permanent`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    return res.json();
}

export async function permanentlyDeleteFolderApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/folders/${id}/permanent`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    return res.json();
}
