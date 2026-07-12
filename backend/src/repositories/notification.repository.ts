import { NotificationModel, INotification } from "../models/notification.model";

export class NotificationMongoRepository {
    async createMany(notifications: Partial<INotification>[]): Promise<void> {
        if (notifications.length === 0) return;
        await NotificationModel.insertMany(notifications);
    }

    async getMine(userId: string): Promise<INotification[]> {
        return NotificationModel.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
    }

    async countUnread(userId: string): Promise<number> {
        return NotificationModel.countDocuments({ user: userId, isRead: false });
    }

    async markRead(id: string, userId: string): Promise<INotification | null> {
        return NotificationModel.findOneAndUpdate({ _id: id, user: userId }, { isRead: true }, { new: true });
    }

    async markAllRead(userId: string): Promise<void> {
        await NotificationModel.updateMany({ user: userId, isRead: false }, { isRead: true });
    }
}
