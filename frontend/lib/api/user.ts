const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchUsersApi(
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

    const res = await fetch(`${API_URL}/api/v1/auth/users?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
