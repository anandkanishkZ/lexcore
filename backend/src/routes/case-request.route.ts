import { Router } from "express";
import { CaseRequestController } from "../controllers/case-request.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const caseRequestRouter = Router();
const caseRequestController = new CaseRequestController();

caseRequestRouter.use(authorizedMiddleware);

// /mine must be registered before /:id, same reasoning as case.route.ts.
// POST / and GET /mine are open to any authenticated user — a client submits
// and tracks their own requests. Reviewing the queue (list/approve/reject) is
// any-staff, not admin-exclusive — a paralegal can triage incoming intake.
caseRequestRouter.post("/", caseRequestController.create);
caseRequestRouter.get("/mine", caseRequestController.getMine);

caseRequestRouter.get("/", staffMiddleware, caseRequestController.getAll);
caseRequestRouter.get("/:id", staffMiddleware, caseRequestController.getById);
caseRequestRouter.post("/:id/approve", staffMiddleware, caseRequestController.approve);
caseRequestRouter.post("/:id/reject", staffMiddleware, caseRequestController.reject);

export default caseRequestRouter;
