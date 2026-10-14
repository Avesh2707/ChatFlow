import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { registerSchema, loginSchema, updateProfileSchema } from "../schemas/auth.schema";
import { hashPassword, comparePassword } from "../utils/password";
import {
  signToken,
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getClearCookieOptions,
} from "../utils/jwt";
import { broadcastUserUpdate } from "../socket";

/**
 * Register a new user account.
 * Validates inputs, normalizes email, hashes password with bcryptjs,
 * handles duplicate emails safely, and returns safe public user fields.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Validation Error",
      message: "Invalid registration input",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, email, password } = result.data;

  try {
    // Check for duplicate email before creation
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      res.status(409).json({
        error: "Conflict",
        message: "An account with this email already exists",
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (err: unknown) {
    // Catch database-level unique constraint violations (e.g. from concurrent registrations)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      res.status(409).json({
        error: "Conflict",
        message: "An account with this email already exists",
      });
      return;
    }

    console.error("Registration error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred during registration",
    });
  }
};

/**
 * Authenticate user with email and password.
 * Validates credentials, sets an HTTP-only cookie with signed JWT,
 * and returns safe user data (without JWT or passwordHash in response body).
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Validation Error",
      message: "Invalid login input",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = result.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Use generic error message for invalid credentials to prevent email enumeration
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
      return;
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
      return;
    }

    // Sign JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
    });

    // Store JWT strictly in an HTTP-only cookie
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    console.error("Login error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred during login",
    });
  }
};

/**
 * Log out user by clearing the authentication cookie.
 */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
  res.status(200).json({
    message: "Logged out successfully",
  });
};

/**
 * Get current authenticated user details from verified cookie.
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
      res.status(401).json({
        error: "Unauthorized",
        message: "User account no longer exists",
      });
      return;
    }

    res.status(200).json({
      user,
    });
  } catch (err: unknown) {
    console.error("GetMe error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve user profile",
    });
  }
};

/**
 * Update current authenticated user profile (display name, avatar).
 * Validates input and guarantees user can only update their own record.
 */
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
    return;
  }

  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Validation Error",
      message: "Invalid profile update data",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, avatar } = result.data;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    broadcastUserUpdate(updatedUser);

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err: unknown) {
    console.error("Update profile error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update profile",
    });
  }
};
