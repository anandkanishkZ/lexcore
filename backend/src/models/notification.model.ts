import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    title: string;
    message: string;
    isRead: boolean;
    linkedEntityType?: string;
    linkedEntityId?: string;
    createdAt: Date;
}

const NotificationMongoSchema = new Schema<INotification>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        isRead: { type: Boolean, default: false },
        linkedEntityType: { type: String },
        linkedEntityId: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const NotificationModel = mongoose.model<INotification>("Notification", NotificationMongoSchema);
