import { CaseModel, ICase } from "../models/case.model";
import { ClientModel } from "../models/client.model";
import { escapeRegex } from "../utils/regex.util";

export interface CaseQuery {
    page: number;
    size: number;
    search?: string;
    status?: string;
    client?: string;
}

export class CaseMongoRepository {
    async getAll(query: CaseQuery): Promise<{ data: ICase[]; total: number }> {
        const { page, size, search, status, client } = query;
        const skip = (page - 1) * size;

        const filter: any = {};
        if (search) {
            const pattern = escapeRegex(search);
            filter.$or = [
                { title: { $regex: pattern, $options: "i" } },
                { caseNumber: { $regex: pattern, $options: "i" } },
                { description: { $regex: pattern, $options: "i" } },
            ];
        }
        if (status) filter.status = status;
        if (client) filter.client = client;

        const [data, total] = await Promise.all([
            CaseModel.find(filter)
                .populate("client", "firstName lastName email")
                .populate("assignedAttorney", "firstName lastName email")
                .populate("createdBy", "firstName lastName")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size),
            CaseModel.countDocuments(filter),
        ]);

        return { data, total };
    }

    async getById(id: string): Promise<ICase | null> {
        return CaseModel.findById(id)
            .populate("client", "firstName lastName email phone type linkedUserId")
            .populate("assignedAttorney", "firstName lastName email userType")
            .populate("createdBy", "firstName lastName email");
    }

    async countAll(): Promise<number> {
        return CaseModel.countDocuments();
    }

    async create(data: Partial<ICase> & { caseNumber: string }): Promise<ICase> {
        return CaseModel.create(data);
    }

    async update(id: string, data: Partial<ICase>): Promise<ICase | null> {
        return CaseModel.findByIdAndUpdate(id, data, { new: true })
            .populate("client", "firstName lastName email")
            .populate("assignedAttorney", "firstName lastName email");
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await CaseModel.findByIdAndDelete(id);
        return !!deleted;
    }

    async getMineByEmail(email: string): Promise<ICase[]> {
        const client = await ClientModel.findOne({ email });
        if (!client) return [];
        return CaseModel.find({ client: client._id })
            .populate("client", "firstName lastName email")
            .populate("assignedAttorney", "firstName lastName email userType")
            .populate("createdBy", "firstName lastName")
            .sort({ createdAt: -1 });
    }

    /** Keyword search over title + description (AI search feature). */
    async searchText(query: string, limit: number): Promise<ICase[]> {
        return CaseModel.find({ $text: { $search: query } }, { score: { $meta: "textScore" } })
            .populate("client", "firstName lastName email")
            .sort({ score: { $meta: "textScore" } })
            .limit(limit);
    }
}
