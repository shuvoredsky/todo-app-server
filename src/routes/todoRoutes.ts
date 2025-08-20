import { Router } from "express";
import {
  createTodo,
  updateTodoById,
  deleteTodoById,
  getMyTodos,
  getAllTodosController,
} from "../controllers/todoController";
import { verifyFirebaseToken } from "../middleware/authMiddleware";
import { validate, todoSchema } from "../middleware/validateMiddleware";

const router = Router();

router.post("/", verifyFirebaseToken, validate(todoSchema), createTodo);
router.put("/:id", verifyFirebaseToken, validate(todoSchema), updateTodoById);
router.delete("/:id", verifyFirebaseToken, deleteTodoById);
router.get("/me", verifyFirebaseToken, getMyTodos);
router.get("/", getAllTodosController);

export default router;
