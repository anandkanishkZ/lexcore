const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchCalendarEventsApi(token: string, from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`${API_URL}/api/v1/calendar-events?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createCalendarEventApi(
    token: string,
    data: {
        title: string;
        type?: string;
        date: string;
        time?: string;
        location?: string;
        notes?: string;
        case?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/calendar-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateCalendarEventApi(
    token: string,
    id: string,
    data: {
        title?: string;
        type?: string;
        date?: string;
        time?: string;
        location?: string;
        notes?: string;
        case?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/calendar-events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteCalendarEventApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/calendar-events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
