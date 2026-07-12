import { InvoiceModel, IInvoice } from "../models/invoice.model";
import { PaymentModel, IPayment } from "../models/payment.model";
import { ClientModel } from "../models/client.model";

export interface InvoiceQuery {
    page: number;
    size: number;
    status?: string;
    client?: string;
    caseId?: string;
}

export class InvoiceMongoRepository {
    async getAll(query: InvoiceQuery): Promise<{ data: IInvoice[]; total: number }> {
        const { page, size, status, client, caseId } = query;
        const skip = (page - 1) * size;

        const filter: any = {};
        if (status) filter.status = status;
        if (client) filter.client = client;
        if (caseId) filter.case = caseId;

        const [data, total] = await Promise.all([
            InvoiceModel.find(filter)
                .populate("client", "firstName lastName email")
                .populate("case", "title caseNumber")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size),
            InvoiceModel.countDocuments(filter),
        ]);

        return { data, total };
    }

    async getById(id: string): Promise<IInvoice | null> {
        return InvoiceModel.findById(id)
            .populate("client", "firstName lastName email phone address")
            .populate("case", "title caseNumber")
            .populate("createdBy", "firstName lastName");
    }

    async getMineByEmail(email: string): Promise<IInvoice[]> {
        const client = await ClientModel.findOne({ email });
        if (!client) return [];
        return InvoiceModel.find({ client: client._id })
            .populate("case", "title caseNumber")
            .sort({ createdAt: -1 });
    }

    async countAll(): Promise<number> {
        return InvoiceModel.countDocuments();
    }

    async create(data: Partial<IInvoice>): Promise<IInvoice> {
        return InvoiceModel.create(data);
    }

    async update(id: string, data: Partial<IInvoice>): Promise<IInvoice | null> {
        return InvoiceModel.findByIdAndUpdate(id, data, { new: true })
            .populate("client", "firstName lastName email")
            .populate("case", "title caseNumber");
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await InvoiceModel.findByIdAndDelete(id);
        return !!deleted;
    }

    async createPayment(data: Partial<IPayment>): Promise<IPayment> {
        return PaymentModel.create(data);
    }

    async listPayments(invoiceId: string): Promise<IPayment[]> {
        return PaymentModel.find({ invoice: invoiceId })
            .populate("recordedBy", "firstName lastName")
            .sort({ date: -1 });
    }

    async sumPayments(invoiceId: string): Promise<number> {
        const payments = await PaymentModel.find({ invoice: invoiceId }, "amount");
        return payments.reduce((sum, p) => sum + p.amount, 0);
    }

    async countPayments(): Promise<number> {
        return PaymentModel.countDocuments();
    }
}
