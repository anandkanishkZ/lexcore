const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchDocumentsApi(token: string, caseId: string, folderId?: string) {
    const params = new URLSearchParams({ case: caseId });
    if (folderId) params.set("folder", folderId);

    const res = await fetch(`${API_URL}/api/v1/documents?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createFolderApi(
    token: string,
    data: { case: string; name: string; parent?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/documents/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteDocumentApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function deleteFolderApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/documents/folders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
