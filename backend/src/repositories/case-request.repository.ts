import { CaseRequestModel, ICaseRequest } from "../models/case-request.model";

export class CaseRequestMongoRepository {
    async create(data: Partial<ICaseRequest>): Promise<ICaseRequest> {
        return CaseRequestModel.create(data);
    }

    async getAll(status?: string): Promise<ICaseRequest[]> {
        const filter: any = {};
        if (status) filter.status = status;

        return CaseRequestModel.find(filter)
            .populate("requestedBy", "firstName lastName email")
            .populate("reviewedBy", "firstName lastName")
            .populate("resultingCase", "caseNumber title")
            .sort({ createdAt: -1 });
    }

    async getById(id: string): Promise<ICaseRequest | null> {
        return CaseRequestModel.findById(id)
            .populate("requestedBy", "firstName lastName email")
            .populate("reviewedBy", "firstName lastName")
            .populate("resultingCase", "caseNumber title");
    }

    async getMineByUserId(userId: string): Promise<ICaseRequest[]> {
        return CaseRequestModel.find({ requestedBy: userId })
            .populate("resultingCase", "caseNumber title")
            .sort({ createdAt: -1 });
    }

    async update(id: string, data: Partial<ICaseRequest>): Promise<ICaseRequest | null> {
        return CaseRequestModel.findByIdAndUpdate(id, data, { new: true })
            .populate("requestedBy", "firstName lastName email")
            .populate("reviewedBy", "firstName lastName")
            .populate("resultingCase", "caseNumber title");
    }
}
