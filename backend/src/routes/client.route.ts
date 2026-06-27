import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const clientRouter = Router();
const clientController = new ClientController();

clientRouter.use(authorizedMiddleware);

clientRouter.get("/", clientController.getAll);
clientRouter.get("/:id", clientController.getById);
clientRouter.post("/", clientController.create);
clientRouter.put("/:id", clientController.update);
clientRouter.delete("/:id", clientController.delete);

export default clientRouter;
