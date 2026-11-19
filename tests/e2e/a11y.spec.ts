import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { resetRateLimits } from "./helpers";

/** SPEC §10 E2E 6 / tokens.md 12.5: no serious or critical axe violations, Arabic and English. */
async function audit(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

const PAGES = ["/", "/en", "/login", "/en/login", "/staff/login", "/no-such-page", "/en/no-such-page"];

test.beforeAll(async () => resetRateLimits());

for (const path of PAGES) {
  test(`axe ${path}`, async ({ page }) => {
    await page.goto(path);
    await audit(page);
  });
}

test("axe: mobile menu open (ar)", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1024, "menu is mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: "القائمة" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "القائمة" })).toBeFocused();
});

test("axe: OTP step (ar)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("رقم الجوال").fill(`5${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`);
  await page.getByRole("button", { name: "أرسل رمز التحقق" }).click();
  await expect(page.getByRole("heading", { name: "أدخل الرمز" })).toBeVisible();
  await audit(page);
});

test("touch targets in the store header are at least 44px", async ({ page }) => {
  await page.goto("/");
  const header = page.locator("header").first();
  for (const el of await header.locator("a, button").all()) {
    if (!(await el.isVisible())) continue;
    const box = (await el.boundingBox())!;
    expect(
      Math.round(box.height),
      (await el.getAttribute("aria-label")) ?? (await el.textContent()) ?? "",
    ).toBeGreaterThanOrEqual(44);
  }
});
