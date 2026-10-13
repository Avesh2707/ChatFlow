import { Router } from "express";
import {
  getConversations,
  createDirectConversation,
  getConversationMessages,
} from "../controllers/conversation.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateOrigin } from "../middlewares/csrf.middleware";

export const conversationRouter = Router();

// All conversation routes require an authenticated session
conversationRouter.use(requireAuth);

conversationRouter.get("/", getConversations);
conversationRouter.post("/", validateOrigin, createDirectConversation);
conversationRouter.post("/direct", validateOrigin, createDirectConversation);
conversationRouter.get("/:id/messages", getConversationMessages);
