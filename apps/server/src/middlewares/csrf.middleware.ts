import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * Normalizes a URL string to its canonical origin (e.g., "http://localhost:3000"),
 * safely removing any trailing slashes, paths, or query parameters.
 */
export const getNormalizedOrigin = (urlStr: string): string | null => {
  try {
    return new URL(urlStr).origin;
  } catch {
    return null;
  }
};

/**
 * Validates Origin and Referer headers on state-changing requests (POST, PUT, DELETE, PATCH).
 * Protects against cross-site request forgery (CSRF) in conjunction with SameSite cookies.
 */
export const validateOrigin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const method = req.method.toUpperCase();
  const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  if (!isStateChanging) {
    return next();
  }

  const allowedOrigin = getNormalizedOrigin(env.CLIENT_URL);
  if (!allowedOrigin) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Server configuration error: invalid CLIENT_URL",
    });
    return;
  }

  const origin = req.headers.origin;

  if (origin) {
    const normalizedOrigin = getNormalizedOrigin(origin);
    if (!normalizedOrigin || normalizedOrigin !== allowedOrigin) {
      res.status(403).json({
        error: "Forbidden",
        message: "CSRF protection: request origin does not match allowed client origin",
      });
      return;
    }
    return next();
  }

  const referer = req.headers.referer;
  if (referer) {
    const refererOrigin = getNormalizedOrigin(referer);
    if (!refererOrigin) {
      res.status(403).json({
        error: "Forbidden",
        message: "CSRF protection: malformed referer header",
      });
      return;
    }

    if (refererOrigin !== allowedOrigin) {
      res.status(403).json({
        error: "Forbidden",
        message: "CSRF protection: referer origin does not match allowed client origin",
      });
      return;
    }
    return next();
  }

  // If neither Origin nor Referer is present (e.g., non-browser server-to-server or test runner), allow
  next();
};
