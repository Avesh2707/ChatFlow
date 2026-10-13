import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __chatflow_prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__chatflow_prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalThis.__chatflow_prisma = prisma;
}

/**
 * Generates a deterministic canonical key for a direct (1-to-1) conversation
 * between two users. Enforces at the database level that no duplicate 1-on-1
 * conversation can exist regardless of which user initiates it.
 *
 * @param userA First user ID
 * @param userB Second user ID
 * @returns Sorted, colon-separated canonical key (e.g., "id1:id2")
 */
export const getDirectConversationKey = (userA: string, userB: string): string => {
  return [userA, userB].sort().join(":");
};

export interface DatabaseHealthResult {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Checks database connectivity by executing a fast raw query (`SELECT 1`).
 *
 * @returns Health status object with latency in milliseconds or error message.
 */
export const checkDatabaseHealth = async (): Promise<DatabaseHealthResult> => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      latencyMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return {
      connected: false,
      error: message,
    };
  }
};
