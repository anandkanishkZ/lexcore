import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
    _id: mongoose.Types.ObjectId;
    actor: mongoose.Types.ObjectId;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: string;
    createdAt: Date;
}

const AuditLogMongoSchema = new Schema<IAuditLog>(
    {
        actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
        action: { type: String, required: true },
        entityType: { type: String, required: true },
        entityId: { type: String, required: true },
        metadata: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", AuditLogMongoSchema);
