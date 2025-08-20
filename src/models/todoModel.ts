import { Db, ObjectId } from "mongodb";
import { getDB } from "../config/db";

interface Todo {
  title: string;
  description?: string;
  userEmail: string;
  dueDate?: Date | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "done";
  createdAt: Date;
}

export const createTodo = async (todo: Todo) => {
  const db: Db = getDB();
  return await db.collection("todos").insertOne(todo);
};

export const updateTodo = async (id: string, updateData: Partial<Todo>) => {
  const db: Db = getDB();
  return await db
    .collection("todos")
    .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
};

export const deleteTodo = async (id: string) => {
  const db: Db = getDB();
  return await db.collection("todos").deleteOne({ _id: new ObjectId(id) });
};

export const getTodosByUser = async (
  userEmail: string,
  filters: {
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    order?: string;
    page?: string;
    limit?: string;
  }
) => {
  const db: Db = getDB();
  const query: any = { userEmail };

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.startDate && filters.endDate) {
    query.dueDate = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  const pageNum = parseInt(filters.page || "1");
  const limitNum = parseInt(filters.limit || "10");
  const skip = (pageNum - 1) * limitNum;

  let sort: any = {};
  if (filters.sortBy) {
    sort[filters.sortBy] = filters.order === "desc" ? -1 : 1;
  } else {
    sort = { createdAt: -1 };
  }

  const todos = await db
    .collection("todos")
    .find(query)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const total = await db.collection("todos").countDocuments(query);

  return {
    todos,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

export const getAllTodos = async (filters: {
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  order?: string;
  page?: string;
  limit?: string;
}) => {
  const db: Db = getDB();
  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.startDate && filters.endDate) {
    query.dueDate = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  const pageNum = parseInt(filters.page || "1");
  const limitNum = parseInt(filters.limit || "10");
  const skip = (pageNum - 1) * limitNum;

  let sort: any = {};
  if (filters.sortBy) {
    sort[filters.sortBy] = filters.order === "desc" ? -1 : 1;
  } else {
    sort = { createdAt: -1 };
  }

  const todos = await db
    .collection("todos")
    .find(query)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const total = await db.collection("todos").countDocuments(query);

  return {
    todos,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};
