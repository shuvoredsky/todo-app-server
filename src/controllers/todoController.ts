import { Request, Response } from "express";
import admin from "firebase-admin";
import {
  createTodo as createTodoModel,
  updateTodo,
  deleteTodo,
  getTodosByUser,
  getAllTodos,
} from "../models/todoModel";

interface CustomRequest extends Request {
  decoded?: admin.auth.DecodedIdToken;
}

export const createTodo = async (req: CustomRequest, res: Response) => {
  try {
    const { title, description, dueDate, priority, status } = req.body;
    const userEmail = req.decoded?.email;
    if (!userEmail) {
      return res
        .status(400)
        .json({ success: false, message: "User email not found" });
    }

    const newTodo = {
      title,
      description,
      userEmail,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      status: status || "pending",
      createdAt: new Date(),
    };

    const result = await createTodoModel(newTodo);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Create Todo Error:", error);
    res.status(500).json({ success: false, message: "Error creating todo" });
  }
};

export const updateTodoById = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userEmail = req.decoded?.email;
    if (!userEmail) {
      return res
        .status(400)
        .json({ success: false, message: "User email not found" });
    }

    const result = await updateTodo(id, { ...req.body, userEmail });

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Todo not found" });
    }

    res.json({ success: true, message: "Todo updated" });
  } catch (error) {
    console.error("Update Todo Error:", error);
    res.status(500).json({ success: false, message: "Error updating todo" });
  }
};

export const deleteTodoById = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userEmail = req.decoded?.email;
    if (!userEmail) {
      return res
        .status(400)
        .json({ success: false, message: "User email not found" });
    }

    const result = await deleteTodo(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Delete Todo Error:", error);
    res.status(500).json({ success: false, message: "Error deleting todo" });
  }
};

export const getMyTodos = async (req: CustomRequest, res: Response) => {
  try {
    const userEmail = req.decoded?.email || (req.query.userEmail as string);
    if (!userEmail) {
      return res
        .status(400)
        .json({ success: false, message: "userEmail is required" });
    }

    const filters = req.query;
    const { todos, pagination } = await getTodosByUser(userEmail, filters);

    res.json({
      success: true,
      data: todos,
      pagination,
    });
  } catch (error) {
    console.error("Fetch My Todos Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching my todos" });
  }
};

export const getAllTodosController = async (req: Request, res: Response) => {
  try {
    const filters = req.query;
    const { todos, pagination } = await getAllTodos(filters);

    res.json({
      success: true,
      data: todos,
      pagination,
    });
  } catch (error) {
    console.error("Fetch Todos Error:", error);
    res.status(500).json({ success: false, message: "Error fetching todos" });
  }
};
