// @vitest-environment node
import { describe, expect, it } from "vitest";
import { solvePowInBrowser } from "@/features/auth/pow";
import { leadingZeroBits, powHash } from "@/lib/providers/captcha";

describe("browser PoW solver (D36-2)", () => {
  it("finds a solution the server-side check accepts", async () => {
    const token = "test-token-abcdef0123456789";
    const solution = await solvePowInBrowser(token, 12);
    expect(leadingZeroBits(powHash(token, solution))).toBeGreaterThanOrEqual(12);
  });
});
