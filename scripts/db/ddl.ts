/**
 * Minimal DMMF → PostgreSQL DDL, following Prisma Migrate's naming and defaults for the subset of
 * features this schema uses. See generate-baseline-migrations.ts for why this exists.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Datamodel = { readonly models: readonly any[]; readonly enums: readonly any[]; readonly indexes: readonly any[] };

const q = (s: string) => `"${s}"`;
const trunc = (s: string) => (s.length > 63 ? s.slice(0, 63) : s);

function tableOf(dm: Datamodel, model: string): string {
  const m = dm.models.find((x) => x.name === model);
  if (!m) throw new Error(`unknown model ${model}`);
  return m.dbName ?? m.name;
}

function colOf(model: any, field: string): string {
  const f = model.fields.find((x: any) => x.name === field);
  if (!f) throw new Error(`unknown field ${model.name}.${field}`);
  return f.dbName ?? f.name;
}

function sqlType(dm: Datamodel, f: any): string {
  if (f.kind === "enum") return q(f.type);
  const nt = f.nativeType as [string, string[]] | null;
  let base: string;
  if (nt) {
    const [name, args] = nt;
    const map: Record<string, string> = {
      Uuid: "UUID",
      Citext: "CITEXT",
      Timestamptz: "TIMESTAMPTZ",
      Decimal: "DECIMAL",
      Text: "TEXT",
    };
    const t = map[name];
    if (!t) throw new Error(`native type ${name} not supported by ddl.ts`);
    base = args.length ? `${t}(${args.join(",")})` : t;
  } else {
    const map: Record<string, string> = {
      String: "TEXT",
      Int: "INTEGER",
      BigInt: "BIGINT",
      Boolean: "BOOLEAN",
      DateTime: "TIMESTAMP(3)",
      Json: "JSONB",
      Decimal: "DECIMAL(65,30)",
    };
    const t = map[f.type];
    if (!t) throw new Error(`type ${f.type} not supported by ddl.ts`);
    base = t;
  }
  void dm;
  return f.isList ? `${base}[]` : base;
}

function sqlDefault(f: any, type: string): string | null {
  if (!f.hasDefaultValue) return null;
  const d = f.default;
  if (Array.isArray(d)) {
    if (d.length) throw new Error(`non-empty list default on ${f.name}`);
    return `ARRAY[]::${type}`;
  }
  if (d && typeof d === "object" && "name" in d) {
    if (d.name === "now") return "CURRENT_TIMESTAMP";
    if (d.name === "dbgenerated") return d.args[0];
    if (d.name === "autoincrement") return null; // handled by BIGSERIAL/SERIAL
    throw new Error(`default fn ${d.name} not supported`);
  }
  if (typeof d === "boolean" || typeof d === "number") return String(d);
  if (typeof d === "string") {
    if (f.kind === "enum") return `'${d}'`;
    return `'${d.replace(/'/g, "''")}'`;
  }
  throw new Error(`default for ${f.name} not supported`);
}

function isAutoincrement(f: any) {
  return f.default && typeof f.default === "object" && f.default.name === "autoincrement";
}

function createTable(dm: Datamodel, model: any): string {
  const table = model.dbName ?? model.name;
  const cols: string[] = [];
  for (const f of model.fields) {
    if (f.kind === "object") continue;
    const col = f.dbName ?? f.name;
    let type = sqlType(dm, f);
    if (isAutoincrement(f)) type = f.type === "BigInt" ? "BIGSERIAL" : "SERIAL";
    const def = sqlDefault(f, type);
    const parts = [q(col), type];
    if (f.isRequired || f.isList) parts.push("NOT NULL");
    if (def !== null) parts.push(`DEFAULT ${def}`);
    cols.push(`    ${parts.join(" ")}`);
  }
  const idFields: string[] =
    model.primaryKey?.fields ?? model.fields.filter((f: any) => f.isId).map((f: any) => f.name);
  cols.push(
    `    CONSTRAINT ${q(trunc(`${table}_pkey`))} PRIMARY KEY (${idFields.map((n) => q(colOf(model, n))).join(", ")})`,
  );
  return `CREATE TABLE ${q(table)} (\n${cols.join(",\n")}\n);`;
}

function indexes(dm: Datamodel, model: any): string[] {
  const table = model.dbName ?? model.name;
  const out: string[] = [];
  for (const ix of dm.indexes.filter((i) => i.model === model.name)) {
    if (ix.type === "id") continue;
    const cols = ix.fields.map((x: any) => colOf(model, x.name));
    const colSql = ix.fields
      .map((x: any) => `${q(colOf(model, x.name))}${x.sortOrder === "desc" ? " DESC" : ""}`)
      .join(", ");
    if (ix.type === "unique") {
      const name = ix.dbName ?? trunc(`${table}_${cols.join("_")}_key`);
      out.push(`CREATE UNIQUE INDEX ${q(name)} ON ${q(table)}(${colSql});`);
    } else if (ix.type === "normal") {
      const name = ix.dbName ?? trunc(`${table}_${cols.join("_")}_idx`);
      out.push(`CREATE INDEX ${q(name)} ON ${q(table)}(${colSql});`);
    } else {
      throw new Error(`index type ${ix.type} not supported`);
    }
  }
  return out;
}

interface Fk {
  key: string;
  from: string;
  to: string;
  sql: string;
}

function foreignKeys(dm: Datamodel, model: any): Fk[] {
  const table = model.dbName ?? model.name;
  const out: Fk[] = [];
  for (const f of model.fields) {
    if (f.kind !== "object" || !f.relationFromFields?.length) continue;
    const target = dm.models.find((m) => m.name === f.type);
    const fromCols = f.relationFromFields.map((n: string) => colOf(model, n));
    const toCols = f.relationToFields.map((n: string) => colOf(target, n));
    const optional = f.relationFromFields.some((n: string) => !model.fields.find((x: any) => x.name === n).isRequired);
    const onDeleteMap: Record<string, string> = {
      Cascade: "CASCADE",
      Restrict: "RESTRICT",
      SetNull: "SET NULL",
      NoAction: "NO ACTION",
      SetDefault: "SET DEFAULT",
    };
    const onDelete = f.relationOnDelete ? onDeleteMap[f.relationOnDelete] : optional ? "SET NULL" : "RESTRICT";
    const name = trunc(`${table}_${fromCols.join("_")}_fkey`);
    out.push({
      key: name,
      from: model.name,
      to: target.name,
      sql:
        `ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(name)} FOREIGN KEY (${fromCols.map(q).join(", ")}) ` +
        `REFERENCES ${q(target.dbName ?? target.name)}(${toCols.map(q).join(", ")}) ON DELETE ${onDelete} ON UPDATE CASCADE;`,
    });
  }
  return out;
}

const emittedFks = new Set<string>();

export function buildDdl(dm: Datamodel, models: string[], created: Set<string>, createdEnums: Set<string>): string {
  const parts: string[] = [];
  const modelObjs = models.map((n) => dm.models.find((m) => m.name === n));

  const enums = new Set<string>();
  for (const m of modelObjs)
    for (const f of m.fields) if (f.kind === "enum" && !createdEnums.has(f.type)) enums.add(f.type);
  for (const e of dm.enums.filter((e) => enums.has(e.name))) {
    parts.push(
      `CREATE TYPE ${q(e.dbName ?? e.name)} AS ENUM (${e.values.map((v: any) => `'${v.dbName ?? v.name}'`).join(", ")});`,
    );
    createdEnums.add(e.name);
  }
  if (enums.size) parts.push("");

  for (const m of modelObjs) {
    parts.push(createTable(dm, m), "");
    created.add(m.name);
  }
  for (const m of modelObjs) {
    const ix = indexes(dm, m);
    if (ix.length) parts.push(...ix, "");
  }
  // FKs of every created model whose target now exists and was not emitted before.
  for (const name of created) {
    const m = dm.models.find((x) => x.name === name);
    for (const fk of foreignKeys(dm, m)) {
      if (emittedFks.has(fk.key) || !created.has(fk.to)) continue;
      parts.push(fk.sql);
      emittedFks.add(fk.key);
    }
  }
  void tableOf;
  return parts.join("\n");
}
