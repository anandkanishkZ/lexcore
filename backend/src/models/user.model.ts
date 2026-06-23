import mongoose, { Schema, Document } from "mongoose";
import { UserType } from "../types/user.type";

export interface IUser extends UserType, Document {
    _id: mongoose.Types.ObjectId;
    profileImage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserMongoSchema: Schema = new Schema<IUser>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        userType: { type: String, required: true, enum: ["client", "attorney", "lawyer", "advocate", "paralegal", "judge", "legal consultant"] },
        password: { type: String, required: true },
        role: { type: String, enum: ["admin", "user"], default: "user" },
        // Relative path to the uploaded avatar, e.g. "/uploads/profile-<id>.jpg".
        profileImage: { type: String, default: "" },
    },
    { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("User", UserMongoSchema);

/**
 * The user shape that is safe to send to clients — everything except the
 * password hash. Build it only through `toPublicUser` so the hash can never
 * leak out of an API response by accident.
 */
export interface PublicUser {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    role: string;
    profileImage: string;
    createdAt: Date;
    updatedAt: Date;
}

export const toPublicUser = (user: IUser): PublicUser => ({
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    role: user.role,
    profileImage: user.profileImage ?? "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});
