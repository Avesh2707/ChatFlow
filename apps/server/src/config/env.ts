import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

// Documented local-development fallback key (strictly disallowed in production)
export const DEV_JWT_SECRET_FALLBACK =
  "chatflow_dev_only_jwt_secret_key_at_least_32_characters!";
export const DEV_DATABASE_URL_FALLBACK =
  "postgresql://chatflow:chatflow_secret@localhost:5432/chatflow_db?schema=public";
export const DEV_CLIENT_URL_FALLBACK = "http://localhost:3000";

const isLocalhostHost = (hostname: string): boolean => {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
};

const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

export const envSchema = baseEnvSchema
  .transform((data) => {
    // In development and test, provide safe fallbacks if not explicitly configured
    if (data.NODE_ENV !== "production") {
      return {
        ...data,
        CLIENT_URL: data.CLIENT_URL || DEV_CLIENT_URL_FALLBACK,
        DATABASE_URL: data.DATABASE_URL || DEV_DATABASE_URL_FALLBACK,
        JWT_SECRET: data.JWT_SECRET || DEV_JWT_SECRET_FALLBACK,
      };
    }
    return {
      ...data,
      CLIENT_URL: data.CLIENT_URL ?? "",
      DATABASE_URL: data.DATABASE_URL ?? "",
      JWT_SECRET: data.JWT_SECRET ?? "",
    };
  })
  .superRefine((data, ctx) => {
    // -------------------------------------------------------------
    // Production-Specific Strict Invariant Checks
    // -------------------------------------------------------------
    if (data.NODE_ENV === "production") {
      // 1. DATABASE_URL: must be explicitly provided, valid PostgreSQL, and NOT localhost
      if (!data.DATABASE_URL || data.DATABASE_URL.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "DATABASE_URL is required in production and must be explicitly provided via environment variables.",
          path: ["DATABASE_URL"],
        });
      } else if (data.DATABASE_URL === DEV_DATABASE_URL_FALLBACK) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A development DATABASE_URL placeholder cannot be used in production.",
          path: ["DATABASE_URL"],
        });
      } else {
        try {
          const dbUrl = new URL(data.DATABASE_URL);
          if (
            dbUrl.protocol !== "postgresql:" &&
            dbUrl.protocol !== "postgres:"
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "DATABASE_URL must be a valid PostgreSQL connection URL starting with postgresql:// or postgres://.",
              path: ["DATABASE_URL"],
            });
          } else if (isLocalhostHost(dbUrl.hostname)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "DATABASE_URL cannot point to localhost or a loopback address in production.",
              path: ["DATABASE_URL"],
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "DATABASE_URL is malformed. Please provide a valid PostgreSQL connection URL.",
            path: ["DATABASE_URL"],
          });
        }
      }

      // 2. CLIENT_URL: must be explicitly provided, valid HTTPS URL, and NOT localhost
      if (!data.CLIENT_URL || data.CLIENT_URL.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "CLIENT_URL is required in production and must be explicitly provided via environment variables.",
          path: ["CLIENT_URL"],
        });
      } else if (data.CLIENT_URL === DEV_CLIENT_URL_FALLBACK) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A development CLIENT_URL placeholder cannot be used in production.",
          path: ["CLIENT_URL"],
        });
      } else {
        try {
          const clientUrl = new URL(data.CLIENT_URL);
          if (clientUrl.protocol !== "https:") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "CLIENT_URL must use the secure HTTPS protocol in production.",
              path: ["CLIENT_URL"],
            });
          } else if (isLocalhostHost(clientUrl.hostname)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "CLIENT_URL cannot point to localhost or a loopback address in production.",
              path: ["CLIENT_URL"],
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "CLIENT_URL is malformed. Please provide a valid HTTPS URL.",
            path: ["CLIENT_URL"],
          });
        }
      }

      // 3. JWT_SECRET: required in production, cannot be placeholder
      if (!data.JWT_SECRET || data.JWT_SECRET.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "JWT_SECRET is required in production and must be explicitly provided via environment variables.",
          path: ["JWT_SECRET"],
        });
        return;
      }

      if (
        data.JWT_SECRET === DEV_JWT_SECRET_FALLBACK ||
        data.JWT_SECRET ===
          "chatflow_super_secret_jwt_key_at_least_32_chars_long_2026"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A development JWT_SECRET placeholder cannot be used in production.",
          path: ["JWT_SECRET"],
        });
        return;
      }
    } else {
      // -------------------------------------------------------------
      // Development / Test General Syntax Verification
      // -------------------------------------------------------------
      try {
        new URL(data.CLIENT_URL);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CLIENT_URL must be a valid URL.",
          path: ["CLIENT_URL"],
        });
      }

      try {
        const dbUrl = new URL(data.DATABASE_URL);
        if (
          dbUrl.protocol !== "postgresql:" &&
          dbUrl.protocol !== "postgres:"
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "DATABASE_URL must be a valid PostgreSQL connection URL starting with postgresql:// or postgres://.",
            path: ["DATABASE_URL"],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DATABASE_URL must be a valid URL.",
          path: ["DATABASE_URL"],
        });
      }
    }

    // 4. JWT_SECRET length requirement (applies to all environments)
    if (data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET must be at least 32 characters long.",
        path: ["JWT_SECRET"],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (rawEnv: Record<string, unknown> = process.env) => {
  return envSchema.safeParse(rawEnv);
};

const parseEnv = (): Env => {
  const parsed = validateEnv(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
};

export const env = parseEnv();
