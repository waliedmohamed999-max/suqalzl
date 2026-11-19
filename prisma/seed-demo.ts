/**
 * M1-01 preview seed (docs/plan.md M1-01). Runs ONLY with SEED_DEMO=true and NEVER in production.
 * Everything here is illustrative and labelled as such ("توضيحي" / "Demo"): no real people, phones
 * (+96650000000X), brands or photos. Images are neutral generated SVG illustrations.
 *
 * Idempotent: rows are looked up by slug / e-mail / phone and never overwritten (admin edits win);
 * demo orders are created once (skipped if the first demo customer already has orders).
 *
 * What it adds: ~42 platform products (vendorId = null, D6) over the 14 categories with options,
 * variants and stock; 2 bundles; 2 banners and the home sections; policy pages from the docs/legal
 * v0.2 drafts; a demo shipping zone; 3 demo customers with addresses and 7 orders in different
 * states; a STAFF user with partial permissions (orders.manage + customers.view).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/auth/password";
import { withCtx, type Tx } from "../src/lib/db";
import { storageProvider } from "../src/lib/providers/storage";
import { vatOfGross } from "../src/lib/vat";

export const DEMO_STAFF_EMAIL = "staff.demo@suqalzl.invalid";
export const DEMO_STAFF_PERMISSIONS = ["orders.manage", "customers.view"];
export const DEMO_CUSTOMERS = [
  { phone: "+966500000001", name: "عميل توضيحي ١" },
  { phone: "+966500000002", name: "عميلة توضيحية ٢" },
  { phone: "+966500000003", name: "عميل توضيحي ٣" },
];
const AR_SUFFIX = " (توضيحي)";
const EN_SUFFIX = " (Demo)";

export function assertDemoAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production" || env.APP_ENV === "production")
    throw new Error("SEED_DEMO is not allowed in production (docs/plan.md M1-01)");
}

// ------------------------------------------------------------------ illustrations (neutral SVG)
const PALETTE = [
  ["#2b1d14", "#c9a45c"],
  ["#3a2a1e", "#e3cfa3"],
  ["#1c1712", "#b8893d"],
  ["#5b4330", "#f1e6cf"],
  ["#14110d", "#d8b46a"],
  ["#4a3626", "#cdb68a"],
];
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
/** Abstract geometric pattern + a small "illustrative image" caption. No people, no brands. */
export function demoSvg(seed: string, w = 800, h = 800, caption = "صورة توضيحية · Demo"): string {
  const x = hash(seed);
  const [bg, fg] = PALETTE[x % PALETTE.length]!;
  const motif = x % 3;
  const shapes: string[] = [];
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.28;
  if (motif === 0) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      shapes.push(
        `<rect x="${cx - r / 2}" y="${cy - r / 2}" width="${r}" height="${r}" fill="none" stroke="${fg}" stroke-width="3" transform="rotate(${(a * 180) / Math.PI} ${cx} ${cy})"/>`,
      );
    }
  } else if (motif === 1) {
    for (let i = 1; i <= 5; i++)
      shapes.push(
        `<circle cx="${cx}" cy="${cy}" r="${(r * i) / 4}" fill="none" stroke="${fg}" stroke-width="${6 - i}" opacity="${1 - i * 0.12}"/>`,
      );
  } else {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const rr = i % 2 ? r * 0.55 : r;
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
    }).join(" ");
    shapes.push(`<polygon points="${pts}" fill="${fg}" opacity="0.85"/>`);
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.25}" fill="${bg}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect width="${w}" height="${h}" fill="${bg}"/>
<g>${shapes.join("")}</g>
<text x="${w / 2}" y="${h - 28}" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) / 28)}" fill="${fg}" text-anchor="middle" opacity="0.8">${caption}</text>
</svg>`;
}

// ------------------------------------------------------------------ catalogue data
interface Opt {
  ar: string;
  en: string;
  values: [string, string][];
}
interface Def {
  cat: string;
  slug: string;
  ar: string;
  en: string;
  price: number; // halalas, VAT inclusive
  compareAt?: number;
  options?: Opt[];
  /** stock per variant (cycled), default 8 */
  stock?: number[];
  featured?: boolean;
  weight: number;
  descAr: string;
  descEn: string;
  /** price step per variant index (halalas) */
  step?: number;
}
const COLORS: Opt = {
  ar: "اللون",
  en: "Color",
  values: [
    ["أسود", "Black"],
    ["بني", "Brown"],
    ["كحلي", "Navy"],
  ],
};
const BISHT_SIZES: Opt = {
  ar: "المقاس",
  en: "Size",
  values: [
    ["52", "52"],
    ["54", "54"],
    ["56", "56"],
    ["58", "58"],
  ],
};
const SML: Opt = {
  ar: "المقاس",
  en: "Size",
  values: [
    ["صغير", "S"],
    ["وسط", "M"],
    ["كبير", "L"],
  ],
};

export const DEMO_PRODUCTS: Def[] = [
  // بشوت
  {
    cat: "bisht",
    slug: "demo-bisht-classic",
    ar: "بشت كلاسيكي",
    en: "Classic bisht",
    price: 185_000,
    compareAt: 220_000,
    options: [COLORS, BISHT_SIZES],
    stock: [5, 3, 0, 7, 2, 9],
    featured: true,
    weight: 900,
    descAr: "بشت توضيحي بخياطة يدوية وزري ذهبي.\n\nهذا وصف تجريبي لأغراض المعاينة فقط.",
    descEn: "Illustrative hand-finished bisht with gold trim.\n\nDemo description for the preview only.",
  },
  {
    cat: "bisht",
    slug: "demo-bisht-summer",
    ar: "بشت صيفي خفيف",
    en: "Light summer bisht",
    price: 125_000,
    options: [BISHT_SIZES],
    stock: [6, 4, 2, 0],
    weight: 600,
    descAr: "بشت صيفي توضيحي بقماش خفيف.",
    descEn: "Illustrative light summer bisht.",
  },
  {
    cat: "bisht",
    slug: "demo-bisht-royal",
    ar: "بشت ملكي مطرز",
    en: "Embroidered royal bisht",
    price: 420_000,
    options: [COLORS],
    stock: [2, 1, 3],
    featured: true,
    weight: 1100,
    descAr: "بشت توضيحي بتطريز كثيف.",
    descEn: "Illustrative heavily embroidered bisht.",
  },
  // فراوي
  {
    cat: "farwa",
    slug: "demo-farwa-heritage",
    ar: "فروة تراثية",
    en: "Heritage farwa",
    price: 95_000,
    options: [SML],
    stock: [4, 6, 2],
    featured: true,
    weight: 1500,
    descAr: "فروة توضيحية مبطنة للشتاء.",
    descEn: "Illustrative lined winter farwa.",
  },
  {
    cat: "farwa",
    slug: "demo-farwa-light",
    ar: "فروة خفيفة",
    en: "Light farwa",
    price: 65_000,
    compareAt: 79_000,
    options: [SML],
    stock: [8, 8, 0],
    weight: 1100,
    descAr: "فروة توضيحية خفيفة.",
    descEn: "Illustrative light farwa.",
  },
  {
    cat: "farwa",
    slug: "demo-farwa-kids",
    ar: "فروة أطفال",
    en: "Kids farwa",
    price: 39_000,
    stock: [12],
    weight: 600,
    descAr: "فروة توضيحية للأطفال.",
    descEn: "Illustrative kids farwa.",
  },
  // زل
  {
    cat: "zal",
    slug: "demo-zal-classic",
    ar: "زل كلاسيكي",
    en: "Classic zal rug",
    price: 78_000,
    options: [
      {
        ar: "المقاس",
        en: "Size",
        values: [
          ["2×3 م", "2×3 m"],
          ["3×4 م", "3×4 m"],
          ["4×6 م", "4×6 m"],
        ],
      },
    ],
    step: 40_000,
    stock: [5, 3, 1],
    featured: true,
    weight: 6000,
    descAr: "زل توضيحي بنقوش هندسية.",
    descEn: "Illustrative zal rug with geometric patterns.",
  },
  {
    cat: "zal",
    slug: "demo-zal-majlis",
    ar: "زل مجلس",
    en: "Majlis zal rug",
    price: 145_000,
    stock: [3],
    weight: 9000,
    descAr: "زل مجلس توضيحي.",
    descEn: "Illustrative majlis rug.",
  },
  {
    cat: "zal",
    slug: "demo-zal-runner",
    ar: "زل ممر",
    en: "Runner zal rug",
    price: 42_000,
    stock: [10],
    weight: 2500,
    descAr: "زل ممر توضيحي.",
    descEn: "Illustrative runner rug.",
  },
  // عقل
  {
    cat: "iqal",
    slug: "demo-iqal-black",
    ar: "عقال أسود",
    en: "Black iqal",
    price: 12_000,
    options: [
      {
        ar: "المقاس",
        en: "Size",
        values: [
          ["58", "58"],
          ["60", "60"],
          ["62", "62"],
        ],
      },
    ],
    stock: [20, 15, 0],
    weight: 150,
    descAr: "عقال توضيحي.",
    descEn: "Illustrative iqal.",
  },
  {
    cat: "iqal",
    slug: "demo-iqal-mirir",
    ar: "عقال مرير",
    en: "Mirir iqal",
    price: 18_500,
    stock: [9],
    weight: 160,
    descAr: "عقال مرير توضيحي.",
    descEn: "Illustrative mirir iqal.",
  },
  {
    cat: "iqal",
    slug: "demo-iqal-kids",
    ar: "عقال أطفال",
    en: "Kids iqal",
    price: 6_500,
    stock: [2],
    weight: 100,
    descAr: "عقال أطفال توضيحي.",
    descEn: "Illustrative kids iqal.",
  },
  // مباخر
  {
    cat: "incense-burners",
    slug: "demo-mabkhara-brass",
    ar: "مبخرة نحاس",
    en: "Brass incense burner",
    price: 34_000,
    compareAt: 41_000,
    options: [
      {
        ar: "اللون",
        en: "Color",
        values: [
          ["ذهبي", "Gold"],
          ["فضي", "Silver"],
        ],
      },
    ],
    stock: [7, 4],
    featured: true,
    weight: 800,
    descAr: "مبخرة توضيحية من النحاس.",
    descEn: "Illustrative brass burner.",
  },
  {
    cat: "incense-burners",
    slug: "demo-mabkhara-electric",
    ar: "مبخرة كهربائية",
    en: "Electric incense burner",
    price: 22_000,
    stock: [15],
    weight: 700,
    descAr: "مبخرة كهربائية توضيحية.",
    descEn: "Illustrative electric burner.",
  },
  {
    cat: "incense-burners",
    slug: "demo-mabkhara-wood",
    ar: "مبخرة خشب",
    en: "Wooden incense burner",
    price: 16_000,
    stock: [0],
    weight: 500,
    descAr: "مبخرة خشبية توضيحية (نفدت الكمية).",
    descEn: "Illustrative wooden burner (out of stock).",
  },
  // فيس
  {
    cat: "faya",
    slug: "demo-faya-silver",
    ar: "فيس فضة",
    en: "Silver faya",
    price: 88_000,
    stock: [3],
    weight: 400,
    descAr: "فيس توضيحي بمقبض فضي.",
    descEn: "Illustrative faya with silver handle.",
  },
  {
    cat: "faya",
    slug: "demo-faya-heritage",
    ar: "فيس تراثي",
    en: "Heritage faya",
    price: 54_000,
    stock: [5],
    weight: 380,
    descAr: "فيس تراثي توضيحي.",
    descEn: "Illustrative heritage faya.",
  },
  {
    cat: "faya",
    slug: "demo-faya-gift",
    ar: "فيس هدية",
    en: "Gift faya",
    price: 31_000,
    stock: [8],
    weight: 300,
    descAr: "فيس هدية توضيحي.",
    descEn: "Illustrative gift faya.",
  },
  // خواتم ومسابح
  {
    cat: "rings-prayer-beads",
    slug: "demo-misbaha-amber",
    ar: "مسبحة كهرمان",
    en: "Amber prayer beads",
    price: 46_000,
    options: [
      {
        ar: "عدد الحبات",
        en: "Beads",
        values: [
          ["33", "33"],
          ["99", "99"],
        ],
      },
    ],
    step: 30_000,
    stock: [4, 2],
    featured: true,
    weight: 120,
    descAr: "مسبحة توضيحية.",
    descEn: "Illustrative prayer beads.",
  },
  {
    cat: "rings-prayer-beads",
    slug: "demo-ring-silver",
    ar: "خاتم فضة",
    en: "Silver ring",
    price: 27_500,
    options: [
      {
        ar: "المقاس",
        en: "Size",
        values: [
          ["9", "9"],
          ["10", "10"],
          ["11", "11"],
        ],
      },
    ],
    stock: [3, 3, 1],
    weight: 30,
    descAr: "خاتم توضيحي.",
    descEn: "Illustrative ring.",
  },
  {
    cat: "rings-prayer-beads",
    slug: "demo-misbaha-wood",
    ar: "مسبحة خشب",
    en: "Wooden prayer beads",
    price: 9_500,
    stock: [25],
    weight: 60,
    descAr: "مسبحة خشب توضيحية.",
    descEn: "Illustrative wooden beads.",
  },
  // سيوف (منصة فقط D26)
  {
    cat: "luxury-swords",
    slug: "demo-sword-ceremonial",
    ar: "سيف عرضة",
    en: "Ceremonial sword",
    price: 350_000,
    stock: [2],
    featured: true,
    weight: 2500,
    descAr: "سيف توضيحي للعرضة.",
    descEn: "Illustrative ceremonial sword.",
  },
  {
    cat: "luxury-swords",
    slug: "demo-sword-display",
    ar: "سيف عرض مع حامل",
    en: "Display sword with stand",
    price: 520_000,
    compareAt: 590_000,
    stock: [1],
    weight: 3200,
    descAr: "سيف عرض توضيحي.",
    descEn: "Illustrative display sword.",
  },
  {
    cat: "luxury-swords",
    slug: "demo-sword-mini",
    ar: "سيف صغير للهدايا",
    en: "Mini gift sword",
    price: 89_000,
    stock: [6],
    weight: 900,
    descAr: "سيف هدية توضيحي.",
    descEn: "Illustrative mini sword.",
  },
  // أحزمة محالة
  {
    cat: "mahala-belts",
    slug: "demo-mahala-gold",
    ar: "حزام محالة ذهبي",
    en: "Gold mahala belt",
    price: 64_000,
    options: [SML],
    stock: [3, 5, 2],
    weight: 500,
    descAr: "حزام توضيحي.",
    descEn: "Illustrative belt.",
  },
  {
    cat: "mahala-belts",
    slug: "demo-mahala-silver",
    ar: "حزام محالة فضي",
    en: "Silver mahala belt",
    price: 52_000,
    options: [SML],
    stock: [4, 0, 4],
    weight: 480,
    descAr: "حزام توضيحي فضي.",
    descEn: "Illustrative silver belt.",
  },
  {
    cat: "mahala-belts",
    slug: "demo-mahala-leather",
    ar: "حزام جلد مطرز",
    en: "Embroidered leather belt",
    price: 28_000,
    stock: [7],
    weight: 350,
    descAr: "حزام جلد توضيحي.",
    descEn: "Illustrative leather belt.",
  },
  // زعفران
  {
    cat: "super-saffron",
    slug: "demo-saffron-super",
    ar: "زعفران سوبر",
    en: "Super saffron",
    price: 8_500,
    options: [
      {
        ar: "الوزن",
        en: "Weight",
        values: [
          ["1 غرام", "1 g"],
          ["5 غرام", "5 g"],
          ["10 غرام", "10 g"],
        ],
      },
    ],
    step: 30_000,
    stock: [40, 20, 10],
    featured: true,
    weight: 50,
    descAr: "زعفران توضيحي.",
    descEn: "Illustrative saffron.",
  },
  {
    cat: "super-saffron",
    slug: "demo-saffron-gift-box",
    ar: "علبة زعفران هدية",
    en: "Saffron gift box",
    price: 36_000,
    stock: [6],
    weight: 200,
    descAr: "علبة هدية توضيحية.",
    descEn: "Illustrative gift box.",
  },
  {
    cat: "super-saffron",
    slug: "demo-saffron-threads",
    ar: "زعفران شعيرات",
    en: "Saffron threads",
    price: 14_500,
    stock: [3],
    weight: 60,
    descAr: "زعفران شعيرات توضيحي.",
    descEn: "Illustrative saffron threads.",
  },
  // عود ودهن عود
  {
    cat: "oud-oils",
    slug: "demo-oud-oil",
    ar: "دهن عود",
    en: "Oud oil",
    price: 45_000,
    compareAt: 52_000,
    options: [
      {
        ar: "الحجم",
        en: "Volume",
        values: [
          ["3 مل", "3 ml"],
          ["6 مل", "6 ml"],
          ["12 مل", "12 ml"],
        ],
      },
    ],
    step: 40_000,
    stock: [10, 6, 2],
    featured: true,
    weight: 80,
    descAr: "دهن عود توضيحي.",
    descEn: "Illustrative oud oil.",
  },
  {
    cat: "oud-oils",
    slug: "demo-oud-chips",
    ar: "عود بخور",
    en: "Oud chips",
    price: 32_000,
    options: [
      {
        ar: "الوزن",
        en: "Weight",
        values: [
          ["تولة", "Tola"],
          ["ربع كيلو", "250 g"],
        ],
      },
    ],
    step: 250_000,
    stock: [15, 2],
    weight: 150,
    descAr: "عود بخور توضيحي.",
    descEn: "Illustrative oud chips.",
  },
  {
    cat: "oud-oils",
    slug: "demo-mukhallat",
    ar: "مخلط فاخر",
    en: "Luxury mukhallat",
    price: 27_000,
    stock: [9],
    weight: 120,
    descAr: "مخلط توضيحي.",
    descEn: "Illustrative mukhallat.",
  },
  // شالات
  {
    cat: "shawls",
    slug: "demo-shawl-kashmir",
    ar: "شال كشميري",
    en: "Kashmiri shawl",
    price: 39_000,
    options: [COLORS],
    stock: [6, 4, 3],
    weight: 250,
    descAr: "شال توضيحي.",
    descEn: "Illustrative shawl.",
  },
  {
    cat: "shawls",
    slug: "demo-shawl-wool",
    ar: "شال صوف",
    en: "Wool shawl",
    price: 24_000,
    stock: [11],
    weight: 300,
    descAr: "شال صوف توضيحي.",
    descEn: "Illustrative wool shawl.",
  },
  {
    cat: "shawls",
    slug: "demo-shmagh",
    ar: "شماغ",
    en: "Shemagh",
    price: 15_500,
    compareAt: 19_000,
    stock: [30],
    weight: 200,
    descAr: "شماغ توضيحي.",
    descEn: "Illustrative shemagh.",
  },
  // سداري
  {
    cat: "sadari",
    slug: "demo-sadari-classic",
    ar: "سديري كلاسيكي",
    en: "Classic sadari",
    price: 36_000,
    options: [SML],
    stock: [5, 5, 5],
    weight: 400,
    descAr: "سديري توضيحي.",
    descEn: "Illustrative sadari vest.",
  },
  {
    cat: "sadari",
    slug: "demo-sadari-embroidered",
    ar: "سديري مطرز",
    en: "Embroidered sadari",
    price: 49_000,
    options: [SML],
    stock: [2, 3, 0],
    weight: 450,
    descAr: "سديري مطرز توضيحي.",
    descEn: "Illustrative embroidered sadari.",
  },
  {
    cat: "sadari",
    slug: "demo-sadari-kids",
    ar: "سديري أطفال",
    en: "Kids sadari",
    price: 19_000,
    stock: [8],
    weight: 250,
    descAr: "سديري أطفال توضيحي.",
    descEn: "Illustrative kids sadari.",
  },
  // عبايات
  {
    cat: "abayas",
    slug: "demo-abaya-classic",
    ar: "عباية كلاسيكية",
    en: "Classic abaya",
    price: 58_000,
    options: [
      {
        ar: "المقاس",
        en: "Size",
        values: [
          ["52", "52"],
          ["54", "54"],
          ["56", "56"],
        ],
      },
    ],
    stock: [4, 6, 3],
    featured: true,
    weight: 700,
    descAr: "عباية توضيحية.",
    descEn: "Illustrative abaya.",
  },
  {
    cat: "abayas",
    slug: "demo-abaya-embroidered",
    ar: "عباية مطرزة",
    en: "Embroidered abaya",
    price: 89_000,
    compareAt: 99_000,
    options: [
      {
        ar: "المقاس",
        en: "Size",
        values: [
          ["52", "52"],
          ["54", "54"],
          ["56", "56"],
        ],
      },
    ],
    stock: [1, 2, 0],
    weight: 800,
    descAr: "عباية مطرزة توضيحية.",
    descEn: "Illustrative embroidered abaya.",
  },
  {
    cat: "abayas",
    slug: "demo-abaya-daily",
    ar: "عباية يومية",
    en: "Everyday abaya",
    price: 34_000,
    stock: [14],
    weight: 600,
    descAr: "عباية يومية توضيحية.",
    descEn: "Illustrative everyday abaya.",
  },
];

const HOME_CATEGORIES = ["bisht", "farwa", "zal", "iqal", "incense-burners", "oud-oils", "super-saffron", "abayas"];

const BUNDLES = [
  {
    slug: "demo-bundle-groom",
    ar: "باقة العريس" + AR_SUFFIX,
    en: "Groom bundle" + EN_SUFFIX,
    price: 225_000,
    compareAt: 254_500,
    items: [
      { product: "demo-bisht-classic", qty: 1 },
      { product: "demo-iqal-black", qty: 1 },
      { product: "demo-oud-oil", qty: 1 },
    ],
  },
  {
    slug: "demo-bundle-majlis",
    ar: "باقة الضيافة" + AR_SUFFIX,
    en: "Majlis hospitality bundle" + EN_SUFFIX,
    price: 70_000,
    compareAt: 83_000,
    items: [
      { product: "demo-mabkhara-brass", qty: 1 },
      { product: "demo-oud-chips", qty: 1 },
      { product: "demo-saffron-super", qty: 2 },
    ],
  },
];

const PAGES: { slug: string; file: string | null; titleAr: string; titleEn: string }[] = [
  { slug: "privacy", file: "privacy-policy.md", titleAr: "سياسة الخصوصية", titleEn: "Privacy policy" },
  { slug: "returns", file: "returns-policy.md", titleAr: "سياسة الاسترجاع والاستبدال", titleEn: "Returns & exchanges" },
  { slug: "shipping", file: "shipping-policy.md", titleAr: "سياسة الشحن والتوصيل", titleEn: "Shipping & delivery" },
  { slug: "terms", file: "terms.md", titleAr: "الشروط والأحكام", titleEn: "Terms & conditions" },
  { slug: "vendor-agreement", file: "vendor-agreement.md", titleAr: "اتفاقية التاجر", titleEn: "Vendor agreement" },
];
const PREVIEW_NOTE_AR =
  "> **معاينة — مسودة غير معتمدة.** هذا النص مسودة عمل (النسخة 0.2) لم يراجعها محامٍ بعد، ومعروضة في بيئة المعاينة فقط.\n\n";

// ------------------------------------------------------------------ helpers
function variantsOf(d: Def) {
  const opts = d.options ?? [];
  let combos: number[][] = [[]];
  for (const o of opts) combos = combos.flatMap((c) => o.values.map((_, i) => [...c, i]));
  const stock = d.stock ?? [8];
  return combos.map((c, idx) => {
    // price grows with the LAST option's index when `step` is set (size/volume/weight)
    const lastIdx = c.length ? c[c.length - 1]! : 0;
    const price = d.price + (d.step ?? 0) * lastIdx;
    const compareAt = d.compareAt ? d.compareAt + (d.step ?? 0) * lastIdx : null;
    const code = c.map((i) => i + 1).join("") || "1";
    return {
      combo: c,
      price,
      compareAt,
      stock: stock[idx % stock.length]!,
      sku: `${d.slug.replace(/^demo-/, "DEMO-").toUpperCase()}-${code}`,
    };
  });
}

async function putSvg(key: string, svg: string) {
  await storageProvider().putObject({
    bucket: "public",
    key,
    body: new TextEncoder().encode(svg),
    contentType: "image/svg+xml",
  });
}

interface DemoSummary {
  products: number;
  bundles: number;
  banners: number;
  sections: number;
  pages: number;
  customers: number;
  orders: number;
  staff: "created" | "exists";
  staffPassword: string | null;
  storage: string;
}

/** Writes the illustrations (outside any transaction: storage is an external call, SPEC §9). */
async function writeImages() {
  const jobs: Promise<void>[] = [];
  for (const d of DEMO_PRODUCTS) {
    jobs.push(putSvg(`demo/products/${d.slug}-1.svg`, demoSvg(d.slug)));
    jobs.push(putSvg(`demo/products/${d.slug}-2.svg`, demoSvg(`${d.slug}#2`)));
  }
  for (const c of [...new Set(DEMO_PRODUCTS.map((d) => d.cat))])
    jobs.push(putSvg(`demo/categories/${c}.svg`, demoSvg(`cat:${c}`, 600, 600)));
  for (const b of BUNDLES) jobs.push(putSvg(`demo/bundles/${b.slug}.svg`, demoSvg(b.slug)));
  for (const i of [1, 2]) {
    jobs.push(
      putSvg(`demo/banners/banner-${i}-desktop.svg`, demoSvg(`banner${i}`, 1600, 560, "بنر توضيحي · Demo banner")),
    );
    jobs.push(
      putSvg(`demo/banners/banner-${i}-mobile.svg`, demoSvg(`banner${i}m`, 800, 800, "بنر توضيحي · Demo banner")),
    );
  }
  await Promise.all(jobs);
}

export async function seedDemo(opts: { staffPassword?: string } = {}): Promise<DemoSummary> {
  assertDemoAllowed();
  await writeImages();
  const generated = opts.staffPassword ? null : randomBytes(9).toString("base64url");
  const staffPassword = opts.staffPassword ?? generated!;
  const staffHash = await hashPassword(staffPassword);
  const pageBodies = PAGES.map((p) => {
    let body = "";
    try {
      body = p.file ? readFileSync(path.resolve(import.meta.dirname, "../docs/legal", p.file), "utf8") : "";
    } catch {
      body = `# ${p.titleAr}\n\nالمحتوى قيد الإعداد.`;
    }
    return { ...p, contentAr: PREVIEW_NOTE_AR + body };
  });

  const s = await withCtx(
    { kind: "system", reason: "seed.demo" },
    async (tx) => {
      const cats = new Map(
        (await tx.category.findMany({ select: { id: true, slug: true, imagePath: true } })).map((c) => [c.slug, c]),
      );
      for (const [i, slug] of HOME_CATEGORIES.entries()) {
        const c = cats.get(slug);
        if (c && !c.imagePath)
          await tx.category.update({
            where: { id: c.id },
            data: { imagePath: `demo/categories/${slug}.svg`, showOnHome: true, homeSort: i },
          });
      }
      for (const c of cats.values())
        if (!c.imagePath && !HOME_CATEGORIES.includes(c.slug))
          await tx.category.update({ where: { id: c.id }, data: { imagePath: `demo/categories/${c.slug}.svg` } });

      const products = await seedProducts(tx, cats);
      const bundles = await seedBundles(tx);
      const { banners, sections } = await seedHome(tx, cats);
      let pages = 0;
      for (const p of pageBodies) {
        if (await tx.page.findUnique({ where: { slug: p.slug }, select: { id: true } })) continue;
        await tx.page.create({
          data: { slug: p.slug, titleAr: p.titleAr, titleEn: p.titleEn, contentAr: p.contentAr, contentEn: "" },
        });
        pages++;
      }
      await seedShippingZone(tx);
      const staff = await seedStaff(tx, staffHash);
      const { customers, orders } = await seedCustomersAndOrders(tx);
      return { products, bundles, banners, sections, pages, customers, orders, staff };
    },
    { timeout: 120_000 },
  );
  return { ...s, staffPassword: s.staff === "created" ? staffPassword : null, storage: storageProvider().name };
}

async function seedProducts(tx: Tx, cats: Map<string, { id: string }>) {
  let created = 0;
  const now = Date.now();
  for (const [n, d] of DEMO_PRODUCTS.entries()) {
    if (await tx.product.findUnique({ where: { slug: d.slug }, select: { id: true } })) continue;
    const cat = cats.get(d.cat);
    if (!cat) throw new Error(`category ${d.cat} missing: run the base seed first`);
    const vs = variantsOf(d);
    const cheapest = [...vs].sort((a, b) => a.price - b.price)[0]!;
    const p = await tx.product.create({
      data: {
        vendorId: null,
        categoryId: cat.id,
        nameAr: d.ar + AR_SUFFIX,
        nameEn: d.en + EN_SUFFIX,
        slug: d.slug,
        descriptionAr: d.descAr,
        descriptionEn: d.descEn,
        basePrice: cheapest.price,
        compareAtPrice: cheapest.compareAt,
        status: "PUBLISHED",
        isFeatured: !!d.featured,
        weightGrams: d.weight,
        soldCount: (n * 7) % 23,
        // spread "newest" ordering over the last weeks
        publishedAt: new Date(now - n * 36 * 3600_000),
      },
      select: { id: true },
    });
    const valueIds: string[][] = [];
    for (const [i, o] of (d.options ?? []).entries()) {
      const opt = await tx.productOption.create({
        data: { productId: p.id, nameAr: o.ar, nameEn: o.en, sort: i },
        select: { id: true },
      });
      const ids: string[] = [];
      for (const [j, [ar, en]] of o.values.entries())
        ids.push(
          (
            await tx.optionValue.create({
              data: { optionId: opt.id, valueAr: ar, valueEn: en, sort: j },
              select: { id: true },
            })
          ).id,
        );
      valueIds.push(ids);
    }
    for (const v of vs)
      await tx.productVariant.create({
        data: {
          productId: p.id,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAt,
          stock: v.stock,
          optionValueIds: v.combo.map((idx, i) => valueIds[i]![idx]!),
        },
      });
    await tx.productImage.createMany({
      data: [1, 2].map((i) => ({
        productId: p.id,
        path: `demo/products/${d.slug}-${i}.svg`,
        alt: `${d.ar} — صورة توضيحية`,
        sort: i - 1,
      })),
    });
    created++;
  }
  return created;
}

async function firstVariant(tx: Tx, productSlug: string) {
  const v = await tx.productVariant.findFirst({
    where: { product: { slug: productSlug }, isActive: true },
    orderBy: [{ price: "asc" }, { sku: "asc" }],
    include: {
      product: {
        include: {
          options: { include: { values: true }, orderBy: { sort: "asc" } },
          images: { orderBy: { sort: "asc" }, take: 1 },
        },
      },
    },
  });
  if (!v) throw new Error(`demo product ${productSlug} has no variant`);
  return v;
}

async function seedBundles(tx: Tx) {
  let created = 0;
  for (const b of BUNDLES) {
    if (await tx.bundle.findUnique({ where: { slug: b.slug }, select: { id: true } })) continue;
    const bundle = await tx.bundle.create({
      data: {
        slug: b.slug,
        nameAr: b.ar,
        nameEn: b.en,
        price: b.price,
        compareAtPrice: b.compareAt,
        imagePath: `demo/bundles/${b.slug}.svg`,
      },
    });
    for (const it of b.items) {
      const v = await firstVariant(tx, it.product);
      await tx.bundleItem.create({ data: { bundleId: bundle.id, variantId: v.id, qty: it.qty } });
    }
    created++;
  }
  return created;
}

async function seedHome(tx: Tx, cats: Map<string, { id: string }>) {
  let banners = 0;
  if ((await tx.banner.count()) === 0) {
    const rows = [
      { titleAr: "تشكيلة الشتاء — بيانات توضيحية", titleEn: "Winter collection — demo data", link: "/c/farwa" },
      { titleAr: "عود وبخور — بيانات توضيحية", titleEn: "Oud & incense — demo data", link: "/c/oud-oils" },
    ];
    for (const [i, r] of rows.entries()) {
      await tx.banner.create({
        data: {
          ...r,
          sort: i,
          imageDesktopPath: `demo/banners/banner-${i + 1}-desktop.svg`,
          imageMobilePath: `demo/banners/banner-${i + 1}-mobile.svg`,
        },
      });
      banners++;
    }
  }
  let sections = 0;
  if ((await tx.homeSection.count()) === 0) {
    const list: { type: "BANNERS" | "CATEGORIES" | "FEATURED" | "BUNDLES" | "CATEGORY_PRODUCTS"; refId?: string }[] = [
      { type: "BANNERS" },
      { type: "CATEGORIES" },
      { type: "FEATURED" },
      { type: "CATEGORY_PRODUCTS", refId: cats.get("bisht")?.id },
      { type: "BUNDLES" },
      { type: "CATEGORY_PRODUCTS", refId: cats.get("oud-oils")?.id },
    ];
    for (const [i, s] of list.entries()) {
      await tx.homeSection.create({ data: { type: s.type, refId: s.refId ?? null, sort: i } });
      sections++;
    }
  }
  return { banners, sections };
}

/** Demo only: one zone covering every city. Real rates are the owner's decision (O4 / D17). */
async function seedShippingZone(tx: Tx) {
  const name = "منطقة شحن توضيحية — كل المدن";
  if (await tx.shippingZone.findFirst({ where: { name }, select: { id: true } })) return;
  const zone = await tx.shippingZone.create({
    data: { name, baseFee: 3_000, perKgFee: 0, freeShippingOver: 50_000, etaDays: 4 },
  });
  const cities = await tx.city.findMany({ select: { id: true } });
  await tx.shippingZoneCity.createMany({ data: cities.map((c) => ({ zoneId: zone.id, cityId: c.id })) });
}

async function seedStaff(tx: Tx, passwordHash: string): Promise<"created" | "exists"> {
  const existing = await tx.user.findUnique({ where: { email: DEMO_STAFF_EMAIL }, select: { id: true } });
  if (existing) return "exists";
  await tx.user.create({
    data: {
      name: "موظف توضيحي",
      email: DEMO_STAFF_EMAIL,
      emailVerifiedAt: new Date(),
      passwordHash,
      role: "STAFF",
      permissions: DEMO_STAFF_PERMISSIONS,
      locale: "ar",
    },
  });
  return "created";
}

type SubStatus =
  "PENDING_PAYMENT" | "NEW" | "PREPARING" | "READY_TO_SHIP" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED";
const FLOW: SubStatus[] = ["PENDING_PAYMENT", "NEW", "PREPARING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "COMPLETED"];
const ORDER_STATUS: Record<SubStatus, string> = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  NEW: "PAID",
  PREPARING: "PROCESSING",
  READY_TO_SHIP: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

async function seedCustomersAndOrders(tx: Tx) {
  const riyadh = await tx.city.findUnique({ where: { slug: "riyadh" } });
  const jeddah = await tx.city.findUnique({ where: { slug: "jeddah" } });
  if (!riyadh || !jeddah) throw new Error("cities missing: run the base seed first");
  let customers = 0;
  const users: { id: string; name: string; phone: string; city: typeof riyadh }[] = [];
  for (const [i, c] of DEMO_CUSTOMERS.entries()) {
    let u = await tx.user.findUnique({ where: { phone: c.phone }, select: { id: true, name: true } });
    if (!u) {
      u = await tx.user.create({
        data: {
          name: c.name,
          phone: c.phone,
          phoneVerifiedAt: new Date(),
          role: "CUSTOMER",
          locale: "ar",
          createdAt: new Date(Date.now() - (20 - i * 6) * 86_400_000),
        },
        select: { id: true, name: true },
      });
      const city = i === 1 ? jeddah : riyadh;
      await tx.address.create({
        data: {
          userId: u.id,
          label: "المنزل",
          recipientName: c.name,
          recipientPhone: c.phone,
          cityId: city.id,
          district: "حي توضيحي",
          street: "شارع تجريبي",
          buildingNo: String(1000 + i),
          postalCode: "12345",
          isDefault: true,
        },
      });
      customers++;
    }
    users.push({ id: u.id, name: u.name, phone: c.phone, city: i === 1 ? jeddah : riyadh });
  }
  if ((await tx.order.count({ where: { userId: users[0]!.id } })) > 0) return { customers, orders: 0 };

  const plan: {
    user: number;
    status: SubStatus;
    daysAgo: number;
    lines: { product: string; qty: number }[];
    method: "MADA" | "CARD" | "APPLE_PAY" | "STC_PAY";
  }[] = [
    {
      user: 0,
      status: "COMPLETED",
      daysAgo: 18,
      lines: [
        { product: "demo-bisht-classic", qty: 1 },
        { product: "demo-iqal-black", qty: 1 },
      ],
      method: "MADA",
    },
    { user: 0, status: "SHIPPED", daysAgo: 3, lines: [{ product: "demo-oud-oil", qty: 2 }], method: "APPLE_PAY" },
    {
      user: 0,
      status: "PENDING_PAYMENT",
      daysAgo: 0,
      lines: [{ product: "demo-saffron-super", qty: 3 }],
      method: "CARD",
    },
    {
      user: 1,
      status: "DELIVERED",
      daysAgo: 6,
      lines: [
        { product: "demo-abaya-classic", qty: 1 },
        { product: "demo-shawl-kashmir", qty: 1 },
      ],
      method: "MADA",
    },
    {
      user: 1,
      status: "PREPARING",
      daysAgo: 1,
      lines: [{ product: "demo-mabkhara-brass", qty: 1 }],
      method: "STC_PAY",
    },
    { user: 2, status: "NEW", daysAgo: 0, lines: [{ product: "demo-zal-classic", qty: 1 }], method: "CARD" },
    { user: 2, status: "CANCELLED", daysAgo: 9, lines: [{ product: "demo-farwa-heritage", qty: 1 }], method: "MADA" },
  ];
  const vatRateBp = 1500;
  const SHIPPING = 3_000;
  let orders = 0;
  for (const [n, o] of plan.entries()) {
    const u = users[o.user]!;
    const placedAt = new Date(Date.now() - o.daysAgo * 86_400_000 - (n + 1) * 3600_000);
    const lines = [];
    for (const l of o.lines) {
      const v = await firstVariant(tx, l.product);
      const byId = new Map(v.product.options.flatMap((op) => op.values).map((x) => [x.id, x]));
      const labels = v.optionValueIds.map((id) => byId.get(id)).filter((x) => !!x);
      const lineTotal = v.price * l.qty;
      const vat = vatOfGross(lineTotal, vatRateBp);
      lines.push({
        variantId: v.id,
        qty: l.qty,
        unitPrice: v.price,
        lineTotal,
        netAmount: lineTotal - vat,
        vatAmount: vat,
        vatRateBp,
        productSnapshot: {
          productId: v.product.id,
          slug: v.product.slug,
          nameAr: v.product.nameAr,
          nameEn: v.product.nameEn,
          sku: v.sku,
          imagePath: v.product.images[0]?.path ?? null,
          optionsAr: labels.map((x) => x!.valueAr).join(" / "),
          optionsEn: labels.map((x) => x!.valueEn).join(" / "),
        },
      });
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const shippingFee = subtotal >= 50_000 ? 0 : SHIPPING;
    const total = subtotal + shippingFee;
    const vatTotal = vatOfGross(total, vatRateBp);
    const paid = o.status !== "PENDING_PAYMENT";
    const cancelled = o.status === "CANCELLED";
    const order = await tx.order.create({
      data: {
        userId: u.id,
        addressSnapshot: {
          recipientName: u.name,
          recipientPhone: u.phone,
          cityAr: u.city.nameAr,
          cityEn: u.city.nameEn,
          district: "حي توضيحي",
          street: "شارع تجريبي",
          buildingNo: "1000",
          postalCode: "12345",
          nationalAddressShort: null,
        },
        subtotal,
        shippingTotal: shippingFee,
        vatTotal,
        grandTotal: total,
        vatRateBp,
        paymentMethod: o.method,
        paymentStatus: cancelled ? "REFUNDED" : paid ? "PAID" : "INITIATED",
        status: ORDER_STATUS[o.status] as never,
        placedAt,
        paidAt: paid ? new Date(placedAt.getTime() + 60_000) : null,
        cancelledAt: cancelled ? new Date(placedAt.getTime() + 86_400_000) : null,
      },
    });
    const at = (step: number) => new Date(placedAt.getTime() + step * 12 * 3600_000);
    const flowTo = cancelled ? ["PENDING_PAYMENT", "NEW"] : FLOW.slice(0, FLOW.indexOf(o.status) + 1);
    const sub = await tx.subOrder.create({
      data: {
        orderId: order.id,
        vendorId: null,
        number: `${order.number}-1`,
        status: o.status,
        itemsGross: subtotal,
        subtotal,
        shippingFee,
        vatAmount: vatTotal,
        vatRateBp,
        total,
        shippedAt: flowTo.includes("SHIPPED") ? at(4) : null,
        deliveredAt: flowTo.includes("DELIVERED") ? at(5) : null,
        completedAt: flowTo.includes("COMPLETED") ? at(10) : null,
        cancelledAt: cancelled ? at(2) : null,
        cancelReason: cancelled ? "إلغاء توضيحي بطلب العميل" : null,
        items: { create: lines },
      },
    });
    const history = [...flowTo, ...(cancelled ? ["CANCELLED"] : [])];
    for (const [i, to] of history.entries())
      await tx.orderStatusHistory.create({
        data: {
          subOrderId: sub.id,
          from: i ? (history[i - 1] as SubStatus) : null,
          to: to as SubStatus,
          note: i === 0 ? "تم إنشاء الطلب" : null,
          createdAt: at(i),
        },
      });
    if (flowTo.includes("SHIPPED"))
      await tx.shipment.create({
        data: {
          subOrderId: sub.id,
          carrier: "شركة شحن توضيحية",
          trackingNumber: `DEMO${String(100000 + n)}`,
          status: "IN_TRANSIT",
        },
      });
    if (paid)
      await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: "MOYASAR",
          method: o.method,
          gatewayRef: `demo-${order.number}`,
          amount: total,
          status: cancelled ? "REFUNDED" : "PAID",
          refundedAmount: cancelled ? total : 0,
          paidAt: new Date(placedAt.getTime() + 60_000),
        },
      });
    orders++;
  }
  return { customers, orders };
}
