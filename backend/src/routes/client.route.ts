import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const clientRouter = Router();
const clientController = new ClientController();

// Staff-only — the mobile client portal never calls this API (clients see
// their own cases via /cases/mine, not the client directory).
clientRouter.use(authorizedMiddleware, adminMiddleware);

clientRouter.get("/", clientController.getAll);
clientRouter.get("/:id", clientController.getById);
clientRouter.post("/", clientController.create);
clientRouter.put("/:id", clientController.update);
clientRouter.delete("/:id", clientController.delete);

export default clientRouter;
