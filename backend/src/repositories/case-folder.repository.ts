import { CaseFolderModel, ICaseFolder } from "../models/case-folder.model";

export class CaseFolderMongoRepository {
    async listByCase(caseId: string, parent?: string | null): Promise<ICaseFolder[]> {
        return CaseFolderModel.find({ case: caseId, parent: parent ?? null, isDeleted: { $ne: true } }).sort({
            name: 1,
        });
    }

    async listTrashedByCase(caseId: string): Promise<ICaseFolder[]> {
        return CaseFolderModel.find({ case: caseId, isDeleted: true }).sort({ deletedAt: -1 });
    }

    /** Full flat, non-trashed folder list for a case — feeds the move-to picker
     * (the service layer excludes the moving folder's own subtree). */
    async getAllByCase(caseId: string): Promise<ICaseFolder[]> {
        return CaseFolderModel.find({ case: caseId, isDeleted: { $ne: true } }).sort({ name: 1 });
    }

    async listStarredForCases(caseIds: string[]): Promise<ICaseFolder[]> {
        return CaseFolderModel.find({ case: { $in: caseIds }, starred: true, isDeleted: { $ne: true } })
            .populate("case", "title caseNumber")
            .sort({ name: 1 });
    }

    async listStarredAcrossAllCases(): Promise<ICaseFolder[]> {
        return CaseFolderModel.find({ starred: true, isDeleted: { $ne: true } })
            .populate("case", "title caseNumber")
            .sort({ name: 1 });
    }

    async getById(id: string): Promise<ICaseFolder | null> {
        return CaseFolderModel.findById(id);
    }

    async create(data: { name: string; case: string; parent?: string | null; createdBy: string }): Promise<ICaseFolder> {
        return CaseFolderModel.create(data);
    }

    async rename(id: string, name: string): Promise<ICaseFolder | null> {
        return CaseFolderModel.findByIdAndUpdate(id, { name }, { new: true });
    }

    async move(id: string, parentId: string | null): Promise<ICaseFolder | null> {
        return CaseFolderModel.findByIdAndUpdate(id, { parent: parentId }, { new: true });
    }

    async setStarred(id: string, starred: boolean): Promise<ICaseFolder | null> {
        return CaseFolderModel.findByIdAndUpdate(id, { starred }, { new: true });
    }

    /** BFS down the `parent` chain. Includes `folderId` itself, so callers can
     * pass the result straight to a bulk update covering "this folder and
     * everything inside it" without a separate self-update. */
    async getDescendantFolderIds(folderId: string): Promise<string[]> {
        const result: string[] = [folderId];
        let currentLevel = [folderId];

        while (currentLevel.length > 0) {
            const children = await CaseFolderModel.find({ parent: { $in: currentLevel } }, { _id: 1 });
            const childIds = children.map((c) => c._id.toString());
            if (childIds.length === 0) break;
            result.push(...childIds);
            currentLevel = childIds;
        }

        return result;
    }

    /** Walk up from `folderId`'s parent to the root. Does not include
     * `folderId` itself — used to restore any trashed ancestor of something
     * being restored, so it's actually reachable again afterwards. */
    async getAncestorChain(folderId: string): Promise<string[]> {
        const chain: string[] = [];
        let current = await CaseFolderModel.findById(folderId, { parent: 1 });

        while (current?.parent) {
            chain.push(current.parent.toString());
            current = await CaseFolderModel.findById(current.parent, { parent: 1 });
        }

        return chain;
    }

    /** Root→current ancestor names (excluding `folderId` itself) — feeds the
     * breadcrumb. Same upward walk as getAncestorChain, but collecting id+name
     * and returned in root-first order. */
    async getAncestorTrail(folderId: string): Promise<{ _id: string; name: string }[]> {
        const trail: { _id: string; name: string }[] = [];
        let current = await CaseFolderModel.findById(folderId, { parent: 1 });

        while (current?.parent) {
            const parent = await CaseFolderModel.findById(current.parent, { parent: 1, name: 1 });
            if (!parent) break;
            trail.push({ _id: parent._id.toString(), name: parent.name });
            current = parent;
        }

        return trail.reverse();
    }

    async bulkSoftDelete(folderIds: string[]): Promise<void> {
        await CaseFolderModel.updateMany({ _id: { $in: folderIds } }, { isDeleted: true, deletedAt: new Date() });
    }

    async bulkRestore(folderIds: string[]): Promise<void> {
        await CaseFolderModel.updateMany({ _id: { $in: folderIds } }, { isDeleted: false, deletedAt: null });
    }

    async hardDelete(id: string): Promise<boolean> {
        const result = await CaseFolderModel.findByIdAndDelete(id);
        return Boolean(result);
    }

    async hardDeleteMany(folderIds: string[]): Promise<void> {
        await CaseFolderModel.deleteMany({ _id: { $in: folderIds } });
    }
}
