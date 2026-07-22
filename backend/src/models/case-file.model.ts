import mongoose, { Schema, Document } from "mongoose";

export interface ICaseFile extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    case: mongoose.Types.ObjectId;
    folder?: mongoose.Types.ObjectId;
    mimeType: string;
    size: number;
    storagePath: string;
    uploadedBy: mongoose.Types.ObjectId;
    extractedText?: string;
    starred: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CaseFileMongoSchema = new Schema<ICaseFile>(
    {
        name: { type: String, required: true, maxlength: 255 },
        case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
        folder: { type: Schema.Types.ObjectId, ref: "CaseFolder" },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        storagePath: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        // Plain text pulled from PDF/Word/image uploads at upload time (see
        // document.service.ts's recordUpload) for the AI search feature —
        // images are OCR'd, same as scanned PDF pages. Undefined for
        // spreadsheets/other types, or if extraction failed.
        extractedText: { type: String },
        starred: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

// Every list query filters by case (+ folder, + isDeleted) — this is the
// shape that index needs to match.
CaseFileMongoSchema.index({ case: 1, folder: 1, isDeleted: 1 });

// Keyword search over filename + extracted content for the AI search feature.
CaseFileMongoSchema.index({ name: "text", extractedText: "text" });

export const CaseFileModel = mongoose.model<ICaseFile>("CaseFile", CaseFileMongoSchema);
