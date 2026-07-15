import { InvoiceMongoRepository, InvoiceQuery } from "../repositories/invoice.repository";
import { CreateInvoiceDTO, UpdateInvoiceDTO, RecordPaymentDTO } from "../dtos/invoice.dto";
import { IInvoice, IInvoiceItem } from "../models/invoice.model";
import { IPayment } from "../models/payment.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";
import { retryOnDuplicateKey } from "../utils/retry-unique.util";

const invoiceRepository = new InvoiceMongoRepository();

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
        return retryOnDuplicateKey(async () => {
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
    }

    async update(id: string, data: UpdateInvoiceDTO): Promise<IInvoice> {
        const existing = await invoiceRepository.getById(id);
        if (!existing) throw new HttpException(404, "Invoice not found");
        if (existing.status === "paid") {
            throw new HttpException(400, "A paid invoice cannot be edited");
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
            updatePayload.items = items;
            updatePayload.subtotal = subtotal;
            updatePayload.tax = tax;
            updatePayload.total = total;
        }

        const updated = await invoiceRepository.update(id, updatePayload);
        if (!updated) throw new HttpException(500, "Failed to update invoice");
        return updated;
    }

    async delete(id: string, actorId: string): Promise<boolean> {
        const existing = await invoiceRepository.getById(id);
        if (!existing) throw new HttpException(404, "Invoice not found");

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
    async recordPayment(invoiceId: string, data: RecordPaymentDTO, userId: string): Promise<IInvoice> {
        const invoice = await invoiceRepository.getById(invoiceId);
        if (!invoice) throw new HttpException(404, "Invoice not found");
        if (invoice.status === "paid") throw new HttpException(400, "This invoice is already fully paid");

        const remaining = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;
        if (data.amount > remaining) {
            throw new HttpException(400, `Payment of ${data.amount} exceeds the remaining balance of ${remaining}`);
        }

        // See CaseService.create's comment on retryOnDuplicateKey — same
        // count-then-format-then-insert race, here on the receiptNumber
        // unique index.
        await retryOnDuplicateKey(async () => {
            const paymentCount = await invoiceRepository.countPayments();
            const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, "0")}`;

            return invoiceRepository.createPayment({
                invoice: invoiceId as any,
                amount: data.amount,
                method: data.method,
                date: data.date ? new Date(data.date) : new Date(),
                receiptNumber,
                notes: data.notes ?? "",
                recordedBy: userId as any,
            });
        });

        const paidAmount = await invoiceRepository.sumPayments(invoiceId);
        const status = paidAmount >= invoice.total ? "paid" : invoice.status;

        const updated = await invoiceRepository.update(invoiceId, { paidAmount, status });
        if (!updated) throw new HttpException(500, "Failed to update invoice after payment");

        await logAudit({
            actorId: userId,
            action: "invoice.payment-recorded",
            entityType: "Invoice",
            entityId: invoiceId,
            metadata: `${invoice.invoiceNumber} — ${data.amount} via ${data.method}`,
        });

        return updated;
    }
}
