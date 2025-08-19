import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { MongoClient, Db, ObjectId } from "mongodb";
import cors from "cors";
import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
import Joi from "joi";
import { todo } from "node:test";

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
app.use(cors());
app.use(express.json());

// Get port from environment or default to 3000
const PORT = process.env.PORT;

let db: Db;
let client: MongoClient;

// MongoDB connection
const connectDB = async (): Promise<void> => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not defined in .env file");
    }

    client = new MongoClient(dbUrl);
    await client.connect();
    console.log("MongoDB Connected Successfully");

    db = client.db("todoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// JWT authentication middleware
// const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

//   if (!token) {
//     return res
//       .status(401)
//       .json({ success: false, message: "Access token required" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET!);
//     (req as any).user = decoded;
//     next();
//   } catch (error) {
//     return res
//       .status(403)
//       .json({ success: false, message: "Invalid or expired token" });
//   }
// };

// Connect to database
connectDB();

// Test route
app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, message: "Server is running!" });
});

// Validation schema for user
const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Validation schema for todo
const todoSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().optional(),
  dueDate: Joi.date().optional(),
  completed: Joi.boolean().optional(),
});

// Create a new todo (protected)
// app.post("/todos", async (req: Request, res: Response) => {
//   // try {
//   //   const { error } = todoSchema.validate(req.body);
//   //   if (error) {
//   //     return res
//   //       .status(400)
//   //       .json({ success: false, message: error.details[0].message });
//   //   }

//   // const todo = { ...req.body, userId: (req as any).user.email };
//   const todo = req.body;
//   const result = await db.collection("todos").insertOne(todo);
//   res.json({ success: true, insertedId: result.insertedId });
//   // } catch (error) {
//   //   res.status(500).json({ success: false, message: "Error inserting todo" });
//   // }
// });

app.post("/todos", async (req: Request, res: Response) => {
  try {
    const { title, status, priority, dueDate } = req.body;
    const newTodo = {
      title,
      status: status || "pending",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: new Date(),
    };
    const result = await db.collection("todos").insertOne(newTodo);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating todo" });
  }
});

// Get all todos for the authenticated user
// app.get("/todos", async (req: Request, res: Response) => {
//   try {
//     const todos = await db.collection("todos").find().toArray();
//     res.json(todos);
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Error fetching todos" });
//   }
// });

app.get("/todos", async (req: Request, res: Response) => {
  try {
    const { status, priority, startDate, endDate, sortBy, order, page, limit } =
      req.query;

    const query: any = {};

    // Filtering
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    let sort: any = {};
    if (sortBy) {
      sort[sortBy as string] = order === "desc" ? -1 : 1;
    } else {
      sort = { createdAt: -1 }; // default
    }

    const todos = await db
      .collection("todos")
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await db.collection("todos").countDocuments(query);

    res.json({
      success: true,
      data: todos,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching todos" });
  }
});

// Create a new user
app.post("/users", async (req: Request, res: Response) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { email, password, name } = req.body;

    // Check if email already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userWithRole = {
      email,
      password: hashedPassword,
      name,
      role: "user",
    };

    const result = await db.collection("users").insertOne(userWithRole);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating user" });
  }
});

// Sign in user
app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { error } = userSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { email, password } = req.body;

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    // const token = jwt.sign(
    //   { email: user.email, role: user.role },
    //   process.env.JWT_SECRET!,
    //   {
    //     expiresIn: "1h",
    //   }
    // );

    res.json({
      success: true,
      message: "Login successful",
      // token,
      user: { email: user.email, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error during login" });
  }
});

// Get all users (for testing, should be restricted in production)
app.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await db.collection("users").find().toArray();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  await client.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
