import path from "path";
import fs from "fs";
import { MessageMongoRepository } from "../repositories/message.repository";
import { CaseService } from "./case.service";
import { NotificationService } from "./notification.service";
import { SendMessageDTO } from "../dtos/message.dto";
import { IMessage, IMessageAttachment } from "../models/message.model";
import { ICase } from "../models/case.model";
import { HttpException } from "../exceptions/http-exception";
import { sendMail } from "../utils/mail.util";
import { getIo } from "../socket/io-instance";
import { isOnline } from "../socket/presence";
import { classifyAttachment, MESSAGE_ATTACHMENTS_DIR } from "../middlewares/message-attachment-upload.middleware";

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
     * Single path for sending a text-only message, used by both the REST
     * POST handler and the socket `message:send` event — so history, live
     * delivery, and the offline-notification fallback all happen exactly
     * once regardless of which transport the sender used.
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

        await this.finalizeSend(caseId, found, created, requestingUser.userId);
        return created;
    }

    /**
     * REST-only (attachments require multipart, which the socket transport
     * doesn't carry) — files are already written to disk by multer
     * (message-attachment-upload.middleware.ts) by the time this runs, so
     * every rejection path here must clean them up rather than leaving
     * orphans behind.
     */
    async sendWithAttachments(
        caseId: string,
        files: Express.Multer.File[],
        content: string | undefined,
        requestingUser: RequestingUser
    ): Promise<IMessage> {
        let found: ICase;
        try {
            found = await caseService.assertChatAccess(caseId, requestingUser);
        } catch (error) {
            await this.cleanupFiles(files);
            throw error;
        }

        if (found.status === "closed") {
            await this.cleanupFiles(files);
            throw new HttpException(400, "This case is closed — new messages can't be sent, but the history is still readable.");
        }

        const trimmedContent = content?.trim() ?? "";
        if (files.length === 0 && !trimmedContent) {
            throw new HttpException(400, "Message must include text or at least one attachment");
        }

        const attachments: Partial<IMessageAttachment>[] = files.map((file) => ({
            fileName: path.basename(file.path),
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            kind: classifyAttachment(file.mimetype),
        }));

        const created = await messageRepository.create({
            case: caseId as any,
            sender: requestingUser.userId as any,
            content: trimmedContent,
            attachments: attachments as any,
        });

        await this.finalizeSend(caseId, found, created, requestingUser.userId);
        return created;
    }

    /** Streams an attachment's bytes back to whoever has chat access to its
     * case — same ownership rule as reading the thread itself, since an
     * attachment is just part of a message the requester can already see. */
    async getAttachmentForDownload(
        messageId: string,
        attachmentId: string,
        requestingUser: RequestingUser
    ): Promise<{ attachment: IMessageAttachment; absolutePath: string }> {
        const message = await messageRepository.getById(messageId);
        if (!message) throw new HttpException(404, "Message not found");

        await caseService.assertChatAccess(message.case.toString(), requestingUser);

        const attachment = message.attachments.find((a) => a._id.toString() === attachmentId);
        if (!attachment) throw new HttpException(404, "Attachment not found");

        const absolutePath = path.join(MESSAGE_ATTACHMENTS_DIR, message.case.toString(), attachment.fileName);
        return { attachment, absolutePath };
    }

    private async cleanupFiles(files: Express.Multer.File[]): Promise<void> {
        await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => undefined)));
    }

    private async finalizeSend(caseId: string, found: ICase, created: IMessage, senderId: string): Promise<void> {
        getIo()?.to(`case:${caseId}`).emit("message:new", created);
        await this.notifyRecipientIfOffline(caseId, found, senderId);
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
