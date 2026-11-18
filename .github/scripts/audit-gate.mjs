#!/usr/bin/env node
// -----------------------------------------------------------------------------
// npm audit gate with an EXPIRING allowlist (security.yml, job `dependencies`).
//
//   npm audit --omit=dev --json > audit.json || true
//   node .github/scripts/audit-gate.mjs audit.json [--allowlist .github/audit-allowlist.json]
//                                       [--level high] [--today YYYY-MM-DD]
//
// Fails (exit 1) when an advisory at or above --level (default: high) is found and
// it is NOT covered by a valid allowlist entry. An entry covers an advisory when
// its `id` (GHSA-...) and `package` match and `expires` is today or later.
// Fails closed (exit 2) on unreadable/invalid audit JSON, an npm error report,
// or an invalid allowlist (missing fields, bad date, expiry > MAX_DAYS ahead).
// Warns (never fails) about entries that match nothing (remove them) and entries
// expiring within WARN_DAYS.
//
// No dependencies: plain Node 18+. Writes GitHub annotations and, when
// GITHUB_STEP_SUMMARY is set, a Markdown table of what it saw.
// -----------------------------------------------------------------------------
import { appendFileSync, readFileSync } from "node:fs";

const SEVERITY = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const MAX_DAYS = 120; // no entry may be allowlisted further ahead than this
const WARN_DAYS = 14;
const DAY_MS = 86_400_000;

function parseArgs(argv) {
  const opts = { auditPath: null, allowlist: ".github/audit-allowlist.json", level: "high", today: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--allowlist") opts.allowlist = argv[++i];
    else if (a === "--level") opts.level = argv[++i];
    else if (a === "--today") opts.today = argv[++i];
    else if (!a.startsWith("--") && !opts.auditPath) opts.auditPath = a;
    else bail(`unknown argument: ${a}`);
  }
  if (!opts.auditPath)
    bail("usage: audit-gate.mjs <npm-audit.json> [--allowlist file] [--level high] [--today YYYY-MM-DD]");
  if (!(opts.level in SEVERITY)) bail(`--level must be one of ${Object.keys(SEVERITY).join(", ")}`);
  return opts;
}

/** GitHub workflow command (annotation), with the escaping the runner requires. */
function annotate(level, title, msg) {
  const data = (v) => String(v).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  const prop = (v) => data(v).replace(/:/g, "%3A").replace(/,/g, "%2C");
  console.log(`::${level} title=${prop(title)}::${data(msg)}`);
}

function bail(msg) {
  annotate("error", "audit-gate", msg);
  process.exit(2);
}

function readJson(path, what) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    bail(`cannot read ${what} ${path}: ${err.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    bail(`${what} ${path} is not valid JSON: ${err.message}`);
  }
}

/** YYYY-MM-DD -> UTC midnight ms, or NaN. */
function day(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  const t = Date.parse(`${s}T00:00:00Z`);
  return new Date(t).toISOString().slice(0, 10) === s ? t : NaN;
}

function ghsaOf(adv) {
  const fromUrl = typeof adv.url === "string" ? adv.url.match(/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i) : null;
  return fromUrl ? fromUrl[0] : String(adv.source ?? adv.title ?? "unknown");
}

/** Every advisory object in an npm audit v2 report (auditReportVersion 2, npm >= 7). */
function advisoriesOf(report) {
  if (report.error) bail(`npm audit reported an error: ${report.error.summary ?? JSON.stringify(report.error)}`);
  if (report.auditReportVersion !== 2 || typeof report.vulnerabilities !== "object") {
    bail("unexpected npm audit format (need `npm audit --json` from npm >= 7, auditReportVersion 2)");
  }
  const seen = new Map();
  for (const [pkg, vuln] of Object.entries(report.vulnerabilities)) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== "object" || via === null) continue; // a string = "inherited from <pkg>"
      const id = ghsaOf(via);
      const key = `${id}|${via.name ?? pkg}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id,
          package: via.name ?? pkg,
          severity: via.severity ?? vuln.severity,
          range: via.range ?? vuln.range ?? "",
          title: via.title ?? "",
          url: via.url ?? "",
          fix: vuln.fixAvailable,
        });
      }
    }
  }
  return [...seen.values()];
}

function validateAllowlist(doc, today) {
  const entries = Array.isArray(doc?.entries) ? doc.entries : bail('allowlist must be { "entries": [ ... ] }');
  const problems = [];
  entries.forEach((e, i) => {
    const where = `allowlist entry #${i + 1} (${e?.id ?? "no id"})`;
    for (const f of ["id", "package", "reason", "owner", "expires"]) {
      if (typeof e?.[f] !== "string" || !e[f].trim()) problems.push(`${where}: field "${f}" is required`);
    }
    if (typeof e?.id === "string" && !/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(e.id)) {
      problems.push(`${where}: id must be a GHSA id`);
    }
    const exp = day(e?.expires);
    if (Number.isNaN(exp)) problems.push(`${where}: expires must be a real date YYYY-MM-DD`);
    else if (exp - today > MAX_DAYS * DAY_MS) problems.push(`${where}: expires is more than ${MAX_DAYS} days ahead`);
  });
  if (problems.length) {
    for (const p of problems) annotate("error", `audit-allowlist`, `${p}`);
    process.exit(2);
  }
  return entries;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const today = opts.today ? day(opts.today) : day(new Date().toISOString().slice(0, 10));
  if (Number.isNaN(today)) bail("--today must be YYYY-MM-DD");
  const min = SEVERITY[opts.level];

  const advisories = advisoriesOf(readJson(opts.auditPath, "audit report"));
  const entries = validateAllowlist(readJson(opts.allowlist, "allowlist"), today);
  const used = new Set();
  const rows = [];
  let blocking = 0;

  for (const adv of advisories.sort((a, b) => (SEVERITY[b.severity] ?? 0) - (SEVERITY[a.severity] ?? 0))) {
    const sev = SEVERITY[adv.severity] ?? SEVERITY.critical; // unknown severity = treat as worst
    if (sev < min) continue;
    const idx = entries.findIndex((e) => e.id.toLowerCase() === adv.id.toLowerCase() && e.package === adv.package);
    const entry = idx >= 0 ? entries[idx] : null;
    let status;
    if (!entry) {
      status = "BLOCKING (not allowlisted)";
      blocking++;
      annotate(
        "error",
        `${adv.package} ${adv.id} (${adv.severity})`,
        `${adv.title} ${adv.url} — upgrade, or add a dated entry to ${opts.allowlist}`,
      );
    } else if (day(entry.expires) < today) {
      used.add(idx);
      status = `BLOCKING (allowlist expired ${entry.expires})`;
      blocking++;
      annotate(
        "error",
        `${adv.package} ${adv.id} (${adv.severity})`,
        `allowlist entry expired on ${entry.expires} (owner: ${entry.owner}). Fix it or renew the entry with a new reason.`,
      );
    } else {
      used.add(idx);
      status = `allowed until ${entry.expires} (${entry.owner})`;
      if (day(entry.expires) - today <= WARN_DAYS * DAY_MS) {
        annotate(
          "warning",
          `${adv.package} ${adv.id}`,
          `allowlist entry expires on ${entry.expires} (owner: ${entry.owner})`,
        );
      }
      annotate("notice", `${adv.package} ${adv.id} (${adv.severity})`, `allowlisted: ${entry.reason}`);
    }
    rows.push(`| ${adv.package} | ${adv.severity} | [${adv.id}](${adv.url}) | ${adv.range} | ${status} |`);
  }

  entries.forEach((e, i) => {
    if (!used.has(i)) {
      annotate(
        "warning",
        `audit-allowlist`,
        `entry ${e.id} (${e.package}) matches no current advisory at >= ${opts.level}; remove it`,
      );
    }
  });

  const summary = [
    `### npm audit gate (production dependencies, level >= ${opts.level})`,
    "",
    rows.length
      ? "| package | severity | advisory | range | status |\n|---|---|---|---|---|\n" + rows.join("\n")
      : "No advisories at or above the level.",
    "",
    blocking ? `**${blocking} blocking advisory(ies).**` : "**Gate passed.**",
    "",
  ].join("\n");
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
  process.exit(blocking ? 1 : 0);
}

main();
