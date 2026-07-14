import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const reportRouter = Router();
const reportController = new ReportController();

// Staff-only — canned dashboard aggregates, not client-visible.
reportRouter.use(authorizedMiddleware, staffMiddleware);

reportRouter.get("/cases-by-status", reportController.casesByStatus);
reportRouter.get("/revenue-by-month", reportController.revenueByMonth);
reportRouter.get("/task-completion", reportController.taskCompletion);

export default reportRouter;
