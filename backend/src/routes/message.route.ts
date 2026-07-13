import { Router } from "express";
import { MessageController } from "../controllers/message.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const messageRouter = Router();
const messageController = new MessageController();

// Ownership (admin, the case's client, or its assignedAttorney) is enforced
// inside MessageService via CaseService.assertChatAccess, not route
// middleware — same shared-route pattern as GET /cases/:id. This REST path
// is the fallback/initial-load transport; the socket gateway
// (socket/chat.gateway.ts) is the live-delivery transport, and both funnel
// through the same MessageService.send()/getHistory().
messageRouter.use(authorizedMiddleware);
messageRouter.get("/", messageController.getHistory);
messageRouter.post("/", messageController.send);

export default messageRouter;
