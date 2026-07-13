import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    case: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content: string;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const MessageMongoSchema = new Schema<IMessage>(
    {
        case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
        sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        readAt: { type: Date },
    },
    { timestamps: true }
);

MessageMongoSchema.index({ case: 1, createdAt: 1 });

export const MessageModel = mongoose.model<IMessage>("Message", MessageMongoSchema);
