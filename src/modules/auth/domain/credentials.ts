import { z } from "zod";

export const emailSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim().toLowerCase() : value,
  z.email().max(320)
);

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(256) });

export const strongPasswordSchema = z.string().min(12).max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(128),
  email: emailSchema,
  password: strongPasswordSchema
});
