import "server-only";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ZodError, type z } from "zod";
import { SECTION_PERMISSION } from "@/features/admin/queries";
import type { AdminSection } from "@/features/admin/schema";
import { getPrincipal } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/db";
import { can, type Principal } from "@/lib/permissions";
import { PAGE_SIZES } from "./list-params";

/**
 * Page-level helpers for /admin routes (server only). The services authorize again (defence in
 * depth); this only decides whether to render the drawn 403 instead of calling them.
 */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function adminPage(
  params: Promise<{ locale: string }>,
  section: AdminSection,
): Promise<
  { principal: Principal; allowed: true } | { principal: Principal | null; allowed: false; permission: string }
> {
  const { locale } = await params;
  setRequestLocale(locale);
  const principal = await getPrincipal();
  const need = SECTION_PERMISSION[section];
  if (principal && can(principal, need)) return { principal, allowed: true };
  return {
    principal,
    allowed: false,
    permission: need.area === "admin" ? (need.perm === "super" ? "SUPER_ADMIN" : need.perm) : "",
  };
}

/**
 * URL values are user input: keep only the keys the contract accepts (the input schemas are
 * .strict() and enum-checked), so a hand-edited ?status=foo shows the unfiltered list, not a 500.
 */
export function cleanInput<S extends z.ZodType>(schema: S, input: Record<string, unknown>): z.input<S> {
  const data: Record<string, unknown> = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  for (let i = 0; i < 5; i++) {
    const r = schema.safeParse(data);
    if (r.success) return data as z.input<S>;
    for (const issue of r.error.issues) delete data[String(issue.path[0])];
  }
  return {} as z.input<S>;
}

export const toPage = (v: string | string[] | undefined) => {
  const n = Number.parseInt(one(v) ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
};
export const toPer = (v: string | string[] | undefined) => {
  const n = Number.parseInt(one(v) ?? "", 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : PAGE_SIZES[0];
};

/** Missing or malformed ids -> the localized 404. */
export async function orNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof ZodError) notFound();
    throw e;
  }
}
