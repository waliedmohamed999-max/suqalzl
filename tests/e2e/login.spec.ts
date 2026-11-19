import { expect, test } from "@playwright/test";
import {
  exhaustPhoneHour,
  logOffset,
  otpFromLog,
  randomPhone,
  resetRateLimits,
  setSetting,
  superAdmin,
} from "./helpers";

test.beforeAll(async () => resetRateLimits());

test.describe("customer login (phone + OTP)", () => {
  test("protected /account → /login?next → OTP → back to /account", async ({ page }) => {
    const phone = randomPhone();
    await page.goto("/account", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const offset = logOffset();
    await page.getByLabel("رقم الجوال").fill(phone.slice(4)); // 5XXXXXXXX
    await page.getByRole("button", { name: "أرسل رمز التحقق" }).click();
    await expect(page.getByRole("heading", { name: "أدخل الرمز" })).toBeVisible();

    const code = await otpFromLog(phone, offset);
    await page.getByLabel("رمز التحقق من 6 أرقام").fill(code); // completes → auto-submit
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "حسابي" })).toBeVisible();
  });

  test("wrong code shows an inline error and keeps the user on the code step", async ({ page }) => {
    const phone = randomPhone();
    await page.goto("/login", { waitUntil: "networkidle" });
    const offset = logOffset();
    await page.getByLabel("رقم الجوال").fill(`0${phone.slice(4)}`);
    await page.getByRole("button", { name: "أرسل رمز التحقق" }).click();
    const real = await otpFromLog(phone, offset);
    const wrong = real === "000000" ? "111111" : "000000";
    await page.getByLabel("رمز التحقق من 6 أرقام").fill(wrong);
    await expect(page.locator("main").getByRole("alert")).toContainText("الرمز غير صحيح.");
    await expect(page.getByLabel("رمز التحقق من 6 أرقام")).toHaveAttribute("aria-invalid", "true");
  });

  test("over the hourly per-phone limit: proof-of-work challenge is solved in the browser (D36-2)", async ({
    page,
  }) => {
    const phone = randomPhone();
    await exhaustPhoneHour(phone);
    await page.goto("/login", { waitUntil: "networkidle" });
    const offset = logOffset();
    await page.getByLabel("رقم الجوال").fill(phone.slice(4));
    const challenge = page.waitForResponse((r) => r.url().endsWith("/api/auth/challenge"));
    await page.getByRole("button", { name: "أرسل رمز التحقق" }).click();
    expect((await challenge).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "أدخل الرمز" })).toBeVisible();
    expect(await otpFromLog(phone, offset)).toMatch(/^\d{6}$/);
  });

  test("invalid phone is caught before any request", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByLabel("رقم الجوال").fill("12345");
    await page.getByRole("button", { name: "أرسل رمز التحقق" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("اكتب 9 أرقام تبدأ بـ 5.");
  });

  test("English login page is LTR with English copy", async ({ page }) => {
    await page.goto("/en/login", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("button", { name: "Send verification code" })).toBeVisible();
  });
});

test.describe("staff login (D31)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetRateLimits();
  });

  test.afterAll(async () => {
    await setSetting("staffTwoFactorEnabled", false);
  });

  test("2FA off (default): password → /admin shell → logout", async ({ page }) => {
    await setSetting("staffTwoFactorEnabled", false);
    const admin = superAdmin();
    await page.goto("/admin", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/staff\/login\?next=%2Fadmin/);
    await page.getByLabel("البريد الإلكتروني").fill(admin.email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(admin.password);
    await page.getByRole("button", { name: "دخول", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "لوحة الإدارة" })).toBeVisible();
    await expect(page.getByText("تذكر هذا الجهاز 30 يوماً")).toHaveCount(0);

    await page.waitForLoadState("networkidle"); // hydrated before clicking client buttons
    const isMobile = (page.viewportSize()?.width ?? 0) < 1024;
    if (isMobile) await page.getByRole("button", { name: "فتح القائمة" }).click();
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test("wrong password: one generic error", async ({ page }) => {
    await page.goto("/staff/login", { waitUntil: "networkidle" });
    await page.getByLabel("البريد الإلكتروني").fill(superAdmin().email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill("definitely-wrong-password");
    await page.getByRole("button", { name: "دخول", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
  });

  test("2FA on: code step appears, remember device, next login skips 2FA", async ({ page }) => {
    const admin = superAdmin();
    test.skip(!admin.phone, "SUPER_ADMIN_PHONE is needed for 2FA");
    await setSetting("staffTwoFactorEnabled", true);

    await page.goto("/staff/login", { waitUntil: "networkidle" });
    const offset = logOffset();
    await page.getByLabel("البريد الإلكتروني").fill(admin.email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(admin.password);
    await page.getByRole("button", { name: "دخول", exact: true }).click();
    await expect(page.getByRole("heading", { name: "رمز التحقق" })).toBeVisible();
    await page.getByRole("checkbox", { name: "تذكر هذا الجهاز 30 يوماً" }).click();
    const code = await otpFromLog(admin.phone!, offset);
    await page.getByLabel("رمز التحقق من 6 أرقام").fill(code);
    await expect(page).toHaveURL(/\/admin$/);

    // Same browser (trusted-device cookie kept), new session: no code step.
    await page.context().clearCookies({ name: /session/ });
    await page.goto("/staff/login", { waitUntil: "networkidle" });
    await page.getByLabel("البريد الإلكتروني").fill(admin.email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(admin.password);
    await page.getByRole("button", { name: "دخول", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test("unknown path renders the Arabic 404 inside the app", async ({ page }) => {
  const res = await page.goto("/no-such-page", { waitUntil: "networkidle" });
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "الصفحة غير موجودة" })).toBeVisible();
  await expect(page.getByRole("link", { name: "العودة للرئيسية" })).toBeVisible();
});
