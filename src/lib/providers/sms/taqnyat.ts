import type { SmsDeliveryReport, SmsMessage, SmsProvider } from "./index";
import { renderSmsTemplate } from "./templates";

/**
 * Taqnyat REST (backend.md §2.2): POST {base}/v1/messages, Bearer token, recipients without "+".
 * We do NOT use Taqnyat's verify.php: OTPs are generated and checked by us (D20).
 * Delivery-report authentication is pending provider confirmation (backend.md 2.8-5) → P5-02.
 */
export class TaqnyatSmsProvider implements SmsProvider {
  readonly name = "taqnyat";
  constructor(private readonly cfg: { baseUrl: string; apiKey?: string; sender: string }) {}

  async send(message: SmsMessage) {
    if (!this.cfg.apiKey) throw new Error("TAQNYAT_API_KEY is not set");
    const body = renderSmsTemplate(message.templateKey, message.vars, message.locale);
    const res = await fetch(`${this.cfg.baseUrl}/v1/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.cfg.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ recipients: [message.to.replace(/^\+/, "")], body, sender: this.cfg.sender }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Taqnyat send failed: HTTP ${res.status}`);
    const json = (await res.json().catch(() => ({}))) as { messageId?: string | number };
    return { providerMessageId: json.messageId != null ? String(json.messageId) : null };
  }

  async parseDeliveryReport(): Promise<SmsDeliveryReport[]> {
    throw new Error("Taqnyat delivery reports: P5-02 (auth method to be confirmed by the provider)");
  }
}
