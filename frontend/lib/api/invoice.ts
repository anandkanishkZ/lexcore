const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

export interface InvoiceItemInput {
    description: string;
    quantity: number;
    rate: number;
}

export interface InvoicePayload {
    client: string;
    case?: string;
    items: InvoiceItemInput[];
    taxRate?: number;
    status?: string;
    dueDate: string;
    notes?: string;
}

export async function fetchInvoicesApi(token: string, page: number = 1, size: number = 10, status?: string, client?: string) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set("status", status);
    if (client) params.set("client", client);

    const res = await fetch(`${API_URL}/api/v1/invoices?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function fetchInvoiceApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/invoices/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function fetchInvoicePaymentsApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/invoices/${id}/payments`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function createInvoiceApi(token: string, data: InvoicePayload) {
    const res = await fetch(`${API_URL}/api/v1/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateInvoiceApi(token: string, id: string, data: Partial<InvoicePayload>) {
    const res = await fetch(`${API_URL}/api/v1/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteInvoiceApi(token: string, id: string) {
    const res = await fetch(`${API_URL}/api/v1/invoices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function recordPaymentApi(
    token: string,
    id: string,
    data: { amount: number; method: string; date?: string; notes?: string }
) {
    const res = await fetch(`${API_URL}/api/v1/invoices/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    return res.json();
}
