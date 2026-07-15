import { Request, Response } from "express";
import { CreateDocumentRequestDTO, FulfillDocumentRequestDTO } from "../dtos/document-request.dto";
import { DocumentRequestService } from "../services/document-request.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const documentRequestService = new DocumentRequestService();

export class DocumentRequestController {
    async create(req: Request, res: Response) {
        try {
            const parsed = CreateDocumentRequestDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const staffUserId = (req.user as IUser)._id.toString();
            const created = await documentRequestService.create(parsed.data, staffUserId);
            return ApiResponseHelper.success(res, created, "Document request created successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentRequestController");
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || undefined;
            const status = (req.query.status as string) || undefined;
            const data = await documentRequestService.getAll(caseId, status);
            return ApiResponseHelper.success(res, data, "Document requests fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentRequestController");
        }
    }

    async getMine(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            const data = await documentRequestService.getMine(user.email);
            return ApiResponseHelper.success(res, data, "My document requests fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentRequestController");
        }
    }

    async fulfill(req: Request, res: Response) {
        try {
            const parsed = FulfillDocumentRequestDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = req.user as IUser;
            const updated = await documentRequestService.fulfill(req.params.id as string, parsed.data, {
                role: user.role,
                email: user.email,
                userId: user._id.toString(),
            });
            return ApiResponseHelper.success(res, updated, "Document request fulfilled", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentRequestController");
        }
    }

    async cancel(req: Request, res: Response) {
        try {
            const staffUserId = (req.user as IUser)._id.toString();
            const updated = await documentRequestService.cancel(req.params.id as string, staffUserId);
            return ApiResponseHelper.success(res, updated, "Document request cancelled", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "DocumentRequestController");
        }
    }
}
