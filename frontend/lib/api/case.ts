const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchCasesApi(
    token: string,
    page: number = 1,
    size: number = 10,
    search?: string,
    status?: string,
    client?: string,
    assignedAttorney?: string
) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (client) params.set("client", client);
    if (assignedAttorney) params.set("assignedAttorney", assignedAttorney);

    const res = await fetch(`${API_URL}/api/v1/cases?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function fetchCaseApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/cases/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createCaseApi(
    token: string,
    data: {
        title: string;
        type: string;
        status?: string;
        description?: string;
        client: string;
        assignedAttorney?: string;
        openDate?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateCaseApi(
    token: string,
    id: string,
    data: {
        title?: string;
        type?: string;
        status?: string;
        description?: string;
        client?: string;
        assignedAttorney?: string;
        openDate?: string;
        closeDate?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteCaseApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/cases/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
