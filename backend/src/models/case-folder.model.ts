import mongoose, { Schema, Document } from "mongoose";

export interface ICaseFolder extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    case: mongoose.Types.ObjectId;
    parent?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    starred: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CaseFolderMongoSchema = new Schema<ICaseFolder>(
    {
        name: { type: String, required: true },
        case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
        parent: { type: Schema.Types.ObjectId, ref: "CaseFolder" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        starred: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

CaseFolderMongoSchema.index({ case: 1, parent: 1, isDeleted: 1 });

export const CaseFolderModel = mongoose.model<ICaseFolder>("CaseFolder", CaseFolderMongoSchema);
