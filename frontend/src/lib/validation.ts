import { z } from "zod";

export const policyEnum = z.enum(["replace", "redact", "hash", "block"]);
export type PolicyMode = z.infer<typeof policyEnum>;

export const sessionIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Session ID must be alphanumeric and 1-64 characters");

export const maskRequestSchema = z.object({
  text: z
    .string({ required_error: "Text is required" })
    .min(1, "Text cannot be empty")
    .max(20000, "Text cannot exceed 20,000 characters"),
  policy: policyEnum.default("replace"),
  session_id: sessionIdSchema.optional().nullable(),
});

export const unmaskRequestSchema = z.object({
  masked_text: z
    .string({ required_error: "Masked text is required" })
    .min(1, "Masked text cannot be empty")
    .max(50000, "Masked text cannot exceed 50,000 characters"),
  session_id: sessionIdSchema,
});

export const chatMessageSchema = z.object({
  role: z.string().max(30),
  content: z.string().max(20000, "Message cannot exceed 20,000 characters"),
});

export const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(50, "Conversation history cannot exceed 50 messages"),
  model: z.string().max(100).optional(),
  stream: z.boolean().optional(),
  session_id: sessionIdSchema.optional().nullable(),
  policy: policyEnum.optional().nullable(),
});

export const adminLoginSchema = z.object({
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .max(200, "Password exceeds max length"),
});
