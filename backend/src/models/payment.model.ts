import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
    _id: mongoose.Types.ObjectId;
    invoice: mongoose.Types.ObjectId;
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "cheque" | "other";
    date: Date;
    receiptNumber: string;
    notes: string;
    recordedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const PaymentMongoSchema = new Schema<IPayment>(
    {
        invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
        amount: { type: Number, required: true, min: 0.01 },
        method: {
            type: String,
            enum: ["cash", "bank_transfer", "card", "cheque", "other"],
            default: "cash",
        },
        date: { type: Date, default: Date.now },
        receiptNumber: { type: String, required: true, unique: true },
        notes: { type: String, default: "" },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentMongoSchema.index({ invoice: 1 });

export const PaymentModel = mongoose.model<IPayment>("Payment", PaymentMongoSchema);
