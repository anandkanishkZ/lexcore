import { NotificationMongoRepository } from "../repositories/notification.repository";
import { DeviceTokenMongoRepository } from "../repositories/device-token.repository";
import { INotification } from "../models/notification.model";
import { UserModel } from "../models/user.model";
import { sendMail } from "../utils/mail.util";
import { sendPush } from "../utils/push.util";

const notificationRepository = new NotificationMongoRepository();
const deviceTokenRepository = new DeviceTokenMongoRepository();

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

    async registerDeviceToken(userId: string, token: string, platform: "android" | "ios"): Promise<void> {
        await deviceTokenRepository.register(userId, token, platform);
    }

    async unregisterDeviceToken(token: string): Promise<void> {
        await deviceTokenRepository.unregister(token);
    }

    /** Sends to whatever devices these users have registered, then prunes
     * any token FCM reports as dead. A no-op (and never throws) when push
     * isn't configured — see utils/push.util.ts. */
    private async push(userIds: string[], title: string, message: string, linkedEntity?: { type: string; id: string }): Promise<void> {
        const tokens = await deviceTokenRepository.getTokensForUsers(userIds);
        if (tokens.length === 0) return;
        const staleTokens = await sendPush(tokens, {
            title,
            body: message,
            data: linkedEntity ? { type: linkedEntity.type, id: linkedEntity.id } : undefined,
        });
        await deviceTokenRepository.deleteTokens(staleTokens);
    }

    /**
     * In-app notification for every admin ("the firm"), e.g. a new case
     * request landing. Kept to `role: admin` rather than every staff member —
     * a small firm's owners/managers are the right audience for a triage
     * queue, not everyone with console access.
     */
    async notifyAdmins(title: string, message: string, linkedEntity?: { type: string; id: string }): Promise<void> {
        const admins = await UserModel.find({ role: "admin" }, "_id");
        const adminIds = admins.map((admin) => admin._id.toString());
        await notificationRepository.createMany(
            adminIds.map((id) => ({
                user: id as any,
                title,
                message,
                linkedEntityType: linkedEntity?.type,
                linkedEntityId: linkedEntity?.id,
            }))
        );
        await this.push(adminIds, title, message, linkedEntity);
    }

    async emailAdmins(subject: string, text: string): Promise<void> {
        const admins = await UserModel.find({ role: "admin" }, "email");
        await Promise.all(admins.map((admin) => sendMail(admin.email, subject, text)));
    }

    /**
     * In-app notification for a single specific user — e.g. a client whose
     * portal account (Client.linkedUserId) exists. Distinct from
     * notifyAdmins, which broadcasts to every admin.
     */
    async notifyUser(userId: string, title: string, message: string, linkedEntity?: { type: string; id: string }): Promise<void> {
        await notificationRepository.createMany([
            {
                user: userId as any,
                title,
                message,
                linkedEntityType: linkedEntity?.type,
                linkedEntityId: linkedEntity?.id,
            },
        ]);
        await this.push([userId], title, message, linkedEntity);
    }
}
