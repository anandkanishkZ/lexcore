import mongoose, { Schema, Document } from "mongoose";

export type MessageAttachmentKind = "image" | "document" | "audio" | "other";

export interface IMessageAttachment {
    _id: mongoose.Types.ObjectId;
    // On-disk filename only (within uploads/messages/<caseId>/), never an
    // absolute path — MessageService resolves the real path server-side so
    // a filesystem layout is never handed to a client, unlike CaseFile's
    // pre-existing storagePath field.
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    kind: MessageAttachmentKind;
    // Seconds — only ever set for kind "audio" (recorded voice notes).
    duration?: number;
}

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    case: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content: string;
    attachments: IMessageAttachment[];
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const MessageAttachmentSchema = new Schema<IMessageAttachment>(
    {
        fileName: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true, min: 1 },
        kind: { type: String, enum: ["image", "document", "audio", "other"], required: true },
        duration: { type: Number, min: 0 },
    },
    { _id: true }
);

const MessageMongoSchema = new Schema<IMessage>(
    {
        case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
        sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
        // No longer unconditionally required — an attachment-only message
        // (a photo with no caption) has empty content. MessageService
        // enforces "at least one of content or attachments" instead, since
        // that rule only applies to the text-only send path unchanged and
        // needs different logic on the attachment path.
        content: { type: String, default: "" },
        attachments: { type: [MessageAttachmentSchema], default: [] },
        readAt: { type: Date },
    },
    { timestamps: true }
);

MessageMongoSchema.index({ case: 1, createdAt: 1 });

export const MessageModel = mongoose.model<IMessage>("Message", MessageMongoSchema);
