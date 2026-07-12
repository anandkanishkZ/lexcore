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

// Matches getMine's find({user}).sort({createdAt}) and countUnread/
// markAllRead's find({user, isRead}) shapes exactly.
NotificationMongoSchema.index({ user: 1, createdAt: -1 });
NotificationMongoSchema.index({ user: 1, isRead: 1 });

export const NotificationModel = mongoose.model<INotification>("Notification", NotificationMongoSchema);
