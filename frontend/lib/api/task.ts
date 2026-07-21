const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchTasksApi(token: string, status?: string, assignee?: string, caseId?: string, client?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (assignee) params.set("assignee", assignee);
    if (caseId) params.set("case", caseId);
    if (client) params.set("client", client);

    const res = await fetch(`${API_URL}/api/v1/tasks?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createTaskApi(
    token: string,
    data: {
        title: string;
        description?: string;
        priority?: string;
        status?: string;
        dueDate?: string;
        assignee?: string;
        case?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateTaskApi(
    token: string,
    id: string,
    data: {
        title?: string;
        description?: string;
        priority?: string;
        status?: string;
        dueDate?: string;
        assignee?: string;
        case?: string;
    }
) {
    const res = await fetch(`${API_URL}/api/v1/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteTaskApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
