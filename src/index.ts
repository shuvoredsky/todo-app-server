import express, { Express, Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDB, closeDB } from "./config/db";
import todoRoutes from "./routes/todoRoutes";
import userRoutes from "./routes/userRoutes";

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, message: "Server is running!" });
});

app.use("/todos", todoRoutes);
app.use("/users", userRoutes);

connectDB();

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
