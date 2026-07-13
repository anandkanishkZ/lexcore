const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export async function fetchMessagesApi(token: string, caseId: string) {
    const res = await fetch(`${API_URL}/api/v1/messages?case=${caseId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function sendMessageApi(token: string, caseId: string, content: string) {
    const res = await fetch(`${API_URL}/api/v1/messages?case=${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
    });
    return res.json();
}
