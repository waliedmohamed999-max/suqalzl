/**
 * EmailProvider (SPEC §2): Resend in production, SMTP for Mailpit in development
 * (notes-for-backend §5: Mailpit has no Resend API), console as last resort.
 * Money in e-mails is TEXT ("ر.س"/"SAR"): formatSAR(..., { display: "text" }) (tokens.md 8.4.6).
 * Never call send() inside withCtx (SPEC §9).
 */
import type { Transporter } from "nodemailer";
import { env } from "../../env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** e.g. "transactional" | "marketing" — marketing needs recorded consent (SPEC §8) */
  category: "transactional" | "marketing";
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ providerMessageId: string | null }>;
}

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  readonly sent: EmailMessage[] = [];
  async send(m: EmailMessage) {
    if (process.env.APP_ENV === "production") throw new Error("console e-mail driver is not allowed in production");
    this.sent.push(m);
    if (this.sent.length > 100) this.sent.shift();
    if (process.env.NODE_ENV !== "test") console.info(`[email:console] subject="${m.subject}"`);
    return { providerMessageId: null };
  }
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transport: Transporter | undefined;
  constructor(
    private readonly cfg: { host: string; port: number; secure: boolean; user?: string; password?: string; from: string },
  ) {}
  async send(m: EmailMessage) {
    if (!this.transport) {
      const nodemailer = await import("nodemailer");
      this.transport = nodemailer.createTransport({
        host: this.cfg.host,
        port: this.cfg.port,
        secure: this.cfg.secure,
        auth: this.cfg.user ? { user: this.cfg.user, pass: this.cfg.password } : undefined,
      });
    }
    const info = await this.transport.sendMail({ from: this.cfg.from, to: m.to, subject: m.subject, html: m.html, text: m.text, replyTo: m.replyTo });
    return { providerMessageId: info.messageId ?? null };
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private readonly cfg: { apiKey?: string; from: string }) {}
  async send(m: EmailMessage) {
    if (!this.cfg.apiKey) throw new Error("RESEND_API_KEY is not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.cfg.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: this.cfg.from, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend send failed: HTTP ${res.status}`);
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { providerMessageId: json.id ?? null };
  }
}

let instance: EmailProvider | undefined;
export function emailProvider(): EmailProvider {
  if (instance) return instance;
  const e = env();
  switch (e.EMAIL_PROVIDER) {
    case "smtp":
      instance = new SmtpEmailProvider({
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE,
        user: e.SMTP_USER,
        password: e.SMTP_PASSWORD,
        from: e.EMAIL_FROM,
      });
      break;
    case "resend":
      instance = new ResendEmailProvider({ apiKey: e.RESEND_API_KEY, from: e.EMAIL_FROM });
      break;
    default:
      instance = new ConsoleEmailProvider();
  }
  return instance;
}
export function setEmailProvider(p: EmailProvider | undefined) {
  instance = p;
}
