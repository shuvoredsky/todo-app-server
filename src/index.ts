import dotenv from "dotenv";
dotenv.config();
import express, { Express, Request, Response, NextFunction } from "express";
import { MongoClient, Db, ObjectId } from "mongodb";
declare global {
  namespace Express {
    interface Request {
      decoded?: admin.auth.DecodedIdToken;
    }
  }
}
import admin from "firebase-admin";
const decoded = Buffer.from(process.env.FB_SERVICE_KEY!, "base64").toString(
  "utf8"
);

const serviceAccount = JSON.parse(decoded);
import cors from "cors";
import bcrypt from "bcryptjs";

import Joi from "joi";
import { todo } from "node:test";
import rateLimit from "express-rate-limit";

dotenv.config();

const app: Express = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

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
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const verifyFireBaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

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
  description: Joi.string().optional().allow(""),
  dueDate: Joi.date().optional().allow(null),
  completed: Joi.boolean().optional(),
  priority: Joi.string().valid("low", "medium", "high").required(),
  status: Joi.string().valid("pending", "done").optional().allow(null),
}).unknown(true);

app.post("/todos", verifyFireBaseToken, async (req: Request, res: Response) => {
  try {
    const { error } = todoSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation Error:", error.details);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { title, description, dueDate, priority, status, userEmail } =
      req.body;
    const newTodo = {
      title,
      description,
      userEmail,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      status: status || "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("todos").insertOne(newTodo);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Create Todo Error:", error);
    res.status(500).json({ success: false, message: "Error creating todo" });
  }
});

app.put("/todos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = todoSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation Error:", error.details); // Debug
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const result = await db
      .collection("todos")
      .updateOne({ _id: new ObjectId(id) }, { $set: req.body });

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Todo not found" });
    }

    res.json({ success: true, message: "Todo updated" });
  } catch (error) {
    console.error("Update Todo Error:", error); // Debug
    res.status(500).json({ success: false, message: "Error updating todo" });
  }
});

app.get("/todos/me", async (req: Request, res: Response) => {
  try {
    const {
      userEmail,
      status,
      priority,
      startDate,
      endDate,
      sortBy,
      order,
      page,
      limit,
    } = req.query;

    if (!userEmail) {
      return res
        .status(400)
        .json({ success: false, message: "userEmail is required" });
    }

    const query: any = { userEmail };

    // Filtering
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    let sort: any = {};
    if (sortBy) {
      sort[sortBy as string] = order === "desc" ? -1 : 1;
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
    console.error("Fetch My Todos Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching my todos" });
  }
});

app.get("/todos", async (req: Request, res: Response) => {
  try {
    const { status, priority, startDate, endDate, sortBy, order, page, limit } =
      req.query;

    const query: any = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    let sort: any = {};
    if (sortBy) {
      sort[sortBy as string] = order === "desc" ? -1 : 1;
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

app.delete("/todos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db
      .collection("todos")
      .deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting todo" });
  }
});

app.put("/todos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const result = await db
      .collection("todos")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating todo" });
  }
});

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

app.get("/users", async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    const query: any = email ? { email } : {};

    const users = await db.collection("users").find(query).toArray();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  await client.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
