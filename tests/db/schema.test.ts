import { readFileSync } from "node:fs";
import path from "node:path";
import internals from "@prisma/internals";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withCtx } from "@/lib/db";
import { ownerQuery, seedFixture, SYS, truncateAll, vendorCtx, type Seed } from "./helpers";

/**
 * The applied database (migrations 0001–0010) vs prisma/schema.prisma, plus the database-level
 * guarantees Prisma cannot express: RLS everywhere, runtime-role privileges, append-only tables,
 * guard triggers, CHECKs, exclusion constraint, price-history trigger, sequences.
 */
let s: Seed;
beforeAll(async () => {
  await truncateAll();
  s = await seedFixture();
});

describe("schema drift: database == prisma/schema.prisma", () => {
  it("every model/field exists with the same nullability, list-ness and enum values", async () => {
    const dmmf = await internals.getDMMF({ datamodel: readFileSync(path.resolve("prisma/schema.prisma"), "utf8") });
    const cols = (
      await ownerQuery<{
        table_name: string;
        column_name: string;
        is_nullable: string;
        data_type: string;
        udt_name: string;
      }>(
        `SELECT table_name, column_name, is_nullable, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public'`,
      )
    ).rows;
    const byTable = new Map<string, Map<string, (typeof cols)[number]>>();
    for (const c of cols) {
      if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Map());
      byTable.get(c.table_name)!.set(c.column_name, c);
    }
    const problems: string[] = [];
    for (const m of dmmf.datamodel.models) {
      const table = m.dbName ?? m.name;
      const t = byTable.get(table);
      if (!t) {
        problems.push(`missing table ${table}`);
        continue;
      }
      const expected = new Set<string>();
      for (const f of m.fields) {
        if (f.kind === "object") continue;
        const col = f.dbName ?? f.name;
        expected.add(col);
        const c = t.get(col);
        if (!c) {
          problems.push(`missing column ${table}.${col}`);
          continue;
        }
        const nullable = c.is_nullable === "YES";
        if (nullable !== (!f.isRequired && !f.isList)) problems.push(`nullability ${table}.${col}`);
        if (f.isList !== (c.data_type === "ARRAY")) problems.push(`list ${table}.${col}`);
        if (f.kind === "enum" && c.udt_name !== f.type)
          problems.push(`enum type ${table}.${col}: ${c.udt_name} != ${f.type}`);
      }
      // Unsupported("tsvector") is not in the DMMF: allow it explicitly.
      for (const col of t.keys())
        if (!expected.has(col) && !(table === "products" && col === "search_vector"))
          problems.push(`extra column ${table}.${col}`);
    }
    const enums = (
      await ownerQuery<{ typname: string; labels: string[] }>(
        `SELECT t.typname, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
         FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' GROUP BY t.typname`,
      )
    ).rows;
    for (const e of dmmf.datamodel.enums) {
      const db = enums.find((x) => x.typname === e.name);
      if (!db) problems.push(`missing enum ${e.name}`);
      else if (JSON.stringify(db.labels) !== JSON.stringify(e.values.map((v) => v.name)))
        problems.push(`enum values ${e.name}`);
    }
    expect(problems).toEqual([]);
  });

  it("migrations are recorded in _prisma_migrations exactly like `prisma migrate deploy`", async () => {
    const r = await ownerQuery<{ migration_name: string; checksum: string; finished_at: Date | null }>(
      `SELECT migration_name, checksum, finished_at FROM _prisma_migrations ORDER BY migration_name`,
    );
    expect(r.rows.map((x) => x.migration_name)).toEqual([
      "0001_init_core",
      "0002_catalog_inventory",
      "0003_orders_payments",
      "0004_shipping",
      "0005_ledger_payouts",
      "0006_price_history",
      "0007_deals",
      "0008_negotiation",
      "0009_security_hardening",
      "0010_realtime_outbox",
      "0011_session_revocation_cron_leases",
    ]);
    for (const row of r.rows) {
      expect(row.finished_at).not.toBeNull();
      expect(row.checksum).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("RLS and privileges (SPEC §4, D34)", () => {
  it("ENABLE + FORCE on every table (except the two SECURITY DEFINER-owned tables)", async () => {
    const r = await ownerQuery<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'`,
    );
    expect(r.rowCount).toBeGreaterThan(60);
    for (const t of r.rows) {
      expect(t.relrowsecurity, t.relname).toBe(true);
      expect(t.relforcerowsecurity, t.relname).toBe(!["price_history", "realtime_events"].includes(t.relname));
    }
  });

  it("the runtime role is not owner, not superuser, NOBYPASSRLS, and cannot TRUNCATE or DELETE append-only data", async () => {
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    try {
      const me = (await c.query("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")).rows[0];
      expect(me).toEqual({ rolsuper: false, rolbypassrls: false });
      await expect(c.query("TRUNCATE audit_logs")).rejects.toThrow(/permission denied/);
      for (const t of ["audit_logs", "wallet_transactions", "tax_invoices", "orders", "payments", "users"]) {
        await expect(c.query(`DELETE FROM ${t}`), t).rejects.toThrow(/permission denied/);
      }
      await expect(c.query("SELECT * FROM _prisma_migrations")).rejects.toThrow(/permission denied/);
      await expect(
        c.query("INSERT INTO price_history (variant_id, price) VALUES (gen_random_uuid(), 1)"),
      ).rejects.toThrow(/permission denied/);
      await expect(c.query("CREATE TABLE evil (x int)")).rejects.toThrow(/permission denied/);
    } finally {
      await c.end();
    }
  });
});

describe("database guarantees", () => {
  it("audit_logs is append-only (M11) even for the owner", async () => {
    await withCtx(SYS, (tx) => tx.auditLog.create({ data: { action: "test.x", entity: "Test" } }));
    await expect(ownerQuery("UPDATE audit_logs SET action = 'y'")).rejects.toThrow(/append-only/);
    await expect(ownerQuery("DELETE FROM audit_logs")).rejects.toThrow(/append-only/);
  });

  it("wallet ledger: sign CHECK, immutable amounts, forward-only status, unique idempotency key (C7)", async () => {
    const insert = (type: string, amount: number, key: string) =>
      ownerQuery(
        `INSERT INTO wallet_transactions (vendor_id, type, amount, idempotency_key) VALUES ($1, $2::"WalletTransactionType", $3, $4) RETURNING id`,
        [s.vendorA, type, amount, key],
      );
    await expect(insert("COMMISSION_DEBIT", 100, "k1")).rejects.toThrow(/wallet_transactions_sign/);
    const id = (await insert("SALE_CREDIT", 100_000, "sale:1")).rows[0]!.id;
    await expect(insert("SALE_CREDIT", 100_000, "sale:1")).rejects.toThrow(/idempotency_key/);
    await expect(ownerQuery("UPDATE wallet_transactions SET amount = 1 WHERE id = $1", [id])).rejects.toThrow(
      /append-only/,
    );
    await ownerQuery("UPDATE wallet_transactions SET status = 'AVAILABLE' WHERE id = $1", [id]);
    await expect(ownerQuery("UPDATE wallet_transactions SET status = 'PENDING' WHERE id = $1", [id])).rejects.toThrow(
      /cannot move/,
    );
    await expect(ownerQuery("DELETE FROM wallet_transactions WHERE id = $1", [id])).rejects.toThrow(/append-only/);
  });

  it("guard triggers: a vendor cannot publish, feature, or touch reserved stock; staff can", async () => {
    const v = vendorCtx(s, "A");
    await expect(
      withCtx(v, (tx) => tx.product.update({ where: { id: s.productADraft }, data: { status: "PUBLISHED" } })),
    ).rejects.toThrow(/privileged product columns/);
    await expect(
      withCtx(v, (tx) => tx.product.update({ where: { id: s.productADraft }, data: { isFeatured: true } })),
    ).rejects.toThrow();
    await expect(
      withCtx(v, (tx) => tx.productVariant.update({ where: { id: s.variantA }, data: { reservedStock: 5 } })),
    ).rejects.toThrow(/reserved_stock/);
    await withCtx(v, (tx) =>
      tx.product.update({ where: { id: s.productADraft }, data: { status: "PENDING", nameAr: "تعديل" } }),
    );
    await expect(
      withCtx(v, (tx) => tx.vendor.update({ where: { id: s.vendorA }, data: { commissionRate: 0 } })),
    ).rejects.toThrow(/privileged vendor columns/);
    await withCtx(v, (tx) => tx.vendor.update({ where: { id: s.vendorA }, data: { descriptionAr: "وصف" } }));
    await withCtx({ kind: "admin", userId: s.ownerA }, (tx) =>
      tx.product.update({ where: { id: s.productADraft }, data: { status: "PUBLISHED" } }),
    );
  });

  it("CHECKs: Saudi phone format, variant stock invariants, coupon code upper-case", async () => {
    await expect(
      ownerQuery("INSERT INTO users (name, phone, role) VALUES ('x', '+971501234567', 'CUSTOMER')"),
    ).rejects.toThrow(/users_phone_format/);
    await expect(
      ownerQuery("UPDATE product_variants SET reserved_stock = stock + 1 WHERE id = $1", [s.variantA]),
    ).rejects.toThrow(/reserved_le_stock/);
    await expect(
      ownerQuery(
        "INSERT INTO coupons (code, type, value, starts_at, ends_at) VALUES ('lower10', 'PERCENT', 1000, now(), now() + interval '1 day')",
      ),
    ).rejects.toThrow(/coupons_code_upper/);
  });

  it("H5: price changes are recorded by trigger with the acting user", async () => {
    await withCtx(vendorCtx(s, "A"), (tx) =>
      tx.productVariant.update({ where: { id: s.variantA }, data: { price: 210_000 } }),
    );
    const h = await ownerQuery<{ price: number; changed_by_user_id: string }>(
      "SELECT price, changed_by_user_id FROM price_history WHERE variant_id = $1 ORDER BY changed_at",
      [s.variantA],
    );
    expect(h.rows.map((r) => r.price)).toEqual([200_000, 210_000]);
    expect(h.rows[1]!.changed_by_user_id).toBe(s.ownerA);
    const seen = await withCtx(vendorCtx(s, "B"), (tx) => tx.priceHistory.count({ where: { variantId: s.variantA } }));
    expect(seen).toBe(0); // other vendors cannot read it
  });

  it("H6: one blocking deal per variant per time range (exclusion constraint)", async () => {
    const deal = async () =>
      (
        await ownerQuery(
          `INSERT INTO deals (vendor_id, product_id, type, deal_price, starts_at, ends_at, title_ar, title_en)
           VALUES ($1, $2, 'FLASH', 150000, now(), now() + interval '2 hours', 'عرض', 'Deal') RETURNING id`,
          [s.vendorA, s.productA],
        )
      ).rows[0]!.id as string;
    const d1 = await deal();
    const d2 = await deal();
    const dv = (d: string, from: string, to: string) =>
      ownerQuery(
        `INSERT INTO deal_variants (deal_id, variant_id, starts_at, ends_at) VALUES ($1, $2, now() + $3::interval, now() + $4::interval)`,
        [d, s.variantA, from, to],
      );
    await dv(d1, "0 hours", "2 hours");
    await expect(dv(d2, "1 hour", "3 hours")).rejects.toThrow(/deal_variants_no_overlap/);
    await dv(d2, "3 hours", "4 hours"); // no overlap: fine
    await expect(
      ownerQuery(
        `INSERT INTO deals (product_id, type, starts_at, ends_at, title_ar, title_en) VALUES ($1, 'DAILY', now(), now() + interval '1 day', 'x', 'x')`,
        [s.productA],
      ),
    ).rejects.toThrow(/deals_one_price/);
  });

  it("M1: order / price-request numbers come from sequences", async () => {
    const r = await ownerQuery<{ n: string }>("SELECT nextval('order_number_seq')::text AS n");
    expect(Number(r.rows[0]!.n)).toBeGreaterThanOrEqual(100_001);
    const p = await ownerQuery<{ n: string }>("SELECT nextval('price_request_number_seq')::text AS n");
    expect(Number(p.rows[0]!.n)).toBeGreaterThanOrEqual(10_001);
  });
});

afterAll(async () => {
  await truncateAll();
});
