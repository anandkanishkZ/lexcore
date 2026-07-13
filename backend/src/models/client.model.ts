import mongoose, { Schema, Document } from "mongoose";
import { ClientType } from "../types/client.type";

export interface IClient extends ClientType, Document {
    _id: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    /**
     * The client-portal User account this CRM contact belongs to, if they
     * have login access — set once at link time (case-request approval, or
     * an admin explicitly linking them) rather than re-derived by matching
     * email strings on every read. `undefined` means this is a CRM-only
     * contact with no portal access at all.
     */
    linkedUserId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ClientMongoSchema: Schema = new Schema<IClient>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        type: { type: String, required: true, enum: ["individual", "company"] },
        companyName: { type: String, default: "" },
        address: { type: String, default: "" },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        linkedUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    },
    { timestamps: true }
);

export const ClientModel = mongoose.model<IClient>("Client", ClientMongoSchema);
