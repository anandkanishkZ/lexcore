import mongoose, { Schema, Document } from "mongoose";

export interface ICase extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    caseNumber: string;
    type: "criminal" | "civil" | "corporate" | "family" | "immigration" | "real estate" | "other";
    status: "open" | "pending" | "closed" | "on hold";
    description: string;
    client: mongoose.Types.ObjectId;
    assignedAttorney?: mongoose.Types.ObjectId;
    openDate: Date;
    closeDate?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CaseMongoSchema = new Schema<ICase>(
    {
        title: { type: String, required: true },
        caseNumber: { type: String, required: true, unique: true },
        type: {
            type: String,
            required: true,
            enum: ["criminal", "civil", "corporate", "family", "immigration", "real estate", "other"],
        },
        status: {
            type: String,
            enum: ["open", "pending", "closed", "on hold"],
            default: "open",
        },
        description: { type: String, default: "" },
        client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
        assignedAttorney: { type: Schema.Types.ObjectId, ref: "User" },
        openDate: { type: Date, default: Date.now },
        closeDate: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

// status is filtered on the admin list view; client backs getMineByEmail's
// second query (the ClientModel lookup itself is already covered by its own
// unique index on email).
CaseMongoSchema.index({ status: 1 });
CaseMongoSchema.index({ client: 1 });

export const CaseModel = mongoose.model<ICase>("Case", CaseMongoSchema);
