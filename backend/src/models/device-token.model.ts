import mongoose, { Schema, Document } from "mongoose";

/** One FCM registration token for one signed-in device. A user can have
 * several (phone + tablet, or a reinstall that got a fresh token before the
 * old one expired) — kept as its own collection rather than an array on
 * User so an individual token can be looked up/deleted by its own value in
 * O(1) via the unique index, which matters for cleaning up tokens FCM
 * reports as no-longer-registered (see utils/push.util.ts). */
export interface IDeviceToken extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    token: string;
    platform: "android" | "ios";
    createdAt: Date;
    updatedAt: Date;
}

const DeviceTokenMongoSchema = new Schema<IDeviceToken>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        token: { type: String, required: true, unique: true },
        platform: { type: String, enum: ["android", "ios"], required: true },
    },
    { timestamps: true }
);

// Every push send fans out from "which tokens belong to this user" — see
// NotificationService's push step.
DeviceTokenMongoSchema.index({ user: 1 });

export const DeviceTokenModel = mongoose.model<IDeviceToken>("DeviceToken", DeviceTokenMongoSchema);
