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

// Dedicated, verified endpoint — the old flow sent {password} straight to
// PUT /auth/update (the generic profile-fields endpoint), which hashed and
// saved whatever it was given with no check against the existing password.
export async function changePasswordApi(
    token: string,
    data: { currentPassword: string; newPassword: string }
) {
    const res = await fetch(`${API_URL}/api/v1/auth/password`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function forgotPasswordApi(email: string) {
    const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    return res.json();
}

export async function resetPasswordApi(token: string, newPassword: string) {
    const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
    });
    return res.json();
}
