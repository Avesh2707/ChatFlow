import { Request, Response, NextFunction } from "express";
import { verifyToken, AUTH_COOKIE_NAME, JwtUserPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      userId?: string;
    }
  }
}

/**
 * Authentication middleware that verifies JWT in HTTP-only cookie.
 * Rejects missing, expired, or invalid tokens with 401 Unauthorized.
 * Attaches verified user ID and email to req.
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing",
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    req.userId = payload.userId;
    next();
  } catch (_err: unknown) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired authentication token",
    });
    return;
  }
};
