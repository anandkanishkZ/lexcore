import { DocumentRequestModel, IDocumentRequest } from "../models/document-request.model";

export class DocumentRequestMongoRepository {
    async create(data: Partial<IDocumentRequest>): Promise<IDocumentRequest> {
        return DocumentRequestModel.create(data);
    }

    // Reviewed as a status-filtered queue, not a paginated table — same
    // "bounded, not paginated" reasoning as tasks/calendar-events/case-requests.
    async getAll(caseId?: string, status?: string): Promise<IDocumentRequest[]> {
        const filter: any = {};
        if (caseId) filter.case = caseId;
        if (status) filter.status = status;

        return DocumentRequestModel.find(filter)
            .populate("case", "caseNumber title")
            .populate("requestedBy", "firstName lastName")
            .populate("fulfilledFile", "name mimeType size")
            .sort({ createdAt: -1 })
            .limit(500);
    }

    async getById(id: string): Promise<IDocumentRequest | null> {
        return DocumentRequestModel.findById(id)
            .populate("case", "caseNumber title client")
            .populate("requestedBy", "firstName lastName")
            .populate("fulfilledFile", "name mimeType size");
    }

    // The client doesn't own a DocumentRequest directly — they own the Case
    // it's attached to. Callers resolve the client's own case ids first
    // (CaseService.getMine) and pass them in here, mirroring
    // DocumentService.listRecent's caseService.getMine -> caseIds -> $in
    // pattern rather than a 3-hop query inside the repository.
    async getMineForCases(caseIds: string[]): Promise<IDocumentRequest[]> {
        if (caseIds.length === 0) return [];
        return DocumentRequestModel.find({ case: { $in: caseIds } })
            .populate("case", "caseNumber title")
            .populate("fulfilledFile", "name mimeType size")
            .sort({ createdAt: -1 })
            .limit(200);
    }

    async update(id: string, data: Partial<IDocumentRequest>): Promise<IDocumentRequest | null> {
        return DocumentRequestModel.findByIdAndUpdate(id, data, { new: true })
            .populate("case", "caseNumber title")
            .populate("requestedBy", "firstName lastName")
            .populate("fulfilledFile", "name mimeType size");
    }
}
