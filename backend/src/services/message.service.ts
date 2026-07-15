import { MessageMongoRepository } from "../repositories/message.repository";
import { CaseService } from "./case.service";
import { NotificationService } from "./notification.service";
import { SendMessageDTO } from "../dtos/message.dto";
import { IMessage } from "../models/message.model";
import { ICase } from "../models/case.model";
import { HttpException } from "../exceptions/http-exception";
import { sendMail } from "../utils/mail.util";
import { getIo } from "../socket/io-instance";
import { isOnline } from "../socket/presence";

const messageRepository = new MessageMongoRepository();
const caseService = new CaseService();
const notificationService = new NotificationService();

type RequestingUser = { role: string; email: string; userId: string };

export class MessageService {
    /** History stays readable after a case closes — only new writes are
     * blocked (see send() below) — so this intentionally has no status
     * check. Marks every message from the other party as read: readAt was
     * declared on the schema but nothing used to set it. */
    async getHistory(caseId: string, requestingUser: RequestingUser): Promise<IMessage[]> {
        await caseService.assertChatAccess(caseId, requestingUser);
        const history = await messageRepository.getHistory(caseId);
        await messageRepository.markReadForCase(caseId, requestingUser.userId);
        return history;
    }

    /**
     * Single path for sending a message, used by both the REST POST handler
     * and the socket `message:send` event — so history, live delivery, and
     * the offline-notification fallback all happen exactly once regardless
     * of which transport the sender used.
     */
    async send(caseId: string, data: SendMessageDTO, requestingUser: RequestingUser): Promise<IMessage> {
        const found = await caseService.assertChatAccess(caseId, requestingUser);
        if (found.status === "closed") {
            throw new HttpException(400, "This case is closed — new messages can't be sent, but the history is still readable.");
        }

        const created = await messageRepository.create({
            case: caseId as any,
            sender: requestingUser.userId as any,
            content: data.content,
        });

        getIo()?.to(`case:${caseId}`).emit("message:new", created);

        await this.notifyRecipientIfOffline(caseId, found, requestingUser.userId);

        return created;
    }

    private async notifyRecipientIfOffline(caseId: string, found: ICase, senderId: string): Promise<void> {
        const client = found.client as unknown as { email?: string; linkedUserId?: { toString(): string } } | null;
        const assignedAttorney = found.assignedAttorney as unknown as
            | { _id?: { toString(): string }; email?: string }
            | null;

        const clientUserId = client?.linkedUserId?.toString();
        const attorneyId = assignedAttorney?._id?.toString();

        // The recipient is whichever side didn't just send this message.
        const recipientId = senderId === clientUserId ? attorneyId : clientUserId;
        if (!recipientId) return; // no counterpart to notify (unassigned case, or the client has no linked portal login)

        if (isOnline(caseId, recipientId)) return;

        await notificationService.notifyUser(
            recipientId,
            "New message",
            `You have a new message on case ${found.caseNumber}.`,
            { type: "Message", id: caseId }
        );

        const recipientEmail = recipientId === clientUserId ? client?.email : assignedAttorney?.email;
        if (recipientEmail) {
            await sendMail(
                recipientEmail,
                "New message",
                `You have a new message on case ${found.caseNumber}. Please check the Lexcore app to reply.`
            );
        }
    }
}
