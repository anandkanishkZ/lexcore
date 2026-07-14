import { Router } from "express";
import { AiController } from "../controllers/ai.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const aiRouter = Router();
const aiController = new AiController();

// Staff-only tool — no client-accessible routes, unlike message.route.ts.
aiRouter.use(authorizedMiddleware, staffMiddleware);
aiRouter.post("/ask", aiController.ask);
aiRouter.get("/cases/:id/summary", aiController.summarizeCase);
aiRouter.get("/documents/:id/summary", aiController.summarizeDocument);
aiRouter.post("/documents/:id/chat", aiController.chatDocument);

export default aiRouter;
