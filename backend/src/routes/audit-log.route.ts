import { Router } from "express";
import { AuditLogController } from "../controllers/audit-log.controller";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const auditLogRouter = Router();
const auditLogController = new AuditLogController();

// Admin-only — the audit trail itself is a sensitive, privileged view.
auditLogRouter.use(authorizedMiddleware, adminMiddleware);

auditLogRouter.get("/", auditLogController.getAll);

export default auditLogRouter;
