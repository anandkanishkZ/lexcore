import fs from "fs";
import { CaseFolderMongoRepository } from "../repositories/case-folder.repository";
import { CaseFileMongoRepository } from "../repositories/case-file.repository";
import { CaseService } from "./case.service";
import { HttpException } from "../exceptions/http-exception";
import { ICaseFolder } from "../models/case-folder.model";
import { ICaseFile } from "../models/case-file.model";
import { CreateFolderDTO } from "../dtos/document.dto";

type RequestingUser = { role: string; email: string };

const folderRepository = new CaseFolderMongoRepository();
const fileRepository = new CaseFileMongoRepository();
const caseService = new CaseService();

export class DocumentService {
    async list(
        caseId: string,
        folderId: string | undefined,
        requestingUser: RequestingUser
    ): Promise<{ folder: ICaseFolder | null; folders: ICaseFolder[]; files: ICaseFile[] }> {
        await caseService.assertAccess(caseId, requestingUser);
        const [folder, folders, files] = await Promise.all([
            folderId ? folderRepository.getById(folderId) : Promise.resolve(null),
            folderRepository.listByCase(caseId, folderId ?? null),
            fileRepository.listByCase(caseId, folderId ?? null),
        ]);
        return { folder, folders, files };
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
        return fileRepository.create({
            name: file.originalname,
            case: caseId,
            folder: folderId ?? null,
            mimeType: file.mimetype,
            size: file.size,
            storagePath: file.path,
            uploadedBy: userId,
        });
    }

    async getFileForDownload(id: string, requestingUser: RequestingUser): Promise<ICaseFile> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);
        return file;
    }

    async deleteFile(id: string, requestingUser: RequestingUser): Promise<void> {
        const file = await fileRepository.getById(id);
        if (!file) throw new HttpException(404, "File not found");
        await caseService.assertAccess(file.case.toString(), requestingUser);

        await fileRepository.delete(id);
        fs.unlink(file.storagePath, () => {
            // Best-effort: the DB record is the source of truth for listings,
            // so a lingering orphaned file on disk isn't worth failing the
            // request over.
        });
    }

    async deleteFolder(id: string, requestingUser: RequestingUser): Promise<void> {
        const folder = await folderRepository.getById(id);
        if (!folder) throw new HttpException(404, "Folder not found");
        await caseService.assertAccess(folder.case.toString(), requestingUser);

        const hasChildren = await folderRepository.hasChildren(id);
        if (hasChildren) throw new HttpException(400, "Folder is not empty");

        await folderRepository.delete(id);
    }
}
