import { z } from "zod";

export const directConversationSchema = z.object({
  recipientId: z
    .string()
    .trim()
    .min(1, "Recipient ID is required"),
});

export const joinConversationSchema = z.object({
  conversationId: z
    .string()
    .trim()
    .min(1, "Conversation ID is required"),
});

export const sendMessageSchema = z.object({
  conversationId: z
    .string()
    .trim()
    .min(1, "Conversation ID is required"),
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty")
    .max(5000, "Message content cannot exceed 5000 characters"),
});

export type DirectConversationInput = z.infer<typeof directConversationSchema>;
export type JoinConversationInput = z.infer<typeof joinConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
