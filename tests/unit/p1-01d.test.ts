import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/http";
import { leadingZeroBits, powHash, solvePow } from "@/lib/providers/captcha";
import { realtimeDatabaseUrl } from "@/lib/providers/realtime/pg-hub";
import { buildCsp, generateNonce } from "@/lib/security/csp";
import { sanitizePlainText } from "@/lib/text";

const h = (xff?: string, realIp?: string) => {
  const x = new Headers();
  if (xff !== undefined) x.set("x-forwarded-for", xff);
  if (realIp) x.set("x-real-ip", realIp);
  return x;
};

describe("QA-B1: clientIp() trusts only our proxy hops", () => {
  it("TRUSTED_PROXY_HOPS = 0 (default): XFF and X-Real-IP are ignored", () => {
    expect(clientIp(h("1.2.3.4", "5.6.7.8"), 0)).toBeNull();
  });
  it("1 hop: the right-most entry; client-written entries on the left are ignored", () => {
    expect(clientIp(h("6.6.6.6, 7.7.7.7, 203.0.113.9"), 1)).toBe("203.0.113.9");
    expect(clientIp(h("203.0.113.9"), 1)).toBe("203.0.113.9");
  });
  it("2 hops (CDN + load balancer): the second from the right", () => {
    expect(clientIp(h("6.6.6.6, 198.51.100.4, 10.0.0.2"), 2)).toBe("198.51.100.4");
  });
  it("fewer entries than hops, or garbage → null", () => {
    expect(clientIp(h("203.0.113.9"), 2)).toBeNull();
    expect(clientIp(h(""), 1)).toBeNull();
    expect(clientIp(h("not-an-ip"), 1)).toBeNull();
    expect(clientIp(h("2001:db8::1"), 1)).toBe("2001:db8::1");
  });
});

describe("QA-B10: sanitizePlainText", () => {
  it("strips tags, control and bidi characters, formula prefixes; keeps Arabic and ZWNJ", () => {
    expect(sanitizePlainText("<img src=x onerror=alert(1)>سارة", 80)).toBe("سارة");
    expect(sanitizePlainText("a‮b\u0007c", 80)).toBe("ab c");
    expect(sanitizePlainText("=HYPERLINK(1)", 80)).toBe("HYPERLINK(1)");
    expect(sanitizePlainText("مي‌نا", 80)).toBe("مي‌نا");
    expect(sanitizePlainText("  a   b  ", 80)).toBe("a b");
  });
  it("cuts by code points, never splitting a surrogate pair", () => {
    expect([...sanitizePlainText("😀".repeat(100), 80)]).toHaveLength(80);
  });
});

describe("D36-2: proof-of-work challenge", () => {
  it("leading zero bits and solver agree", () => {
    expect(leadingZeroBits("0f")).toBe(4);
    expect(leadingZeroBits("00")).toBe(8);
    expect(leadingZeroBits("8a")).toBe(0);
    expect(leadingZeroBits("1a")).toBe(3);
    const sol = solvePow("tok", 10);
    expect(leadingZeroBits(powHash("tok", sol))).toBeGreaterThanOrEqual(10);
  });
});

describe("QA-B7: CSP", () => {
  it("enforced policy blocks plugins, framing and foreign base/form targets; target script policy is report-only with a nonce", () => {
    const nonce = generateNonce();
    const { enforced, reportOnly } = buildCsp({ nonce, dev: false, reportUri: "/api/csp-report", https: true });
    expect(enforced).toContain("object-src 'none'");
    expect(enforced).toContain("frame-ancestors 'none'");
    expect(enforced).toContain("base-uri 'self'");
    expect(enforced).toContain("https://cdn.moyasar.com");
    expect(enforced).not.toContain("unsafe-eval");
    expect(reportOnly).toContain(`'nonce-${nonce}'`);
    expect(reportOnly).toContain("'strict-dynamic'");
    expect(reportOnly).toContain("report-uri /api/csp-report");
    expect(enforced).toContain("upgrade-insecure-requests");
    expect(buildCsp({ nonce, dev: false }).enforced).not.toContain("upgrade-insecure-requests"); // plain http
    expect(generateNonce()).not.toBe(nonce);
  });
  it("dev adds what next dev needs (eval for React Refresh, ws for HMR)", () => {
    const { enforced } = buildCsp({ nonce: "n", dev: true });
    expect(enforced).toContain("'unsafe-eval'");
    expect(enforced).toContain("ws:");
    expect(enforced).not.toContain("upgrade-insecure-requests");
  });
});

describe("T10 condition 1: dedicated LISTEN connection in staging/production", () => {
  it("refuses to fall back to DATABASE_URL outside dev/test", () => {
    expect(() => realtimeDatabaseUrl({ APP_ENV: "production", DATABASE_URL: "postgres://x" } as never)).toThrow(
      /REALTIME_DATABASE_URL/,
    );
    expect(() => realtimeDatabaseUrl({ APP_ENV: "staging", DATABASE_URL: "postgres://x" } as never)).toThrow();
    expect(
      realtimeDatabaseUrl({ APP_ENV: "production", REALTIME_DATABASE_URL: "postgres://l", DATABASE_URL: "x" } as never),
    ).toBe("postgres://l");
    expect(realtimeDatabaseUrl({ APP_ENV: "development", DATABASE_URL: "postgres://x" } as never)).toBe("postgres://x");
  });
});
