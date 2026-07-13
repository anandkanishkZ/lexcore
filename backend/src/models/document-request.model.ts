import mongoose, { Schema, Document } from "mongoose";

export interface IDocumentRequest extends Document {
    _id: mongoose.Types.ObjectId;
    case: mongoose.Types.ObjectId;
    title: string;
    description: string;
    status: "pending" | "fulfilled" | "cancelled";
    requestedBy: mongoose.Types.ObjectId;
    fulfilledFile?: mongoose.Types.ObjectId;
    fulfilledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const DocumentRequestMongoSchema = new Schema<IDocumentRequest>(
    {
        case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "fulfilled", "cancelled"],
            default: "pending",
        },
        requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        fulfilledFile: { type: Schema.Types.ObjectId, ref: "CaseFile" },
        fulfilledAt: { type: Date },
    },
    { timestamps: true }
);

DocumentRequestMongoSchema.index({ case: 1, status: 1 });
DocumentRequestMongoSchema.index({ status: 1 });

export const DocumentRequestModel = mongoose.model<IDocumentRequest>("DocumentRequest", DocumentRequestMongoSchema);
