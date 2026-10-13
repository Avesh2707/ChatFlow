import { Router, Request, Response } from "express";
import { checkDatabaseHealth } from "../db";

export const healthRouter = Router();

healthRouter.get("/", async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.connected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    service: "server",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbHealth.connected ? "connected" : "disconnected",
      ...(dbHealth.latencyMs !== undefined && { latencyMs: dbHealth.latencyMs }),
      ...(dbHealth.error && { error: dbHealth.error }),
    },
  });
});
