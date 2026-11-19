/**
 * Phone masking for admin lists (README 4.6: the phone shows masked; revealing it is an audited
 * action that arrives in P3-01). "+966551234512" -> "+9665•••••12". Latin digits, LTR.
 */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const p = phone.replace(/\s+/g, "");
  if (p.length <= 6) return "•".repeat(p.length);
  const head = p.startsWith("+") ? p.slice(0, 5) : p.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, p.length - head.length - 2))}${p.slice(-2)}`;
}

/** "m•••@example.com" */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain || !user) return "•••";
  return `${user[0]}•••@${domain}`;
}
