const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchNotificationsApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/notifications`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });
    return res.json();
}

export async function markNotificationReadApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function markAllNotificationsReadApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
