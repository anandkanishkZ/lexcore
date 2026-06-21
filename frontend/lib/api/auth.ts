const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function registerApi(data: {
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    password: string;
}) {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function loginApi(data: { email: string; password: string }) {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function whoamiApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/auth/whoami`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function updateProfileApi(token: string, formData: FormData) {
    const res = await fetch(`${API_URL}/api/v1/auth/update`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    return res.json();
}

export async function updatePasswordApi(
    token: string,
    data: { password: string }
) {
    const res = await fetch(`${API_URL}/api/v1/auth/update`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}
