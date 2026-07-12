"use server";

import {
    fetchInvoicesApi,
    fetchInvoiceApi,
    fetchInvoicePaymentsApi,
    createInvoiceApi,
    updateInvoiceApi,
    deleteInvoiceApi,
    recordPaymentApi,
    type InvoicePayload,
} from "../api/invoice";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchInvoicesAction(page = 1, size = 10, status?: string, client?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchInvoicesApi(token, page, size, status, client);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch invoices" };
    }
}

export async function fetchInvoiceAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchInvoiceApi(token, id);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch invoice" };
    }
}

export async function fetchInvoicePaymentsAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchInvoicePaymentsApi(token, id);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch payments" };
    }
}

export async function createInvoiceAction(data: InvoicePayload) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createInvoiceApi(token, data);
        if (result.success) revalidatePath("/admin/billing");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to create invoice" };
    }
}

export async function updateInvoiceAction(id: string, data: Partial<InvoicePayload>) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateInvoiceApi(token, id, data);
        if (result.success) revalidatePath("/admin/billing");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to update invoice" };
    }
}

export async function deleteInvoiceAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteInvoiceApi(token, id);
        if (result.success) revalidatePath("/admin/billing");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to delete invoice" };
    }
}

export async function recordPaymentAction(id: string, data: { amount: number; method: string; date?: string; notes?: string }) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await recordPaymentApi(token, id, data);
        if (result.success) revalidatePath(`/admin/billing/${id}`);
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to record payment" };
    }
}
