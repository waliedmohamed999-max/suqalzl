/**
 * SmsProvider (D20, SPEC §2): send(to, templateKey, vars, locale) + parseDeliveryReport().
 * Taqnyat is the provider; Unifonic is the documented fallback behind the same interface.
 * Every SMS is a FIXED template (src/messages/*.json → "sms"), max 2 variables, full https links,
 * sender "SuqAlZal" (SPEC §8). In development the console driver prints the message (and the OTP).
 * NEVER call send() inside withCtx (SPEC §9): send after the transaction commits.
 */
import { env } from "../../env";
import { ConsoleSmsProvider } from "./console";
import { TaqnyatSmsProvider } from "./taqnyat";

export type SmsTemplateKey = "otp";
export type SmsLocale = "ar" | "en";

export interface SmsMessage {
  to: string; // E.164 +9665XXXXXXXX
  templateKey: SmsTemplateKey;
  vars: Record<string, string>;
  locale: SmsLocale;
}

export interface SmsDeliveryReport {
  providerMessageId: string;
  to: string;
  status: "DELIVERED" | "FAILED" | "PENDING";
  raw: unknown;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<{ providerMessageId: string | null }>;
  parseDeliveryReport(req: Request): Promise<SmsDeliveryReport[]>;
}

let instance: SmsProvider | undefined;

export function smsProvider(): SmsProvider {
  if (instance) return instance;
  const e = env();
  switch (e.SMS_PROVIDER) {
    case "taqnyat":
      instance = new TaqnyatSmsProvider({ baseUrl: e.TAQNYAT_API_BASE_URL, apiKey: e.TAQNYAT_API_KEY, sender: e.TAQNYAT_SENDER_NAME });
      break;
    case "unifonic":
      throw new Error("SMS_PROVIDER=unifonic: fallback adapter not implemented yet (P5-02)");
    default:
      instance = new ConsoleSmsProvider();
  }
  return instance;
}

/** Tests only. */
export function setSmsProvider(p: SmsProvider | undefined) {
  instance = p;
}
