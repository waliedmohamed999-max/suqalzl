/**
 * WhatsAppProvider (D20): Meta Cloud API, utility templates for notifications and marketing templates
 * for abandoned carts ONLY with consent (D19). Implementation in P5-02; console driver for dev.
 */
import { maskPhone } from "../../phone";

export interface WhatsAppTemplateMessage {
  to: string;
  template: string;
  category: "utility" | "marketing" | "authentication";
  locale: "ar" | "en";
  /** positional template parameters — no unnecessary personal data (SPEC §8) */
  params: string[];
}

export interface WhatsAppProvider {
  readonly name: string;
  sendTemplate(message: WhatsAppTemplateMessage): Promise<{ providerMessageId: string | null }>;
}

export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  readonly name = "console";
  async sendTemplate(m: WhatsAppTemplateMessage) {
    if (process.env.APP_ENV === "production") throw new Error("console WhatsApp driver is not allowed in production");
    if (process.env.NODE_ENV !== "test")
      console.info(`[whatsapp:console] to=${maskPhone(m.to)} template=${m.template}`);
    return { providerMessageId: null };
  }
}

let instance: WhatsAppProvider | undefined;
export function whatsappProvider(): WhatsAppProvider {
  if (instance) return instance;
  if ((process.env.WHATSAPP_PROVIDER ?? "console") !== "console") {
    throw new Error("WHATSAPP_PROVIDER=meta: Meta Cloud API adapter is P5-02");
  }
  return (instance = new ConsoleWhatsAppProvider());
}
