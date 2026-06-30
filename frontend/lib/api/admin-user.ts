const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchAdminUserApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createAdminUserApi(
    token: string,
    data: {
        firstName: string;
        lastName: string;
        email: string;
        userType: string;
        password: string;
        role: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/admin/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateAdminUserApi(
    token: string,
    id: string,
    data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        userType?: string;
        password?: string;
        role?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteAdminUserApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
