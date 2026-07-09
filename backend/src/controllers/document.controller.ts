import { Request, Response } from "express";
import fs from "fs";
import { DocumentService } from "../services/document.service";
import { CreateFolderDTO } from "../dtos/document.dto";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";

const documentService = new DocumentService();

function requestingUser(req: Request) {
    const user = req.user as IUser;
    return { role: user.role, email: user.email };
}

export class DocumentController {
    async list(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || "";
            const folder = (req.query.folder as string) || undefined;
            if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);

            const data = await documentService.list(caseId, folder, requestingUser(req));
            return ApiResponseHelper.success(res, data, "Documents fetched successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async createFolder(req: Request, res: Response) {
        try {
            const parsed = CreateFolderDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const folder = await documentService.createFolder(parsed.data, userId, requestingUser(req));
            return ApiResponseHelper.success(res, folder, "Folder created successfully", 201);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async upload(req: Request, res: Response) {
        try {
            if (!req.file) return ApiResponseHelper.error(res, "No file provided", 400);

            const caseId = (req.query.case as string) || "";
            const folder = (req.query.folder as string) || undefined;
            const userId = (req.user as IUser)._id.toString();

            const created = await documentService.recordUpload(req.file, caseId, folder, userId);
            return ApiResponseHelper.success(res, created, "File uploaded successfully", 201);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async download(req: Request, res: Response) {
        try {
            const file = await documentService.getFileForDownload(String(req.params.id), requestingUser(req));
            res.setHeader("Content-Type", file.mimeType);
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
            fs.createReadStream(file.storagePath).pipe(res);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async deleteFile(req: Request, res: Response) {
        try {
            await documentService.deleteFile(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, null, "File deleted successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async deleteFolder(req: Request, res: Response) {
        try {
            await documentService.deleteFolder(String(req.params.id), requestingUser(req));
            return ApiResponseHelper.success(res, null, "Folder deleted successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
