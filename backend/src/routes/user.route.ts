import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/register", userController.createUser);
userRouter.post("/login", userController.loginUser);

export default userRouter;
