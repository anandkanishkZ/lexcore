import { ClientModel, IClient } from "../models/client.model";
import { escapeRegex } from "../utils/regex.util";
import { normalizeEmail } from "../utils/email.util";

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
            const pattern = escapeRegex(search);
            filter.$or = [
                { firstName: { $regex: pattern, $options: "i" } },
                { lastName: { $regex: pattern, $options: "i" } },
                { email: { $regex: pattern, $options: "i" } },
                { companyName: { $regex: pattern, $options: "i" } },
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
        return await ClientModel.findOne({ email: normalizeEmail(email) });
    }

    async create(client: Partial<IClient>): Promise<IClient> {
        return await ClientModel.create({ ...client, email: client.email ? normalizeEmail(client.email) : client.email });
    }

    async update(id: string, client: Partial<IClient>): Promise<IClient | null> {
        const payload = client.email ? { ...client, email: normalizeEmail(client.email) } : client;
        return await ClientModel.findByIdAndUpdate(id, payload, { new: true }).populate(
            "createdBy",
            "firstName lastName email"
        );
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await ClientModel.findByIdAndDelete(id);
        return !!deleted;
    }
}
