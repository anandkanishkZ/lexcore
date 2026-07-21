import fs from "fs";
import { Request, Response } from "express";
import { SendMessageDTO, AttachmentCaptionDTO } from "../dtos/message.dto";
import { MessageService } from "../services/message.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";
import { logAudit } from "../utils/audit-log.util";

const messageService = new MessageService();

function requestingUser(req: Request) {
    const user = req.user as IUser;
    return { role: user.role, email: user.email, userId: user._id.toString() };
}

export class MessageController {
    async getHistory(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || "";
            if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);
            const data = await messageService.getHistory(caseId, requestingUser(req));
            return ApiResponseHelper.success(res, data, "Messages fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "MessageController");
        }
    }

    async getHistoryForClient(req: Request, res: Response) {
        try {
            const data = await messageService.getHistoryForClient(req.params.clientId as string);
            return ApiResponseHelper.success(res, data, "Client messages fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "MessageController");
        }
    }

    async send(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || "";
            if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);
            const parsed = SendMessageDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const created = await messageService.send(caseId, parsed.data, requestingUser(req));
            return ApiResponseHelper.success(res, created, "Message sent successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "MessageController");
        }
    }

    async sendWithAttachments(req: Request, res: Response) {
        try {
            const caseId = (req.query.case as string) || "";
            if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);

            const files = (req.files as Express.Multer.File[] | undefined) ?? [];
            if (files.length === 0) return ApiResponseHelper.error(res, "No files provided", 400);

            const parsed = AttachmentCaptionDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }

            const created = await messageService.sendWithAttachments(caseId, files, parsed.data.content, requestingUser(req));
            await logAudit({
                actorId: (req.user as IUser)._id.toString(),
                action: "message.send-attachments",
                entityType: "Message",
                entityId: created._id.toString(),
                metadata: `${files.length} file(s) on case ${caseId}`,
            });
            return ApiResponseHelper.success(res, created, "Message sent successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "MessageController");
        }
    }

    async downloadAttachment(req: Request, res: Response) {
        try {
            const { attachment, absolutePath } = await messageService.getAttachmentForDownload(
                String(req.params.messageId),
                String(req.params.attachmentId),
                requestingUser(req)
            );
            res.setHeader("Content-Type", attachment.mimeType);
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
            fs.createReadStream(absolutePath).pipe(res);
        } catch (error: any) {
            return handleControllerError(res, error, "MessageController");
        }
    }
}

