import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

// Documented local-development fallback key (strictly disallowed in production)
export const DEV_JWT_SECRET_FALLBACK =
  "chatflow_dev_only_jwt_secret_key_at_least_32_characters!";

const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://chatflow:chatflow_secret@localhost:5432/chatflow_db?schema=public"),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

export const envSchema = baseEnvSchema
  .transform((data) => {
    // In development and test, provide a fallback if not explicitly configured
    if (data.NODE_ENV !== "production") {
      return {
        ...data,
        JWT_SECRET: data.JWT_SECRET || DEV_JWT_SECRET_FALLBACK,
      };
    }
    return {
      ...data,
      JWT_SECRET: data.JWT_SECRET ?? "",
    };
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
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
    }

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

