import { Request, Response } from "express";
import { UpdateFirmSettingsDTO } from "../dtos/firm-settings.dto";
import { FirmSettingsService } from "../services/firm-settings.service";
import { ApiResponseHelper } from "../utils/apihelper.util";

const firmSettingsService = new FirmSettingsService();

export class FirmSettingsController {
    async get(req: Request, res: Response) {
        try {
            const settings = await firmSettingsService.get();
            return ApiResponseHelper.success(res, settings, "Firm settings fetched successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateFirmSettingsDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const updated = await firmSettingsService.update(parsed.data);
            return ApiResponseHelper.success(res, updated, "Firm settings updated successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
