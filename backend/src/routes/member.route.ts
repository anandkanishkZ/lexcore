import { Router } from "express";
import { MemberController } from "../controllers/member.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const memberRouter = Router();
const memberController = new MemberController();

// Staff-only: the merged Client+User directory returns every staff member's
// and every other client's name/email/phone — a client account must never
// reach this, only browse their own data via other client-scoped routes.
memberRouter.use(authorizedMiddleware, staffMiddleware);

memberRouter.get("/", memberController.getAll);

export default memberRouter;
