const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchCaseRequestsApi(token: string, status?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);

    const res = await fetch(`${API_URL}/api/v1/case-requests?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function approveCaseRequestApi(
    token: string,
    id: string,
    data: { assignedAttorney?: string; reviewNote?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/case-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function rejectCaseRequestApi(token: string, id: string, reviewNote: string) {
    const res = await fetch(`${API_URL}/api/v1/case-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reviewNote }),
    });
    return res.json();
}
