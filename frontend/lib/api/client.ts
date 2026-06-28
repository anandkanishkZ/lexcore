const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchClientsApi(
    token: string,
    page: number = 1,
    size: number = 10,
    search?: string
) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });
    if (search) params.set("search", search);

    const res = await fetch(`${API_URL}/api/v1/clients?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function fetchClientApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/clients/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createClientApi(
    token: string,
    data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        type: string;
        companyName?: string;
        address?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/clients`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateClientApi(
    token: string,
    id: string,
    data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        type?: string;
        companyName?: string;
        address?: string;
        status?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/clients/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteClientApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/clients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
