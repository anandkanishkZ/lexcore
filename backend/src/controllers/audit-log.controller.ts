import { Request, Response } from "express";
import { AuditLogService } from "../services/audit-log.service";
import { ApiResponseHelper } from "../utils/apihelper.util";

const auditLogService = new AuditLogService();

export class AuditLogController {
    async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 20;
            const { data, total } = await auditLogService.getAll(page, size);
            return ApiResponseHelper.success(res, data, "Audit log fetched successfully", 200, {
                page,
                limit: size,
                total,
            });
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
