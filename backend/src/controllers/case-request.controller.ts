import { Request, Response } from "express";
import { CreateCaseRequestDTO, ApproveCaseRequestDTO, RejectCaseRequestDTO } from "../dtos/case-request.dto";
import { CaseRequestService } from "../services/case-request.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const caseRequestService = new CaseRequestService();

export class CaseRequestController {
    async create(req: Request, res: Response) {
        try {
            const parsed = CreateCaseRequestDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const created = await caseRequestService.create(parsed.data, userId);
            return ApiResponseHelper.success(res, created, "Request submitted successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "CaseRequestController");
        }
    }

    async getMine(req: Request, res: Response) {
        try {
            const userId = (req.user as IUser)._id.toString();
            const data = await caseRequestService.getMine(userId);
            return ApiResponseHelper.success(res, data, "My case requests fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CaseRequestController");
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const status = (req.query.status as string) || undefined;
            const data = await caseRequestService.getAll(status);
            return ApiResponseHelper.success(res, data, "Case requests fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CaseRequestController");
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const found = await caseRequestService.getById(req.params.id as string);
            return ApiResponseHelper.success(res, found, "Case request fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CaseRequestController");
        }
    }

    async approve(req: Request, res: Response) {
        try {
            const parsed = ApproveCaseRequestDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const staffUserId = (req.user as IUser)._id.toString();
            const updated = await caseRequestService.approve(req.params.id as string, staffUserId, parsed.data);
            return ApiResponseHelper.success(res, updated, "Case request approved", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CaseRequestController");
        }
    }

    async reject(req: Request, res: Response) {
        try {
            const parsed = RejectCaseRequestDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const staffUserId = (req.user as IUser)._id.toString();
            const updated = await caseRequestService.reject(req.params.id as string, staffUserId, parsed.data);
            return ApiResponseHelper.success(res, updated, "Case request rejected", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CaseRequestController");
        }
    }
}
