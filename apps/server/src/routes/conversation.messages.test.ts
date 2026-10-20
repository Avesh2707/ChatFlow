import test from "node:test";
import assert from "node:assert";
import http from "http";
import { createApp } from "../app";
import { prisma } from "../db";
import { signToken, AUTH_COOKIE_NAME } from "../utils/jwt";

test("Conversation Message History Regression Tests", async (t) => {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const participantUser = {
    id: "user-participant-101",
    name: "Participant User",
    email: "participant@chatflow.dev",
  };

  const outsiderUser = {
    id: "user-outsider-999",
    name: "Outsider User",
    email: "outsider@chatflow.dev",
  };

  const testConversationId = "conv-regression-test-id";

  // Generate 105 messages with increasing timestamps
  const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();
  const all105Messages = Array.from({ length: 105 }, (_, i) => ({
    id: `msg-${i}`,
    content: `Message ${i}`,
    conversationId: testConversationId,
    senderId: participantUser.id,
    createdAt: new Date(baseTime + i * 1000),
    sender: {
      id: participantUser.id,
      name: participantUser.name,
      email: participantUser.email,
      avatar: null,
    },
  }));

  // Preserve original prisma functions
  const origFindUniqueParticipant = prisma.conversationParticipant.findUnique;
  const origFindManyMessage = prisma.message.findMany;

  // Mock prisma participant lookup
  (prisma.conversationParticipant as any).findUnique = async (args: {
    where: { conversationId_userId?: { conversationId: string; userId: string } };
  }) => {
    const pair = args?.where?.conversationId_userId;
    if (
      pair?.conversationId === testConversationId &&
      pair?.userId === participantUser.id
    ) {
      return {
        id: "part-1",
        conversationId: testConversationId,
        userId: participantUser.id,
        joinedAt: new Date(),
      };
    }
    return null;
  };

  // Mock prisma message findMany to faithfully mimic Prisma database execution:
  // When orderBy: { createdAt: "desc" } and take: 100, the database sorts descending and takes the top 100
  (prisma.message as any).findMany = async (args: {
    where: { conversationId: string };
    orderBy?: { createdAt: "asc" | "desc" };
    take?: number;
  }) => {
    if (args?.where?.conversationId !== testConversationId) {
      return [];
    }

    let result = [...all105Messages];
    if (args?.orderBy?.createdAt === "desc") {
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (args?.orderBy?.createdAt === "asc") {
      result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    if (typeof args?.take === "number") {
      result = result.slice(0, args.take);
    }

    return result;
  };

  t.after(() => {
    (prisma.conversationParticipant as any).findUnique = origFindUniqueParticipant;
    (prisma.message as any).findMany = origFindManyMessage;
    server.close();
  });

  const participantCookie = `${AUTH_COOKIE_NAME}=${signToken({
    userId: participantUser.id,
    email: participantUser.email,
  })}`;

  const outsiderCookie = `${AUTH_COOKIE_NAME}=${signToken({
    userId: outsiderUser.id,
    email: outsiderUser.email,
  })}`;

  await t.test(
    "GET /api/conversations/:id/messages: returns 401 when unauthenticated",
    async () => {
      const res = await fetch(
        `${baseUrl}/api/conversations/${testConversationId}/messages`
      );
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error, "Unauthorized");
    }
  );

  await t.test(
    "GET /api/conversations/:id/messages: returns 403 when user is not a participant",
    async () => {
      const res = await fetch(
        `${baseUrl}/api/conversations/${testConversationId}/messages`,
        {
          headers: { Cookie: outsiderCookie },
        }
      );
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error, "Forbidden");
      assert.strictEqual(
        data.message,
        "You are not a participant in this conversation"
      );
    }
  );

  await t.test(
    "GET /api/conversations/:id/messages: returns latest 100 messages in chronological order (regression verification)",
    async () => {
      const res = await fetch(
        `${baseUrl}/api/conversations/${testConversationId}/messages`,
        {
          headers: { Cookie: participantCookie },
        }
      );

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.messages), "Expected messages to be an array");

      // Verify the limit was enforced: exactly 100 messages returned out of 105 total
      assert.strictEqual(body.messages.length, 100);

      // Verify it fetched the LATEST 100 messages (index 5 to 104), omitting the oldest 5 (index 0 to 4)
      assert.strictEqual(
        body.messages[0].content,
        "Message 5",
        "The oldest message of the latest 100 batch should be Message 5"
      );
      assert.strictEqual(
        body.messages[99].content,
        "Message 104",
        "The newest message of the latest 100 batch should be Message 104"
      );

      // Verify strict chronological ascending order (oldest to newest for the chat UI)
      for (let i = 0; i < body.messages.length - 1; i++) {
        const currentMsgTime = new Date(body.messages[i].createdAt).getTime();
        const nextMsgTime = new Date(body.messages[i + 1].createdAt).getTime();
        assert.ok(
          currentMsgTime < nextMsgTime,
          `Messages should be strictly sorted chronologically: ${body.messages[i].content} vs ${body.messages[i + 1].content}`
        );
      }
    }
  );
});
