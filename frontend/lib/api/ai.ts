const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function askAiApi(token: string, query: string) {
    const res = await fetch(`${API_URL}/api/v1/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query }),
    });
    return res.json();
}

export async function summarizeCaseApi(token: string, caseId: string) {
    const res = await fetch(`${API_URL}/api/v1/ai/cases/${caseId}/summary`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function summarizeDocumentApi(token: string, fileId: string) {
    const res = await fetch(`${API_URL}/api/v1/ai/documents/${fileId}/summary`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function chatAboutDocumentApi(token: string, fileId: string, query: string, history: ChatTurn[]) {
    const res = await fetch(`${API_URL}/api/v1/ai/documents/${fileId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, history }),
    });
    return res.json();
}
