import { Router } from "express";
import { CaseController } from "../controllers/case.controller";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const caseRouter = Router();
const caseController = new CaseController();

caseRouter.use(authorizedMiddleware);

// /mine must be registered before /:id so Express doesn't treat "mine" as an id.
// GET /mine and GET /:id stay open to any authenticated user — the client
// portal app reads its own case detail through GET /:id, so this can't be
// admin-gated. Ownership for non-admins is enforced in CaseService.getById
// (a client may only fetch a case that belongs to them by email).
caseRouter.get("/mine", caseController.getMine);
caseRouter.get("/:id", caseController.getById);

// Everything else (browsing/creating/editing/deleting cases) is staff-only.
caseRouter.get("/", adminMiddleware, caseController.getAll);
caseRouter.post("/", adminMiddleware, caseController.create);
caseRouter.put("/:id", adminMiddleware, caseController.update);
caseRouter.delete("/:id", adminMiddleware, caseController.delete);

export default caseRouter;
