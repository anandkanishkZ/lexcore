import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
    _id: mongoose.Types.ObjectId;
    invoice: mongoose.Types.ObjectId;
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "cheque" | "esewa" | "khalti" | "other";
    date: Date;
    receiptNumber: string;
    notes: string;
    recordedBy: mongoose.Types.ObjectId;
    // Third-party transaction reference (currently eSewa's refId), set only
    // for gateway-verified payments. The unique+sparse index is what
    // actually prevents the same transaction being recorded twice under a
    // concurrent/retried request — see EsewaPaymentService.
    gatewayRef?: string;
    createdAt: Date;
}

const PaymentMongoSchema = new Schema<IPayment>(
    {
        invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
        amount: { type: Number, required: true, min: 0.01 },
        method: {
            type: String,
            enum: ["cash", "bank_transfer", "card", "cheque", "esewa", "khalti", "other"],
            default: "cash",
        },
        date: { type: Date, default: Date.now },
        receiptNumber: { type: String, required: true, unique: true },
        notes: { type: String, default: "" },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        gatewayRef: { type: String, unique: true, sparse: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentMongoSchema.index({ invoice: 1 });
// Matches reportService.revenueByMonth's $match on date — was previously an
// unindexed full collection scan on every report load.
PaymentMongoSchema.index({ date: 1 });

export const PaymentModel = mongoose.model<IPayment>("Payment", PaymentMongoSchema);
