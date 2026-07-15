import { UserModel, IUser } from "../models/user.model";
import { escapeRegex } from "../utils/regex.util";
import { normalizeEmail } from "../utils/email.util";

export interface UserQuery {
    page: number;
    size: number;
    search?: string;
}

export interface IUserRepository {
    getUserByEmail(email: string): Promise<IUser | null>;
    getUserByUsername(username: string): Promise<IUser | null>;
    createUser(user: Partial<IUser>): Promise<IUser>;
    getUserById(id: string): Promise<IUser | null>;
    getAll(query: UserQuery): Promise<{ data: IUser[]; total: number }>;
    update(id: string, user: Partial<IUser>): Promise<IUser | null>;
    delete(id: string): Promise<boolean>;
    setPasswordResetToken(id: string, hash: string, expiresAt: Date): Promise<void>;
    getUserByResetTokenHash(hash: string): Promise<IUser | null>;
    clearPasswordResetToken(id: string): Promise<void>;
}

export class UserMongoRepository implements IUserRepository {
    async getUserById(id: string): Promise<IUser | null> {
        return await UserModel.findOne({ _id: id });
    }

    async getUserByEmail(email: string): Promise<IUser | null> {
        // Normalized so "Jane@Firm.com" and "jane@firm.com" resolve to the
        // same account — see createUser/update below, which normalize on
        // write, but this also covers any pre-existing mixed-case rows.
        return await UserModel.findOne({ email: normalizeEmail(email) });
    }

    async getUserByUsername(username: string): Promise<IUser | null> {
        return await UserModel.findOne({ username });
    }

    async createUser(user: Partial<IUser>): Promise<IUser> {
        return await UserModel.create({ ...user, email: user.email ? normalizeEmail(user.email) : user.email });
    }

    async getAll(query: UserQuery): Promise<{ data: IUser[]; total: number }> {
        const { page, size, search } = query;
        const skip = (page - 1) * size;

        const filter: any = {};
        if (search) {
            const pattern = escapeRegex(search);
            filter.$or = [
                { firstName: { $regex: pattern, $options: "i" } },
                { lastName: { $regex: pattern, $options: "i" } },
                { email: { $regex: pattern, $options: "i" } },
            ];
        }

        const [data, total] = await Promise.all([
            UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(size),
            UserModel.countDocuments(filter),
        ]);

        return { data, total };
    }

    async update(id: string, user: Partial<IUser>): Promise<IUser | null> {
        const payload = user.email ? { ...user, email: normalizeEmail(user.email) } : user;
        return await UserModel.findByIdAndUpdate(id, payload, { new: true });
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await UserModel.findByIdAndDelete(id);
        return !!deleted;
    }

    async setPasswordResetToken(id: string, hash: string, expiresAt: Date): Promise<void> {
        await UserModel.findByIdAndUpdate(id, { passwordResetTokenHash: hash, passwordResetExpiresAt: expiresAt });
    }

    async getUserByResetTokenHash(hash: string): Promise<IUser | null> {
        return await UserModel.findOne({ passwordResetTokenHash: hash });
    }

    async clearPasswordResetToken(id: string): Promise<void> {
        await UserModel.findByIdAndUpdate(id, { passwordResetTokenHash: null, passwordResetExpiresAt: null });
    }
}
