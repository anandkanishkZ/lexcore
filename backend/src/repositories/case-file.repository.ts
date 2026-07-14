import { CaseFileModel, ICaseFile } from "../models/case-file.model";

export interface FileListFilters {
    search?: string;
    /** Friendly category, mapped to a mimeType match — see buildTypeFilter. */
    type?: string;
    sortBy?: "name" | "size" | "createdAt";
    sortOrder?: "asc" | "desc";
}

/** Escapes regex metacharacters so a search term can never be read as a
 * pattern (guards against both a crash on malformed input and ReDoS). */
function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTypeFilter(type: string): Record<string, unknown> | null {
    switch (type) {
        case "pdf":
            return { mimeType: "application/pdf" };
        case "image":
            return { mimeType: /^image\// };
        case "word":
            return { mimeType: { $in: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] } };
        case "excel":
            return { mimeType: { $in: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] } };
        default:
            return null;
    }
}

export class CaseFileMongoRepository {
    async listByCase(caseId: string, folder: string | null | undefined, filters: FileListFilters = {}): Promise<ICaseFile[]> {
        const { search, type, sortBy = "createdAt", sortOrder = "desc" } = filters;

        const query: Record<string, unknown> = {
            case: caseId,
            folder: folder ?? null,
            isDeleted: { $ne: true },
        };
        if (search) {
            query.name = { $regex: escapeRegex(search), $options: "i" };
        }
        if (type) {
            const typeFilter = buildTypeFilter(type);
            if (typeFilter) Object.assign(query, typeFilter);
        }

        return CaseFileModel.find(query)
            .populate("uploadedBy", "firstName lastName")
            .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });
    }

    async listTrashedByCase(caseId: string): Promise<ICaseFile[]> {
        return CaseFileModel.find({ case: caseId, isDeleted: true })
            .populate("uploadedBy", "firstName lastName")
            .sort({ deletedAt: -1 });
    }

    /** Cross-case "Recent" feed for a client — scoped to the case ids they own. */
    async listRecentForCases(caseIds: string[], limit: number): Promise<ICaseFile[]> {
        return CaseFileModel.find({ case: { $in: caseIds }, isDeleted: { $ne: true } })
            .populate("uploadedBy", "firstName lastName")
            .populate("case", "title caseNumber")
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    /** Same, but unscoped — for an admin, who can see every case's files. */
    async listRecentAcrossAllCases(limit: number): Promise<ICaseFile[]> {
        return CaseFileModel.find({ isDeleted: { $ne: true } })
            .populate("uploadedBy", "firstName lastName")
            .populate("case", "title caseNumber")
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    async listStarredForCases(caseIds: string[]): Promise<ICaseFile[]> {
        return CaseFileModel.find({ case: { $in: caseIds }, starred: true, isDeleted: { $ne: true } })
            .populate("uploadedBy", "firstName lastName")
            .populate("case", "title caseNumber")
            .sort({ createdAt: -1 });
    }

    async listStarredAcrossAllCases(): Promise<ICaseFile[]> {
        return CaseFileModel.find({ starred: true, isDeleted: { $ne: true } })
            .populate("uploadedBy", "firstName lastName")
            .populate("case", "title caseNumber")
            .sort({ createdAt: -1 });
    }

    /** Every non-trashed file directly inside any of the given folders — used
     * by cascading trash/restore/permanent-delete to reach a folder's files. */
    async listByFolderIds(folderIds: string[]): Promise<ICaseFile[]> {
        return CaseFileModel.find({ folder: { $in: folderIds } });
    }

    async getById(id: string): Promise<ICaseFile | null> {
        return CaseFileModel.findById(id);
    }

    /** Fills in extractedText after a background OCR pass completes (see
     * text-extraction.util.ts's ocrPdfText) — the upload response has
     * already gone out by the time this runs. */
    async updateExtractedText(id: string, extractedText: string): Promise<void> {
        await CaseFileModel.findByIdAndUpdate(id, { extractedText });
    }

    /** Overwrites a file's current content (new version upload) — name/
     * folder/starred stay as they were; the prior content is snapshotted
     * into FileVersion by the caller before this runs (see
     * DocumentService.recordNewVersion). */
    async replaceContent(
        id: string,
        data: { mimeType: string; size: number; storagePath: string; extractedText?: string }
    ): Promise<ICaseFile | null> {
        return CaseFileModel.findByIdAndUpdate(id, data, { new: true });
    }

    /** Every non-trashed file in one case — used by AiService.summarizeCase to
     * assemble the case's documents' extractedText. */
    async listAllByCase(caseId: string, limit: number): Promise<ICaseFile[]> {
        return CaseFileModel.find({ case: caseId, isDeleted: { $ne: true } })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    /** Keyword search over filename + extracted content (AI search feature). */
    async searchText(query: string, limit: number): Promise<ICaseFile[]> {
        return CaseFileModel.find(
            { $text: { $search: query }, isDeleted: { $ne: true } },
            { score: { $meta: "textScore" } }
        )
            .populate("case", "title caseNumber")
            .sort({ score: { $meta: "textScore" } })
            .limit(limit);
    }

    async create(data: {
        name: string;
        case: string;
        folder?: string | null;
        mimeType: string;
        size: number;
        storagePath: string;
        uploadedBy: string;
        extractedText?: string;
    }): Promise<ICaseFile> {
        return CaseFileModel.create(data);
    }

    async rename(id: string, name: string): Promise<ICaseFile | null> {
        return CaseFileModel.findByIdAndUpdate(id, { name }, { new: true });
    }

    async move(id: string, folderId: string | null): Promise<ICaseFile | null> {
        return CaseFileModel.findByIdAndUpdate(id, { folder: folderId }, { new: true });
    }

    async setStarred(id: string, starred: boolean): Promise<ICaseFile | null> {
        return CaseFileModel.findByIdAndUpdate(id, { starred }, { new: true });
    }

    async softDelete(id: string): Promise<ICaseFile | null> {
        return CaseFileModel.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    }

    async restore(id: string): Promise<ICaseFile | null> {
        return CaseFileModel.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null }, { new: true });
    }

    async bulkSoftDeleteByFolderIds(folderIds: string[]): Promise<void> {
        await CaseFileModel.updateMany({ folder: { $in: folderIds } }, { isDeleted: true, deletedAt: new Date() });
    }

    async bulkRestoreByFolderIds(folderIds: string[]): Promise<void> {
        await CaseFileModel.updateMany({ folder: { $in: folderIds } }, { isDeleted: false, deletedAt: null });
    }

    async hardDelete(id: string): Promise<boolean> {
        const result = await CaseFileModel.findByIdAndDelete(id);
        return Boolean(result);
    }

    async hardDeleteByFolderIds(folderIds: string[]): Promise<ICaseFile[]> {
        const files = await CaseFileModel.find({ folder: { $in: folderIds } });
        await CaseFileModel.deleteMany({ folder: { $in: folderIds } });
        return files;
    }
}
