import jwt, { SignOptions } from "jsonwebtoken";
import { CookieOptions } from "express";
import { env } from "../config/env";

export interface JwtUserPayload {
  userId: string;
  email: string;
}

export interface JwtTokenPayload extends JwtUserPayload {
  type?: "session" | "socket_ticket";
}

export const AUTH_COOKIE_NAME = "auth_token";

/**
 * Signs a standard session token stored strictly in the HTTP-only cookie.
 */
export const signToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(
    {
      ...payload,
      type: "session",
    },
    env.JWT_SECRET,
    options
  );
};

/**
 * Verifies a session token from the HTTP-only cookie.
 * Strictly rejects socket tickets or malformed payloads to prevent privilege elevation.
 */
export const verifyToken = (token: string): JwtUserPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== "object" ||
    !decoded ||
    !("userId" in decoded) ||
    !("email" in decoded)
  ) {
    throw new Error("Invalid token payload structure");
  }

  const payload = decoded as JwtTokenPayload;
  if (payload.type === "socket_ticket") {
    throw new Error(
      "Invalid token type: socket ticket cannot be used for session authentication"
    );
  }

  return {
    userId: payload.userId,
    email: payload.email,
  };
};

/**
 * Signs a dedicated, short-lived (60s) Socket.IO ticket.
 * Contains an explicit type claim ("socket_ticket") ensuring it cannot be used
 * as a regular HTTP session token.
 */
export const signSocketToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = {
    expiresIn: "60s",
  };
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      type: "socket_ticket",
    },
    env.JWT_SECRET,
    options
  );
};

/**
 * Verifies a short-lived Socket.IO ticket from the handshake auth payload.
 * Strictly requires the "socket_ticket" purpose claim and rejects regular session tokens.
 */
export const verifySocketToken = (token: string): JwtUserPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== "object" ||
    !decoded ||
    !("userId" in decoded) ||
    !("email" in decoded)
  ) {
    throw new Error("Invalid token payload structure");
  }

  const payload = decoded as JwtTokenPayload;
  if (payload.type !== "socket_ticket") {
    throw new Error("Invalid token type: expected socket_ticket");
  }

  return {
    userId: payload.userId,
    email: payload.email,
  };
};

/**
 * Auth cookie options:
 * - httpOnly: prevents client-side JavaScript access
 * - secure: requires HTTPS in production
 * - sameSite: "lax" ensures the cookie is sent on top-level navigation and same-origin proxy requests
 * - Host-only: no broad Domain attribute set
 */
export const getAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/",
});

export const getClearCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
