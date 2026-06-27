import mongoose, { Schema, Document } from "mongoose";
import { ClientType } from "../types/client.type";

export interface IClient extends ClientType, Document {
    _id: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
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
    },
    { timestamps: true }
);

export const ClientModel = mongoose.model<IClient>("Client", ClientMongoSchema);
