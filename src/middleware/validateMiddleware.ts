import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const todoSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().optional().allow(""),
  dueDate: Joi.date().optional().allow(null),
  completed: Joi.boolean().optional(),
  priority: Joi.string().valid("low", "medium", "high").required(),
  status: Joi.string().valid("pending", "done").optional().allow(null),
}).unknown(true);

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation Error:", error.details);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    next();
  };
};
