import { UserModel, IUser } from "../models/user.model";

export interface IUserRepository {
    getUserByEmail(email: string): Promise<IUser | null>;
    getUserByUsername(username: string): Promise<IUser | null>;
    createUser(user: Partial<IUser>): Promise<IUser>;
    getUserById(id: string): Promise<IUser | null>;
    getAll(): Promise<IUser[]>;
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

    async getAll(): Promise<IUser[]> {
        return await UserModel.find();
    }

    async update(id: string, user: Partial<IUser>): Promise<IUser | null> {
        return await UserModel.findByIdAndUpdate(id, user, { new: true });
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await UserModel.findByIdAndDelete(id);
        return !!deleted;
    }
}
