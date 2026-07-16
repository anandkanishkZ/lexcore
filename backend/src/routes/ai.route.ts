import { Router } from "express";
import { AiController } from "../controllers/ai.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";
import { aiRateLimiter } from "../middlewares/rate-limit.middleware";

const aiRouter = Router();
const aiController = new AiController();

// Rate-limited: every route here is a billed DeepSeek API call.
aiRouter.use(authorizedMiddleware, aiRateLimiter);

// Staff-only, unscoped — any staff member may search/summarize/chat about
// any case or document. staffMiddleware is applied per-route (not
// router-wide) so it doesn't also gate the /my/* routes below.
aiRouter.post("/ask", staffMiddleware, aiController.ask);
aiRouter.get("/cases/:id/summary", staffMiddleware, aiController.summarizeCase);
aiRouter.get("/documents/:id/summary", staffMiddleware, aiController.summarizeDocument);
aiRouter.post("/documents/:id/chat", staffMiddleware, aiController.chatDocument);

// Client-scoped — reachable by any authenticated user (this is how the
// mobile app, which is client-only, gets AI access at all). No staffMiddleware:
// per-resource ownership is enforced inside AiService via CaseService's
// assertAccess/getMine, not by role.
aiRouter.post("/my/ask", aiController.askMine);
aiRouter.get("/my/cases/:id/summary", aiController.summarizeCaseMine);
aiRouter.get("/my/documents/:id/summary", aiController.summarizeDocumentMine);
aiRouter.post("/my/documents/:id/chat", aiController.chatDocumentMine);

export default aiRouter;
