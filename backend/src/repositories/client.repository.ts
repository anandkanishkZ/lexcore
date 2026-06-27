import { ClientModel, IClient } from "../models/client.model";

export interface ClientQuery {
    page: number;
    size: number;
    search?: string;
}

export class ClientMongoRepository {
    async getAll(query: ClientQuery): Promise<{ data: IClient[]; total: number }> {
        const { page, size, search } = query;
        const skip = (page - 1) * size;

        const filter: any = {};
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { companyName: { $regex: search, $options: "i" } },
            ];
        }

        const [data, total] = await Promise.all([
            ClientModel.find(filter)
                .populate("createdBy", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size),
            ClientModel.countDocuments(filter),
        ]);

        return { data, total };
    }

    async getById(id: string): Promise<IClient | null> {
        return await ClientModel.findById(id).populate("createdBy", "firstName lastName email");
    }

    async getByEmail(email: string): Promise<IClient | null> {
        return await ClientModel.findOne({ email });
    }

    async create(client: Partial<IClient>): Promise<IClient> {
        return await ClientModel.create(client);
    }

    async update(id: string, client: Partial<IClient>): Promise<IClient | null> {
        return await ClientModel.findByIdAndUpdate(id, client, { new: true }).populate(
            "createdBy",
            "firstName lastName email"
        );
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await ClientModel.findByIdAndDelete(id);
        return !!deleted;
    }
}
