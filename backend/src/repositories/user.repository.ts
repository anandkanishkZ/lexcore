import { UserModel, IUser } from "../models/user.model";

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
}

export class UserMongoRepository implements IUserRepository {
    async getUserById(id: string): Promise<IUser | null> {
        return await UserModel.findOne({ _id: id });
    }

    async getUserByEmail(email: string): Promise<IUser | null> {
        return await UserModel.findOne({ email });
    }

    async getUserByUsername(username: string): Promise<IUser | null> {
        return await UserModel.findOne({ username });
    }

    async createUser(user: Partial<IUser>): Promise<IUser> {
        return await UserModel.create(user);
    }

    async getAll(query: UserQuery): Promise<{ data: IUser[]; total: number }> {
        const { page, size, search } = query;
        const skip = (page - 1) * size;

        const filter: any = {};
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const [data, total] = await Promise.all([
            UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(size),
            UserModel.countDocuments(filter),
        ]);

        return { data, total };
    }

    async update(id: string, user: Partial<IUser>): Promise<IUser | null> {
        return await UserModel.findByIdAndUpdate(id, user, { new: true });
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await UserModel.findByIdAndDelete(id);
        return !!deleted;
    }
}
