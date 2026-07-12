import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
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
}
