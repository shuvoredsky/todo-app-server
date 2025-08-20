import { Request, Response, NextFunction } from "express";
import admin from "../config/firebase";

interface CustomRequest extends Request {
  decoded?: admin.auth.DecodedIdToken;
}

export const verifyFirebaseToken = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    if (!decoded.email) {
      return res
        .status(401)
        .send({ message: "Unauthorized: No email in token" });
    }
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).send({ message: "Unauthorized access" });
  }
};
