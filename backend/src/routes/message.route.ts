import { Router, Request, Response, NextFunction } from "express";
import { MessageController } from "../controllers/message.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";
import { messageAttachmentUpload } from "../middlewares/message-attachment-upload.middleware";
import { messageAttachmentRateLimiter } from "../middlewares/rate-limit.middleware";
import { CaseService } from "../services/case.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";

const messageRouter = Router();
const messageController = new MessageController();
const caseService = new CaseService();

// Runs before messageAttachmentUpload so a non-participant is rejected
// before multer writes anything to disk — same reasoning as
// requireCaseQueryAccess in document.route.ts.
async function requireCaseQueryChatAccess(req: Request, res: Response, next: NextFunction) {
    try {
        const caseId = (req.query.case as string) || "";
        if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);
        const user = req.user as IUser;
        await caseService.assertChatAccess(caseId, { role: user.role, email: user.email, userId: user._id.toString() });
        next();
    } catch (error: any) {
        return ApiResponseHelper.error(res, error.message || "Access denied", error.status || 403);
    }
}

// Ownership (admin, the case's client, or its assignedAttorney) is enforced
// inside MessageService via CaseService.assertChatAccess, not route
// middleware — same shared-route pattern as GET /cases/:id. This REST path
// is the fallback/initial-load transport; the socket gateway
// (socket/chat.gateway.ts) is the live-delivery transport, and both funnel
// through the same MessageService.send()/getHistory().
messageRouter.use(authorizedMiddleware);
messageRouter.get("/", messageController.getHistory);
messageRouter.get("/client/:clientId", staffMiddleware, messageController.getHistoryForClient);
messageRouter.post("/", messageController.send);

// Attachments are REST-only — multipart doesn't travel over the Socket.io
// transport the text-send path also supports.
messageRouter.post(
    "/attachments",
    requireCaseQueryChatAccess,
    messageAttachmentRateLimiter,
    messageAttachmentUpload.array("files", 10),
    messageController.sendWithAttachments
);
messageRouter.get("/:messageId/attachments/:attachmentId/download", messageController.downloadAttachment);

export default messageRouter;
