import mongoose, { Schema, Document } from "mongoose";

/**
 * A snapshot of a CaseFile's prior state, taken right before a new version
 * overwrites it (see DocumentService.recordNewVersion). CaseFile itself
 * always holds the current version's storagePath/mimeType/size — everywhere
 * that already reads CaseFile for "download this file" keeps working
 * unchanged and always gets the latest version; FileVersion is purely the
 * append-only history alongside it. Restoring an old version as current is
 * explicitly deferred — this is view/download-only.
 */
export interface IFileVersion extends Document {
    _id: mongoose.Types.ObjectId;
    file: mongoose.Types.ObjectId;
    versionNumber: number;
    name: string;
    mimeType: string;
    size: number;
    storagePath: string;
    uploadedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

const FileVersionMongoSchema = new Schema<IFileVersion>(
    {
        file: { type: Schema.Types.ObjectId, ref: "CaseFile", required: true },
        versionNumber: { type: Number, required: true },
        name: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        storagePath: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

FileVersionMongoSchema.index({ file: 1, versionNumber: -1 });

export const FileVersionModel = mongoose.model<IFileVersion>("FileVersion", FileVersionMongoSchema);
