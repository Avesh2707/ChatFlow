import test from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import {
  signToken,
  verifyToken,
  signSocketToken,
  verifySocketToken,
  getAuthCookieOptions,
  getClearCookieOptions,
  AUTH_COOKIE_NAME,
} from "./jwt";
import { env } from "../config/env";

test("JWT Utilities: Session vs Socket Ticket Token Isolation", async (t) => {
  const userPayload = {
    userId: "test-user-uuid-1234",
    email: "test@chatflow.dev",
  };

  await t.test("signToken issues token with type 'session'", () => {
    const token = signToken(userPayload);
    const decoded = jwt.decode(token) as { userId: string; email: string; type?: string };
    assert.strictEqual(decoded.userId, userPayload.userId);
    assert.strictEqual(decoded.email, userPayload.email);
    assert.strictEqual(decoded.type, "session");
  });

  await t.test("verifyToken accepts valid session token", () => {
    const token = signToken(userPayload);
    const verified = verifyToken(token);
    assert.strictEqual(verified.userId, userPayload.userId);
    assert.strictEqual(verified.email, userPayload.email);
  });

  await t.test("signSocketToken issues token with type 'socket_ticket' and 60s expiration", () => {
    const token = signSocketToken(userPayload);
    const decoded = jwt.decode(token) as {
      userId: string;
      email: string;
      type: string;
      exp: number;
      iat: number;
    };
    assert.strictEqual(decoded.userId, userPayload.userId);
    assert.strictEqual(decoded.email, userPayload.email);
    assert.strictEqual(decoded.type, "socket_ticket");
    // Expiration must be approximately 60 seconds from issuance
    assert.strictEqual(decoded.exp - decoded.iat, 60);
  });

  await t.test("verifySocketToken accepts valid socket ticket", () => {
    const token = signSocketToken(userPayload);
    const verified = verifySocketToken(token);
    assert.strictEqual(verified.userId, userPayload.userId);
    assert.strictEqual(verified.email, userPayload.email);
  });

  await t.test("verifyToken STRICTLY rejects socket_ticket (prevents using ticket as session)", () => {
    const socketTicket = signSocketToken(userPayload);
    assert.throws(
      () => verifyToken(socketTicket),
      /socket ticket cannot be used for session authentication/
    );
  });

  await t.test("verifySocketToken STRICTLY rejects regular session tokens (wrong-purpose rejection)", () => {
    const sessionToken = signToken(userPayload);
    assert.throws(
      () => verifySocketToken(sessionToken),
      /Invalid token type: expected socket_ticket/
    );
  });

  await t.test("verifySocketToken rejects expired tickets", () => {
    // Generate an already expired socket ticket
    const expiredToken = jwt.sign(
      {
        userId: userPayload.userId,
        email: userPayload.email,
        type: "socket_ticket",
      },
      env.JWT_SECRET,
      { expiresIn: "-1s" }
    );
    assert.throws(
      () => verifySocketToken(expiredToken),
      /jwt expired/
    );
  });
});

test("JWT Utilities: Cookie Configuration Invariants", async (t) => {
  await t.test("getAuthCookieOptions sets SameSite=Lax and HTTP-only without broad domain", () => {
    const opts = getAuthCookieOptions();
    assert.strictEqual(opts.httpOnly, true);
    assert.strictEqual(opts.sameSite, "lax");
    assert.strictEqual(opts.path, "/");
    assert.strictEqual(opts.domain, undefined); // Host-only cookie, never broad *.vercel.app domain
    assert.strictEqual(typeof opts.maxAge, "number");
    assert.ok(opts.maxAge! > 0);
  });

  await t.test("getClearCookieOptions matches auth cookie SameSite and path for clean removal", () => {
    const clearOpts = getClearCookieOptions();
    const authOpts = getAuthCookieOptions();
    assert.strictEqual(clearOpts.httpOnly, authOpts.httpOnly);
    assert.strictEqual(clearOpts.sameSite, authOpts.sameSite);
    assert.strictEqual(clearOpts.path, authOpts.path);
    assert.strictEqual(clearOpts.domain, undefined);
  });

  await t.test("AUTH_COOKIE_NAME is 'auth_token'", () => {
    assert.strictEqual(AUTH_COOKIE_NAME, "auth_token");
  });
});
