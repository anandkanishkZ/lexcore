import mongoose, { Schema, Document } from "mongoose";

export interface IInvoiceItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
}

export interface IInvoice extends Document {
    _id: mongoose.Types.ObjectId;
    invoiceNumber: string;
    client: mongoose.Types.ObjectId;
    case?: mongoose.Types.ObjectId;
    items: IInvoiceItem[];
    taxRate: number;
    subtotal: number;
    tax: number;
    total: number;
    // Denormalized cache, always recomputed from the sum of this invoice's
    // Payment records on every payment write — never incremented directly,
    // so it can't drift from the actual payment history.
    paidAmount: number;
    // "overdue" is deliberately not a stored value here — it's derived at
    // read time from status !== "paid" && dueDate < now, so it can never go
    // stale or need a cron job to flip it.
    status: "draft" | "sent" | "paid";
    dueDate: Date;
    notes: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
    {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const InvoiceMongoSchema = new Schema<IInvoice>(
    {
        invoiceNumber: { type: String, required: true, unique: true },
        client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
        case: { type: Schema.Types.ObjectId, ref: "Case" },
        items: { type: [InvoiceItemSchema], default: [] },
        taxRate: { type: Number, default: 0, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
        tax: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
        paidAmount: { type: Number, default: 0, min: 0 },
        status: { type: String, enum: ["draft", "sent", "paid"], default: "draft" },
        dueDate: { type: Date, required: true },
        notes: { type: String, default: "" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

InvoiceMongoSchema.index({ status: 1 });
InvoiceMongoSchema.index({ client: 1 });
InvoiceMongoSchema.index({ case: 1 });

export const InvoiceModel = mongoose.model<IInvoice>("Invoice", InvoiceMongoSchema);
