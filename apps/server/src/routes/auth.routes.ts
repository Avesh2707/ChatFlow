import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateOrigin } from "../middlewares/csrf.middleware";

export const authRouter = Router();

// State-changing authentication endpoints with CSRF origin validation
authRouter.post("/register", validateOrigin, register);
authRouter.post("/login", validateOrigin, login);
authRouter.post("/logout", validateOrigin, logout);

// Protected profile endpoint
authRouter.get("/me", requireAuth, getMe);
