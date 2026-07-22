import fs from "fs";
import path from "path";
import { CaseFolderMongoRepository } from "../repositories/case-folder.repository";
import { CaseFileMongoRepository, FileListFilters } from "../repositories/case-file.repository";
import { FileShareMongoRepository } from "../repositories/file-share.repository";
import { FileVersionMongoRepository } from "../repositories/file-version.repository";
import { CaseMongoRepository } from "../repositories/case.repository";
import { CaseService } from "./case.service";
import { HttpException } from "../exceptions/http-exception";
import { ICaseFolder } from "../models/case-folder.model";
import { ICaseFile } from "../models/case-file.model";
import { IFileShare } from "../models/file-share.model";
import { IFileVersion } from "../models/file-version.model";
import { CreateFolderDTO } from "../dtos/document.dto";
import { extractTextSafely, ocrPdfText, ocrImageText } from "../utils/text-extraction.util";
import { UserMongoRepository } from "../repositories/user.repository";
import { NotificationService } from "./notification.service";
import { sendMail } from "../utils/mail.util";
import { assertUploadIsSafe } from "../utils/malware-scan.util";

type RequestingUser = { role: string; email: string; userId: string };

const folderRepository = new CaseFolderMongoRepository();
const fileRepository = new CaseFileMongoRepository();
const fileShareRepository = new FileShareMongoRepository();
const fileVersionRepository = new FileVersionMongoRepository();
const caseRepository = new CaseMongoRepository();
const caseService = new CaseService();
const userRepository = new UserMongoRepository();
const notificationService = new NotificationService();

const RECENT_LIMIT = 50;

/** Mirrors the multer filename generator in case-file-upload.middleware.ts
 * (not exported from there, since it's wired into multer's own callback
 * shape) — copyFile needs to mint a new on-disk name the same way. */
function generateStorageFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

/** PDFs need their pages rasterized before Tesseract can read them; images
 * are OCR'd directly. Picks the extractor extractTextSafely's needsOcr
 * signal implies for this file's mimetype. */
function ocrTextFor(filePath: string, mimeType: string): Promise<string | undefined> {
    return mimeType === "application/pdf" ? ocrPdfText(filePath) : ocrImageText(filePath);
}

export class DocumentService {
    async list(
        caseId: string,
        folderId: string | undefined,
        requestingUser: RequestingUser,
        filters: FileListFilters = {}
    ): Promise<{
        folder: ICaseFolder | null;
        breadcrumb: { _id: string; name: string }[];
        folders: ICaseFolder[];
        files: ICaseFile[];
    }> {
        await caseService.assertAccess(caseId, requestingUser);
        const [folder, breadcrumb, folders, files] = await Promise.all([
            folderId ? folderRepository.getById(folderId) : Promise.resolve(null),
            folderId ? folderRepository.getAncestorTrail(folderId) : Promise.resolve([]),
            folderRepository.listByCase(caseId, folderId ?? null),
            fileRepository.listByCase(caseId, folderId ?? null, filters),
        ]);
        // getById above trusts the raw folder id alone — without this check a
        // caller with access to caseId could pass a folder belonging to a
        // different case and read its name/breadcrumb via the response.
        if (folderId && (!folder || folder.case.toString() !== caseId)) {
            throw new HttpException(404, "Folder not found");
        }
        return { folder, breadcrumb, folders, files };
    }

    async createFolder(data: CreateFolderDTO, userId: string, requestingUser: RequestingUser): Promise<ICaseFolder> {
        await caseService.assertAccess(data.case, requestingUser);
        return folderRepository.create({
            name: data.name,
            case: data.case,
            parent: data.parent ?? null,
            createdBy: userId,
        });
    }

    async recordUpload(
        file: Express.Multer.File,
        caseId: string,
        folderId: string | undefined,
        userId: string
    ): Promise<ICaseFile> {
        // Ownership is already enforced by requireCaseQueryAccess before multer
        // ever touches disk (see document.route.ts) — no re-check needed here.
        // multer's fileFilter can't see the size (streaming hasn't started
        // yet), so a 0-byte file is only catchable here, after the write.
        if (file.size === 0) {
            fs.unlink(file.path, () => {});
            throw new HttpException(400, "That file is empty");
        }

        try {
            await assertUploadIsSafe(file.path);
        } catch (error: any) {
            fs.unlink(file.path, () => {});
            throw new HttpException(400, error.message || "This file failed a security check and cannot be uploaded.");
        }

        const extraction = await extractTextSafely(file.path, file.mimetype);
        const created = await fileRepository.create({
            name: file.originalname,
            case: caseId,
            folder: folderId ?? null,
            mimeType: file.mimetype,
            size: file.size,
            storagePath: file.path,
            uploadedBy: userId,
            extractedText: extraction.text,
        });

        if (extraction.needsOcr) {
            // Fire-and-forget: OCR runs several seconds per page/image, far
            // longer than an upload request should hang (e.g. the mobile
            // app's 20s timeout) — the response above has already gone out
            // by the time this resolves. Backfills extractedText in place
            // once done.
            ocrTextFor(file.path, file.mimetype)
                .then((text) => (text ? fileRepository.updateExtractedText(created._id.toString(), text) : undefined))
                .catch((error) => console.error(`[ocr:error] file ${created._id}:`, error));
        }

        return created;
    }

    async getFileForDownload(id: string, requestingUser: RequestingUser): Promise<ICaseFile> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await this.assertFileAccess(file, requestingUser);
        return file;
    }

    // --- Sharing (Module 5 DMS collaboration) --------------------------------
    // Only someone with base case access (admin or the case's own client) can
    // manage a file's shares — a share recipient (viewer or editor) cannot
    // re-share further. Keeps the share surface from growing chains.

    async shareFile(
        fileId: string,
        email: string,
        role: "viewer" | "editor",
        userId: string,
        requestingUser: RequestingUser
    ): Promise<IFileShare> {
        const file = await fileRepository.getById(fileId);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);

        // A share granted to an email with no Lexcore account is a dead end
        // — there's no guest-access route, so redeeming a share requires
        // signing in as an existing account with a matching email. Reject
        // up front with an actionable message instead of silently emailing
        // a promise of access the recipient has no way to claim.
        const recipient = await userRepository.getUserByEmail(email);
        if (!recipient) {
            throw new HttpException(
                400,
                "This person doesn't have a Lexcore account yet — they'll need to register before you can share a file with them."
            );
        }

        const share = await fileShareRepository.upsert(fileId, email, role, userId);

        const subject = `You've been given ${role} access to "${file.name}"`;
        const body = `You can now ${role === "editor" ? "view and upload new versions of" : "view"} "${file.name}" in Lexcore.`;
        await notificationService.notifyUser(recipient._id.toString(), "File shared with you", subject, {
            type: "CaseFile",
            id: fileId,
        });
        await sendMail(email, subject, body);

        return share;
    }

    async listShares(fileId: string, requestingUser: RequestingUser): Promise<IFileShare[]> {
        const file = await fileRepository.getById(fileId);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);
        return fileShareRepository.listByFile(fileId);
    }

    async revokeShare(fileId: string, shareId: string, requestingUser: RequestingUser): Promise<void> {
        const file = await fileRepository.getById(fileId);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);

        const share = await fileShareRepository.getById(shareId);
        if (!share || share.file.toString() !== fileId) throw new HttpException(404, "Share not found");
        await fileShareRepository.remove(shareId);
    }

    // --- Versioning (Module 5 DMS collaboration) -----------------------------
    // CaseFile always holds the current version; every other read path in
    // this service (list, download, search, AI summarize) keeps working
    // unchanged. FileVersion is purely the append-only history alongside it.

    async recordNewVersion(
        file: Express.Multer.File,
        fileId: string,
        userId: string,
        requestingUser: RequestingUser
    ): Promise<ICaseFile> {
        const existing = await fileRepository.getById(fileId);
        if (!existing) throw new HttpException(404, "File not found");
        await this.assertCanEditFile(existing, requestingUser);

        if (file.size === 0) {
            fs.unlink(file.path, () => {});
            throw new HttpException(400, "That file is empty");
        }

        try {
            await assertUploadIsSafe(file.path);
        } catch (error: any) {
            fs.unlink(file.path, () => {});
            throw new HttpException(400, error.message || "This file failed a security check and cannot be uploaded.");
        }

        const nextVersionNumber = (await fileVersionRepository.countByFile(fileId)) + 1;
        // Snapshot the state being replaced, then extract fresh text for the
        // new upload the same way a first-time upload does.
        await fileVersionRepository.create({
            file: fileId,
            versionNumber: nextVersionNumber,
            name: existing.name,
            mimeType: existing.mimeType,
            size: existing.size,
            storagePath: existing.storagePath,
            uploadedBy: userId,
        });

        const extraction = await extractTextSafely(file.path, file.mimetype);
        const updated = await fileRepository.replaceContent(fileId, {
            mimeType: file.mimetype,
            size: file.size,
            storagePath: file.path,
            extractedText: extraction.text,
        });
        if (!updated) throw new HttpException(500, "Failed to record new version");

        if (extraction.needsOcr) {
            ocrTextFor(file.path, file.mimetype)
                .then((text) => (text ? fileRepository.updateExtractedText(fileId, text) : undefined))
                .catch((error) => console.error(`[ocr:error] file ${fileId}:`, error));
        }

        return updated;
    }

    async listVersions(fileId: string, requestingUser: RequestingUser): Promise<IFileVersion[]> {
        const file = await fileRepository.getById(fileId);
        if (!file) throw new HttpException(404, "File not found");
        await this.assertFileAccess(file, requestingUser);
        return fileVersionRepository.listByFile(fileId);
    }

    async getVersionForDownload(
        fileId: string,
        versionId: string,
        requestingUser: RequestingUser
    ): Promise<IFileVersion> {
        const file = await fileRepository.getById(fileId);
        if (!file) throw new HttpException(404, "File not found");
        await this.assertFileAccess(file, requestingUser);

        const version = await fileVersionRepository.getById(versionId);
        if (!version || version.file.toString() !== fileId) throw new HttpException(404, "Version not found");
        return version;
    }

    // --- Access helpers -------------------------------------------------------

    /** View access: base case access (admin/case's client), OR any active
     * share (viewer or editor) for this specific file. */
    private async assertFileAccess(file: ICaseFile, requestingUser: RequestingUser): Promise<void> {
        try {
            await caseService.assertAccess(file.case.toString(), requestingUser);
        } catch (error) {
            const share = await fileShareRepository.findByFileAndEmail(file._id.toString(), requestingUser.email);
            if (!share) throw error;
        }
    }

    /** Edit access (new versions): base case access, OR an editor-role share
     * for this specific file — a viewer share cannot upload new versions. */
    private async assertCanEditFile(file: ICaseFile, requestingUser: RequestingUser): Promise<void> {
        try {
            await caseService.assertAccess(file.case.toString(), requestingUser);
        } catch (error) {
            const share = await fileShareRepository.findByFileAndEmail(file._id.toString(), requestingUser.email);
            if (!share || share.role !== "editor") throw error;
        }
    }

    // --- Rename / move / star (one partial-update method per entity type,
    // matching the PATCH endpoints' "any subset of fields" semantics) -------

    async updateFile(
        id: string,
        data: { name?: string; folder?: string | null; starred?: boolean },
        requestingUser: RequestingUser
    ): Promise<ICaseFile> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);

        if (data.folder !== undefined && data.folder !== null) {
            await this.assertValidDestination(data.folder, file.case.toString());
        }

        let updated: ICaseFile = file;
        if (data.name !== undefined) updated = (await fileRepository.rename(id, data.name)) ?? updated;
        if (data.folder !== undefined) updated = (await fileRepository.move(id, data.folder)) ?? updated;
        if (data.starred !== undefined) updated = (await fileRepository.setStarred(id, data.starred)) ?? updated;
        return updated;
    }

    async updateFolder(
        id: string,
        data: { name?: string; parent?: string | null; starred?: boolean },
        requestingUser: RequestingUser
    ): Promise<ICaseFolder> {
        const folder = await folderRepository.getById(id);
        if (!folder) throw new HttpException(404, "Folder not found");
        await caseService.assertAccess(folder.case.toString(), requestingUser);

        if (data.parent !== undefined && data.parent !== null) {
            if (data.parent === id) throw new HttpException(400, "Cannot move a folder into itself");
            await this.assertValidDestination(data.parent, folder.case.toString());
            const descendantIds = await folderRepository.getDescendantFolderIds(id);
            if (descendantIds.includes(data.parent)) {
                throw new HttpException(400, "Cannot move a folder into its own subfolder");
            }
        }

        let updated: ICaseFolder = folder;
        if (data.name !== undefined) updated = (await folderRepository.rename(id, data.name)) ?? updated;
        if (data.parent !== undefined) updated = (await folderRepository.move(id, data.parent)) ?? updated;
        if (data.starred !== undefined) updated = (await folderRepository.setStarred(id, data.starred)) ?? updated;
        return updated;
    }

    private async assertValidDestination(folderId: string, expectedCaseId: string): Promise<void> {
        const target = await folderRepository.getById(folderId);
        if (!target || target.case.toString() !== expectedCaseId || target.isDeleted) {
            throw new HttpException(400, "Invalid destination folder");
        }
    }

    // --- Copy (files only — folder copy is a separate, deferred feature) ---

    async copyFile(id: string, targetFolderId: string | null | undefined, userId: string, requestingUser: RequestingUser): Promise<ICaseFile> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);

        const destinationFolder = targetFolderId !== undefined ? targetFolderId : file.folder?.toString() ?? null;
        if (destinationFolder) {
            await this.assertValidDestination(destinationFolder, file.case.toString());
        }

        const newFilename = generateStorageFilename(file.name);
        const newPath = path.join(path.dirname(file.storagePath), newFilename);
        await fs.promises.copyFile(file.storagePath, newPath);

        return fileRepository.create({
            name: `${file.name} (copy)`,
            case: file.case.toString(),
            folder: destinationFolder,
            mimeType: file.mimeType,
            size: file.size,
            storagePath: newPath,
            uploadedBy: userId,
        });
    }

    // --- Trash / restore (cascading for folders) ----------------------------

    async trashFile(id: string, requestingUser: RequestingUser): Promise<void> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);
        await fileRepository.softDelete(id);
    }

    async trashFolder(id: string, requestingUser: RequestingUser): Promise<void> {
        const folder = await folderRepository.getById(id);
        if (!folder) throw new HttpException(404, "Folder not found");
        await caseService.assertAccess(folder.case.toString(), requestingUser);

        const folderIds = await folderRepository.getDescendantFolderIds(id);
        await Promise.all([folderRepository.bulkSoftDelete(folderIds), fileRepository.bulkSoftDeleteByFolderIds(folderIds)]);
    }

    async restoreFile(id: string, requestingUser: RequestingUser): Promise<ICaseFile> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);

        // If the file's parent folder (or any ancestor of it) is also
        // trashed, restoring only the file would leave it unreachable through
        // normal navigation — so restore the chain too, matching how Drive
        // actually behaves.
        if (file.folder) {
            const ancestorIds = await folderRepository.getAncestorChain(file.folder.toString());
            await folderRepository.bulkRestore([file.folder.toString(), ...ancestorIds]);
        }

        const updated = await fileRepository.restore(id);
        if (!updated) throw new HttpException(500, "Failed to restore file");
        return updated;
    }

    async restoreFolder(id: string, requestingUser: RequestingUser): Promise<ICaseFolder> {
        const folder = await folderRepository.getById(id);
        if (!folder) throw new HttpException(404, "Folder not found");
        await caseService.assertAccess(folder.case.toString(), requestingUser);

        const [descendantIds, ancestorIds] = await Promise.all([
            folderRepository.getDescendantFolderIds(id),
            folder.parent ? folderRepository.getAncestorChain(id) : Promise.resolve([]),
        ]);
        const allFolderIds = [...new Set([...descendantIds, ...ancestorIds])];

        await Promise.all([folderRepository.bulkRestore(allFolderIds), fileRepository.bulkRestoreByFolderIds(descendantIds)]);

        const updated = await folderRepository.getById(id);
        if (!updated) throw new HttpException(500, "Failed to restore folder");
        return updated;
    }

    async listTrash(caseId: string, requestingUser: RequestingUser): Promise<{ folders: ICaseFolder[]; files: ICaseFile[] }> {
        await caseService.assertAccess(caseId, requestingUser);
        const [folders, files] = await Promise.all([
            folderRepository.listTrashedByCase(caseId),
            fileRepository.listTrashedByCase(caseId),
        ]);
        return { folders, files };
    }

    async permanentlyDeleteFile(id: string, requestingUser: RequestingUser): Promise<void> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);

        // Read every prior version's storagePath before the FileVersion rows
        // are removed below — each version has its own physical blob
        // (recordNewVersion never overwrites one in place), so deleting only
        // the DB rows would leak every superseded version's file on disk.
        const versions = await fileVersionRepository.listByFile(id);

        await fileRepository.hardDelete(id);
        await Promise.all([fileShareRepository.removeAllForFile(id), fileVersionRepository.removeAllForFile(id)]);

        for (const version of versions) {
            fs.unlink(version.storagePath, () => {
                // Best-effort — see the identical comment pattern this mirrors below.
            });
        }
        fs.unlink(file.storagePath, () => {
            // Best-effort — see the identical comment pattern this mirrors below.
        });
    }

    async permanentlyDeleteFolder(id: string, requestingUser: RequestingUser): Promise<void> {
        const folder = await folderRepository.getById(id);
        if (!folder) throw new HttpException(404, "Folder not found");
        await caseService.assertAccess(folder.case.toString(), requestingUser);

        const folderIds = await folderRepository.getDescendantFolderIds(id);
        const filesInFolders = await fileRepository.listByFolderIds(folderIds);
        const fileIds = filesInFolders.map((f) => f._id.toString());
        // Same reasoning as permanentlyDeleteFile above — without this, every
        // file inside a permanently-deleted folder leaves its FileShare and
        // FileVersion rows (and every version's on-disk blob) orphaned,
        // since only the single-file delete path used to clean these up.
        const allVersions = (await Promise.all(fileIds.map((fileId) => fileVersionRepository.listByFile(fileId)))).flat();

        const deletedFiles = await fileRepository.hardDeleteByFolderIds(folderIds);
        await folderRepository.hardDeleteMany(folderIds);
        await Promise.all([
            ...fileIds.map((fileId) => fileShareRepository.removeAllForFile(fileId)),
            ...fileIds.map((fileId) => fileVersionRepository.removeAllForFile(fileId)),
        ]);

        for (const version of allVersions) {
            fs.unlink(version.storagePath, () => {
                // Best-effort: the DB records are already gone, so a lingering
                // orphaned blob on disk isn't worth failing the request over.
            });
        }
        for (const deletedFile of deletedFiles) {
            fs.unlink(deletedFile.storagePath, () => {
                // Best-effort: the DB records are already gone, so a lingering
                // orphaned blob on disk isn't worth failing the request over.
            });
        }
    }

    // --- Cross-case views -----------------------------------------------------

    /** Every document across every case belonging to one client — the
     * "Documents" tab on a staff-facing client detail page. Staff-only
     * (enforced at the route), so no ownership check is needed here. */
    async listForClient(clientId: string): Promise<ICaseFile[]> {
        const caseIds = await caseRepository.getIdsForClient(clientId);
        if (caseIds.length === 0) return [];
        return fileRepository.listRecentForCases(caseIds, 500);
    }

    async listRecent(requestingUser: RequestingUser): Promise<ICaseFile[]> {
        if (requestingUser.role === "admin") {
            return fileRepository.listRecentAcrossAllCases(RECENT_LIMIT);
        }
        const cases = await caseService.getMine(requestingUser.email);
        const caseIds = cases.map((c) => c._id.toString());
        return fileRepository.listRecentForCases(caseIds, RECENT_LIMIT);
    }

    async listStarred(requestingUser: RequestingUser): Promise<{ files: ICaseFile[]; folders: ICaseFolder[] }> {
        if (requestingUser.role === "admin") {
            const [files, folders] = await Promise.all([
                fileRepository.listStarredAcrossAllCases(),
                folderRepository.listStarredAcrossAllCases(),
            ]);
            return { files, folders };
        }
        const cases = await caseService.getMine(requestingUser.email);
        const caseIds = cases.map((c) => c._id.toString());
        const [files, folders] = await Promise.all([
            fileRepository.listStarredForCases(caseIds),
            folderRepository.listStarredForCases(caseIds),
        ]);
        return { files, folders };
    }

    async listMoveTargets(caseId: string, excludeFolderId: string | undefined, requestingUser: RequestingUser): Promise<ICaseFolder[]> {
        await caseService.assertAccess(caseId, requestingUser);
        const all = await folderRepository.getAllByCase(caseId);
        if (!excludeFolderId) return all;

        const excludedIds = new Set(await folderRepository.getDescendantFolderIds(excludeFolderId));
        return all.filter((f) => !excludedIds.has(f._id.toString()));
    }
}
