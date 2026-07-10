import { Router } from "express";
import { CaseRequestController } from "../controllers/case-request.controller";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const caseRequestRouter = Router();
const caseRequestController = new CaseRequestController();

caseRequestRouter.use(authorizedMiddleware);

// /mine must be registered before /:id, same reasoning as case.route.ts.
// POST / and GET /mine are open to any authenticated user — a client submits
// and tracks their own requests. Reviewing the queue (list/approve/reject) is
// staff-only.
caseRequestRouter.post("/", caseRequestController.create);
caseRequestRouter.get("/mine", caseRequestController.getMine);

caseRequestRouter.get("/", adminMiddleware, caseRequestController.getAll);
caseRequestRouter.get("/:id", adminMiddleware, caseRequestController.getById);
caseRequestRouter.post("/:id/approve", adminMiddleware, caseRequestController.approve);
caseRequestRouter.post("/:id/reject", adminMiddleware, caseRequestController.reject);

export default caseRequestRouter;
