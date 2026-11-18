import { maskPhone } from "../../phone";
import type { SmsDeliveryReport, SmsMessage, SmsProvider } from "./index";
import { renderSmsTemplate } from "./templates";

/** Development driver (SPEC §2: "في التطوير يُطبع الكود في الـ console"). Refuses to run in production. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  readonly sent: (SmsMessage & { text: string })[] = [];

  async send(message: SmsMessage) {
    if (process.env.APP_ENV === "production") throw new Error("console SMS driver is not allowed in production");
    const text = renderSmsTemplate(message.templateKey, message.vars, message.locale);
    this.sent.push({ ...message, text });
    if (this.sent.length > 100) this.sent.shift();
    if (process.env.NODE_ENV !== "test") console.info(`[sms:console] to=${maskPhone(message.to)} text="${text}"`);
    return { providerMessageId: null };
  }

  async parseDeliveryReport(): Promise<SmsDeliveryReport[]> {
    return [];
  }
}
