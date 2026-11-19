import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setStorageProvider } from "@/lib/providers/storage";
import { LocalStorageProvider } from "@/lib/providers/storage/local";
import type { Principal } from "@/lib/permissions";
import { DEMO_CUSTOMERS, DEMO_STAFF_EMAIL } from "../../prisma/seed-demo";
import { ownerQuery, truncateAll } from "./helpers";

export const STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "szl-m1-"));

/** Fresh DB + base seed + demo seed (SEED_DEMO=true) through the real CLI, twice (idempotency). */
export async function seedM1(): Promise<{
  output: string[];
  superAdmin: Principal;
  staff: Principal;
  customers: string[];
}> {
  await truncateAll();
  setStorageProvider(new LocalStorageProvider(STORAGE_DIR));
  const env = {
    ...process.env,
    SEED_DEMO: "true",
    SEED_DEMO_STAFF_PASSWORD: "demo-staff-password-1",
    SUPER_ADMIN_EMAIL: "root@example.com",
    SUPER_ADMIN_PASSWORD: "seed-password-123",
    STORAGE_PROVIDER: "local",
    LOCAL_STORAGE_DIR: STORAGE_DIR,
  };
  const run = () =>
    execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], { env, encoding: "utf8" });
  const output = [run(), run()];
  const users = await ownerQuery<{
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    permissions: string[];
  }>("SELECT id, email::text AS email, phone, role::text AS role, permissions FROM users");
  const admin = users.rows.find((u) => u.role === "SUPER_ADMIN")!;
  const staff = users.rows.find((u) => u.email === DEMO_STAFF_EMAIL)!;
  return {
    output,
    superAdmin: { kind: "staff", userId: admin.id, role: "SUPER_ADMIN", permissions: [] },
    staff: { kind: "staff", userId: staff.id, role: "STAFF", permissions: staff.permissions },
    customers: DEMO_CUSTOMERS.map((c) => users.rows.find((u) => u.phone === c.phone)!.id),
  };
}

/** Every key anywhere in a JSON value. */
export function allKeys(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => allKeys(x, out));
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) {
      out.add(k);
      allKeys(x, out);
    }
  return out;
}

/** Keys that must never appear in a PUBLIC (store/customer) response (D36-6, SPEC §4). */
export const FORBIDDEN_PUBLIC_KEYS = [
  "floorPrice",
  "autoAcceptPrice",
  "iban",
  "ibanLast4",
  "passwordHash",
  "legalName",
  "crNumber",
  "freelanceDocNumber",
  "vatNumber",
  "bankName",
  "accountHolderName",
  "pickupAddress",
  "ownerUserId",
  "commissionRate",
  "commissionAmount",
  "vendorNet",
  "vendorPayable",
  "reservedStock",
  "stock",
  "guestTokenHash",
  "tokenHash",
];
