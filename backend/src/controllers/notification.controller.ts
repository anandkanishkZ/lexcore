import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import { RegisterDeviceTokenDTO } from "../dtos/notification.dto";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const notificationService = new NotificationService();

export class NotificationController {
    async getMine(req: Request, res: Response) {
        try {
            const userId = (req.user as IUser)._id.toString();
            const [notifications, unread] = await Promise.all([
                notificationService.getMine(userId),
                notificationService.countUnread(userId),
            ]);
            return ApiResponseHelper.success(res, { notifications, unread }, "Notifications fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "NotificationController");
        }
    }

    async markRead(req: Request, res: Response) {
        try {
            const userId = (req.user as IUser)._id.toString();
            const updated = await notificationService.markRead(req.params.id as string, userId);
            return ApiResponseHelper.success(res, updated, "Notification marked read", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "NotificationController");
        }
    }

    async markAllRead(req: Request, res: Response) {
        try {
            const userId = (req.user as IUser)._id.toString();
            await notificationService.markAllRead(userId);
            return ApiResponseHelper.success(res, null, "All notifications marked read", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "NotificationController");
        }
    }

    /** Called once on login (and again whenever FCM hands the app a fresh
     * token) so the backend knows where to push this device's notifications. */
    async registerDeviceToken(req: Request, res: Response) {
        try {
            const parsed = RegisterDeviceTokenDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            await notificationService.registerDeviceToken(userId, parsed.data.token, parsed.data.platform);
            return ApiResponseHelper.success(res, null, "Device registered for push notifications", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "NotificationController");
        }
    }

    /** Called on sign-out — a logged-out session shouldn't keep receiving
     * push for another account that later signs into the same device. */
    async unregisterDeviceToken(req: Request, res: Response) {
        try {
            const parsed = RegisterDeviceTokenDTO.pick({ token: true }).safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            await notificationService.unregisterDeviceToken(parsed.data.token);
            return ApiResponseHelper.success(res, null, "Device unregistered", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "NotificationController");
        }
    }
}
