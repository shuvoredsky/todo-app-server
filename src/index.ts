import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { MongoClient, Db } from "mongodb";

dotenv.config();
const PORT = process.env.PORT || 3000;

const app: Express = express();
app.use(express.json());

let db: Db;

const connectDB = async (): Promise<void> => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not defined in .env file");
    }

    const client = new MongoClient(dbUrl);
    await client.connect();
    console.log("MongoDB Connected Successfully");

    db = client.db();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is running!" });
});

app.post("/todos", async (req: Request, res: Response) => {
  try {
    const todo = req.body;
    const result = await db.collection("todos").insertOne(todo);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error inserting todo", error });
  }
});

app.get("/todos", async (req: Request, res: Response) => {
  try {
    const todos = await db.collection("todos").find().toArray();
    res.json({ success: true, data: todos });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching todos", error });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
