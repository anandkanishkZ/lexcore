import { CaseFileModel, ICaseFile } from "../models/case-file.model";

export class CaseFileMongoRepository {
    async listByCase(caseId: string, folder?: string | null): Promise<ICaseFile[]> {
        return CaseFileModel.find({ case: caseId, folder: folder ?? null })
            .populate("uploadedBy", "firstName lastName")
            .sort({ createdAt: -1 });
    }

    async getById(id: string): Promise<ICaseFile | null> {
        return CaseFileModel.findById(id);
    }

    async create(data: {
        name: string;
        case: string;
        folder?: string | null;
        mimeType: string;
        size: number;
        storagePath: string;
        uploadedBy: string;
    }): Promise<ICaseFile> {
        return CaseFileModel.create(data);
    }

    async delete(id: string): Promise<boolean> {
        const result = await CaseFileModel.findByIdAndDelete(id);
        return Boolean(result);
    }
}
