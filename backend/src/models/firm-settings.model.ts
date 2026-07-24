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
    // eSewa payment gateway — admin-configurable so no redeploy is needed to
    // rotate credentials or flip environments. esewaClientId doubles as
    // eSewa's ePay v2 "product_code" (merchant code) — same underlying
    // value, different name in eSewa's own docs depending on which of their
    // APIs you're reading. esewaSecretEncrypted is the API secret at rest
    // (see utils/crypto.util.ts); it signs every payment request
    // server-side (see EsewaPaymentService) and must never be serialized
    // back to any client — see FirmSettingsService.
    esewaEnabled: boolean;
    esewaEnvironment: "test" | "live";
    esewaClientId: string;
    esewaSecretEncrypted: string;
    // Khalti "Web Checkout (KPG-2)" — a separate gateway from eSewa, same
    // admin-configurable-without-redeploy rationale. Khalti has a single
    // secret key (no separate client id) passed as the Authorization header
    // on every server-side call — see KhaltiPaymentService.
    khaltiEnabled: boolean;
    khaltiEnvironment: "test" | "live";
    khaltiSecretKeyEncrypted: string;
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
        esewaEnabled: { type: Boolean, default: false },
        esewaEnvironment: { type: String, enum: ["test", "live"], default: "test" },
        esewaClientId: { type: String, default: "" },
        esewaSecretEncrypted: { type: String, default: "" },
        khaltiEnabled: { type: Boolean, default: false },
        khaltiEnvironment: { type: String, enum: ["test", "live"], default: "test" },
        khaltiSecretKeyEncrypted: { type: String, default: "" },
    },
    { timestamps: { createdAt: false, updatedAt: true } }
);

export const FirmSettingsModel = mongoose.model<IFirmSettings>("FirmSettings", FirmSettingsMongoSchema);
