import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma, getDirectConversationKey } from "../db";
import { directConversationSchema } from "../schemas/conversation.schema";

/**
 * List all direct conversations for the currently authenticated user.
 */
export const getConversations = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId!;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    res.status(200).json({ conversations });
  } catch (err: unknown) {
    console.error("Error retrieving conversations:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve conversations",
    });
  }
};

/**
 * Create or retrieve an existing direct (1-to-1) conversation.
 * Uses the canonical directKey and Prisma unique constraint to prevent duplicates.
 */
export const createDirectConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  const currentUserId = req.userId!;
  const result = directConversationSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Validation Error",
      message: "Invalid conversation request",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { recipientId } = result.data;

  // Prevent user from starting a direct conversation with themselves
  if (recipientId === currentUserId) {
    res.status(400).json({
      error: "Bad Request",
      message: "Cannot create a direct conversation with yourself",
    });
    return;
  }

  try {
    // Verify recipient user exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, email: true },
    });

    if (!recipient) {
      res.status(404).json({
        error: "Not Found",
        message: "Recipient user not found",
      });
      return;
    }

    // Compute canonical deterministic key
    const directKey = getDirectConversationKey(currentUserId, recipientId);

    // Check if conversation already exists
    const existing = await prisma.conversation.findUnique({
      where: { directKey },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (existing) {
      res.status(200).json({
        message: "Existing conversation retrieved",
        conversation: existing,
      });
      return;
    }

    // Create new direct conversation
    try {
      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          directKey,
          participants: {
            create: [
              { userId: currentUserId },
              { userId: recipientId },
            ],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        message: "Conversation created successfully",
        conversation: newConversation,
      });
    } catch (createErr: unknown) {
      // Handle concurrent creation race condition via unique directKey constraint
      if (
        createErr instanceof Prisma.PrismaClientKnownRequestError &&
        createErr.code === "P2002"
      ) {
        const racedConversation = await prisma.conversation.findUnique({
          where: { directKey },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        if (racedConversation) {
          res.status(200).json({
            message: "Existing conversation retrieved",
            conversation: racedConversation,
          });
          return;
        }
      }
      throw createErr;
    }
  } catch (err: unknown) {
    console.error("Error creating direct conversation:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create or retrieve conversation",
    });
  }
};

/**
 * Retrieve messages for a conversation, ensuring the requesting user is a participant.
 */
export const getConversationMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const conversationId = req.params.id;

  if (!conversationId) {
    res.status(400).json({
      error: "Bad Request",
      message: "Conversation ID is required",
    });
    return;
  }

  try {
    // Verify membership authorization
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      res.status(403).json({
        error: "Forbidden",
        message: "You are not a participant in this conversation",
      });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 100,
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

    res.status(200).json({ messages });
  } catch (err: unknown) {
    console.error("Error retrieving conversation messages:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve messages",
    });
  }
};
