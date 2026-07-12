import { Router } from "express";
import { CaseController } from "../controllers/case.controller";
import { authorizedMiddleware, staffMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

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

// Browsing/creating/editing is any-staff; a non-admin editor is further
// restricted to cases they're assignedAttorney on (CaseService.update).
// Deleting a case stays admin-only.
caseRouter.get("/", staffMiddleware, caseController.getAll);
caseRouter.post("/", staffMiddleware, caseController.create);
caseRouter.put("/:id", staffMiddleware, caseController.update);
caseRouter.delete("/:id", adminMiddleware, caseController.delete);

export default caseRouter;
