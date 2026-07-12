import { redirect, notFound } from "next/navigation";
import { fetchInvoiceAction, fetchInvoicePaymentsAction } from "@/lib/actions/invoice";
import { fetchFirmSettingsAction } from "@/lib/actions/settings";
import InvoiceDetailClient from "./_components/InvoiceDetailClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
    const { id } = await params;

    const [invoiceResult, paymentsResult, firmResult] = await Promise.all([
        fetchInvoiceAction(id),
        fetchInvoicePaymentsAction(id),
        fetchFirmSettingsAction(),
    ]);

    if (!invoiceResult.success && invoiceResult.message === "Not authenticated") {
        redirect("/login");
    }
    if (!invoiceResult.success) {
        notFound();
    }

    const firm = firmResult.success
        ? firmResult.data
        : { name: "Lexcore", address: "", phone: "", email: "" };

    return (
        <InvoiceDetailClient
            invoice={invoiceResult.data}
            payments={paymentsResult.success ? paymentsResult.data : []}
            firm={firm}
        />
    );
}
