import mongoose, { Schema, Document } from "mongoose";

export interface ICaseRequest extends Document {
    _id: mongoose.Types.ObjectId;
    requestedBy: mongoose.Types.ObjectId;
    title: string;
    type: "criminal" | "civil" | "corporate" | "family" | "immigration" | "real estate" | "other";
    description: string;
    phone: string;
    status: "pending" | "approved" | "rejected";
    reviewedBy?: mongoose.Types.ObjectId;
    reviewNote?: string;
    resultingCase?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CaseRequestMongoSchema = new Schema<ICaseRequest>(
    {
        requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["criminal", "civil", "corporate", "family", "immigration", "real estate", "other"],
        },
        description: { type: String, required: true },
        phone: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewNote: { type: String },
        resultingCase: { type: Schema.Types.ObjectId, ref: "Case" },
    },
    { timestamps: true }
);

export const CaseRequestModel = mongoose.model<ICaseRequest>("CaseRequest", CaseRequestMongoSchema);
