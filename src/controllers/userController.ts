import { Request, Response } from "express";
import { createUser, findUserByEmail, getUsers } from "../models/userModel";
import bcrypt from "bcryptjs";

export const createUserController = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    const result = await createUser({ email, password, name, role: "user" });
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({ success: false, message: "Error creating user" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);

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

    res.json({
      success: true,
      message: "Login successful",
      user: { email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Error during login" });
  }
};

export const getUsersController = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const users = await getUsers(email);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
};
