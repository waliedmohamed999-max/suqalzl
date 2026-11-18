import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import type { SmsLocale, SmsTemplateKey } from "./index";

const TEMPLATES: Record<SmsLocale, Record<string, string>> = { ar: ar.sms, en: en.sms };
const MAX_VARS = 2; // SPEC §8: fixed template, at most two variables

/** Renders a registered template. Unknown variables or more than two variables are a bug. */
export function renderSmsTemplate(key: SmsTemplateKey, vars: Record<string, string>, locale: SmsLocale): string {
  const tpl = TEMPLATES[locale][key];
  if (!tpl) throw new Error(`unknown SMS template ${key}`);
  const names = [...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
  if (names.length > MAX_VARS) throw new Error(`SMS template ${key} has more than ${MAX_VARS} variables`);
  for (const k of Object.keys(vars)) if (!names.includes(k)) throw new Error(`variable ${k} not in SMS template ${key}`);
  return tpl.replace(/\{(\w+)\}/g, (_, n: string) => {
    const v = vars[n];
    if (v === undefined) throw new Error(`missing SMS variable ${n}`);
    return v;
  });
}
