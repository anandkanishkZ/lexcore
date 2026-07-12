import mongoose, { Schema, Document } from "mongoose";

export interface IFirmSettings extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    logoUrl: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    currency: string;
    practiceAreas: string[];
    updatedAt: Date;
}

const FirmSettingsMongoSchema = new Schema<IFirmSettings>(
    {
        name: { type: String, default: "Lexcore" },
        logoUrl: { type: String, default: "" },
        address: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        website: { type: String, default: "" },
        currency: { type: String, default: "USD" },
        practiceAreas: { type: [String], default: [] },
    },
    { timestamps: { createdAt: false, updatedAt: true } }
);

export const FirmSettingsModel = mongoose.model<IFirmSettings>("FirmSettings", FirmSettingsMongoSchema);
