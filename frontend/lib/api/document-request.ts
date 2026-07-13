const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchDocumentRequestsApi(token: string, caseId?: string, status?: string) {
    const params = new URLSearchParams();
    if (caseId) params.set("case", caseId);
    if (status) params.set("status", status);

    const res = await fetch(`${API_URL}/api/v1/document-requests?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createDocumentRequestApi(
    token: string,
    data: { case: string; title: string; description?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/document-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function cancelDocumentRequestApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/document-requests/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
