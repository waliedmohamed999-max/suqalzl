/**
 * Runs in every test worker before any import of src/. Points the app at the TEST database
 * (TEST_DATABASE_URL / TEST_DIRECT_URL) and provides throwaway secrets when CI did not set them.
 */
import "dotenv/config";

const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";
env.APP_ENV = "test";
if (env.TEST_DATABASE_URL) env.DATABASE_URL = env.TEST_DATABASE_URL;
if (env.TEST_DIRECT_URL) env.DIRECT_URL = env.TEST_DIRECT_URL;
const fallback = (k: string, v: string) => {
  if (!env[k]) env[k] = v;
};
fallback("AUTH_SECRET", "test-auth-secret-0123456789abcdef0123456789abcdef");
fallback("OTP_HMAC_SECRET", "test-otp-secret-0123456789abcdef0123456789abcdef");
fallback("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
fallback("FIELD_ENCRYPTION_KEY_ID", "v1");
fallback("CRON_SECRET", "test-cron-secret");
fallback("APP_URL", "http://localhost:3000");
env.SMS_PROVIDER = "console";
env.EMAIL_PROVIDER = "console";
env.WHATSAPP_PROVIDER = "console";
env.PAYMENTS_MODE = "sandbox";
env.REALTIME_HEARTBEAT_SECONDS = "1";
env.DB_POOL_MAX = env.TEST_DB_POOL_MAX ?? "20";
