import { Request, Response } from "express";
import { CreateCaseDTO, UpdateCaseDTO } from "../dtos/case.dto";
import { CaseService } from "../services/case.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";

const caseService = new CaseService();

export class CaseController {
    async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const search = (req.query.search as string) || undefined;
            const status = (req.query.status as string) || undefined;
            const client = (req.query.client as string) || undefined;

            const { data, total } = await caseService.getAll({ page, size, search, status, client });

            return ApiResponseHelper.success(res, data, "Cases fetched successfully", 200, {
                page,
                limit: size,
                total,
            });
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            const found = await caseService.getById(req.params.id, { role: user.role, email: user.email });
            return ApiResponseHelper.success(res, found, "Case fetched successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async create(req: Request, res: Response) {
        try {
            const parsed = CreateCaseDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const created = await caseService.create(parsed.data, userId);
            return ApiResponseHelper.success(res, created, "Case created successfully", 201);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateCaseDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = req.user as IUser;
            const updated = await caseService.update(req.params.id, parsed.data, {
                role: user.role,
                userId: user._id.toString(),
            });
            return ApiResponseHelper.success(res, updated, "Case updated successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const actorId = (req.user as IUser)._id.toString();
            await caseService.delete(req.params.id, actorId);
            return ApiResponseHelper.success(res, null, "Case deleted successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async getMine(req: Request, res: Response) {
        try {
            const email = (req.user as IUser).email;
            const data = await caseService.getMine(email);
            return ApiResponseHelper.success(res, data, "My cases fetched successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
