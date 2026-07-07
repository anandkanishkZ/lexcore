import { Router } from "express";
import { CaseController } from "../controllers/case.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const caseRouter = Router();
const caseController = new CaseController();

caseRouter.use(authorizedMiddleware);

// /mine must be registered before /:id so Express doesn't treat "mine" as an id
caseRouter.get("/mine", caseController.getMine);
caseRouter.get("/", caseController.getAll);
caseRouter.get("/:id", caseController.getById);
caseRouter.post("/", caseController.create);
caseRouter.put("/:id", caseController.update);
caseRouter.delete("/:id", caseController.delete);

export default caseRouter;
