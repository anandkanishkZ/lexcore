import mongoose, { Schema, Document } from "mongoose";

/**
 * Grants a person access to one file by email — independent of whether they
 * match the case's client (the only access CaseService.assertAccess itself
 * grants) or even have a User account at all. See
 * DocumentService.assertFileAccess for how this is consulted as a fallback
 * once the normal case-based check fails, never in place of it.
 */
export interface IFileShare extends Document {
    _id: mongoose.Types.ObjectId;
    file: mongoose.Types.ObjectId;
    email: string;
    role: "viewer" | "editor";
    sharedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FileShareMongoSchema = new Schema<IFileShare>(
    {
        file: { type: Schema.Types.ObjectId, ref: "CaseFile", required: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
        sharedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

// One share per file+email — re-sharing updates the existing grant's role
// rather than creating a duplicate.
FileShareMongoSchema.index({ file: 1, email: 1 }, { unique: true });

export const FileShareModel = mongoose.model<IFileShare>("FileShare", FileShareMongoSchema);
