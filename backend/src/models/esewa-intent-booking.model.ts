import mongoose, { Schema, Document } from "mongoose";

/**
 * One row per Intent Payment booking. Needed because — unlike ePay v2, where
 * the client itself reports a transaction_uuid back to us after redirect —
 * Intent's callback_url is called server-to-server by eSewa and only carries
 * (product_code, amount, reference_code, correlation_id, status), no
 * merchant-supplied identifiers we control the shape of. This table is what
 * lets the callback (and the polling status-check fallback) map a
 * correlation_id back to the invoice + our own transaction_uuid.
 */
export interface IEsewaIntentBooking extends Document {
    _id: mongoose.Types.ObjectId;
    invoice: mongoose.Types.ObjectId;
    transactionUuid: string;
    bookingId: string;
    correlationId: string;
    amount: number;
    status: "booked" | "success" | "failed" | "canceled" | "reverted";
    referenceCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

const EsewaIntentBookingSchema = new Schema<IEsewaIntentBooking>(
    {
        invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
        transactionUuid: { type: String, required: true, unique: true },
        bookingId: { type: String, required: true },
        correlationId: { type: String, required: true, unique: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["booked", "success", "failed", "canceled", "reverted"],
            default: "booked",
        },
        referenceCode: { type: String },
    },
    { timestamps: true }
);

EsewaIntentBookingSchema.index({ invoice: 1 });

export const EsewaIntentBookingModel = mongoose.model<IEsewaIntentBooking>(
    "EsewaIntentBooking",
    EsewaIntentBookingSchema
);
