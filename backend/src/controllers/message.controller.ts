import { Request, Response } from "express";
import { SendMessageDTO } from "../dtos/message.dto";
import { MessageService } from "../services/message.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

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
}
