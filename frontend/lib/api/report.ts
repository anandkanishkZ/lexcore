const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchCasesByStatusApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/reports/cases-by-status`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function fetchRevenueByMonthApi(token: string, months?: number) {
    const query = months ? `?months=${months}` : "";
    const res = await fetch(`${API_URL}/api/v1/reports/revenue-by-month${query}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function fetchTaskCompletionApi(token: string) {
    const res = await fetch(`${API_URL}/api/v1/reports/task-completion`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
