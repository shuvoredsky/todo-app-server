import { Db } from "mongodb";
import { getDB } from "../config/db";
import bcrypt from "bcryptjs";

interface User {
  email: string;
  password: string;
  name?: string;
  role: string;
}

export const createUser = async (user: User) => {
  const db: Db = getDB();
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const userWithRole = {
    ...user,
    password: hashedPassword,
    role: "user",
  };
  return await db.collection("users").insertOne(userWithRole);
};

export const findUserByEmail = async (email: string) => {
  const db: Db = getDB();
  return await db.collection("users").findOne({ email });
};

export const getUsers = async (email?: string) => {
  const db: Db = getDB();
  const query: any = email ? { email } : {};
  return await db.collection("users").find(query).toArray();
};
