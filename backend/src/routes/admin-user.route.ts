import { Router } from "express";
import { AdminUserController } from "../controllers/admin-user.controller";
import { authorizedMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const adminUserRouter = Router();
const adminUserController = new AdminUserController();

adminUserRouter.use(authorizedMiddleware, adminMiddleware);

adminUserRouter.get("/", adminUserController.getAll);
adminUserRouter.get("/:id", adminUserController.getById);
adminUserRouter.post("/", adminUserController.create);
adminUserRouter.put("/:id", adminUserController.update);
adminUserRouter.patch("/:id", adminUserController.update);
adminUserRouter.delete("/:id", adminUserController.remove);

export default adminUserRouter;
