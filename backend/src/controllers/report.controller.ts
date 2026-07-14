import { Request, Response } from "express";
import { z } from "zod";
import { ReportService } from "../services/report.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const reportService = new ReportService();
const MonthsQuerySchema = z.coerce.number().int().min(1).max(24).optional();

export class ReportController {
    async casesByStatus(req: Request, res: Response) {
        try {
            const data = await reportService.casesByStatus();
            return ApiResponseHelper.success(res, data, "Cases by status fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "ReportController");
        }
    }

    async revenueByMonth(req: Request, res: Response) {
        try {
            const parsed = MonthsQuerySchema.safeParse(req.query.months);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, "months must be a number between 1 and 24", 400);
            }
            const data = await reportService.revenueByMonth(parsed.data);
            return ApiResponseHelper.success(res, data, "Revenue by month fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "ReportController");
        }
    }

    async taskCompletion(req: Request, res: Response) {
        try {
            const data = await reportService.taskCompletion();
            return ApiResponseHelper.success(res, data, "Task completion fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "ReportController");
        }
    }
}
