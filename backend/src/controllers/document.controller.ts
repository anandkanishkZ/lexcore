import { Request, Response } from "express";
import fs from "fs";
import { DocumentService } from "../services/document.service";
import { CreateFolderDTO, UpdateFileDTO, UpdateFolderDTO, CopyFileDTO, ShareFileDTO } from "../dtos/document.dto";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";
import { FileListFilters } from "../repositories/case-file.repository";
import { logAudit } from "../utils/audit-log.util";

const documentService = new DocumentService();

function requestingUser(req: Request) {
    const user = req.user as IUser;
    return { role: user.role, email: user.email, userId: user._id.toString() };
}

function userId(req: Request) {
    return (req.user as IUser)._id.toString();
}

export class DocumentController {
    async list(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || "";
            const folder = (req.query.folder as string) || undefined;
            if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);

            const filters: FileListFilters = {
                search: (req.query.search as string) || undefined,
                type: (req.query.type as string) || undefined,
                sortBy: (req.query.sortBy as FileListFilters["sortBy"]) || undefined,
                sortOrder: (req.query.sortOrder as FileListFilters["sortOrder"]) || undefined,
            };

            const data = await documentService.list(caseId, folder, requestingUser(req), filters);
            return ApiResponseHelper.success(res, data, "Documents fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async recent(req: Request, res: Response) {
        try {
            const files = await documentService.listRecent(requestingUser(req));
            return ApiResponseHelper.success(res, files, "Recent documents fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async starred(req: Request, res: Response) {
        try {
            const data = await documentService.listStarred(requestingUser(req));
            return ApiResponseHelper.success(res, data, "Starred documents fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async trash(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || "";
            if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);
            const data = await documentService.listTrash(caseId, requestingUser(req));
            return ApiResponseHelper.success(res, data, "Trash fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async moveTargets(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || "";
            if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);
            const exclude = (req.query.exclude as string) || undefined;
            const folders = await documentService.listMoveTargets(caseId, exclude, requestingUser(req));
            return ApiResponseHelper.success(res, folders, "Folders fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async createFolder(req: Request, res: Response) {
        try {
            const parsed = CreateFolderDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const folder = await documentService.createFolder(parsed.data, userId(req), requestingUser(req));
            return ApiResponseHelper.success(res, folder, "Folder created successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async upload(req: Request, res: Response) {
        try {
            if (!req.file) return ApiResponseHelper.error(res, "No file provided", 400);

            const caseId = (req.query.case as string) || "";
            const folder = (req.query.folder as string) || undefined;

            const created = await documentService.recordUpload(req.file, caseId, folder, userId(req));
            await logAudit({
                actorId: userId(req),
                action: "document.upload",
                entityType: "CaseFile",
                entityId: created._id.toString(),
                metadata: created.name,
            });
            return ApiResponseHelper.success(res, created, "File uploaded successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async download(req: Request, res: Response) {
        try {
            const file = await documentService.getFileForDownload(String(req.params.id), requestingUser(req));
            await logAudit({
                actorId: userId(req),
                action: "document.download",
                entityType: "CaseFile",
                entityId: file._id.toString(),
                metadata: file.name,
            });
            res.setHeader("Content-Type", file.mimeType);
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
            fs.createReadStream(file.storagePath).pipe(res);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    // --- Sharing ---------------------------------------------------------------

    async shareFile(req: Request, res: Response) {
        try {
            const parsed = ShareFileDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const share = await documentService.shareFile(
                String(req.params.id),
                parsed.data.email,
                parsed.data.role,
                userId(req),
                requestingUser(req)
            );
            await logAudit({
                actorId: userId(req),
                action: "document.share",
                entityType: "CaseFile",
                entityId: String(req.params.id),
                metadata: `${parsed.data.email} (${parsed.data.role})`,
            });
            return ApiResponseHelper.success(res, share, "File shared successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async listShares(req: Request, res: Response) {
        try {
            const shares = await documentService.listShares(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, shares, "Shares fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async revokeShare(req: Request, res: Response) {
        try {
            await documentService.revokeShare(String(req.params.id), String(req.params.shareId), requestingUser(req));
            await logAudit({
                actorId: userId(req),
                action: "document.revoke-share",
                entityType: "CaseFile",
                entityId: String(req.params.id),
                metadata: String(req.params.shareId),
            });
            return ApiResponseHelper.success(res, null, "Share revoked", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    // --- Versioning --------------------------------------------------------------

    async uploadVersion(req: Request, res: Response) {
        try {
            if (!req.file) return ApiResponseHelper.error(res, "No file provided", 400);
            const updated = await documentService.recordNewVersion(
                req.file,
                String(req.params.id),
                userId(req),
                requestingUser(req)
            );
            await logAudit({
                actorId: userId(req),
                action: "document.upload-version",
                entityType: "CaseFile",
                entityId: String(req.params.id),
                metadata: updated.name,
            });
            return ApiResponseHelper.success(res, updated, "New version uploaded successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async listVersions(req: Request, res: Response) {
        try {
            const versions = await documentService.listVersions(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, versions, "Versions fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async downloadVersion(req: Request, res: Response) {
        try {
            const version = await documentService.getVersionForDownload(
                String(req.params.id),
                String(req.params.versionId),
                requestingUser(req)
            );
            res.setHeader("Content-Type", version.mimeType);
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(version.name)}"`);
            fs.createReadStream(version.storagePath).pipe(res);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async copyFile(req: Request, res: Response) {
        try {
            const parsed = CopyFileDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const copy = await documentService.copyFile(String(req.params.id), parsed.data.folder, userId(req), requestingUser(req));
            return ApiResponseHelper.success(res, copy, "File copied successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async updateFile(req: Request, res: Response) {
        try {
            const parsed = UpdateFileDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const updated = await documentService.updateFile(String(req.params.id), parsed.data, requestingUser(req));
            return ApiResponseHelper.success(res, updated, "File updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async updateFolder(req: Request, res: Response) {
        try {
            const parsed = UpdateFolderDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const updated = await documentService.updateFolder(String(req.params.id), parsed.data, requestingUser(req));
            return ApiResponseHelper.success(res, updated, "Folder updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async restoreFile(req: Request, res: Response) {
        try {
            const restored = await documentService.restoreFile(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, restored, "File restored successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async restoreFolder(req: Request, res: Response) {
        try {
            const restored = await documentService.restoreFolder(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, restored, "Folder restored successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async trashFile(req: Request, res: Response) {
        try {
            await documentService.trashFile(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, null, "File moved to trash", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async trashFolder(req: Request, res: Response) {
        try {
            await documentService.trashFolder(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, null, "Folder moved to trash", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async permanentlyDeleteFile(req: Request, res: Response) {
        try {
            await documentService.permanentlyDeleteFile(String(req.params.id), requestingUser(req));
            await logAudit({
                actorId: userId(req),
                action: "document.permanent-delete",
                entityType: "CaseFile",
                entityId: String(req.params.id),
            });
            return ApiResponseHelper.success(res, null, "File permanently deleted", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }

    async permanentlyDeleteFolder(req: Request, res: Response) {
        try {
            await documentService.permanentlyDeleteFolder(String(req.params.id), requestingUser(req));
            await logAudit({
                actorId: userId(req),
                action: "document.permanent-delete-folder",
                entityType: "CaseFolder",
                entityId: String(req.params.id),
            });
            return ApiResponseHelper.success(res, null, "Folder permanently deleted", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentController");
        }
    }
}
