import { Router } from "express";
import { DocumentRequestController } from "../controllers/document-request.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const documentRequestRouter = Router();
const documentRequestController = new DocumentRequestController();

documentRequestRouter.use(authorizedMiddleware);

// /mine must be registered before any /:id-shaped route, same reasoning as
// case.route.ts and case-request.route.ts. GET /mine and POST /:id/fulfill
// are open to any authenticated user — a client only ever fulfills a request
// on a case they own (enforced in the service via CaseService.assertAccess),
// same shared-route pattern as GET /cases/:id.
documentRequestRouter.get("/mine", documentRequestController.getMine);
documentRequestRouter.post("/:id/fulfill", documentRequestController.fulfill);

documentRequestRouter.get("/", staffMiddleware, documentRequestController.getAll);
documentRequestRouter.post("/", staffMiddleware, documentRequestController.create);
documentRequestRouter.post("/:id/cancel", staffMiddleware, documentRequestController.cancel);

export default documentRequestRouter;
