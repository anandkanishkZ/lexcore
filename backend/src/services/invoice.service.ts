import { InvoiceMongoRepository, InvoiceQuery } from "../repositories/invoice.repository";
import { CreateInvoiceDTO, UpdateInvoiceDTO, RecordPaymentDTO } from "../dtos/invoice.dto";
import { IInvoice, IInvoiceItem } from "../models/invoice.model";
import { IPayment } from "../models/payment.model";
import { ClientModel } from "../models/client.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";
import { retryOnDuplicateKey } from "../utils/retry-unique.util";
import { NotificationService } from "./notification.service";
import { sendMail } from "../utils/mail.util";

const invoiceRepository = new InvoiceMongoRepository();
const notificationService = new NotificationService();

function computeTotals(
    items: { description: string; quantity: number; rate: number }[],
    taxRate: number
): { items: IInvoiceItem[]; subtotal: number; tax: number; total: number } {
    const priced = items.map((item) => ({ ...item, amount: Math.round(item.quantity * item.rate * 100) / 100 }));
    const subtotal = Math.round(priced.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { items: priced, subtotal, tax, total };
}

export class InvoiceService {
    async getAll(query: InvoiceQuery): Promise<{ data: IInvoice[]; total: number }> {
        return invoiceRepository.getAll(query);
    }

    async getById(id: string): Promise<IInvoice> {
        const found = await invoiceRepository.getById(id);
        if (!found) throw new HttpException(404, "Invoice not found");
        return found;
    }

    /**
     * Same admin-or-owning-client-by-email rule as CaseService.assertAccess —
     * reused for the shared GET /invoices/:id route, reachable by clients.
     */
    async assertAccess(id: string, requestingUser: { role: string; email: string }): Promise<IInvoice> {
        const found = await invoiceRepository.getById(id);
        if (!found) throw new HttpException(404, "Invoice not found");

        if (requestingUser.role !== "admin") {
            const client = found.client as unknown as { email?: string } | null;
            if (!client || client.email !== requestingUser.email) {
                throw new HttpException(403, "Access denied");
            }
        }

        return found;
    }

    async getMine(email: string): Promise<IInvoice[]> {
        return invoiceRepository.getMineByEmail(email);
    }

    async create(data: CreateInvoiceDTO, userId: string): Promise<IInvoice> {
        const { items, subtotal, tax, total: totalAmount } = computeTotals(
            data.items as { description: string; quantity: number; rate: number }[],
            data.taxRate
        );

        // See CaseService.create's comment on retryOnDuplicateKey — same
        // count-then-format-then-insert race on the invoiceNumber unique index.
        const created = await retryOnDuplicateKey(async () => {
            const total = await invoiceRepository.countAll();
            const year = new Date().getFullYear();
            const invoiceNumber = `INV-${year}-${String(total + 1).padStart(4, "0")}`;

            return invoiceRepository.create({
                invoiceNumber,
                client: data.client as any,
                case: data.case ? (data.case as any) : undefined,
                items,
                taxRate: data.taxRate,
                subtotal,
                tax,
                total: totalAmount,
                paidAmount: 0,
                status: data.status ?? "draft",
                dueDate: new Date(data.dueDate),
                notes: data.notes ?? "",
                createdBy: userId as any,
            });
        });

        // Invoicing had no notification hook at all before this — money
        // changing hands was invisible to the client until they happened to
        // check the Billing tab. A "draft" invoice isn't final/billable yet
        // though, so only notify once it's actually sent.
        if (created.status === "sent") {
            const client = await ClientModel.findById(data.client);
            if (client) {
                const message = `A new invoice ${created.invoiceNumber} for ${created.total} has been issued to you.`;
                if (client.linkedUserId) {
                    await notificationService.notifyUser(client.linkedUserId.toString(), "New invoice", message, {
                        type: "Invoice",
                        id: created._id.toString(),
                    });
                }
                await sendMail(client.email, "New invoice", message);
            }
        }

        return created;
    }

    async update(id: string, data: UpdateInvoiceDTO, actorId?: string): Promise<IInvoice> {
        const existing = await invoiceRepository.getById(id);
        if (!existing) throw new HttpException(404, "Invoice not found");
        if (existing.status === "paid") {
            throw new HttpException(400, "A paid invoice cannot be edited");
        }
        if (existing.status === "void") {
            throw new HttpException(400, "A voided invoice cannot be edited");
        }

        const updatePayload: any = { ...data };
        if (data.case !== undefined) updatePayload.case = data.case || null;
        if (data.dueDate) updatePayload.dueDate = new Date(data.dueDate);

        if (data.items) {
            const taxRate = data.taxRate ?? existing.taxRate;
            const { items, subtotal, tax, total } = computeTotals(
                data.items as { description: string; quantity: number; rate: number }[],
                taxRate
            );
            // A "sent" invoice can carry partial payments while still being
            // editable (status only flips to "paid" once fully covered) —
            // without this check, the total could be lowered below what's
            // already been collected, leaving a negative outstanding
            // balance with no way to reconcile it.
            if (existing.paidAmount > 0 && total < existing.paidAmount) {
                throw new HttpException(
                    400,
                    `Cannot lower the total below ${existing.paidAmount}, which has already been paid against this invoice`
                );
            }
            updatePayload.items = items;
            updatePayload.subtotal = subtotal;
            updatePayload.tax = tax;
            updatePayload.total = total;
        }

        const updated = await invoiceRepository.update(id, updatePayload);
        if (!updated) throw new HttpException(500, "Failed to update invoice");

        if (actorId) {
            await logAudit({
                actorId,
                action: "invoice.update",
                entityType: "Invoice",
                entityId: id,
                metadata: existing.invoiceNumber,
            });
        }

        return updated;
    }

    async delete(id: string, actorId: string): Promise<boolean> {
        const existing = await invoiceRepository.getById(id);
        if (!existing) throw new HttpException(404, "Invoice not found");

        if (existing.paidAmount > 0) {
            throw new HttpException(
                400,
                "Cannot delete an invoice with recorded payments — void it instead to preserve the payment history."
            );
        }

        const deleted = await invoiceRepository.delete(id);
        if (deleted) {
            await logAudit({
                actorId,
                action: "invoice.delete",
                entityType: "Invoice",
                entityId: id,
                metadata: `${existing.invoiceNumber} — ${existing.total}`,
            });
        }
        return deleted;
    }

    /** Non-destructive alternative to delete — for a wrong or cancelled
     * invoice that already has payment history against it (or that a firm
     * simply wants to keep in the record rather than erase). Only reachable
     * from draft/sent, matching the same reasoning update() uses: a paid or
     * already-void invoice is a closed record. */
    async voidInvoice(id: string, actorId: string): Promise<IInvoice> {
        const existing = await invoiceRepository.getById(id);
        if (!existing) throw new HttpException(404, "Invoice not found");
        if (existing.status === "void") throw new HttpException(400, "This invoice is already void");
        if (existing.status === "paid") throw new HttpException(400, "A fully paid invoice cannot be voided");

        const updated = await invoiceRepository.update(id, { status: "void" });
        if (!updated) throw new HttpException(500, "Failed to void invoice");

        await logAudit({
            actorId,
            action: "invoice.void",
            entityType: "Invoice",
            entityId: id,
            metadata: existing.invoiceNumber,
        });

        return updated;
    }

    async listPayments(invoiceId: string): Promise<IPayment[]> {
        return invoiceRepository.listPayments(invoiceId);
    }

    /**
     * paidAmount is always recomputed as the sum of every Payment record for
     * this invoice — never incremented directly — so it can never drift from
     * the actual payment history. status only ever flips to "paid" here,
     * once the full total is covered; there is no other way to mark an
     * invoice paid.
     */
    async recordPayment(
        invoiceId: string,
        data: RecordPaymentDTO,
        userId: string,
        gatewayRef?: string
    ): Promise<IInvoice> {
        const invoice = await invoiceRepository.getById(invoiceId);
        if (!invoice) throw new HttpException(404, "Invoice not found");
        if (invoice.status === "paid") throw new HttpException(400, "This invoice is already fully paid");
        if (invoice.status === "void") throw new HttpException(400, "This invoice has been voided");

        // Rounded the same way every other money field on this model is
        // (see computeTotals) — an unrounded client-supplied float could
        // drift paidAmount from invoice.total by a fraction of a cent across
        // several partial payments, permanently stalling the "paid" flip
        // even though the UI's rounded amountDue already reads $0.00.
        const amount = Math.round(data.amount * 100) / 100;

        const remaining = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;
        if (amount > remaining) {
            throw new HttpException(400, `Payment of ${amount} exceeds the remaining balance of ${remaining}`);
        }

        // See CaseService.create's comment on retryOnDuplicateKey — same
        // count-then-format-then-insert race, here on the receiptNumber
        // unique index.
        await retryOnDuplicateKey(async () => {
            const paymentCount = await invoiceRepository.countPayments();
            const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, "0")}`;

            return invoiceRepository.createPayment({
                invoice: invoiceId as any,
                amount,
                method: data.method,
                date: data.date ? new Date(data.date) : new Date(),
                receiptNumber,
                notes: data.notes ?? "",
                recordedBy: userId as any,
                gatewayRef,
            });
        });

        // The Payment record above is already committed by this point — it's
        // the source of truth paidAmount is always recomputed FROM, never
        // incremented, so retrying this reconciliation step (by re-fetching
        // the invoice) is always safe and never double-counts. If it still
        // fails, say so plainly rather than a generic 500 that reads as if
        // the payment itself never happened.
        let updated: IInvoice | null;
        try {
            const paidAmount = await invoiceRepository.sumPayments(invoiceId);
            const status = paidAmount >= invoice.total ? "paid" : invoice.status;
            updated = await invoiceRepository.update(invoiceId, { paidAmount, status });
        } catch (error) {
            throw new HttpException(
                500,
                "The payment was recorded, but the invoice total couldn't be refreshed. Reload this invoice — the balance will catch up automatically."
            );
        }
        if (!updated) throw new HttpException(500, "Failed to update invoice after payment");

        await logAudit({
            actorId: userId,
            action: "invoice.payment-recorded",
            entityType: "Invoice",
            entityId: invoiceId,
            metadata: `${invoice.invoiceNumber} — ${amount} via ${data.method}`,
        });

        return updated;
    }
}
