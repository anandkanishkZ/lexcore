import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { upload } from "../middlewares/upload.middleware";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/register", userController.createUser);
userRouter.post("/login", userController.loginUser);

// Protected — require a valid Bearer token.
userRouter.get("/users", authorizedMiddleware, userController.getAll);
userRouter.get("/me", authorizedMiddleware, userController.getMe);
userRouter.get("/whoami", authorizedMiddleware, userController.whoami);
userRouter.put("/update", authorizedMiddleware, upload.single("profileImage"), userController.updateUser);
userRouter.post(
    "/profile/image",
    authorizedMiddleware,
    upload.single("image"),
    userController.uploadProfileImage
);

export default userRouter;
