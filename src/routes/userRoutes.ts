import { Router } from "express";
import {
  createUserController,
  loginUser,
  getUsersController,
} from "../controllers/userController";
import { validate, userSchema } from "../middleware/validateMiddleware";

const router = Router();

router.post("/", validate(userSchema), createUserController);
router.post("/login", validate(userSchema), loginUser);
router.get("/", getUsersController);

export default router;
