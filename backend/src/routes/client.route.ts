import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import { authorizedMiddleware, staffMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const clientRouter = Router();
const clientController = new ClientController();

// Staff-only — the mobile client portal never calls this API (clients see
// their own cases via /cases/mine, not the client directory). Any staff
// member may browse/create/edit via the client directory, not just role:
// admin accounts — but deleting a client is admin-only (see delete route
// below), since it's an irreversible action ClientService now also checks
// for linked cases/invoices before allowing.
clientRouter.use(authorizedMiddleware, staffMiddleware);

clientRouter.get("/", clientController.getAll);
clientRouter.get("/:id", clientController.getById);
clientRouter.post("/", clientController.create);
clientRouter.put("/:id", clientController.update);
clientRouter.delete("/:id", adminMiddleware, clientController.delete);

export default clientRouter;
