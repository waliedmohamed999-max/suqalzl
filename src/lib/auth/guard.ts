/**
 * Authoritative area guard for Server Component layouts (/admin, /vendor, /account).
 * The middleware only checks that a session cookie EXISTS (cheap, edge-safe); this validates the
 * session in the database and the role/area, on every request.
 */
import { redirect } from "next/navigation";
import { can, type Principal } from "../permissions";
import { getPrincipal } from "./session";

export type Area = "admin" | "vendor" | "account";

export const LOGIN_PATH: Record<Area, string> = { admin: "/staff/login", vendor: "/staff/login", account: "/login" };

export async function requireArea(area: Area, locale: string = "ar"): Promise<Principal> {
  const p = await getPrincipal();
  const ok =
    area === "account" ? can(p, { area: "account" }) : area === "admin" ? p?.kind === "staff" : p?.kind === "vendor";
  if (!p || !ok) {
    const prefix = locale === "en" && area === "account" ? "/en" : "";
    redirect(`${prefix}${LOGIN_PATH[area]}`);
  }
  return p;
}
