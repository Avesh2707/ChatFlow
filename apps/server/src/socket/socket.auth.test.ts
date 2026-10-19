import test from "node:test";
import assert from "node:assert";
import http from "http";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { initSocketServer, closeSocketServer } from "./index";
import { prisma } from "../db";
import {
  signToken,
  signSocketToken,
  AUTH_COOKIE_NAME,
} from "../utils/jwt";
import { env } from "../config/env";

test("Socket.IO Handshake Authentication & Reconnection Tests", async (t) => {
  const app = createApp();
  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const socketUrl = `http://localhost:${address.port}`;

  const validUser = {
    id: "user-socket-test-1111",
    name: "Sam Socket",
    email: "sam@chatflow.dev",
  };

  const origFindUnique = prisma.user.findUnique;
  (prisma.user as any).findUnique = async (args: { where: { id?: string; email?: string } }) => {
    if (args?.where?.id === validUser.id || args?.where?.email === validUser.email) {
      return {
        id: validUser.id,
        name: validUser.name,
        email: validUser.email,
        passwordHash: "mock-hash",
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  };

  t.after(async () => {
    (prisma.user as any).findUnique = origFindUnique;
    await closeSocketServer();
    server.close();
  });

  await t.test("Socket connects successfully using fresh socket ticket in auth payload", async () => {
    const ticket = signSocketToken({
      userId: validUser.id,
      email: validUser.email,
    });

    const client: ClientSocket = ioClient(socketUrl, {
      auth: { token: ticket },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        assert.ok(client.connected);
        client.disconnect();
        resolve();
      });
      client.on("connect_error", (err) => {
        client.disconnect();
        reject(err);
      });
    });
  });

  await t.test("Socket connection is REJECTED when ticket is expired", async () => {
    const expiredTicket = jwt.sign(
      {
        userId: validUser.id,
        email: validUser.email,
        type: "socket_ticket",
      },
      env.JWT_SECRET,
      { expiresIn: "-1s" }
    );

    const client: ClientSocket = ioClient(socketUrl, {
      auth: { token: expiredTicket },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        client.disconnect();
        reject(new Error("Socket should not have connected with expired ticket"));
      });
      client.on("connect_error", (err) => {
        assert.ok(err.message.includes("Authentication error"));
        assert.ok(err.message.includes("expired"));
        client.disconnect();
        resolve();
      });
    });
  });

  await t.test("Socket connection is REJECTED when regular session token is passed in auth (wrong purpose)", async () => {
    const sessionToken = signToken({
      userId: validUser.id,
      email: validUser.email,
    });

    const client: ClientSocket = ioClient(socketUrl, {
      auth: { token: sessionToken },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        client.disconnect();
        reject(new Error("Socket should not have connected with regular session token in auth"));
      });
      client.on("connect_error", (err) => {
        assert.ok(err.message.includes("Authentication error"));
        assert.ok(err.message.includes("expected socket_ticket"));
        client.disconnect();
        resolve();
      });
    });
  });

  await t.test("Socket connection is REJECTED when credentials are completely missing", async () => {
    const client: ClientSocket = ioClient(socketUrl, {
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        client.disconnect();
        reject(new Error("Socket should not have connected without credentials"));
      });
      client.on("connect_error", (err) => {
        assert.ok(err.message.includes("Authentication error"));
        assert.ok(err.message.includes("Missing authentication credentials"));
        client.disconnect();
        resolve();
      });
    });
  });

  await t.test("Socket connects successfully using session cookie (local development flow)", async () => {
    const sessionToken = signToken({
      userId: validUser.id,
      email: validUser.email,
    });

    const client: ClientSocket = ioClient(socketUrl, {
      extraHeaders: {
        Cookie: `${AUTH_COOKIE_NAME}=${sessionToken}`,
      },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        assert.ok(client.connected);
        client.disconnect();
        resolve();
      });
      client.on("connect_error", (err) => {
        client.disconnect();
        reject(err);
      });
    });
  });

  await t.test("Socket reconnects retrieving a new ticket via dynamic auth callback", async () => {
    let ticketCallCount = 0;

    const dynamicAuth = (cb: (data: { token?: string }) => void) => {
      ticketCallCount++;
      const freshTicket = signSocketToken({
        userId: validUser.id,
        email: validUser.email,
      });
      cb({ token: freshTicket });
    };

    const client: ClientSocket = ioClient(socketUrl, {
      auth: dynamicAuth,
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 50,
      reconnectionAttempts: 3,
    });

    // 1. Initial connection
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => {
        assert.strictEqual(ticketCallCount, 1);
        resolve();
      });
      client.once("connect_error", reject);
    });

    // 2. Disconnect and trigger reconnect
    client.disconnect();
    client.connect();

    // 3. Reconnection should trigger dynamicAuth again to fetch fresh ticket
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => {
        assert.strictEqual(ticketCallCount, 2, "Reconnection must have invoked dynamic auth callback for fresh ticket");
        client.disconnect();
        resolve();
      });
      client.once("connect_error", reject);
    });
  });
});
