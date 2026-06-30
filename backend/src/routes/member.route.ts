import { Router } from "express";
import { MemberController } from "../controllers/member.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const memberRouter = Router();
const memberController = new MemberController();

memberRouter.use(authorizedMiddleware);

memberRouter.get("/", memberController.getAll);

export default memberRouter;
