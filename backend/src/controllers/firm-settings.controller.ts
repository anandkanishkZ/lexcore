import { Request, Response } from "express";
import { UpdateFirmSettingsDTO } from "../dtos/firm-settings.dto";
import { FirmSettingsService } from "../services/firm-settings.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";
import { logAudit } from "../utils/audit-log.util";
import { IUser } from "../models/user.model";

const firmSettingsService = new FirmSettingsService();

export class FirmSettingsController {
    async get(req: Request, res: Response) {
        try {
            const settings = await firmSettingsService.get();
            return ApiResponseHelper.success(res, settings, "Firm settings fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "FirmSettingsController");
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateFirmSettingsDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const updated = await firmSettingsService.update(parsed.data);
            await logAudit({
                actorId: (req.user as IUser)._id.toString(),
                action: "settings.update",
                entityType: "FirmSettings",
                entityId: "firm",
                metadata: Object.keys(parsed.data).join(", "),
            });
            return ApiResponseHelper.success(res, updated, "Firm settings updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "FirmSettingsController");
        }
    }

    /** Any authenticated user (staff or client) — non-sensitive firm info
     * (name, currency) needed to render amounts consistently. */
    async getPublicInfo(req: Request, res: Response) {
        try {
            const info = await firmSettingsService.getPublicInfo();
            return ApiResponseHelper.success(res, info, "Firm info fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "FirmSettingsController");
        }
    }

    /** Any authenticated user (staff or client) — the mobile app's "Pay with
     * eSewa" button needs this before it can even show, not just staff. */
    async getEsewaConfig(req: Request, res: Response) {
        try {
            const config = await firmSettingsService.getEsewaPublicConfig();
            return ApiResponseHelper.success(res, config, "Payment config fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "FirmSettingsController");
        }
    }

    /** Same purpose as getEsewaConfig, for the "Pay with Khalti" button. */
    async getKhaltiConfig(req: Request, res: Response) {
        try {
            const config = await firmSettingsService.getKhaltiPublicConfig();
            return ApiResponseHelper.success(res, config, "Payment config fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "FirmSettingsController");
        }
    }
}
