import { NotificationMongoRepository } from "../repositories/notification.repository";
import { INotification } from "../models/notification.model";
import { UserModel } from "../models/user.model";
import { sendMail } from "../utils/mail.util";

const notificationRepository = new NotificationMongoRepository();

export class NotificationService {
    async getMine(userId: string): Promise<INotification[]> {
        return notificationRepository.getMine(userId);
    }

    async countUnread(userId: string): Promise<number> {
        return notificationRepository.countUnread(userId);
    }

    async markRead(id: string, userId: string): Promise<INotification | null> {
        return notificationRepository.markRead(id, userId);
    }

    async markAllRead(userId: string): Promise<void> {
        return notificationRepository.markAllRead(userId);
    }

    /**
     * In-app notification for every admin ("the firm"), e.g. a new case
     * request landing. Kept to `role: admin` rather than every staff member —
     * a small firm's owners/managers are the right audience for a triage
     * queue, not everyone with console access.
     */
    async notifyAdmins(title: string, message: string, linkedEntity?: { type: string; id: string }): Promise<void> {
        const admins = await UserModel.find({ role: "admin" }, "_id");
        await notificationRepository.createMany(
            admins.map((admin) => ({
                user: admin._id,
                title,
                message,
                linkedEntityType: linkedEntity?.type,
                linkedEntityId: linkedEntity?.id,
            }))
        );
    }

    async emailAdmins(subject: string, text: string): Promise<void> {
        const admins = await UserModel.find({ role: "admin" }, "email");
        await Promise.all(admins.map((admin) => sendMail(admin.email, subject, text)));
    }
}
