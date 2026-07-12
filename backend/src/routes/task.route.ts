import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const taskRouter = Router();
const taskController = new TaskController();

// Staff-only — tasks are an internal productivity tool, not client-visible.
taskRouter.use(authorizedMiddleware, staffMiddleware);

taskRouter.get("/", taskController.getAll);
taskRouter.get("/:id", taskController.getById);
taskRouter.post("/", taskController.create);
taskRouter.put("/:id", taskController.update);
taskRouter.delete("/:id", taskController.delete);

export default taskRouter;
