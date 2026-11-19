/**
 * Server environment, validated with Zod on first use (notes-for-backend §7). Import only from
 * server code. Every variable here is documented in .env.example (CLAUDE.md rule 9).
 */
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");
const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : Number(v)))
    .pipe(z.number().int().nonnegative());
const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: int(5),
  DB_POOL_TIMEOUT_MS: int(10_000),
  REALTIME_DATABASE_URL: optional,

  /** reserved (signed cookies / CSRF tokens); sessions are opaque DB tokens */
  AUTH_SECRET: optional,
  OTP_HMAC_SECRET: z.string().min(32, "OTP_HMAC_SECRET must be at least 32 characters"),
  FIELD_ENCRYPTION_KEY: optional,
  FIELD_ENCRYPTION_KEY_ID: z.string().default("v1"),
  FIELD_ENCRYPTION_PREVIOUS_KEYS: optional,

  STORAGE_PROVIDER: z.enum(["s3", "local", "auto"]).default("s3"),
  LOCAL_STORAGE_DIR: z.string().default(".data/storage"),
  S3_ENDPOINT: optional,
  S3_PUBLIC_ENDPOINT: optional,
  S3_REGION: z.string().default("us-east-1"),
  S3_FORCE_PATH_STYLE: bool,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  S3_BUCKET_PUBLIC: z.string().default("suqalzl-public"),
  S3_BUCKET_PRIVATE: z.string().default("suqalzl-private"),
  S3_SIGNED_URL_TTL_SECONDS: int(300),

  JOB_SCHEDULER: z.enum(["local", "http"]).default("local"),
  CRON_SECRET: optional,

  REALTIME_PROVIDER: z.enum(["sse"]).default("sse"),
  REALTIME_HEARTBEAT_SECONDS: int(25),

  PAYMENTS_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  MOYASAR_SECRET_KEY: optional,

  SMS_PROVIDER: z.enum(["console", "taqnyat", "unifonic"]).default("console"),
  TAQNYAT_API_BASE_URL: z.string().default("https://api.taqnyat.sa"),
  TAQNYAT_API_KEY: optional,
  TAQNYAT_SENDER_NAME: z.string().default("SuqAlZal"),

  WHATSAPP_PROVIDER: z.enum(["console", "meta"]).default("console"),

  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("Souq AlZal <no-reply@example.com>"),
  EMAIL_REPLY_TO: optional,
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: int(1025),
  SMTP_SECURE: bool,
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  RESEND_API_KEY: optional,

  SENTRY_DSN: optional,
  SENTRY_ENVIRONMENT: optional,
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0)),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  assertPaymentsSafety(parsed.data);
  cached = parsed.data;
  return cached;
}

/** notes-for-backend §6 fail-safe: live keys only in production, never test keys when live. */
export function assertPaymentsSafety(
  e: Pick<Env, "PAYMENTS_MODE" | "APP_ENV">,
  keys: (string | undefined)[] = livePaymentKeys(),
) {
  if (e.PAYMENTS_MODE === "live" && e.APP_ENV !== "production") {
    throw new Error("PAYMENTS_MODE=live is only allowed when APP_ENV=production (D14)");
  }
  for (const k of keys) {
    if (!k) continue;
    const isLive = /^(sk|pk)_live_/.test(k);
    const isTest = /^(sk|pk)_test_/.test(k);
    if (e.PAYMENTS_MODE !== "live" && isLive) throw new Error("live payment key found while PAYMENTS_MODE is not live");
    if (e.PAYMENTS_MODE === "live" && isTest) throw new Error("test payment key found while PAYMENTS_MODE=live");
  }
}

function livePaymentKeys() {
  return [
    process.env.MOYASAR_SECRET_KEY,
    process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY,
    process.env.TABBY_SECRET_KEY,
    process.env.NEXT_PUBLIC_TABBY_PUBLIC_KEY,
  ];
}

/** Test helper only. */
export function resetEnvCache() {
  cached = undefined;
}
