/**
 * Seed (SPEC §11 P1, docs/plan.md P1-01). Idempotent: safe to run on every deploy.
 * - Runs as the APP role in a `system` RLS context (FORCE RLS applies to the owner too; SPEC §2 DB).
 * - Categories (14), cities (reference data for addresses/zones), SUPER_ADMIN from env, default
 *   settings (O1/O3/O7/O10/O14 values awaiting the owner = finance-zatca proposals, D27, D31).
 * - Existing rows are NOT overwritten (admin edits win).
 * - SEED_DEMO=true also runs prisma/seed-demo.ts (M1-01 preview catalogue, customers, orders, STAFF);
 *   refused in production.
 */
import "dotenv/config";
import { hashPassword } from "../src/lib/auth/password";
import { disconnectDb, withCtx } from "../src/lib/db";
import { normalizeSaudiMobile } from "../src/lib/phone";
import { assertDemoAllowed, seedDemo } from "./seed-demo";
import { DEFAULT_SETTINGS, PENDING_OWNER_KEYS, PUBLIC_SETTING_KEYS, type SettingKey } from "../src/lib/settings";

export const CATEGORIES: { slug: string; nameAr: string; nameEn: string; vendorsAllowed?: boolean }[] = [
  { slug: "bisht", nameAr: "بشوت", nameEn: "Bisht" },
  { slug: "farwa", nameAr: "فراوي", nameEn: "Farwa" },
  { slug: "zal", nameAr: "زل", nameEn: "Zal rugs" },
  { slug: "iqal", nameAr: "عقل", nameEn: "Iqal" },
  { slug: "incense-burners", nameAr: "مباخر", nameEn: "Incense burners" },
  { slug: "faya", nameAr: "فيس", nameEn: "Faya" },
  { slug: "rings-prayer-beads", nameAr: "خواتم ومسابح", nameEn: "Rings & prayer beads" },
  // D26: swords are platform-only until the owner decides (O11)
  { slug: "luxury-swords", nameAr: "سيوف فاخرة", nameEn: "Luxury swords", vendorsAllowed: false },
  { slug: "mahala-belts", nameAr: "أحزمة محالة", nameEn: "Mahala belts" },
  { slug: "super-saffron", nameAr: "زعفران سوبر", nameEn: "Super saffron" },
  { slug: "oud-oils", nameAr: "عود ودهن عود", nameEn: "Oud & oud oil" },
  { slug: "shawls", nameAr: "شالات", nameEn: "Shawls" },
  { slug: "sadari", nameAr: "سداري", nameEn: "Sadari" },
  { slug: "abayas", nameAr: "عبايات", nameEn: "Abayas" },
];

export const CITIES: { slug: string; nameAr: string; nameEn: string; regionCode: string }[] = [
  { slug: "riyadh", nameAr: "الرياض", nameEn: "Riyadh", regionCode: "01" },
  { slug: "al-kharj", nameAr: "الخرج", nameEn: "Al Kharj", regionCode: "01" },
  { slug: "makkah", nameAr: "مكة المكرمة", nameEn: "Makkah", regionCode: "02" },
  { slug: "jeddah", nameAr: "جدة", nameEn: "Jeddah", regionCode: "02" },
  { slug: "taif", nameAr: "الطائف", nameEn: "Taif", regionCode: "02" },
  { slug: "madinah", nameAr: "المدينة المنورة", nameEn: "Madinah", regionCode: "03" },
  { slug: "yanbu", nameAr: "ينبع", nameEn: "Yanbu", regionCode: "03" },
  { slug: "buraidah", nameAr: "بريدة", nameEn: "Buraidah", regionCode: "05" },
  { slug: "unaizah", nameAr: "عنيزة", nameEn: "Unaizah", regionCode: "05" },
  { slug: "dammam", nameAr: "الدمام", nameEn: "Dammam", regionCode: "04" },
  { slug: "khobar", nameAr: "الخبر", nameEn: "Al Khobar", regionCode: "04" },
  { slug: "dhahran", nameAr: "الظهران", nameEn: "Dhahran", regionCode: "04" },
  { slug: "al-ahsa", nameAr: "الأحساء", nameEn: "Al Ahsa", regionCode: "04" },
  { slug: "jubail", nameAr: "الجبيل", nameEn: "Jubail", regionCode: "04" },
  { slug: "qatif", nameAr: "القطيف", nameEn: "Qatif", regionCode: "04" },
  { slug: "abha", nameAr: "أبها", nameEn: "Abha", regionCode: "06" },
  { slug: "khamis-mushait", nameAr: "خميس مشيط", nameEn: "Khamis Mushait", regionCode: "06" },
  { slug: "tabuk", nameAr: "تبوك", nameEn: "Tabuk", regionCode: "07" },
  { slug: "hail", nameAr: "حائل", nameEn: "Hail", regionCode: "08" },
  { slug: "arar", nameAr: "عرعر", nameEn: "Arar", regionCode: "09" },
  { slug: "jazan", nameAr: "جازان", nameEn: "Jazan", regionCode: "10" },
  { slug: "najran", nameAr: "نجران", nameEn: "Najran", regionCode: "11" },
  { slug: "al-baha", nameAr: "الباحة", nameEn: "Al Baha", regionCode: "12" },
  { slug: "sakaka", nameAr: "سكاكا", nameEn: "Sakaka", regionCode: "13" },
];

const SETTING_DESCRIPTIONS: Partial<Record<SettingKey, string>> = {
  vatRate: "ضريبة القيمة المضافة بالـ basis points (1500 = 15%)",
  defaultCommission: "العمولة الافتراضية bps — أولوية: التاجر ← التصنيف ← هذا الإعداد (SPEC 6.1)",
  holdDays: "O3 بانتظار المالك: أيام الحجز بعد التسليم",
  newVendorHoldDays: "O3 بانتظار المالك: أيام الحجز للتاجر الجديد (holdDaysOverride عند القبول)",
  payoutCycle: "O3 بانتظار المالك",
  payoutWeekday: "O3 بانتظار المالك: يوم إنشاء دفعة التسوية (قطع 00:00 بتوقيت الرياض)",
  minPayout: "O3 بانتظار المالك: الحد الأدنى للتحويل بالهللة",
  gatewayFeeBearer: "O1 بانتظار المالك: من يتحمل رسوم كل وسيلة دفع (يُجمّد على الطلب الفرعي)",
  negotiationCommissionBps: "O7 بانتظار المالك: null = نفس سلسلة عمولة التاجر",
  platformCouponApprovalBps: "D18: كوبون عام بنسبة ≥ هذه القيمة يحتاج موافقة المالك",
  souqDiscountsRequireLicense: "D16: true يقصر الخصومات على فترات الترخيص",
  allowNonResidentVendors: "O10 بانتظار المالك",
  swordsVendorsAllowed: "D26 / O11 بانتظار المالك: السيوف للمنصة فقط",
  negotiation: "D22: حدود الفصال",
  staffLoginMethod: "D31 / O14 بانتظار المالك: PASSWORD أو PHONE_OTP (طريقة واحدة مفعّلة)",
  staffTwoFactorEnabled: "D31 / O14 بانتظار المالك: التحقق بخطوتين للإدارة والتجار",
  otp: "SPEC §9: 6 أرقام، 5 دقائق، 5 محاولات، 5 طلبات/ساعة لكل رقم وIP",
};

async function main() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const adminPhoneRaw = process.env.SUPER_ADMIN_PHONE?.trim();
  const adminPhone = adminPhoneRaw ? normalizeSaudiMobile(adminPhoneRaw) : null;
  if (adminPhoneRaw && !adminPhone) throw new Error("SUPER_ADMIN_PHONE must be a Saudi mobile (+9665XXXXXXXX)");
  const passwordHash = adminEmail && adminPassword ? await hashPassword(adminPassword) : null;

  const summary = await withCtx(
    { kind: "system", reason: "seed" },
    async (tx) => {
      let categories = 0;
      for (const [i, c] of CATEGORIES.entries()) {
        const existing = await tx.category.findUnique({ where: { slug: c.slug }, select: { id: true } });
        if (existing) continue;
        await tx.category.create({
          data: {
            slug: c.slug,
            nameAr: c.nameAr,
            nameEn: c.nameEn,
            sort: i,
            homeSort: i,
            vendorsAllowed: c.vendorsAllowed ?? true,
          },
        });
        categories++;
      }

      let cities = 0;
      for (const [i, c] of CITIES.entries()) {
        const existing = await tx.city.findUnique({ where: { slug: c.slug }, select: { id: true } });
        if (existing) continue;
        await tx.city.create({ data: { ...c, sort: i } });
        cities++;
      }

      let settings = 0;
      for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
        const existing = await tx.setting.findUnique({ where: { key }, select: { key: true } });
        if (existing) continue;
        const pending = PENDING_OWNER_KEYS.includes(key);
        await tx.setting.create({
          data: {
            key,
            value: DEFAULT_SETTINGS[key] as never,
            isPublic: PUBLIC_SETTING_KEYS.includes(key),
            description: SETTING_DESCRIPTIONS[key] ?? (pending ? "قيمة افتراضية بانتظار المالك" : null),
          },
        });
        settings++;
      }

      let admin: "created" | "exists" | "skipped" = "skipped";
      if (adminEmail && passwordHash) {
        const existing = await tx.user.findUnique({ where: { email: adminEmail }, select: { id: true, role: true } });
        if (existing) {
          admin = "exists";
          if (existing.role !== "SUPER_ADMIN")
            throw new Error(`SUPER_ADMIN_EMAIL belongs to a ${existing.role} account`);
        } else {
          await tx.user.create({
            data: {
              name: "Super Admin",
              email: adminEmail,
              emailVerifiedAt: new Date(),
              phone: adminPhone,
              phoneVerifiedAt: adminPhone ? new Date() : null,
              passwordHash,
              role: "SUPER_ADMIN",
              locale: "ar",
            },
          });
          admin = "created";
        }
      }
      return { categories, cities, settings, admin };
    },
    { timeout: 60_000 },
  );
  console.log(
    `seed: +${summary.categories} categories, +${summary.cities} cities, +${summary.settings} settings, super admin ${summary.admin}`,
  );
  if (summary.admin === "skipped")
    console.warn("seed: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — no admin created");

  if (demoEnabled) {
    const d = await seedDemo({ staffPassword: process.env.SEED_DEMO_STAFF_PASSWORD || undefined });
    console.log(
      `seed demo: +${d.products} products, +${d.bundles} bundles, +${d.banners} banners, +${d.sections} home sections, ` +
        `+${d.pages} pages, +${d.customers} customers, +${d.orders} orders, staff ${d.staff} (images: ${d.storage})`,
    );
    if (d.staffPassword && !process.env.SEED_DEMO_STAFF_PASSWORD)
      console.log(`seed demo: STAFF login staff.demo@suqalzl.invalid / ${d.staffPassword} (generated, shown once)`);
  }
}

const demoEnabled = ["true", "1"].includes((process.env.SEED_DEMO ?? "").trim().toLowerCase());
if (demoEnabled) assertDemoAllowed();

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
