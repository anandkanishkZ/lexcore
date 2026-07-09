import { CaseFolderModel, ICaseFolder } from "../models/case-folder.model";
import { CaseFileModel } from "../models/case-file.model";

export class CaseFolderMongoRepository {
    async listByCase(caseId: string, parent?: string | null): Promise<ICaseFolder[]> {
        return CaseFolderModel.find({ case: caseId, parent: parent ?? null }).sort({ name: 1 });
    }

    async getById(id: string): Promise<ICaseFolder | null> {
        return CaseFolderModel.findById(id);
    }

    async create(data: { name: string; case: string; parent?: string | null; createdBy: string }): Promise<ICaseFolder> {
        return CaseFolderModel.create(data);
    }

    async hasChildren(id: string): Promise<boolean> {
        const [childFolder, childFile] = await Promise.all([
            CaseFolderModel.exists({ parent: id }),
            CaseFileModel.exists({ folder: id }),
        ]);
        return Boolean(childFolder || childFile);
    }

    async delete(id: string): Promise<boolean> {
        const result = await CaseFolderModel.findByIdAndDelete(id);
        return Boolean(result);
    }
}
