import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const clientRouter = Router();
const clientController = new ClientController();

// Staff-only — the mobile client portal never calls this API (clients see
// their own cases via /cases/mine, not the client directory). Any staff
// member may use the client directory, not just role: admin accounts.
clientRouter.use(authorizedMiddleware, staffMiddleware);

clientRouter.get("/", clientController.getAll);
clientRouter.get("/:id", clientController.getById);
clientRouter.post("/", clientController.create);
clientRouter.put("/:id", clientController.update);
clientRouter.delete("/:id", clientController.delete);

export default clientRouter;
