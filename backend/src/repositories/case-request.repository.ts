import { CaseRequestModel, ICaseRequest } from "../models/case-request.model";

export class CaseRequestMongoRepository {
    async create(data: Partial<ICaseRequest>): Promise<ICaseRequest> {
        return CaseRequestModel.create(data);
    }

    async getAll(status?: string): Promise<ICaseRequest[]> {
        const filter: any = {};
        if (status) filter.status = status;

        // Reviewed as a status-filtered queue, not a paginated table — same
        // "bounded, not paginated" reasoning as tasks/calendar-events.
        return CaseRequestModel.find(filter)
            .populate("requestedBy", "firstName lastName email")
            .populate("reviewedBy", "firstName lastName")
            .populate("resultingCase", "caseNumber title")
            .sort({ createdAt: -1 })
            .limit(500);
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
            .sort({ createdAt: -1 })
            .limit(200);
    }

    /** Used to block a duplicate submission — see CaseRequestService.create. */
    async hasPendingWithTitle(userId: string, title: string): Promise<boolean> {
        const existing = await CaseRequestModel.exists({ requestedBy: userId, title, status: "pending" });
        return existing !== null;
    }

    async update(id: string, data: Partial<ICaseRequest>): Promise<ICaseRequest | null> {
        return CaseRequestModel.findByIdAndUpdate(id, data, { new: true })
            .populate("requestedBy", "firstName lastName email")
            .populate("reviewedBy", "firstName lastName")
            .populate("resultingCase", "caseNumber title");
    }

    /** Atomically transitions a request out of "pending" — returns null if
     * it's already been reviewed (by a concurrent request or otherwise),
     * instead of the read-then-write race a plain `update()` would have.
     * Used as the very first step of approve()/reject() so only one of two
     * concurrent decisions can ever proceed past the check. */
    async updateIfPending(id: string, data: Partial<ICaseRequest>): Promise<ICaseRequest | null> {
        return CaseRequestModel.findOneAndUpdate({ _id: id, status: "pending" }, data, { new: true })
            .populate("requestedBy", "firstName lastName email")
            .populate("reviewedBy", "firstName lastName")
            .populate("resultingCase", "caseNumber title");
    }
}
