import http from "http";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";
import { prisma } from "../db";
import { AUTH_COOKIE_NAME, verifyToken } from "../utils/jwt";
import { getNormalizedOrigin } from "../middlewares/csrf.middleware";
import {
  AuthenticatedSocketData,
  ClientToServerEvents,
  ServerToClientEvents,
  SafeMessage,
} from "./types";
import {
  joinConversationSchema,
  sendMessageSchema,
} from "../schemas/conversation.schema";

export type ChatSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  AuthenticatedSocketData
>;

let ioInstance: Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  AuthenticatedSocketData
> | null = null;

/**
 * Safely parses cookie strings into key-value pairs without external dependencies.
 */
export const parseCookies = (
  cookieHeader?: string
): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, pair) => {
    const idx = pair.indexOf("=");
    if (idx > 0) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      acc[key] = decodeURIComponent(val);
    }
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Initializes the Socket.IO server attached to the existing HTTP server.
 */
export const initSocketServer = (
  httpServer: http.Server
): Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  AuthenticatedSocketData
> => {
  const allowedOrigin = getNormalizedOrigin(env.CLIENT_URL) || env.CLIENT_URL;

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    AuthenticatedSocketData
  >(httpServer, {
    cors: {
      origin: allowedOrigin,
      credentials: true,
    },
  });

  // Socket authentication middleware: verifies HTTP-only auth_token cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      const token = cookies[AUTH_COOKIE_NAME];

      if (!token) {
        return next(
          new Error("Authentication error: Missing authentication cookie")
        );
      }

      const payload = verifyToken(token);

      // Verify user still exists in database
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      });

      if (!user) {
        return next(
          new Error("Authentication error: User account not found")
        );
      }

      // Securely store authenticated identity on socket.data
      socket.data.user = payload;
      socket.data.userId = payload.userId;

      next();
    } catch (_err: unknown) {
      return next(
        new Error("Authentication error: Invalid or expired token")
      );
    }
  });

  // Connection handler
  io.on("connection", (socket: ChatSocket) => {
    const userId = socket.data.userId;

    // Join conversation room handler
    socket.on("conversation:join", async (payload, ack) => {
      const parsed = joinConversationSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({
          success: false,
          error: "Invalid join payload: conversationId is required",
        });
        return;
      }

      const { conversationId } = parsed.data;

      try {
        // Verify socket user is actually a participant in the conversation
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
        });

        if (!participant) {
          ack?.({
            success: false,
            error: "Forbidden: You are not a participant in this conversation",
          });
          return;
        }

        const roomName = `conversation:${conversationId}`;
        await socket.join(roomName);

        ack?.({
          success: true,
          conversationId,
        });
      } catch (err: unknown) {
        console.error("Error joining conversation room:", err);
        ack?.({
          success: false,
          error: "Internal server error while joining conversation",
        });
      }
    });

    // Send message handler
    socket.on("message:send", async (payload, ack) => {
      const parsed = sendMessageSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({
          success: false,
          error:
            parsed.error.errors[0]?.message || "Invalid message payload",
        });
        return;
      }

      const { conversationId, content } = parsed.data;

      try {
        // Verify socket user is an authorized participant before creating message
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
        });

        if (!participant) {
          ack?.({
            success: false,
            error: "Forbidden: You are not a participant in this conversation",
          });
          return;
        }

        // Persist message with sender derived strictly from authenticated socket
        const savedMessage = await prisma.message.create({
          data: {
            content,
            conversationId,
            senderId: userId,
          },
          select: {
            id: true,
            content: true,
            conversationId: true,
            senderId: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Touch conversation updatedAt for chronological recency
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        const safeMessage: SafeMessage = {
          id: savedMessage.id,
          content: savedMessage.content,
          conversationId: savedMessage.conversationId,
          senderId: savedMessage.senderId,
          createdAt: savedMessage.createdAt,
          sender: savedMessage.sender,
        };

        // Broadcast to all participants in the conversation room
        const roomName = `conversation:${conversationId}`;
        io.to(roomName).emit("message:new", safeMessage);

        // Acknowledge the sender
        ack?.({
          success: true,
          message: safeMessage,
        });
      } catch (err: unknown) {
        console.error("Error persisting message:", err);
        ack?.({
          success: false,
          error: "Failed to persist and send message",
        });
      }
    });
  });

  ioInstance = io;
  return io;
};

/**
 * Returns the active Socket.IO server instance if initialized.
 */
export const getSocketServer = () => ioInstance;

/**
 * Gracefully shuts down the Socket.IO server.
 */
export const closeSocketServer = async (): Promise<void> => {
  if (ioInstance) {
    await new Promise<void>((resolve) => {
      ioInstance!.close(() => resolve());
    });
    ioInstance = null;
  }
};
