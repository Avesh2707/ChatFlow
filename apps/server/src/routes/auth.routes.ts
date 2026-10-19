import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  getSocketToken,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateOrigin } from "../middlewares/csrf.middleware";

export const authRouter = Router();

// State-changing authentication endpoints with CSRF origin validation
authRouter.post("/register", validateOrigin, register);
authRouter.post("/login", validateOrigin, login);
authRouter.post("/logout", validateOrigin, logout);

// Protected profile endpoints
authRouter.get("/me", requireAuth, getMe);
authRouter.patch("/me", requireAuth, validateOrigin, updateProfile);

// Protected Socket.IO ticket endpoint (issues 60s ticket for WebSocket handshake)
authRouter.get("/socket-token", requireAuth, getSocketToken);
