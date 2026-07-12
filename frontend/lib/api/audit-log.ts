const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchAuditLogsApi(token: string, page: number = 1, size: number = 20) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const res = await fetch(`${API_URL}/api/v1/audit-logs?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
