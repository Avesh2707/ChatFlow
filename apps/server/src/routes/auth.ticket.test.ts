import test from "node:test";
import assert from "node:assert";
import http from "http";
import { createApp } from "../app";
import { prisma } from "../db";
import {
  signToken,
  signSocketToken,
  AUTH_COOKIE_NAME,
} from "../utils/jwt";
import { env } from "../config/env";

test("HTTP Auth & Socket Ticket Integration Tests", async (t) => {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  t.after(() => {
    server.close();
  });

  const validUser = {
    id: "user-test-uuid-9999",
    name: "Alex Demo",
    email: "alex@chatflow.dev",
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

  t.after(() => {
    (prisma.user as any).findUnique = origFindUnique;
    server.close();
  });

  const validSessionCookie = `${AUTH_COOKIE_NAME}=${signToken({
    userId: validUser.id,
    email: validUser.email,
  })}`;

  await t.test("GET /api/auth/socket-token: rejects request with missing cookie (401)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/socket-token`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, "Unauthorized");
    assert.strictEqual(body.message, "Authentication token is missing");
  });

  await t.test("GET /api/auth/socket-token: rejects request with invalid cookie (401)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/socket-token`, {
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=invalid-garbage-token`,
      },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, "Unauthorized");
    assert.strictEqual(body.message, "Invalid or expired authentication token");
  });

  await t.test("GET /api/auth/socket-token: rejects socket ticket passed as session cookie (401)", async () => {
    const socketTicket = signSocketToken({
      userId: validUser.id,
      email: validUser.email,
    });
    const res = await fetch(`${baseUrl}/api/auth/socket-token`, {
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=${socketTicket}`,
      },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, "Unauthorized");
  });

  await t.test("GET /api/auth/me: regular HTTP auth strictly rejects socket ticket (401)", async () => {
    const socketTicket = signSocketToken({
      userId: validUser.id,
      email: validUser.email,
    });
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=${socketTicket}`,
      },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, "Unauthorized");
  });

  await t.test("GET /api/auth/socket-token: issues fresh ticket with valid session and no-store header (200)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/socket-token`, {
      headers: {
        Cookie: validSessionCookie,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("cache-control"), "no-store, private");

    const body = await res.json();
    assert.strictEqual(typeof body.token, "string");
    assert.strictEqual(body.expiresIn, 60);

    // Verify token payload structure
    const parts = body.token.split(".");
    assert.strictEqual(parts.length, 3);
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    assert.strictEqual(payload.userId, validUser.id);
    assert.strictEqual(payload.email, validUser.email);
    assert.strictEqual(payload.type, "socket_ticket");
  });

  await t.test("CSRF Origin Enforcement: rejects state-changing request from unauthorized origin (403)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Origin: "https://malicious-attacker.com",
        Cookie: validSessionCookie,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error, "Forbidden");
    assert.ok(body.message.includes("CSRF protection"));
  });

  await t.test("CSRF Origin Enforcement: rejects state-changing request with mismatched referer (403)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Referer: "https://malicious-attacker.com/evil-form",
        Cookie: validSessionCookie,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error, "Forbidden");
    assert.ok(body.message.includes("CSRF protection"));
  });

  await t.test("CSRF Origin Enforcement: accepts state-changing request from allowed client origin (200)", async () => {
    const allowedOrigin = new URL(env.CLIENT_URL).origin;
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        Cookie: validSessionCookie,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.message, "Logged out successfully");
  });
});
