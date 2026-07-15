import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { upload } from "../middlewares/upload.middleware";
import { authRateLimiter } from "../middlewares/rate-limit.middleware";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/register", authRateLimiter, userController.createUser);
userRouter.post("/login", authRateLimiter, userController.loginUser);

// Unauthenticated by nature (the whole point is recovering access without
// being logged in) — rate-limited the same as register/login since, like
// them, they're unauthenticated write paths reachable by anyone.
userRouter.post("/forgot-password", authRateLimiter, userController.forgotPassword);
userRouter.post("/reset-password", authRateLimiter, userController.resetPassword);

// Protected — require a valid Bearer token.
// (The full user list lives at GET /admin/users, gated by adminMiddleware —
// there is no unauthenticated-to-role "list all users" route here.)
userRouter.get("/me", authorizedMiddleware, userController.getMe);
userRouter.get("/whoami", authorizedMiddleware, userController.whoami);
userRouter.put("/update", authorizedMiddleware, upload.single("profileImage"), userController.updateUser);
userRouter.put("/password", authorizedMiddleware, userController.changePassword);
userRouter.post(
    "/profile/image",
    authorizedMiddleware,
    upload.single("image"),
    userController.uploadProfileImage
);

export default userRouter;
