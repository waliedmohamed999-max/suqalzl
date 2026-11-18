# سوق الزل — المواصفات الكاملة للمشروع (Project Spec)

> هذا الملف هو **المرجع الوحيد** لكل الإيجنتس. أي قرار غير مذكور هنا يُرفع للـ CEO قبل التنفيذ.
> ضع الملف في جذر المستودع باسم `SPEC.md` وانسخ قسم "قواعد العمل للإيجنتس" إلى `CLAUDE.md`.
> **آخر تحديث: 2026-11-18** — دُمجت قرارات المالك (2026-11-17) والتعديلات المعتمدة من `docs/decisions.md` §5 بصياغة المختصين. التعديلات المرتبطة بقرار متأجل أو بانتظار المالك **لم تُدمج** وهي في قسم 15. سجل الحالات: `docs/decisions.md` §0 و§5.1.

---

## 0. ملخص المشروع

- **الاسم:** سوق الزل — Souq AlZal — الدومين: `suqalzl.com`
- **الحالي:** متجر على منصة زد يبيع منتجات خليجية تراثية فاخرة (بشوت، فراوي، زل، عقل، مباخر، فيس، خواتم ومسابح، سيوف فاخرة، أحزمة محالة، زعفران سوبر، عود ودهن عود، شالات، سداري، عبايات). الأسعار من ~45 ر.س إلى ~25,000 ر.س. حوالي 50 منتج، كثير منها بخيارات (مقاس/لون/خامة). الدفع حالياً: مدى، فيزا، ماستركارد، Apple Pay، تابي، تمارا.
- **المطلوب:** منصة مستقلة بالكامل (بدون زد/سلة) تتكون من:
  1. **واجهة متجر** للعملاء.
  2. **لوحة إدارة** للمالك `/admin`.
  3. **نظام شركات وتجار (Marketplace)**: شركات وتجار يسجلون، يضيفون منتجاتهم تحت التصنيفات الموجودة فقط، والمنصة تبيع وتأخذ عمولة.
  4. **صفحة "سوق الزل" `/souq`**: سوق حي (Live) تعرض فيه الشركات والتجار عروضها وخصوماتها، وفيه **نظام فصال وطلب سعر**: العميل يطلب سعر معين لمنتج، والطلب يوصل لكل التجار في نفس التصنيف، وكل تاجر يوافق أو يرفض أو يرد بسعر مضاد، والعميل يختار أفضل عرض ويشتري به (قسم 6.7 و 6.8).
- **السوق:** السعودية — العملة SAR — اللغة عربي أولاً (RTL) + إنجليزي — ضريبة القيمة المضافة 15%.

---

## 1. القرارات المحسومة (لا تُغيَّر بدون موافقة المالك)

| # | القرار |
|---|---|
| D1 | **كل المدفوعات تدخل حساب المنصة** عبر **Moyasar** (حساب واحد باسم المنصة). لا يوجد Split Payments. |
| D2 | **تحويل مستحقات التجار يدوي** من المالك (تحويل بنكي)، والنظام يحسب المستحقات ويجهز ملف التحويل ويسجل التحويل برقم مرجعي وإيصال. |
| D3 | سلة واحدة ودفعة واحدة للعميل، والطلب ينقسم داخلياً إلى طلبات فرعية (Sub-orders) لكل تاجر. |
| D4 | التاجر يضيف منتجات **فقط** في التصنيفات المسموحة له من الإدارة. |
| D5 | منتجات التاجر تحتاج موافقة الإدارة قبل النشر، إلا التاجر "الموثوق". |
| D6 | المنصة نفسها تاجر رقم صفر: منتجات سوق الزل الحالية `vendorId = null`. |
| D7 | المبالغ تُخزَّن بالهللة (Integer). ممنوع Float في أي حساب مالي. |
| D8 | الأسعار المعروضة شاملة الضريبة. |
| D10 | **كل منتج يتبع تاجراً واحداً** (لا يوجد كتالوج مشترك بين التجار). في الفصال، صاحب المنتج يرد على نفس منتجه، وباقي التجار في نفس التصنيف يردون بمنتج مطابق أو مشابه من منتجاتهم المنشورة. |
| D9 | المتجر القديم على زد يبقى شغال حتى نجاح اختبار القبول للمنصة الجديدة. البناء على `new.suqalzl.com` ثم التحويل. |
| D11 | **(O2، اعتمده المالك 2026-11-17) المنصة هي البائع** باسمها لكل الطلبات: فاتورة مبسطة واحدة للعميل باسم سوق الزل (وفاتورة ضريبية B2B لو أدخل العميل رقماً ضريبياً). التاجر غير المسجل: المنصة "مورّد حكمي" بقوة النظام من 1 يناير 2026 ويستلم الصافي. التاجر المسجل: **يصدر هو** فاتورة ضريبية للمنصة (لا فوترة ذاتية عند الإطلاق) والجزء الضريبي لا يُحوَّل قبل استلامها. العمولة هامش بلا فاتورة منفصلة. (`docs/decisions/finance.md` §3.4) |
| D12 | **الكود مستقل عن الاستضافة (portable):** التطوير على Postgres محلي (Docker)، والتحديث اللحظي بـ SSE، والتخزين خلف interface (S3-compatible)، والمهام المجدولة خلف interface. لا اعتماد على Supabase ولا Google Cloud تحديداً، ولا استيراد لـ `@supabase/*` في كود التطبيق. قرار الاستضافة (O6) في آخر المشروع (P7/P8). |
| D13 | **الفواتير: تأسيس فقط الآن** — نموذج بيانات الفاتورة، الترقيم التسلسلي، الحقول المطلوبة، توليد PDF، و QR بصيغة TLV كهيكل. الربط مع ZATCA (فاتورة المرحلة الثانية) في P8. |
| D14 | **الدفع:** ربط Moyasar وتابي وتمارا في بيئة **sandbox**. المفاتيح الحية والعقود في P8. |
| D15 | **كل الأمور الورقية والقانونية** (السجل التجاري، الرقم الضريبي، المستشار الضريبي، المحامي، عروض أسعار المزودين، تراخيص التخفيضات، تسجيل الهيئات) في **P8 "الأمور الورقية والاعتمادات"** بعد اعتماد المنصة والتصميم والكود والتشغيل، وقبل الإطلاق الفعلي. |
| D16 | **الخصومات في `/souq` مسموحة طول السنة** حتى تتوافق الاعتمادات، مع إعداد `souqDiscountsRequireLicense` (افتراضي `false`) يقصرها لاحقاً على فترات الترخيص بدون تعديل كود. |
| D17 | **الشحن الآن يدوي فقط:** interface `ShippingProvider` + تنفيذ يدوي واحد (التاجر أو الإدارة يدخل شركة الشحن ورقم التتبع)، بدون ربط بأي مزود. اختيار المزود (O4) متأجل؛ المالك يضبط الشحن لاحقاً. |
| D18 | **ضابط الكوبون العام:** أي كوبون عام نسبته ≥ نسبة العمولة يحتاج موافقة المالك قبل التفعيل (`platformCouponApprovalBps = 1000`). |
| D19 | **السلة المتروكة:** التذكير يُرسل فقط للعميل الذي وافق على التسويق. |
| D20 | **(O5) SMS: Taqnyat** خلف `SmsProvider` (Unifonic بديل خلف نفس الـ interface)، و**الـ OTP نولّده ونتحقق منه بأنفسنا** (6 أرقام، 5 دقائق، 5 محاولات). **واتساب: Meta Cloud API** (مباشر أو عبر BSP) خلف `WhatsAppProvider`. اسم المرسل **`SuqAlZal`**. (`docs/decisions/backend.md` §2.6) |
| D21 | **(O8)** العميل يرى **اسم المتجر وتقييمه وشاراته** (أسرع رد، نسبة القبول) قبل القبول، مع ضوابط: لا وسيلة تواصل في صفحة المتجر ولا العروض، فلتر الملاحظات مع حفظ النص الأصلي للإدارة، وحماية المشتري للشراء داخل المنصة فقط. الواجهة تقول "المتجر" أو "ينفّذه متجر …" وليس "البائع"، لأن البائع قانونياً وضريبياً هو المنصة (D11). |
| D22 | **(O9) حدود الفصال:** جوال موثّق إلزامي؛ 5 مفتوحة / 10 يومياً؛ الحساب الجديد بدون طلب مدفوع 2 مفتوحة / 3 يومياً لأول 7 أيام؛ طلب مفتوح واحد لكل عميل على نفس المنتج؛ حد أدنى للسعر المطلوب 50% من سعر الـ variant لفصال المنتج و30% من أقل سعر منشور في التصنيف للطلب المفتوح؛ 30 مستلماً كحد أقصى (صاحب المنتج دائماً + الأعلى في سرعة الرد والقبول)؛ تعليق الفصال 7 أيام بعد 3 محاولات مشاركة وسيلة تواصل خلال 7 أيام؛ Rate limit 5 إنشاءات/10 دقائق لكل حساب و IP؛ تأخير عشوائي 2–10 دقائق للقبول التلقائي. كلها إعدادات في `Setting`. |
| D23 | **القرارات التقنية الست** (`docs/decisions.md` §9): `floorPrice`/`autoAcceptPrice` مبلغ بالهللة لكل variant؛ المنتج المنشور يبقى ظاهراً أثناء مراجعة تعديله (`ProductRevision`)؛ التاجر يحدد الشحن في عرض الفصال؛ جدول `City` (والتسعير حسب مدينة التاجر يتبع إعداد الشحن لاحقاً)؛ أرقام `+9665` فقط؛ وضع منتج FLASH في السلة لا يحجز حصة. |
| D24 | **زر واتساب أخضر** (success-solid + أيقونة بيضاء). |
| D25 | **رمز الريال الجديد (U+20C1)** بدل "ر.س" في الواجهة. الحل التقني في `docs/design/tokens.md` 1.1 §8.4 (خط `Souq Riyal Sign`)، و"ر.س"/`SAR` نصاً في القنوات التي لا نتحكم في خطها (6.1). |
| D26 | **السيوف (افتراضي مؤقت بانتظار المالك):** منتجات المنصة فقط، وتصنيف "سيوف فاخرة" مقفول للتجار حتى قرار المالك مع الشحن. |
| D27 | **قيم مؤقتة بانتظار المالك (O1، O3، O7):** إعدادات قابلة للتغيير في الكود بقيم finance-zatca المقترحة كافتراضي (جدول O أدناه و `docs/decisions.md` §8). |
| D28 | **(2026-11-18) التصميم الحالي معتمد** (الهوية، التوكنات v1.1، الشاشات في `docs/design/`)، مع إمكانية تعديلات لاحقة. بوابة G1 **معتمدة**. |

### قرارات مفتوحة أو متأجلة (2026-11-18)

| # | السؤال | الحالة | الافتراضي في الكود حتى القرار | المسؤول |
|---|---|---|---|---|
| O1 | من يتحمل رسوم Moyasar/تابي/تمارا | **بانتظار المالك** | `gatewayFeeBearer = { MADA/CARD/APPLE_PAY/STC_PAY: PLATFORM, TABBY/TAMARA: VENDOR }` (`finance.md` 2.4) | finance-zatca |
| O3 | مدة الحجز ودورية التسوية | **بانتظار المالك** | `holdDays = 7`، `newVendorHoldDays = 14`، `payoutCycle = WEEKLY`، `payoutWeekday = SUN`، `minPayout = 10000` (`finance.md` 4.3) | finance-zatca |
| O4 | مزود الشحن | **متأجل** (المالك يضبط الشحن لاحقاً) | شحن يدوي فقط (D17) | backend-engineer + CEO |
| O6 | الاستضافة | **متأجل** إلى P7 (التقييم والنشر) و P8 (الاعتماد القانوني والعقد) | Postgres محلي بـ Docker + interfaces (D12) | devops-engineer |
| O7 | عمولة صفقات الفصال | **بانتظار المالك** | `negotiationCommissionBps = null` (= نفس عمولة التاجر) (`finance.md` 5.2) | finance-zatca |
| O10 | منع التجار غير المقيمين، والدفع عند الاستلام | **بانتظار المالك** | `allowNonResidentVendors = false`؛ COD غير موجود في وسائل الدفع | finance-zatca + المالك |
| O11 | السيوف (المسار، حد القيمة العالية، التأمين) | **بانتظار المالك** (تابع للشحن) | D26 | backend-engineer + legal-contracts |
| O12 | الضمان سنتين مقابل الحجز (T7) | **بانتظار المالك** | لا احتياطي (الوضع الحالي) | finance-zatca |
| O13 | الكوبون العام: `maxDiscount` إلزامي؟ ومن يتحمل `FREE_SHIPPING` لصاحب الشحن الذاتي؟ | **بانتظار المالك** | — (قسم 15) | finance-zatca |

---

## 2. التقنيات (Stack) — مستقل عن الاستضافة (D12)

> **مبدأ يحمينا (fail-safe، من `docs/decisions/devops.md` §5.1):** كل مزود خلف interface، ومفيش أي استيراد لـ `@supabase/*` في كود التطبيق. اختيار الاستضافة (O6) في P7/P8، والتغيير وقتها يكون في الـ adapters والبنية بس.

- **Framework:** Next.js 15 (App Router) + TypeScript (strict) + React Server Components + Server Actions
- **UI:** Tailwind CSS + shadcn/ui + lucide-react — RTL افتراضي — خط **IBM Plex Sans Arabic فقط بثلاثة أوزان (400/600/700)** وحذف Tajawal (design-system-performance، `docs/design/tokens.md` 1.1)
- **i18n:** next-intl (ar افتراضي، en)
- **DB:** **PostgreSQL 16** + Prisma ORM + Prisma Migrate. التطوير على Postgres محلي بـ `docker compose`. أي ميزة نستخدمها تكون من Postgres نفسه (SEQUENCE، triggers، exclusion constraints بـ `btree_gist`، `LISTEN/NOTIFY`، RLS) وليست من مزود
- **Auth:** Better Auth (أو Auth.js) — دخول بالجوال + OTP، وإيميل/كلمة مرور للإدارة والتجار، مع جلسات من السيرفر
- **Storage:** خلف interface `StorageProvider` (S3-compatible): bucket عام للصور وbucket خاص للوثائق بروابط موقعة مؤقتة. التطوير على خادم S3-compatible محلي داخل `docker compose` (يختاره devops-engineer)
- **Validation:** Zod — **Forms:** react-hook-form — **Tables:** TanStack Table — **Charts:** Recharts
- **Email:** Resend + react-email (قوالب عربية)
- **SMS:** **Taqnyat** خلف `SmsProvider` (`send(to, templateKey, vars, locale)`، `parseDeliveryReport()`)، و Unifonic بديل خلف نفس الـ interface. **OTP نولّده بأنفسنا** (لا نستخدم `verify.php` لدى المزود). في التطوير يُطبع الكود في الـ console
- **WhatsApp:** **Meta Cloud API** خلف `WhatsAppProvider` للإشعارات (قوالب utility) والسلات المتروكة (قوالب marketing بموافقة العميل)
- **Payments:** Moyasar (mada، Visa، Mastercard، Apple Pay، STC Pay) + Tabby + Tamara خلف `PaymentProvider` — **sandbox** حتى P8 (D14)
- **Shipping:** interface `ShippingProvider` بتنفيذ واحد الآن: **يدوي** (D17). تنفيذ مزود يُضاف لاحقاً خلف نفس الـ interface (O4)
- **Jobs/Cron:** interface `JobScheduler` يستدعي `POST /api/cron/<job>` (المحفّز يختلف حسب الاستضافة)، + جدول `Job` مع leasing (`FOR UPDATE SKIP LOCKED`) و heartbeat و idempotency (`devops.md` §6.5). في التطوير: محفّز محلي
- **Realtime:** interface `RealtimeProvider`. **مرحلة 1:** SSE من Next.js + Postgres `LISTEN/NOTIFY` (بمكتبة `pg` مش Prisma). لاحقاً حسب الحمل: Centrifugo خلف نفس الـ interface (`devops.md` §5.2). صلاحية الاشتراك في القناة تتفحص على السيرفر، والقنوات منفصلة لكل جمهور (6.8)
- **Search:** Postgres Full-text + تطبيع عربي (لاحقاً Meilisearch)
- **Testing:** Vitest (unit) + Playwright (e2e) + axe-core + أداة حمل لاختبارات التزامن (k6 أو سكربت متوازي)
- **Monitoring:** Sentry + سجل أخطاء — **تنظيف البيانات الشخصية إلزامي** (`sendDefaultPii: false`، و `beforeSend` يمسح الجوال والإيميل والعنوان والآيبان). بقاء Sentry أو استبداله بـ GlitchTip يتبع رأي المحامي في P8
- **Analytics:** GA4 + Meta/Snap/TikTok Pixels (بموافقة الكوكيز)
- **الوقت:** القاعدة والتطبيق على UTC، والعرض بتوقيت `Asia/Riyadh`

---

## 3. هيكل المستودع

```
/
├─ SPEC.md                 ← هذا الملف
├─ CLAUDE.md               ← قواعد العمل
├─ docker-compose.yml      ← Postgres 16 + تخزين S3-compatible محلي (devops-engineer)
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (store)/       ← واجهة المتجر
│  │  │  ├─ (auth)/        ← دخول/تسجيل/OTP
│  │  │  ├─ account/       ← حساب العميل
│  │  │  ├─ sell/          ← صفحة انضمام التجار
│  │  │  ├─ admin/         ← لوحة الإدارة
│  │  │  └─ vendor/        ← لوحة التاجر
│  │  └─ api/
│  │     ├─ webhooks/moyasar/
│  │     ├─ webhooks/tabby/
│  │     ├─ webhooks/tamara/
│  │     ├─ webhooks/shipping/
│  │     └─ cron/
│  ├─ features/            ← منطق كل ميزة (catalog, cart, checkout, orders, vendors, wallet, payouts, coupons, reviews, cms, settings, notifications, deals, negotiation, invoices)
│  │  └─ <feature>/{actions.ts, queries.ts, schema.ts, service.ts, components/}
│  ├─ lib/
│  │  ├─ db.ts, auth.ts, permissions.ts, money.ts, vat.ts, arabic-search.ts
│  │  └─ providers/{payment, sms, shipping, email, storage, realtime, jobs, whatsapp}/  ← interfaces + implementations
│  ├─ components/ui/       ← shadcn
│  └─ messages/{ar.json, en.json}
├─ tests/{unit, e2e}
└─ scripts/{import-zid.ts, fonts/}   ← fonts: تجهيز خط IBM Plex Sans Arabic (design-system-performance)
```

---

## 4. الأدوار والصلاحيات

| الدور | النطاق |
|---|---|
| `SUPER_ADMIN` | كل شيء |
| `STAFF` | صلاحيات تفصيلية (permissions array): `orders.manage`, `products.review`, `vendors.manage`, `payouts.manage`, `cms.manage`, `customers.view`, `reports.view`, `settings.manage` |
| `VENDOR_OWNER` | كل شيء داخل `vendorId` الخاص به |
| `VENDOR_STAFF` | صلاحيات يحددها صاحب المتجر: `products.manage`, `orders.fulfill`, `finance.view`, `reviews.reply` |
| `CUSTOMER` | حسابه فقط |

**قواعد إلزامية:**
- كل Server Action وكل Route Handler يبدأ بـ `requirePermission(...)` من `lib/permissions.ts`.
- أي استعلام في `/vendor` يأخذ `vendorId` **من الجلسة على السيرفر**، ولا يقبله من العميل أبداً.
- التاجر لا يرى جوال/إيميل العميل إلا الحقول اللازمة للشحن (الاسم، المدينة، العنوان، جوال الاستلام) وفقط للطلبات الفرعية الخاصة به.
- **طبقة العزل الأساسية في السيرفر** (`docs/decisions/backend.md` C2-أ): `vendorId` من الجلسة + repository لكل نطاق (`vendorScope(vendorId)`) + اختبارات العزل (سيناريو 5 و 8). RLS في Postgres (بـ `SET LOCAL app.vendor_id` داخل الـ transaction) **طبقة إضافية** حسب نتيجة spike أول P1 (بين backend-engineer و devops-engineer).
- **DTOs بمخطط Zod للمخرجات** (`.strict()`) و **Prisma global `omit`** لـ `VariantNegotiationSettings.floorPrice` و `autoAcceptPrice` و `User.passwordHash` و `Vendor.iban` (يُكشف مقنّعاً فقط `SA****1234`) (`backend.md` 5.6).
- كل عملية حساسة (تغيير حالة طلب، قبول تاجر، تعديل عمولة، تسجيل تحويل) تُكتب في `audit_logs`.

---

## 5. نموذج البيانات (Prisma — الحقول الأساسية)

> المبالغ كلها `Int` بالهللة. التواريخ `DateTime` UTC. كل جدول فيه `createdAt`, `updatedAt`.

**المستخدمون والتجار**
- `User`: id, name, phone (unique, E.164), email?, passwordHash?, role, permissions String[], status (ACTIVE|BLOCKED), locale
- `Vendor`: id, ownerUserId, storeNameAr, storeNameEn, slug (unique), logoUrl, coverUrl, descriptionAr/En, legalName, crNumber?, freelanceDocNumber?, vatNumber?, iban, bankName, accountHolderName, city, pickupAddress (JSON), commissionRate? (basis points, مثال 1000 = 10%), isTrusted, status (PENDING|APPROVED|REJECTED|SUSPENDED), rejectReason?, agreementAcceptedAt, agreementVersion
- `VendorDocument`: vendorId, type (CR|FREELANCE|VAT|IBAN_LETTER|OTHER), fileUrl (private), status
- `VendorMember`: vendorId, userId, permissions String[]
- `VendorCategory`: vendorId, categoryId (المسموح)

**الكتالوج**
- `Category`: id, parentId?, nameAr, nameEn, slug, imageUrl, sort, isActive, commissionRate?, showOnHome, homeSort
- `Product`: id, vendorId?, categoryId, nameAr, nameEn, slug, descriptionAr/En (rich text), basePrice, compareAtPrice?, status (DRAFT|PENDING|PUBLISHED|REJECTED|ARCHIVED), rejectReason?, isFeatured, weightGrams, seoTitle, seoDescription, searchVector (tsvector), ratingAvg, ratingCount, soldCount
- `ProductImage`: productId, url, alt, sort
- `ProductOption`: productId, nameAr, nameEn, sort — `OptionValue`: optionId, valueAr, valueEn, sort
- `ProductVariant`: productId, sku (unique), price, compareAtPrice?, stock, reservedStock, optionValueIds String[], isActive
- `Bundle`: id, nameAr/En, slug, price, compareAtPrice, imageUrl, items → `BundleItem`(bundleId, variantId, qty) — الباقات للمنصة فقط في المرحلة الأولى

**السلة والعملاء**
- `Cart`: id, userId?, guestToken?, couponId? — `CartItem`: cartId, variantId | bundleId, qty
- `Address`: userId, label, recipientName, recipientPhone, city, district, street, buildingNo, postalCode, nationalAddressShort?, lat?, lng?, isDefault
- `Wishlist`: userId, productId

**الطلبات**
- `Order`: id, number (SZ-100001 تسلسلي), userId, addressSnapshot (JSON), subtotal, discountTotal, shippingTotal, vatTotal, grandTotal, couponCode?, paymentMethod (MADA|CARD|APPLE_PAY|STC_PAY|TABBY|TAMARA), paymentStatus (PENDING|PAID|FAILED|REFUNDED|PARTIALLY_REFUNDED), status (PENDING_PAYMENT|PAID|PARTIALLY_SHIPPED|COMPLETED|CANCELLED), placedAt, paidAt?
- `SubOrder`: id, orderId, vendorId?, number (SZ-100001-1), status (state machine بالأسفل), subtotal, discountShare, shippingFee, vatAmount, total, commissionRate, commissionAmount, gatewayFeeShare, vendorNet, shippingProvider?, trackingNumber?, labelUrl?, shippedAt?, deliveredAt?, cancelledAt?, cancelReason?
- `OrderItem`: subOrderId, variantId?, bundleId?, productSnapshot (JSON: الاسم، الصورة، الخيارات، SKU), qty, unitPrice, lineTotal
- `OrderStatusHistory`: subOrderId, from, to, byUserId, note
- `Payment`: orderId, gateway (MOYASAR|TABBY|TAMARA), gatewayRef, amount, fee?, status, rawPayload (JSON), refundedAmount
- `Return`: subOrderId, items (JSON), reason, photos[], status (REQUESTED|APPROVED|REJECTED|RECEIVED|REFUNDED), refundAmount

**المالية (Ledger)**
- `WalletTransaction`: id, vendorId, subOrderId?, payoutId?, type (SALE_CREDIT|COMMISSION_DEBIT|GATEWAY_FEE_DEBIT|REFUND_DEBIT|ADJUSTMENT|PAYOUT_DEBIT), amount (موجب أو سالب), status (PENDING|AVAILABLE|PAID), availableAt?, note, createdByUserId?
- `Payout`: id, vendorId, batchId?, amount, status (DRAFT|APPROVED|PAID|CANCELLED), bankSnapshot (JSON: iban, bank, holder), transferReference?, receiptUrl?, paidAt?, paidByUserId?
- `PayoutBatch`: id, periodFrom, periodTo, totalAmount, status, exportFileUrl?

**التسويق والمحتوى**
- `Coupon`: code (unique, uppercase), type (PERCENT|FIXED|FREE_SHIPPING), value, minOrder?, maxDiscount?, vendorId? (null = عام وتتحمله المنصة), appliesToCategoryIds[], usageLimit?, perUserLimit?, usedCount, startsAt, endsAt, isActive
- `Review`: productId, userId, orderItemId (لازم يكون اشترى)، rating 1–5, comment, photos[], status (PENDING|APPROVED|HIDDEN), vendorReply?
- `Banner`: imageDesktop, imageMobile, link, titleAr/En, sort, isActive, startsAt?, endsAt?
- `Page`: slug (privacy, returns, terms, faq, shipping, about, vendor-agreement), titleAr/En, contentAr/En
- `HomeSection`: type (BANNERS|CATEGORIES|BUNDLES|CATEGORY_PRODUCTS|FEATURED), refId?, sort, isActive
- `Setting`: key, value (JSON) — مثال: storeInfo، vatRate=1500، defaultCommission=1000، holdDays=7، payoutCycle=WEEKLY، gatewayFeeBearer، shippingRates، whatsappNumber، pixels. **إضافات (G1):** `gatewayFeeBearer` خريطة لكل `paymentMethod`؛ `commissionBase = NET_OF_VAT`؛ `negotiationCommissionBps = null`؛ `payoutWeekday = SUN`؛ `newVendorHoldDays = 14`؛ `platformCouponApprovalBps = 1000`؛ `souqDiscountsRequireLicense = false`؛ `allowNonResidentVendors = false`؛ وإعدادات O9 (D22). قيم O1/O3/O7 افتراضية بانتظار المالك
- `ShippingZone`: name, cities[], baseFee, perKgFee, freeShippingOver?, etaDays
- `Notification`: userId, type, title, body, link, readAt?
- `AuditLog`: actorUserId, action, entity, entityId, before (JSON), after (JSON), ip
- `Redirect`: fromPath (unique), toPath, code (301)
- `Job`: type, payload, status, runAt, attempts, lastError

**سوق الزل: العروض والفصال**
- `Deal`: id, vendorId?, productId, variantIds[] (فارغ = كل الخيارات), type (FLASH|DAILY|WEEKLY|CLEARANCE|BUNDLE), dealPrice أو discountPercent, startsAt, endsAt, stockLimit?, soldCount, perCustomerLimit?, titleAr/En, badgeAr/En, status (DRAFT|PENDING|APPROVED|LIVE|ENDED|REJECTED), rejectReason?, isPinned, priority
- `NegotiationSettings` (لكل منتج، 1:1 مع Product): allowBargain (Boolean), floorPrice? (أقل سعر يقبله التاجر، **سري لا يظهر للعميل أبداً**), autoAcceptPrice? (أي طلب ≥ هذا السعر يُقبل تلقائياً), maxRounds (افتراضي 3), responseWindowHours (افتراضي 24)
- `PriceRequest`: id, number (PR-10001), customerId, type (PRODUCT|OPEN), productId?, variantId? (لو على منتج محدد), categoryId, titleAr, description?, images[], qty, targetPrice (للوحدة، بالهللة), city, status (OPEN|HAS_OFFERS|ACCEPTED|CONVERTED|EXPIRED|CANCELLED), expiresAt (افتراضي 48 ساعة), acceptedOfferId?, broadcastCount, viewsCount
- `PriceRequestRecipient`: requestId, vendorId, status (SENT|SEEN|RESPONDED|DECLINED|IGNORED), seenAt? — يحدد من وصله الطلب
- `PriceOffer`: id, requestId, vendorId?, productId, variantId (منتج التاجر نفسه المطابق للطلب), round (1..maxRounds), parentOfferId?, author (VENDOR|CUSTOMER), unitPrice, qty, shippingFee, etaDays, note? (يُفلتر من أرقام الجوال والروابط والإيميلات), status (PENDING|ACCEPTED|REJECTED|COUNTERED|EXPIRED|WITHDRAWN), expiresAt, isAuto (لو قُبل تلقائياً)
- `PriceLock`: id, offerId, customerId, variantId, unitPrice, qty, expiresAt (افتراضي 24 ساعة للدفع), reservedStock, usedOrderId?, status (ACTIVE|USED|EXPIRED|CANCELLED)
- `OrderItem` يضاف له: `priceLockId?`, `dealId?` لتتبع مصدر السعر
- `Deal` يضاف له (D16): `discountLicenseNumber?`, `discountLicenseFrom?`, `discountLicenseTo?`. لو `souqDiscountsRequireLicense = true` لا يصبح العرض `LIVE` خارج فترة ترخيص سارية، ويُعرض الترخيص في صفحة العرض (`docs/legal/legal-review.md` R-07 توصية 2). الافتراضي `false`.

### 5.1 إضافات معتمدة على النموذج (G1 — المرجع الملزم ملف المختص)

> التنفيذ في `prisma/schema.prisma` لـ backend-engineer فقط (قاعدة 4). التفاصيل الكاملة والـ indexes والـ CHECK والـ migrations في `docs/decisions/backend.md` §5 و§6 و `docs/decisions/finance.md` §7. migration الحماية (`0009_security_hardening`) تُعاد كتابتها على Postgres عام بدل أدوار Supabase.

**المالية والضريبة (finance-zatca — `finance.md` §7):**
- `Vendor`: `vatStatus` (NOT_REGISTERED / PENDING_VERIFICATION / REGISTERED_VERIFIED)، `vatVerifiedAt?`، `isResident` (true فقط في الإطلاق)، `holdDaysOverride?`
- `SubOrder`: تقسيم `discountShare` إلى `platformDiscountShare` و `vendorDiscountShare`؛ إضافة `itemsGross`، `commissionBaseNet`، `feeBearer`، `shippingMode`، `shippingNetToVendor`، `vendorVatRegistered` (مُجمّد)، `vendorVatNumberSnapshot?`، `vendorVat`، `vendorPayable`؛ `vendorNet` يصبح **صافياً قبل الضريبة**؛ `priceSource` (REGULAR / DEAL / NEGOTIATION)
- `OrderItem`: `platformDiscount`، `vendorDiscount`، `netAmount`، `vatAmount` لكل بند (+ `vatRateBp`، والتوزيع بالباقي الأكبر — `backend.md` H12)
- `Order`: `buyerVatNumber?`، `buyerLegalName?`، `invoiceType` (SIMPLIFIED / STANDARD)؛ `couponId` (FK) بدل `couponCode` نصياً فقط
- `Payment`: `feeNet?`، `feeVat?`، `feeSource` (GATEWAY / ESTIMATE)، `settledAt?`، `settlementRef?`، `refundFeeNet?`
- `WalletTransaction`: قيم جديدة للـ `type`: `SHIPPING_CREDIT`، `PURCHASE_VAT_CREDIT`، `COMMISSION_REVERSAL_CREDIT`، `PURCHASE_VAT_REVERSAL`، `SHIPPING_REVERSAL`. حقول: `returnId?`، `reversesTransactionId?`، `holdReason?` (AWAITING_COMPLETION / AWAITING_SETTLEMENT / AWAITING_VENDOR_INVOICE)، `idempotencyKey` **unique**؛ append-only بتريغر (`backend.md` C7)
- جديد `TaxInvoice`: `orderId`، `kind` (INVOICE / CREDIT_NOTE / DEBIT_NOTE)، `type` (SIMPLIFIED / STANDARD)، `number` تسلسلي، `uuid`، `icv`، `previousInvoiceHash`، `issuedAt`، `netTotal`، `vatTotal`، `grossTotal`، `originalInvoiceId?`، `returnId?`، `xmlUrl`، `qrTlv`، `zatcaStatus` (PENDING / REPORTED / CLEARED / REJECTED)، `zatcaResponse` (JSON) — **بدون تعديل أو حذف**. *(D13: `xmlUrl` و `zatcaStatus` و `zatcaResponse` حقول هيكلية الآن وتُملأ عند الربط في P8)*
- جديد `VendorPurchaseInvoice`: `vendorId`، `payoutId?`، `periodFrom/To`، `vendorInvoiceNumber`، `issueDate`، `netAmount`، `vatAmount`، `fileUrl` (private)، `status` (EXPECTED / RECEIVED / MATCHED / REJECTED)، `matchedByUserId?`
- `PayoutBatch` / `Payout`: `cutoffAt`، `heldVatAmount` (الجزء الضريبي المحجوز)

**التقني (backend-engineer — `backend.md` §5):**
- `StockReservation` (variantId، qty، sourceType: `ORDER`\|`PRICE_LOCK`، sourceId، expiresAt، status: `ACTIVE`\|`CONSUMED`\|`RELEASED`) — الحجز **بـ UPDATE شرطي ذري** وليس SELECT ثم UPDATE (C3)
- `PaymentTransaction` (AUTHORIZE\|CAPTURE\|REFUND\|VOID، `idempotencyKey` unique، method: `GATEWAY`\|`MANUAL_BANK_TRANSFER`) (C4)
- `WebhookEvent` (unique(provider, eventId)، المعالجة بعد التخزين في job) (C5)
- `VariantNegotiationSettings` (variantId PK، floorPrice، autoAcceptPrice — **مبلغ بالهللة**، D23) مع إبقاء `NegotiationSettings` للإعدادات العامة (C6)
- `Vendor.shippingMode` (`PLATFORM_SHIPPING`\|`SELF_SHIPPING`) مُجمّد في `SubOrder.shippingMode` (H1)
- `Shipment` (subOrderId، direction: `OUTBOUND`\|`RETURN`، provider (الآن `MANUAL` فقط)، carrier، trackingNumber، status، cost، declaredValue، codAmount=0) و `ShipmentEvent` (H3)
- `PriceHistory` (H5)؛ `DealVariant` بدل `Deal.variantIds[]` + exclusion constraint (H6)؛ `Deal.reservedCount` و `DealRedemption` (H7)؛ `CartItem.dealId?`، `lockedUnitPrice?`، `priceLockedUntil?` (H8)
- `NegotiationThread` unique(requestId, vendorId) و `PriceOffer.threadId` (H9)؛ أقفال القبول والفهارس الجزئية (H10)؛ `PriceLock` بحالة `IN_CHECKOUT` و `pendingOrderId` (H11)
- حالات موسعة (H14): `PaymentStatus`: `INITIATED`، `AUTHORIZED`، `PAID`، `FAILED`، `VOIDED`، `PARTIALLY_REFUNDED`، `REFUNDED`. `OrderStatus` مشتق: `PENDING_PAYMENT`، `PAID`، `PROCESSING`، `PARTIALLY_SHIPPED`، `SHIPPED`، `DELIVERED`، `COMPLETED`، `PARTIALLY_CANCELLED`، `CANCELLED`، `PAID_NEEDS_REVIEW`. `Payment` 1:N مع `Order`
- `SEQUENCE` لأرقام الطلبات وطلبات السعر والفواتير (M1)؛ `VendorBankChangeRequest` (M2)؛ `storagePath` بدل الروابط للوثائق (M3)؛ `City` و `Address.cityId` (M4)؛ `ProductRevision` (M5، D23)؛ `PriceLock.shippingFee` (M7)؛ `noteRaw` و `noteSanitized` و `ModerationFlag` (M8)؛ فهرس فريد جزئي لطلب واحد مفتوح لكل منتج (M9)؛ `User.deletedAt` + التجهيل (M10)؛ `AuditLog` append-only (M11)؛ M6 و M12 و M13 و M14 كما في الملف
- `User.phone ~ '^\+9665[0-9]{8}$'` (D23)

---

## 6. قواعد العمل التجارية (Business Rules)

### 6.1 المال والضريبة
- `lib/money.ts`: دوال `toHalalas`, `formatSAR`، وتقريب `ROUND_HALF_UP` موحد.
- **عرض العملة (D25، `docs/design/tokens.md` 1.1 §8.4 و§9):** في الواجهة **رمز الريال الجديد U+20C1** بخط مخصص صغير `Souq Riyal Sign` (`unicode-range: U+20C1`، أول عنصر في `--font-sans`)، والترتيب في العربي `1,250.00` ثم U+00A0 ثم U+20C1، مع `role="img"` و `aria-label="ريال سعودي"`. في القنوات التي لا نتحكم في خطها يبقى النص: **"ر.س" بالعربي و "SAR" بالإنجليزي** في SMS وقوالب واتساب والإشعارات والإيميل و `<title>`/`meta`/`og`؛ و **`priceCurrency: "SAR"` بلا رمز** في JSON-LD؛ و `SAR` في الخلاصات وتصدير CSV/Excel وبوابات الدفع و XML الخاص بـ ZATCA؛ وفاتورة PDF بالرمز بخط مضمّن (يعتمده finance-zatca قبل P3). `formatSAR` يأخذ القناة كمعامل.
- الأسعار شاملة الضريبة: `vat = round(total * 15 / 115)`.
- العمولة تُحسب على **صافي قيمة المنتجات قبل الضريبة، بعد خصم كوبون التاجر وقبل الشحن** (`commissionBase = NET_OF_VAT`).
- أولوية نسبة العمولة: `Vendor.commissionRate` ← `Category.commissionRate` ← `Setting.defaultCommission`. تُجمّد النسبة في `SubOrder.commissionRate` لحظة الدفع.
- خصم الكوبون العام يتوزع على الطلبات الفرعية بنسبة قيمتها (`platformDiscountShare`) وتتحمله المنصة، أي أنه **لا** يقلل `vendorNet`. كوبون التاجر (`vendorId` محدد) يتحمله التاجر (`vendorDiscountShare`).
- **ضابط الكوبون العام (D18):** أي كوبون عام نسبته ≥ نسبة العمولة (`platformCouponApprovalBps`) يحتاج موافقة المالك قبل التفعيل.
- رسوم الدفع حسب `gatewayFeeBearer` — **خريطة لكل وسيلة دفع** تُجمّد على `SubOrder.feeBearer` لحظة الدفع (O1 بانتظار المالك؛ الافتراضي في جدول O). `VENDOR` = **الرسم الفعلي قبل الضريبة** من سجل `Payment` (وإن لم يرجع من البوابة يُستخدم تقدير ويُصحح بقيد `ADJUSTMENT` عند وصول كشف التسوية)، موزعاً بنسبة **المبلغ المدفوع لكل طلب فرعي** بطريقة **الباقي الأكبر**. عند الاسترجاع لا تُعكس حصة الرسم على التاجر إلا إذا ردّت البوابة الرسم فعلاً (`finance.md` 2.4).
- **معادلة مستحق التاجر** (`docs/decisions/finance.md` §6 — تُحسب وتُجمّد لكل SubOrder لحظة الدفع):
```
vatOfGross(g)  = roundHalfUp(g × 15 / 115)
netOfGross(g)  = g − vatOfGross(g)
vatOnNet(n)    = roundHalfUp(n × 15 / 100)

commissionBaseGross = itemsGross − vendorDiscount
commissionBaseNet   = netOfGross(commissionBaseGross)
commissionAmount    = roundHalfUp(commissionBaseNet × commissionRateBps / 10000)
gatewayFeeShare     = (feeBearer == VENDOR) ? allocateLargestRemainder(Payment.feeNet, customerPaidGross) : 0
shippingNetToVendor = (SELF_SHIPPING) ? netOfGross(shippingGross) : 0

vendorNet           = commissionBaseNet − commissionAmount − gatewayFeeShare + shippingNetToVendor   // صافي سعر الشراء
vendorVat           = vendorVatRegistered ? vatOnNet(vendorNet) : 0
vendorPayable       = vendorNet + vendorVat
```
- **الاسترجاع:** "أعد الحساب وخذ الفرق" (Recompute-and-diff): يُحسب الطلب الفرعي بالكمية المتبقية، والعكس = الأصل − الجديد. يمنع تراكم فروق التقريب (TC10).
- **الشحن بالمنصة:** رسوم الشحن إيراد للمنصة (عليها ضريبة مخرجات) وتكلفة الناقل على المنصة.
- إذا كان صاحب العرض أو المنتج هو المنصة (`vendorId = null`) لا عمولة ولا مستحق.

### 6.2 الدفع (Moyasar → حساب المنصة)
1. Checkout ينشئ `Order` بحالة `PENDING_PAYMENT` + `SubOrders` + حجز مخزون (`reservedStock`) لمدة 30 دقيقة، كله داخل transaction واحدة.
2. الدفع عبر Moyasar Payment Form/API (مدى، بطاقات، Apple Pay، STC Pay) مع `callback_url`.
3. **مصدر الحقيقة هو الـ webhook** + جلب حالة الدفع من Moyasar API على السيرفر (لا نثق في redirect المتصفح). التحقق من الـ secret/التوقيع، و Idempotency على `gatewayRef`.
4. عند `paid`: `Order.paymentStatus=PAID`، الحالة `PAID`، خصم المخزون الفعلي، كل SubOrder إلى `NEW`، تجميد العمولة، إنشاء قيود `PENDING` في الـ ledger، إشعار العميل والتجار والإدارة.
5. عند الفشل أو انتهاء المهلة: إلغاء الطلب وفك الحجز (cron كل 5 دقائق).
6. الاسترجاع (Refund) من لوحة الإدارة فقط عبر Moyasar Refund API، كامل أو جزئي لكل SubOrder، مع قيد `REFUND_DEBIT` على التاجر إن كان رصيده دخل.
7. تابي وتمارا: نفس النمط (session ← redirect ← webhook ← capture/refund)، ويُعرض ويدجت الأقساط في صفحة المنتج والسلة **حسب تأهيل المزود** (البند 13).

**تفاصيل التحقق والتنفيذ (`docs/decisions/backend.md` 3.2 و 4.3) — كلها في sandbox حتى P8 (D14):**
8. **التحقق من webhook Moyasar:** مقارنة `secret_token` بزمن ثابت، ثم **إعادة جلب الدفعة `GET /v1/payments/:id` بالمفتاح السري** ومطابقة `amount` و `currency` و `metadata.orderId` و `status` قبل أي تحول. لأن التحقق سر مشترك وليس توقيعاً، إعادة الجلب إلزامية وليست اختيارية.
9. **الاستقبال:** حفظ الحدث في `WebhookEvent` (فريد على `provider + eventId`) والرد 200 فوراً، ثم المعالجة في job.
10. **`given_id` = `Payment.id`** لدينا (UUID نولّده قبل الطلب)، فإعادة المحاولة بعد انقطاع الشبكة لا تنشئ دفعة ثانية. `metadata`: `orderId`، `orderNumber`، `env`، بدون بيانات شخصية.
11. **الإلغاء قبل الشحن:** إذا أُلغي الطلب خلال ساعتين نستخدم void، وبعدها refund. **الاسترجاع الجزئي المتعدد** يحتاج تأكيداً من Moyasar (P8)؛ إن لم يكن مدعوماً فالاسترجاع الثاني تحويل بنكي يدوي للعميل يُسجل بطريقة `MANUAL_BANK_TRANSFER`. وصول `paid` بعد انتهاء حجز المخزون: محاولة إعادة الحجز، وإلا `PAID_NEEDS_REVIEW`.
12. **تابي/تمارا: "مدفوع" عندنا = تفويض ناجح ومتحقق منه** (`AUTHORIZED` في تابي بعد إعادة الجلب، و `authorised` في تمارا بعد التحقق من JWT وإعادة الجلب)، ثم capture بمطالبة ذرية (`PaymentTransaction` فريد على `paymentId + type=CAPTURE`). تابي: الهيدر السري + IP allowlist + إعادة الجلب. تمارا: JWT بـ HS256 + إعادة الجلب. cron يومي يلغي/يسترجع أي دفعة BNPL مفوّضة وطلبها ملغى.
13. **إظهار التقسيط:** لا يُعرض زر تابي/تمارا إلا إذا أكدت الجلسة أو الـ eligibility التأهيل، وويدجت الأقساط لا يُعرض للمنتجات فوق سقف المنتج المتاح لدى المزود. (تأكيد سقف ساما والخطط الممتدة في P8.)
14. **cron مطابقة** كل 10–15 دقيقة: كل `Payment` بحالة `INITIATED` أكثر من 10 دقائق تُجلب حالتها من المزود.

### 6.3 دورة حياة الطلب الفرعي (State Machine)
```
NEW → PREPARING → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED
  ↘ CANCELLED (من NEW/PREPARING فقط)
DELIVERED → RETURN_REQUESTED → RETURNED
```
- التحولات المسموحة فقط تمر عبر `features/orders/service.ts::transition()` وتسجل في `OrderStatusHistory`.
- التاجر يغير: NEW→PREPARING→READY_TO_SHIP→SHIPPED (مع رقم تتبع). الإدارة تغير أي حالة. webhook الشحن يحدث SHIPPED/DELIVERED.
- `COMPLETED` تلقائياً بعد `holdDays` من `DELIVERED` بدون طلب استرجاع (`Vendor.holdDaysOverride` إن وُجد يتقدم على `holdDays`؛ القيم O3 افتراضية بانتظار المالك).
- حالة `Order` الرئيسية تُشتق من حالات الطلبات الفرعية (الحالات الموسعة في 5.1، ومنها `PAID_NEEDS_REVIEW`).
- مع الشحن اليدوي (D17) لا يوجد webhook شحن: `SHIPPED` من التاجر أو الإدارة برقم التتبع، و `DELIVERED` من الإدارة أو من التاجر بإثبات.

### 6.4 المحفظة والتحويل اليدوي للتجار
- **القيود (`docs/decisions/finance.md` 6.3):**

| الحدث | القيود (للتاجر) | الحالة |
|---|---|---|
| الدفع | `SALE_CREDIT +commissionBaseNet`، `COMMISSION_DEBIT −commissionAmount`، `GATEWAY_FEE_DEBIT −gatewayFeeShare` (إن وجد)، `SHIPPING_CREDIT +shippingNetToVendor` (إن وجد)، `PURCHASE_VAT_CREDIT +vendorVat` (للمسجل) | PENDING |
| الإكمال + التسوية من البوابة | كلها ← AVAILABLE، إلا `PURCHASE_VAT_CREDIT` حتى استلام فاتورة التاجر | AVAILABLE |
| استرجاع جزئي/كامل | `REFUND_DEBIT −Δ commissionBaseNet`، `COMMISSION_REVERSAL_CREDIT +Δ commissionAmount`، `PURCHASE_VAT_REVERSAL −Δ vendorVat`، `SHIPPING_REVERSAL` إن لزم | نفس حالة القيد الأصلي، أو AVAILABLE مباشرة إن كان مدفوعاً (رصيد سالب) |
| التحويل | `PAYOUT_DEBIT −amount` والقيود المشمولة ← PAID | PAID |

- **شروط الإتاحة** (السلوك الافتراضي، O3 بانتظار المالك): القيد يصبح `AVAILABLE` بثلاثة شروط: (أ) الطلب الفرعي `COMPLETED`؛ (ب) `Payment.settledAt` موجود (المال وصل حساب المالك فعلاً)؛ (ج) لقيود `PURCHASE_VAT_CREDIT`: فاتورة التاجر المسجل مستلمة ومطابقة (D11). `holdReason` يوضح سبب الانتظار.
- **التاجر المسجل (D11):** النظام يولّد له **مسودة بالأرقام** (صافي، ضريبة، إجمالي، أرقام الطلبات الفرعية) لفاتورته للمنصة، والجزء الضريبي لا يُحوَّل قبل رفع الفاتورة ومطابقتها (`VendorPurchaseInvoice`). التاجر غير المسجل: "كشف مشتريات" شهري (مستند غير ضريبي).
- **الجدولة الافتراضية** (O3 بانتظار المالك، كلها إعدادات): أسبوعية، إنشاء الدفعة كل **أحد** بقطع 00:00 بتوقيت الرياض، والاعتماد والتحويل حتى **الثلاثاء**؛ `holdDaysOverride = 14` للتاجر الجديد يُعيَّن عند القبول، والنظام **يقترح** إزالته بعد 60 يوماً و10 طلبات مكتملة، والإزالة بقرار الإدارة (مسجل في `audit_logs`)؛ **الرصيد السالب** يُرحَّل ويُقتطع من الدفعات القادمة؛ علامة مراجعة يدوية لأي Payout ≥ 10,000 ر.س قبل الاعتماد.
- **الرصيد:** معلّق = مجموع PENDING، متاح = مجموع AVAILABLE، مدفوع = مجموع PAID.
- **دورة التسوية (يدوية):**
  1. الإدارة تفتح `/admin/payouts` ← "إنشاء دفعة تسوية" لفترة محددة ← النظام ينشئ `Payout` لكل تاجر رصيده المتاح ≥ الحد الأدنى (إعداد، افتراضي 100 ر.س).
  2. مراجعة واعتماد (`APPROVED`).
  3. **تصدير ملف تحويل** CSV/Excel (اسم المستفيد، الآيبان، البنك، المبلغ، المرجع) لرفعه على بنك المالك كتحويل جماعي، أو تنفيذ التحويلات واحداً واحداً.
  4. بعد التحويل: المالك يسجل لكل Payout **رقم مرجع التحويل + صورة الإيصال** ← الحالة `PAID` ← قيد `PAYOUT_DEBIT` وتحويل القيود المشمولة إلى `PAID`.
  5. إشعار التاجر (إيميل + SMS + داخل اللوحة) مع كشف الحساب.
- التاجر يقدر يرسل "طلب سحب" يظهر للإدارة، لكن التنفيذ دائماً يدوي.
- ممنوع تعديل أو حذف قيد ledger؛ أي تصحيح يكون بقيد `ADJUSTMENT` مع سبب ومستخدم.
- تقرير شهري: مبيعات كل تاجر، العمولات، الرسوم، المحوّل، المتبقي (تصدير Excel).

### 6.5 التجار والمنتجات
- التسجيل من `/sell`: بيانات الشركة ← الوثائق ← الحساب البنكي (التحقق من صيغة الآيبان السعودي `SA` + 22 رقم) ← التصنيفات المطلوبة ← الموافقة على الاتفاقية (نسخة وتاريخ).
- الإدارة: قبول (مع تحديد التصنيفات المسموحة والعمولة) أو رفض بسبب.
- إضافة منتج من التاجر: قائمة التصنيفات = `VendorCategory` فقط، والتحقق على السيرفر.
- أي تعديل على (الاسم، الوصف، الصور، التصنيف) لمنتج منشور من تاجر غير موثوق يدخل المراجعة عبر `ProductRevision`، **والنسخة المنشورة تبقى ظاهرة حتى الموافقة** (D23). تعديل السعر والمخزون لا يحتاج مراجعة.
- تعليق التاجر `SUSPENDED` يخفي كل منتجاته فوراً ويوقف الطلبات الجديدة، ويبقي الطلبات الحالية والرصيد.
- **الضريبة (D11):** التحقق من الرقم الضريبي عند قبول التاجر وقبل كل دفعة؛ رقم غير متحقق منه = يُعامل كغير مسجل (لا تُدفع له ضريبة). صفحة `/sell` تعرض **حاسبة "صافيك"** قبل الانضمام (مثال: منتج 1,150 ر.س بعمولة 10% ← 900 للتاجر غير المسجل، و 1,035 للمسجل منها 135 ضريبة يوردها هو).
- **غير المقيمين:** افتراضي مؤقت `allowNonResidentVendors = false` (O10 بانتظار المالك).
- **السيوف (D26):** تصنيف "سيوف فاخرة" مقفول للتجار افتراضياً (منتجات المنصة فقط) حتى قرار المالك.

### 6.6 الشحن (D17 — يدوي فقط الآن)
- رسوم الشحن تُحسب لكل SubOrder حسب المدينة والوزن (`ShippingZone`) مع شحن مجاني فوق حد معين. (التسعير حسب مدينة التاجر يتبع إعداد الشحن الذي يضبطه المالك لاحقاً.)
- وضعان لكل تاجر (`Vendor.shippingMode`): `PLATFORM_SHIPPING` (المنصة تشحن) أو `SELF_SHIPPING` (التاجر يشحن، ورسوم الشحن تذهب له).
- **التنفيذ الوحيد الآن `ManualShippingProvider`:** التاجر (في `SELF_SHIPPING`) أو الإدارة (في `PLATFORM_SHIPPING`) **يدخل شركة الشحن ورقم التتبع** يدوياً، ويُسجل في `Shipment` بـ `provider = MANUAL`. بدون أي ربط بمزود، وبدون إصدار بوليصة آلي، وبدون webhook.
- الـ interface `ShippingProvider` يبقى عاماً حتى يُضاف مزود لاحقاً (O4) بدون تغيير منطق الطلبات.
- لا دفع عند الاستلام (غير موجود في وسائل الدفع؛ O10).

### 6.7 صفحة "سوق الزل" والعروض (Deals)
- `/souq` صفحة سوق حي: تعرض العروض النشطة (`LIVE`) من كل التجار والمنصة، مقسمة إلى: **عروض الساعة (FLASH)** بعداد تنازلي وشريط "باقي X قطعة"، **عروض اليوم**، **عروض الأسبوع**، **تصفية**، **باقات**، و**أحدث طلبات الفصال المفتوحة** (بدون بيانات العميل) لتحفيز التجار والعملاء.
- فلاتر: التصنيف، التاجر، نسبة الخصم، السعر، المدينة، "ينتهي قريباً". ترتيب: الأعلى خصماً، ينتهي قريباً، الأكثر مبيعاً، الأحدث.
- بطاقة العرض: صورة، اسم المنتج، اسم المتجر وتقييمه (D21)، السعر قبل وبعد، نسبة الخصم، العداد، الكمية المتبقية، زر "اشترِ الآن"، وزر "فاصل" لو `allowBargain`.
- **الخصومات والترخيص (D16):** الخصومات مسموحة طول السنة الآن. لو فُعّل `souqDiscountsRequireLicense` لاحقاً: لا يصبح العرض `LIVE` خارج فترة ترخيص سارية، و"المواسم" تُربط بفترات الترخيص، وخارجها تعرض `/souq` طلبات الفصال المفتوحة، "اطلب سعرك"، وصل حديثاً، والمنتجات القابلة للفصال **بدون سعر قبل/بعد**. التصميم والبناء يدعمان الوضعين بإعداد واحد.
- تحديث لحظي (Realtime عبر `RealtimeProvider`): الكمية المتبقية، انتهاء العرض، عروض جديدة.
- التاجر ينشئ العرض من `/vendor/deals` ← الحالة `PENDING` ← الإدارة توافق (إلا الموثوق) ← يصبح `LIVE` تلقائياً عند `startsAt` وينتهي عند `endsAt` أو نفاد `stockLimit` (cron + فحص لحظي في السلة).
- **قواعد العروض:**
  - سعر العرض لازم يكون أقل من السعر الأساسي الحالي، والسعر "قبل" المعروض هو آخر سعر بيع فعلي (ممنوع رفع السعر قبل الخصم؛ النظام يحفظ تاريخ السعر ويرفض العرض لو السعر الأساسي اتغير خلال آخر 14 يوم). هذا حماية للعميل وللمصداقية.
  - عرض واحد نشط لكل variant في نفس الوقت.
  - `perCustomerLimit` يُفرض في السلة وفي الـ checkout.
  - السعر يُقفل في السلة 15 دقيقة لعروض FLASH، وبعدها يُعاد حسابه. **القفل للسعر فقط؛ حصة `stockLimit` تُحجز عند الـ checkout** (إنشاء الطلب `PENDING_PAYMENT`) بـ UPDATE شرطي ذري وليس عند الإضافة للسلة (D23، `backend.md` H7 و H8). حالة "نشط" تُحسب في الاستعلام ولا تعتمد على الـ cron للصحة.
  - العمولة تُحسب على سعر العرض.
- الإدارة: تثبيت عروض (`isPinned`)، ترتيب، إيقاف أي عرض فوراً، وإنشاء "مواسم" (رمضان، اليوم الوطني، العيد) تجمع عروض تحت بانر واحد.

### 6.8 نظام الفصال وطلب السعر (Negotiation / Reverse Offers)

**الفكرة:** العميل يطلب السعر اللي يناسبه، والتجار يتنافسون على طلبه.

**نوعان من الطلبات:**
1. **فصال على منتج (`PRODUCT`)**: من صفحة منتج فيها `allowBargain` يضغط العميل "اطلب سعرك" ويدخل السعر والكمية والمدينة. الطلب يوصل **لصاحب المنتج + كل التجار المعتمدين في نفس التصنيف** (حسب `VendorCategory`) واللي عندهم منتج منشور في التصنيف. كل تاجر يرد بمنتجه هو (صاحب المنتج يرد على نفس المنتج، والباقي يختارون منتجاً مطابقاً من منتجاتهم).
2. **طلب مفتوح (`OPEN`)**: من `/souq` زر "اطلب منتج بسعرك": يختار التصنيف، يكتب الوصف، يرفع صور اختيارية، يحدد السعر والكمية. يوصل لكل التجار المعتمدين في التصنيف.

**دورة الفصال:**
```
العميل ينشئ الطلب (OPEN)
  → يوصل للتجار (PriceRequestRecipient = SENT) + إشعار فوري
  → كل تاجر: يقبل السعر | يرد بسعر مضاد | يعتذر
       ↳ أول رد → الطلب HAS_OFFERS
  → العميل يشوف كل العروض جنب بعض (السعر، الشحن، مدة التوصيل، المتجر وتقييمه وشاراته) مرتبة بالإجمالي
  → العميل: يقبل عرض | يرد بسعر مضاد على عرض تاجر معين | يرفض
  → الجولات بين العميل وكل تاجر مستقلة، بحد أقصى maxRounds لكل طرف
  → عند القبول: الطلب ACCEPTED + إنشاء PriceLock (سعر مقفول + حجز مخزون) لمدة 24 ساعة
  → العميل يدفع عادي من السلة (عنصر بسعر مقفول) → الطلب CONVERTED
  → باقي العروض تُغلق تلقائياً (EXPIRED) ويُبلّغ التجار
```

**قواعد إلزامية:**
- **السرية:** التجار لا يرون عروض بعضهم ولا أسعار بعضهم (Sealed offers). يرون فقط طلب العميل وسعره المطلوب. العميل يرى كل العروض.
- **الحد الأدنى السري:** `floorPrice` و `autoAcceptPrice` **لكل variant** (مبلغ بالهللة في `VariantNegotiationSettings`، D23). لو العميل طلب أقل من `floorPrice`، يُرسل للتاجر مع تنبيه "أقل من حدك الأدنى" (`belowYourFloor: boolean` فقط في `PriceRequestVendorDTO`)، ولا يُكشف `floorPrice` للعميل أبداً (لا في الـ API ولا في رسائل الخطأ). طلب سعر تحت `floorPrice` يأخذ نفس الرد ونفس المسار مثل أي طلب آخر، فلا يمكن استنتاج الحد من اختلاف الرد أو زمنه.
- **القبول التلقائي:** لو سعر العميل ≥ `autoAcceptPrice` على منتج محدد، يُنشأ عرض مقبول تلقائياً (`isAuto`) من صاحب المنتج **بعد تأخير عشوائي 2–10 دقائق** حتى لا يُستنتج `autoAcceptPrice` بالتجربة (D22).
- **Realtime والسرية (`backend.md` C1):** قنوات منفصلة لكل جمهور: `pr:{requestId}:customer` (العميل فقط)، `pr:{requestId}:vendor:{vendorId}` (خيط هذا التاجر فقط)، `vendor:{vendorId}:inbox`. البث من السيرفر بـ DTO مُصغّر (معرّفات وحالة، والواجهة تجلب التفاصيل من API محمي). صلاحية الاشتراك تتفحص على السيرفر، وممنوع بث تغييرات جداول الفصال مباشرة.
- **الالتزام:** العرض المقبول ملزم للتاجر بالسعر والكمية لمدة الـ PriceLock. لو ألغاه التاجر بعد الدفع يُسجل عليه في التقييم الداخلي، والإدارة تقدر تعلّق ميزة الفصال له.
- **مهلات:** طلب السعر ينتهي بعد 48 ساعة، والعرض بعد `responseWindowHours`، والـ PriceLock بعد 24 ساعة بدون دفع (يفك حجز المخزون). كلها عبر cron.
- **منع التحايل:** حقل الملاحظات يُفلتر من أرقام الجوال والإيميلات والروابط وحسابات السوشيال (regex عربي وإنجليزي وأرقام عربية ٠-٩)، والمحاولات المتكررة تُبلّغ للإدارة. النص الأصلي يُحفظ في `noteRaw` (للإدارة فقط) والمعروض `noteSanitized`، وكل محاولة `ModerationFlag`. كل الاتفاق والدفع داخل المنصة.
- **حدود العميل (O9 معتمد — D22):** جوال موثّق؛ 5 مفتوحة / 10 يومياً؛ الحساب الجديد بدون طلب مدفوع 2 / 3 لأول 7 أيام؛ طلب مفتوح واحد لكل عميل على نفس المنتج (فهرس فريد جزئي)؛ `targetPrice` لا يقل عن 50% من سعر الـ variant لفصال المنتج، و30% من أقل سعر منشور في التصنيف للطلب المفتوح (يُعرض كحد عام وليس حد التاجر)؛ 30 مستلماً كحد أقصى (صاحب المنتج دائماً + الأعلى في سرعة الرد والقبول)؛ تعليق الفصال 7 أيام بعد 3 محاولات مشاركة وسيلة تواصل خلال 7 أيام؛ Rate limit 5 إنشاءات/10 دقائق لكل حساب و IP. كلها إعدادات.
- **صياغة الواجهة (D21):** "المتجر" أو "ينفّذه متجر …" وليس "البائع".
- **حدود التاجر:** يرد بمنتج منشور من منتجاته فقط وفي نفس التصنيف، والسعر بالهللة، والكمية ≤ المخزون المتاح.
- **العمولة:** على **صافي** سعر الصفقة النهائي (`PriceLock.unitPrice × qty` قبل الضريبة) حسب O7 (افتراضي: نفس سلسلة عمولة التاجر، `negotiationCommissionBps = null`)، وتُجمّد في `SubOrder.commissionRate`. صندوق التاجر يعرض "صافيك المتوقع" بجانب أي سعر يكتبه.
- **الشحن في الفصال (D23):** التاجر يحدده في عرضه، و `PriceLock.shippingFee` يتجاوز حساب المنطقة لذلك الصنف.
- **الشفافية:** صفحة الطلب للعميل فيها Timeline لكل جولة، وعداد للمهلة، وتحديث لحظي.
- **الإدارة:** مراقبة كل الطلبات والعروض، إخفاء طلب مسيء، تعليق ميزة الفصال لعميل أو تاجر، وتقارير: نسبة الطلبات التي تحولت لمبيعات، متوسط الفرق بين السعر المطلوب والنهائي، أسرع التجار رداً.
- **ترتيب التجار:** "أسرع رد" و"نسبة القبول" تظهر كشارات في عروض التاجر وتؤثر على ترتيبه.

### 6.9 الفواتير (D13 — تأسيس فقط الآن)
- **فاتورة العميل** (`docs/decisions/finance.md` 3.4): فاتورة ضريبية **مبسطة** واحدة لكل `Order` باسم سوق الزل ورقمها الضريبي، بنود لكل `OrderItem` مع الخصم على مستوى البند. إذا أدخل العميل رقماً ضريبياً لمنشأة ← **فاتورة ضريبية** (STANDARD). وقت الإصدار: عند تأكيد الدفع من الـ webhook.
- **الاسترجاع/الإلغاء:** إشعار دائن مرتبط بالفاتورة الأصلية لكل استرجاع (كامل أو جزئي)، ولا تعديل ولا حذف لأي فاتورة.
- **ما يُبنى الآن:** جدول `TaxInvoice` (5.1)، **ترقيم تسلسلي** بـ SEQUENCE، الحقول المطلوبة، **توليد PDF** عربي، و**QR بصيغة TLV (Base64) كهيكل** (الحقول الأساسية: اسم البائع، الرقم الضريبي، وقت الإصدار، الإجمالي، الضريبة).
- **ما يتأجل إلى P8:** الربط مع ZATCA (المرحلة الثانية): تسجيل EGS، التوقيع والختم وحقول QR الخاصة به، توليد XML، Reporting خلال 24 ساعة و Clearance للفاتورة الضريبية، وملء `zatcaStatus`.

---

## 7. الصفحات والمسارات

### 7.1 المتجر
`/` الرئيسية (أقسام تُدار من `HomeSection`) — `/c/[slug]` التصنيف — `/products` كل المنتجات — `/p/[slug]` المنتج — `/bundles/[slug]` الباقة — `/store/[slug]` صفحة التاجر — `/search?q=` — `/cart` — `/checkout` (العنوان ← الشحن ← الدفع ← المراجعة) — `/checkout/success/[orderNumber]` — `/pages/[slug]` — `/sell` — `/login` — `/account` (طلباتي، تتبع، العناوين، المفضلة، الاسترجاع، **طلبات الأسعار والفصال**، بياناتي).
**سوق الزل:** `/souq` (العروض الحية + الطلبات المفتوحة) — `/souq/deals/[id]` — `/souq/request/new` (طلب مفتوح) — `/p/[slug]?bargain=1` (نافذة "اطلب سعرك") — `/account/requests` و `/account/requests/[number]` (العروض جنب بعض + الجولات + القبول + الدفع). رابط "سوق الزل" في القائمة الرئيسية بشارة "مباشر".

**متطلبات الواجهة:** Mobile-first، هوية فخمة (ذهبي/بيج/أسود/بني غامق) حسب التصميم المعتمد (`docs/design/README.md` و `docs/design/tokens.md` 1.1)، بطاقة منتج (صورة، اسم، سعر وسعر قبل الخصم، "متوفر بعدة خيارات" أو زر "أضف إلى السلة"، المفضلة)، فلاتر في الـ URL، بحث عربي يطبّع (أ إ آ ← ا، ة ← ه، ى ← ي، إزالة التشكيل)، **رمز الريال الجديد U+20C1** في كل الأسعار (D25)، زر واتساب عائم **أخضر** (D24) على `end` (يسار في العربي)، ومخفي في السلة والدفع، وفي الصفحات التي فيها شريط شراء ثابت يرتفع فوقه، Breadcrumbs، Product + Organization + BreadcrumbList JSON-LD، sitemap.xml و robots.txt، Open Graph لكل منتج، صفحات 404/500 عربية، Skeleton loading.

### 7.2 لوحة الإدارة `/admin`
لوحة الأرقام (KPIs بفلتر فترة: المبيعات، الطلبات، متوسط السلة، عملاء جدد، عمولات المنصة، مستحقات التجار المعلقة والمتاحة؛ رسم المبيعات؛ أفضل المنتجات والتجار؛ منتجات بانتظار المراجعة؛ تنبيهات المخزون) — المنتجات (+ المراجعة + الاستيراد/التصدير) — التصنيفات (شجرة بالسحب) — الباقات — الطلبات (قائمة + تفاصيل بالطلبات الفرعية + Timeline + فاتورة PDF + استرجاع) — الاسترجاعات — العملاء — التجار (طلبات الانضمام، الوثائق، التصنيفات المسموحة، العمولة، موثوق، تعليق، كشف حساب) — **المالية** (الـ ledger، أرصدة التجار، دفعات التسوية، التصدير، تسجيل التحويل، التقارير) — الكوبونات والعروض — **سوق الزل** (مراجعة العروض وتثبيتها وإيقافها، المواسم، مراقبة طلبات الفصال والعروض، تعليق الفصال، تقارير التحويل والفروق) — التقييمات — المحتوى (البنرات، أقسام الرئيسية، الصفحات) — الإعدادات (بيانات المتجر والسجل والرقم الضريبي، الضريبة، العمولة الافتراضية، أيام الحجز، Moyasar/Tabby/Tamara، مناطق الشحن، SMS، واتساب، Pixels) — الموظفون والصلاحيات — سجل العمليات.

### 7.3 لوحة التاجر `/vendor`
الرئيسية (مبيعات، طلبات جديدة، رصيد معلّق/متاح/محوّل، التقييم) — المنتجات (إضافة/تعديل، الخيارات والمخزون، استيراد CSV، حالة المراجعة وسبب الرفض) — الطلبات (الطلبات الفرعية فقط، تجهيز، رقم التتبع/البوليصة، طباعة قائمة التجهيز) — المالية (كشف حساب، التحويلات مع الإيصالات، طلب سحب) — ملف المتجر (الشعار، الغلاف، الوصف، العنوان، الحساب البنكي؛ تغيير الآيبان يحتاج موافقة الإدارة) — الفريق — التقييمات والرد — الإشعارات — **العروض** `/vendor/deals` (إنشاء عرض ساعة/يوم/أسبوع/تصفية، الحالة، الأداء) — **طلبات الأسعار** `/vendor/requests` (صندوق وارد لحظي بالطلبات الواصلة، فلتر: جديد/بانتظار ردي/بانتظار العميل/مقبول، الرد بقبول أو سعر مضاد أو اعتذار مع اختيار المنتج المطابق، عداد المهلة) — **إعدادات الفصال** لكل منتج (السماح، الحد الأدنى السري، سعر القبول التلقائي، عدد الجولات). **الإعداد الأول (Onboarding checklist)** لما يتقبل التاجر.

---

## 8. الإشعارات

| الحدث | العميل | التاجر | الإدارة |
|---|---|---|---|
| تأكيد الطلب/الدفع | SMS + إيميل | داخل اللوحة + إيميل + SMS | داخل اللوحة |
| شحن الطلب الفرعي | SMS + إيميل برقم التتبع | — | — |
| تسليم | SMS + طلب تقييم بعد يومين | داخل اللوحة | — |
| طلب انضمام تاجر | — | إيميل استلام | داخل اللوحة + إيميل |
| قبول/رفض تاجر أو منتج | — | إيميل + داخل اللوحة | — |
| نفاد المخزون (≤ حد) | — | داخل اللوحة + إيميل | — |
| تسجيل تحويل مالي | — | إيميل + SMS + كشف | — |
| سلة متروكة (بعد ساعة و24 ساعة) — **فقط لمن وافق على التسويق** (D19) | SMS/واتساب/إيميل (القنوات النهائية في قسم 15) | — | — |
| طلب سعر جديد في تصنيفه | — | لحظي داخل اللوحة + Push + SMS/واتساب (قابل للإيقاف) | — |
| عرض جديد أو سعر مضاد على طلبه | لحظي + SMS/واتساب | — | — |
| سعر مضاد من العميل | — | لحظي + واتساب | — |
| قبول العرض | تأكيد + رابط الدفع + مهلة الـ PriceLock | لحظي + إيميل | — |
| قرب انتهاء المهلة (قبل ساعتين) | تذكير بالدفع | تذكير بالرد | — |
| إغلاق الطلب لصالح تاجر آخر | — | داخل اللوحة | — |
| عرض التاجر بانتظار الموافقة / انطلق / انتهى | — | داخل اللوحة | داخل اللوحة (عند الطلب) |
| محاولة مشاركة وسيلة تواصل في الملاحظات | — | تحذير | تنبيه |

**قواعد الرسائل (`docs/legal/legal-review.md` PDPL #4 و `docs/decisions/backend.md` 2.6):**
- **الموافقة التسويقية:** صندوق **غير مُعلَّم مسبقاً** عند التسجيل والدفع، ويُسجّل (من، متى، النسخة). رابط أو كلمة إلغاء في كل رسالة تسويقية. فصل قوالب الإشعارات الخدمية عن التسويقية، وعدم وضع بيانات شخصية غير لازمة في متغيرات القوالب.
- **نصوص SMS:** كل رسالة قالب ثابت بمتغيرين كحد أقصى، روابط `https://suqalzl.com/...` كاملة بدون مختصرات، والـ OTP العربي قصير ليبقى مقطعاً واحداً. اسم المرسل `SuqAlZal` (D20).
- **واتساب:** قوالب utility للإشعارات، وقوالب marketing للسلة المتروكة بموافقة.

---

## 9. الأمان والجودة والأداء

- Rate limit على: OTP (5 محاولات/ساعة لكل رقم وIP)، الدخول، الـ checkout، الكوبونات.
- التحقق من توقيع كل webhook، و Idempotency keys.
- أسرار في `.env` فقط، و`.env.example` محدّث دائماً.
- Security headers + CSP، وحماية CSRF في Server Actions، وتنظيف HTML في الأوصاف (sanitize).
- رفع الملفات: أنواع وأحجام محددة، والوثائق في bucket خاص بروابط موقعة مؤقتة.
- نظام حماية البيانات الشخصية (PDPL): موافقة الكوكيز، سياسة خصوصية، حذف الحساب عند الطلب **بالتجهيل بدل الحذف** (`User.deletedAt`؛ الطلبات والفواتير تبقى بلقطات العنوان)، **تصدير نسخة من بيانات صاحب الحساب**، وسجل الموافقات. (الإقامة داخل المملكة، خطة الحوادث، مدد الاحتفاظ، RoPA و DPIA: قسم 15 → P7/P8.)
- **OTP:** 6 أرقام بـ `crypto.randomInt`، تخزين hash فقط، `expiresAt` = 5 دقائق، `attempts` ≤ 5 ثم قفل؛ قبول `+9665XXXXXXXX` فقط.
- **أسرار حساسة:** تشفير حقول الآيبان والوثائق الحساسة على مستوى التطبيق بمفتاح منفصل (`FIELD_ENCRYPTION_KEY`) مع key versioning (`devops.md` 6.2).
- الأداء: Lighthouse ≥ 90 على الجوال للرئيسية والمنتج، next/image، caching/ISR للصفحات العامة، LCP < 2.5s، وميزانية الأداء في `docs/design/tokens.md` §12.
- الوصولية: WCAG 2.1 AA بالعربي RTL.
- Backups يومية لقاعدة البيانات واختبار استرجاع.

---

## 10. الاختبارات ومعايير القبول

**Unit (Vitest) — إلزامي:** حساب الضريبة والعمولة والخصومات ورسوم الدفع وتوزيعها، تقسيم الطلب على التجار، الـ state machine، الـ ledger والأرصدة، إنشاء دفعة التسوية، التحقق من الآيبان، تطبيع البحث العربي.

**E2E (Playwright):**
1. زائر يتصفح ← يضيف منتجين من تاجرين + منتج من المنصة ← يسجل بالجوال ← يدفع (Moyasar sandbox) ← يرى 3 طلبات فرعية.
2. تاجر يسجل ← الإدارة تقبله بتصنيفين ← التاجر يحاول إضافة منتج في تصنيف ثالث (مرفوض) ← يضيف في المسموح ← الإدارة توافق ← المنتج يظهر.
3. التاجر يشحن ← التسليم ← بعد مدة الحجز يصبح الرصيد متاح ← الإدارة تنشئ دفعة وتصدر الملف وتسجل التحويل بالمرجع والإيصال ← التاجر يرى الكشف.
4. استرجاع جزئي ينعكس على رصيد التاجر.
5. عزل البيانات: تاجر A لا يصل إلى أي طلب/منتج/كشف لتاجر B (بتغيير الـ IDs في الروابط والطلبات).
6. axe-core على الصفحات الرئيسية عربي وإنجليزي.
7. **فصال على منتج:** عميل يطلب 900 ر.س لمنتج سعره 1,150 ← يوصل لصاحب المنتج و3 تجار في نفس التصنيف ← تاجر يقبل، تاجر يرد 1,000، تاجر يعتذر ← العميل يرد 950 على عرض الـ 1,000 ← التاجر يقبل ← PriceLock ← الدفع بـ 950 ← الطلب CONVERTED وباقي العروض EXPIRED ← العمولة محسوبة على 950.
8. **السرية:** تاجر لا يستطيع رؤية عرض تاجر آخر ولا `floorPrice` لأي منتج عبر أي API أو رسالة خطأ؛ العميل لا يرى `floorPrice`.
9. **القبول التلقائي والمهلات:** طلب ≥ `autoAcceptPrice` يُقبل فوراً؛ PriceLock غير مدفوع يفك المخزون بعد المهلة؛ لا يمكن تجاوز `maxRounds`.
10. **العروض:** عرض FLASH ينطلق وينتهي في وقته، يتوقف عند نفاد `stockLimit`، يُفرض `perCustomerLimit`، ويُرفض عرض على منتج رُفع سعره الأساسي خلال 14 يوم.
11. **فلتر الملاحظات:** "كلمني على ٠٥٥١٢٣٤٥٦٧" و "wa.me/..." و "@insta" تُرفض أو تُخفى.

**Unit مالي إلزامي:** حالات **TC1–TC12** بالهللة في `docs/decisions/finance.md` §8 (بقيم O1/O3/O7 الافتراضية؛ تُحدَّث لو غيّر المالك القيم).

**تزامن وأمان (`docs/decisions/backend.md` §7):** حجز المخزون (50 طلباً متزامناً على مخزون 5 ← 5 نجاحات)، FLASH (`stockLimit` و `perCustomerLimit` تحت التزامن)، القبول المزدوج، إعادة إرسال الـ webhook (قيد ledger واحد)، **اختبار تسريب آلي** على كل route handler و server action يتحقق أن الرد لا يحتوي `floorPrice` و `autoAcceptPrice` ولا `vendorId` غير تاجر الجلسة، ورفض اشتراك تاجر في قناة Realtime لتاجر آخر. بأداة حمل وليس Playwright فقط.

**Unit إضافي:** آلة حالات PriceRequest/PriceOffer، اختيار المستلمين (التصنيف + المعتمدين + عندهم منتج منشور)، قواعد الحد الأدنى والقبول التلقائي، الـ PriceLock، تسعير العروض وحماية السعر المرجعي، فلتر وسائل التواصل.

**Definition of Done لأي مهمة:** الكود يعمل محلياً + الـ types بدون أخطاء + lint نظيف + الاختبارات المتعلقة تنجح + نصوص الواجهة في ملفات الترجمة + لا بيانات وهمية في الواجهة + تحديث `.env.example` والتوثيق + ملخص قصير لما تم وطريقة الاختبار.

---

## 11. المراحل وتوزيع المهام على الإيجنتس

> **تحديث 2026-11-18:** الاستضافة في P7 (التقييم والنشر) و P8 (الاعتماد القانوني والعقد)، والفاتورة تأسيس في P3 وربط ZATCA في P8، والشحن يدوي حتى يضبطه المالك، وكل الأمور الورقية والقانونية في **P8** (D12–D17). الخطة التفصيلية: `docs/plan.md`.

| المرحلة | المهام | الإيجنت المسؤول | يعتمد على |
|---|---|---|---|
| **P0 التجهيز** (منتهية) | حسم القرارات O1–O9 (المعتمد في D11–D28، والباقي في جدول O)؛ اتفاقية التاجر والسياسات v0.2 (مسودات، المحامي في P8)؛ قرار الفاتورة (D11، D13) | ceo، finance-zatca، legal-contracts | — |
| | هوية بصرية + Design tokens + شاشات رئيسية — **معتمدة** (D28) | designer، design-system-performance | — |
| **P1 الأساس** | المستودع، Prisma schema كامل (قسم 5 + 5.1)، migrations، seed (التصنيفات، SUPER_ADMIN، الإعدادات بالقيم الافتراضية في جدول O و D22)، Auth + OTP ذاتي، الصلاحيات، layouts، i18n، RTL | backend-engineer، frontend-engineer | P0 design tokens |
| | spike أول P1: العزل و RLS (`SET LOCAL app.vendor_id`) و SSE + `LISTEN/NOTIFY` على Postgres محلي | backend-engineer + devops-engineer | — |
| | `docker compose` (Postgres 16 + تخزين S3-compatible محلي)، CI (lint, typecheck, tests) كملفات جاهزة تعمل عند وصول مستودع GitHub من المالك، Sentry بتنظيف PII، interfaces `StorageProvider` و `JobScheduler` و `RealtimeProvider` | devops-engineer | — |
| **P2 المتجر** | الكتالوج، البحث، صفحة المنتج، السلة، الكوبونات (ضابط D18)، Checkout، Moyasar sandbox + webhooks، حساب العميل (تصدير البيانات والتجهيل) | frontend-engineer، backend-engineer | P1 |
| | نصوص الواجهة، صفحات السياسات (مسودات حتى المحامي في P8)، SEO و JSON-LD | arabic-content-seo | P1 |
| **P3 لوحة الإدارة** | الأرقام، المنتجات، التصنيفات، الباقات، الطلبات، الاسترجاع، العملاء، المحتوى، الإعدادات، الموظفون، سجل العمليات، **تأسيس الفاتورة** (6.9: النموذج، الترقيم، PDF، QR TLV كهيكل) | frontend-engineer، backend-engineer | P2 |
| **P4 نظام التجار** | `/sell` (حاسبة "صافيك")، المراجعة، لوحة التاجر، مراجعة المنتجات (`ProductRevision`)، تقسيم الطلبات، **الشحن اليدوي** (6.6)، الـ ledger، فواتير التجار المسجلين، دفعات التسوية والتحويل اليدوي، التقارير، الإشعارات | backend-engineer، frontend-engineer | P3 |
| | مراجعة حسابات العمولة والضريبة والـ ledger (TC1–TC12) | finance-zatca | P4 |
| **P4.5 سوق الزل والفصال** | صفحة `/souq` الحية (الخصومات حسب D16)، العروض (Deals) ودورتها، نظام طلب السعر والفصال، PriceLock في السلة، Realtime بقنوات منفصلة، صناديق التاجر والعميل، مراقبة الإدارة | backend-engineer، frontend-engineer | P4 |
| | تصميم تجربة السوق والفصال (التفصيلي والشاشات الباقية) | designer | P0 |
| | قواعد العمولة على الصفقات وحماية السعر المرجعي للعروض | finance-zatca، legal-contracts | P4 |
| **P5 التكاملات** | Tabby، Tamara (sandbox)، SMS (Taqnyat) و OTP، واتساب (Meta Cloud API)، Resend، cron jobs خلف `JobScheduler`. **بدون مزود شحن** (O4 متأجل) | backend-engineer، platform-api-engineer | P4 |
| | الكوكيز، GA4، Pixels، أحداث التحويل | tracking-analytics | P2 |
| **P6 الجودة** | خطة اختبار، e2e، عزل البيانات، التزامن، اختبار التسريب، الوصولية، الأداء | qa-tester، e2e-automation-engineer، design-system-performance | P5 |
| **P7 النقل والتشغيل** | سكربت الاستيراد من زد، Redirects 301؛ **الاستضافة (O6):** تقييم devops المحدّث واختيار المرشح، بيئة staging، backups وتمرين استرجاع، المراقبة، go-live checklist | backend-engineer، devops-engineer | P6 |
| | خطة إطلاق وتسويق لجذب التجار والعملاء (خطة فقط) | marketing-lead، social-media-manager | P6 |
| **P8 الأمور الورقية والاعتمادات** | السجل التجاري والرقم الضريبي وبيانات المنشأة؛ المستشار الضريبي (أسئلة `docs/decisions.md` §7)؛ المحامي (PDPL والاستضافة، حماية المستهلك، التخفيضات، السيوف، SFDA، الاتفاقية والسياسات وقرارات B4–B12)؛ عروض أسعار وعقود المزودين (Moyasar، تابي، تمارا، Taqnyat، الشحن، الاستضافة، البنك)؛ تسجيل اسم المرسل ورقم واتساب الأعمال؛ تراخيص التخفيضات؛ **ربط ZATCA المرحلة الثانية**؛ **اعتماد الاستضافة النهائي والنشر للإنتاج**؛ المفاتيح الحية | المالك (المستندات والتواصل الخارجي) + finance-zatca، legal-contracts، devops-engineer، backend-engineer | P7 |
| **الإطلاق الفعلي** | تفعيل المفاتيح الحية، التحويل من `new.suqalzl.com` إلى `suqalzl.com` (D9)، Apple Pay للدومينات النهائية | devops-engineer، backend-engineer | G6 |

**بوابات المراجعة (Gates):** G1 بعد P0 (القرارات والتصميم) — **معتمدة 2026-11-18**؛ G2 بعد P2 (تجربة شراء sandbox)؛ G3 بعد P4 (دورة تاجر كاملة حتى التحويل)؛ G4 بعد P4.5 (عرض FLASH + صفقة فصال كاملة حتى الدفع)؛ G5 قبل P7؛ **G6 بعد P8** (كل الاعتمادات والأوراق) قبل الإطلاق الفعلي.

---

## 12. قواعد العمل للإيجنتس (انسخها في CLAUDE.md)

1. اقرأ `SPEC.md` كاملاً قبل أي مهمة. لو في تعارض بين المهمة والـ SPEC، توقف وارفع للـ CEO.
2. اشتغل على مهمتك فقط وفي فرع Git باسم `agent/<role>/<task>`، و commit صغير وواضح.
3. قبل الكود: اكتب خطة قصيرة (الملفات، التغييرات على الـ schema، المخاطر).
4. لا تغير `prisma/schema.prisma` إلا backend-engineer، وأي migration لازم تُذكر في الملخص.
5. لا تكتب أي مبلغ كـ Float. استخدم `lib/money.ts`.
6. كل نص في الواجهة يكون في `messages/ar.json` و `messages/en.json`.
7. ممنوع البيانات الوهمية في الواجهات؛ البيانات التجريبية في `seed.ts` فقط.
8. كل action محمي بالصلاحيات، وكل استعلام تاجر مفلتر بـ `vendorId` من الجلسة.
9. لا تضع أسرار في الكود. حدّث `.env.example`.
10. نفذ Definition of Done (قسم 10) قبل ما تعلن انتهاء المهمة.
11. في آخر كل مهمة اكتب: ما تم، الملفات، الأوامر، متغيرات البيئة، طريقة الاختبار اليدوي، وما بقي.
12. أي قرار تجاري أو قانوني أو مالي غير محسوم يرفع للمالك عبر الـ CEO؛ لا تفترضه.

---

## 13. البرومبتات

### 13.1 برومبت التشغيل للـ CEO (ابدأ به)

```
أنت CEO ومدير مشروع "سوق الزل". المرجع الوحيد هو ملف SPEC.md المرفق/الموجود في جذر المستودع — اقرأه كاملاً.

المطلوب:
1) حوّل قسم 11 (المراحل وتوزيع المهام) إلى مهام على لوحة الشركة: لكل مهمة عنوان، وصف، الإيجنت المسؤول، الاعتماديات، معايير القبول من قسم 10.
2) ابدأ بالمرحلة P0 فقط: كلّف finance-zatca و legal-contracts بحسم القرارات المفتوحة O1–O3 وتجهيز اتفاقية التاجر والسياسات، وكلّف designer و design-system-performance بالهوية والشاشات الرئيسية، وكلّف backend-engineer و devops-engineer بتقييم O4–O6.
3) اجمع النتائج في تقرير واحد لي فيه: القرارات المقترحة مع البدائل والتوصية، روابط التصاميم، وأسئلة تحتاج موافقتي.
4) لا تنتقل لأي مرحلة بعدها إلا بعد موافقتي (بوابات المراجعة في قسم 11).

قرارات محسومة لا تناقشها: كل المدفوعات عبر Moyasar تدخل حسابي، وأنا أحوّل للتجار يدوياً، والنظام يحسب المستحقات ويجهز ملف التحويل ويسجل المرجع والإيصال (قسم 6.4).
```

### 13.2 برومبتات المراحل (يرسلها الـ CEO للإيجنت المسؤول أو ترسلها أنت مباشرة)

**P1 — backend-engineer**
```
المهمة P1-Backend حسب SPEC.md:
- أنشئ مشروع Next.js 15 + TypeScript strict حسب قسم 2 و 3، على Postgres 16 محلي بـ `docker compose` (بدون أي اعتماد على Supabase أو مزود سحابي، D12).
- اكتب prisma/schema.prisma كاملاً حسب قسم 5 و 5.1 (كل الجداول والـ enums والعلاقات والـ indexes والـ CHECK، والمبالغ Int بالهللة) حسب `docs/decisions/backend.md` §5–§6 و `docs/decisions/finance.md` §7.
- migrations + seed: التصنيفات (بشت، فروة، زل، عقال، مباخر، فيس، خاتم ومسابح، سيوف فاخرة، حزام محالة، زعفران سوبر، عود ودهن عود، شالات، سداري، عبايات)، SUPER_ADMIN من متغيرات البيئة، Settings الافتراضية (vatRate 1500، defaultCommission 1000، holdDays 7، newVendorHoldDays 14، payoutCycle WEEKLY، payoutWeekday SUN، minPayout 10000، gatewayFeeBearer الخريطة، negotiationCommissionBps null، platformCouponApprovalBps 1000، souqDiscountsRequireLicense false، allowNonResidentVendors false، إعدادات O9 من D22).
- lib/money.ts و lib/vat.ts مع اختبارات.
- Auth: جوال سعودي (`+9665` فقط) + OTP ذاتي (قسم 9) عبر SmsProvider interface (في التطوير يطبع الكود في الـ console)، وإيميل/كلمة مرور للإدارة والتجار.
- lib/permissions.ts حسب قسم 4 + middleware يحمي /admin و /vendor و /account.
- سجل AuditLog كـ helper.
التزم بقواعد قسم 12 و Definition of Done.
```

**P1 — frontend-engineer**
```
المهمة P1-Frontend حسب SPEC.md:
- Tailwind + shadcn/ui بـ design tokens من مخرجات designer، RTL افتراضي، خط IBM Plex Sans Arabic، next-intl (ar/en).
- Layouts: المتجر (هيدر بشعار وبحث وسلة وحساب، قائمة التصنيفات، فوتر بالسياسات وبيانات السجل والرقم الضريبي وشعارات الدفع)، admin و vendor (Sidebar يمين، Topbar، breadcrumbs، الإشعارات).
- مكونات مشتركة: ProductCard، Price، DataTable (TanStack)، FormField، ImageUploader بالسحب والترتيب، StatusBadge، EmptyState، Skeletons.
- صفحات الدخول و OTP.
لا بيانات وهمية؛ اربط بالـ seed. التزم بقسم 12.
```

**P2 — المتجر (backend + frontend)**
```
المهمة P2 حسب SPEC.md أقسام 6.1، 6.2، 7.1:
- الكتالوج: الرئيسية من HomeSection، التصنيف، كل المنتجات بفلاتر في الـ URL، صفحة المنتج بالخيارات وتغيير السعر والمخزون، الباقات، صفحة التاجر، البحث العربي المطبّع.
- السلة (للزائر بـ guestToken ودمجها بعد الدخول)، الكوبونات حسب قواعد 6.1، المفضلة.
- Checkout: العنوان ← الشحن (ShippingZone) ← الدفع ← المراجعة. أنشئ Order + SubOrders لكل تاجر + حجز المخزون في transaction.
- PaymentProvider interface + تنفيذ Moyasar (mada، cards، Apple Pay، STC Pay) — webhook هو مصدر الحقيقة، تحقق من التوقيع، Idempotency، وتأكيد الحالة من Moyasar API. cron لإلغاء الطلبات غير المدفوعة بعد 30 دقيقة.
- حساب العميل: الطلبات وتتبع كل طلب فرعي، العناوين، المفضلة، طلب الاسترجاع.
- اختبارات unit لتقسيم الطلب والخصم والضريبة، و e2e للسيناريو 1 من قسم 10.
```

**P2 — arabic-content-seo**
```
حسب SPEC.md: اكتب نصوص الواجهة العربية والإنجليزية (messages/*.json) بلهجة راقية تناسب منتجات خليجية فاخرة، ومحتوى صفحات: الخصوصية (متوافقة مع PDPL)، الاسترجاع والاستبدال، الشروط والأحكام، الأسئلة الشائعة، الشحن والتوصيل، من نحن، صفحة /sell لجذب التجار. وجهّز: title/description لكل نوع صفحة، JSON-LD (Product، Organization، BreadcrumbList)، sitemap و robots، وقائمة كلمات بحث سعودية لكل تصنيف. السياسات تراجعها legal-contracts قبل النشر.
```

**P3 — لوحة الإدارة**
```
المهمة P3 حسب SPEC.md قسم 7.2: نفّذ كل صفحات /admin ما عدا المالية والتجار (في P4): الأرقام بفلتر فترة، المنتجات (مع قسم المراجعة والاستيراد والتصدير CSV)، التصنيفات بالسحب، الباقات، الطلبات بالطلبات الفرعية والـ Timeline والـ state machine من 6.3، الاسترجاع عبر Moyasar Refund API، العملاء، الكوبونات، التقييمات، المحتوى (البنرات، أقسام الرئيسية، الصفحات)، الإعدادات، الموظفون والصلاحيات، سجل العمليات، **تأسيس الفاتورة حسب 6.9** (TaxInvoice، الترقيم التسلسلي، الحقول المطلوبة، PDF، QR بصيغة TLV كهيكل) بمراجعة finance-zatca. الربط مع ZATCA ليس في هذه المرحلة (P8). كل صفحة محمية بالصلاحية المناسبة.
```

**P4 — نظام الشركات والتجار**
```
المهمة P4 حسب SPEC.md أقسام 6.4، 6.5، 6.6، 7.3:
- /sell: تسجيل متعدد الخطوات (الشركة، الوثائق في bucket خاص، الآيبان SA+22 رقم، التصنيفات المطلوبة، قبول الاتفاقية بالنسخة والتاريخ).
- /admin/vendors: المراجعة، القبول بتحديد التصنيفات المسموحة والعمولة، موثوق، رفض بسبب، تعليق، موافقة تغيير الآيبان.
- /vendor كاملة حسب 7.3، مع قصر التصنيفات على VendorCategory والتحقق على السيرفر، وإرجاع المنتج PENDING عند التعديل الجوهري.
- الطلبات الفرعية للتاجر فقط بحقول الشحن اللازمة فقط.
- الـ Ledger: قيود عند الدفع والإكمال والاسترجاع حسب 6.4، بلا تعديل أو حذف، والتصحيح بـ ADJUSTMENT.
- /admin/payouts: إنشاء دفعة لفترة، اعتماد، تصدير ملف تحويل CSV/Excel، تسجيل رقم المرجع ورفع الإيصال لكل تحويل، إشعار التاجر، كشف حساب PDF.
- الإشعارات حسب قسم 8.
- اختبارات: unit للعمولة والـ ledger والدفعات، و e2e للسيناريوهات 2 و 3 و 4 و 5 من قسم 10.
```

**P4.5 — سوق الزل والفصال (backend + frontend)**
```
المهمة P4.5 حسب SPEC.md أقسام 6.7 و 6.8 و 7 و 8 و 10 (سيناريوهات 7–11):
أ) الـ schema (backend فقط): Deal، NegotiationSettings، PriceRequest، PriceRequestRecipient، PriceOffer، PriceLock، وإضافة priceLockId و dealId على OrderItem، مع الـ indexes على (status, expiresAt) و (vendorId, status).
ب) العروض: /vendor/deals (إنشاء وتعديل وحالة وأداء)، موافقة الإدارة، الانطلاق والانتهاء عبر cron، حماية السعر المرجعي (تاريخ السعر 14 يوم)، stockLimit و perCustomerLimit في السلة والـ checkout، قفل سعر FLASH 15 دقيقة.
ج) صفحة /souq: أقسام عروض الساعة/اليوم/الأسبوع/التصفية/الباقات/الطلبات المفتوحة، فلاتر وترتيب في الـ URL، عداد تنازلي، "باقي X قطعة"، تحديث لحظي عبر `RealtimeProvider` (SSE + `LISTEN/NOTIFY`)، شارة "مباشر" في القائمة. الخصومات حسب `souqDiscountsRequireLicense` (D16).
د) الفصال:
  - features/negotiation/service.ts فيه كل التحولات كـ state machine واحدة (createRequest، selectRecipients، vendorRespond، customerCounter، acceptOffer، expire*)، وكل تحول في transaction ومسجل.
  - selectRecipients = صاحب المنتج + كل تاجر APPROVED عنده VendorCategory للتصنيف ومنتج PUBLISHED فيه، مع استبعاد المعلّقين من الفصال.
  - floorPrice لا يخرج من السيرفر أبداً (اعمل DTOs منفصلة للعميل والتاجر)، و autoAcceptPrice ينشئ عرضاً مقبولاً فوراً.
  - السرية بين التجار: كل استعلام عروض للتاجر يرجع عروضه فقط.
  - acceptOffer ينشئ PriceLock ويحجز المخزون ويغلق باقي العروض ويضيف العنصر للسلة بسعر مقفول؛ الـ checkout يتحقق من صلاحية الـ PriceLock.
  - فلتر وسائل التواصل في الملاحظات (أرقام عربية وإنجليزية، روابط، إيميلات، @handles، wa.me، t.me) مع اختبارات.
  - حدود الاستخدام والـ rate limit حسب O9.
  - Realtime خلف `RealtimeProvider`: قنوات منفصلة لكل جمهور — `pr:{requestId}:customer` (العميل فقط)، `pr:{requestId}:vendor:{vendorId}` (خيط هذا التاجر فقط)، `vendor:{vendorId}:inbox` — بث من السيرفر بمعرّفات وحالة فقط، والتفاصيل من API محمي، وصلاحية الاشتراك تُفحص على السيرفر (`backend.md` C1).
هـ) الواجهات: نافذة "اطلب سعرك" في صفحة المنتج، /souq/request/new، /account/requests/[number] (مقارنة العروض بالإجمالي، Timeline الجولات، أزرار قبول/سعر مضاد/رفض، عدادات)، /vendor/requests (صندوق وارد لحظي، الرد مع اختيار المنتج المطابق)، إعدادات الفصال لكل منتج في نموذج المنتج.
و) الإدارة: /admin/souq (العروض، المواسم، الطلبات والعروض، تعليق الفصال، التقارير).
ز) الإشعارات حسب جدول قسم 8، والـ cron للمهلات والتذكيرات.
ح) اختبارات unit للقواعد، و e2e للسيناريوهات 7–11.
التزم بقسم 12 و Definition of Done.
```

**P4.5 — designer**
```
صمّم تجربة "سوق الزل" حسب SPEC.md 6.7 و 6.8 بنفس الهوية الفخمة: صفحة /souq (إحساس سوق حي: عدادات، شارات خصم، "باقي X"، شريط طلبات مفتوحة)، بطاقة العرض، نافذة "اطلب سعرك"، صفحة مقارنة العروض للعميل مع الجولات، صندوق وارد التاجر والرد السريع، وإعدادات الفصال في نموذج المنتج. جوال أولاً، RTL، مع حالات فارغة وتحميل وانتهاء مهلة. سلّم مواصفات handoff للـ frontend-engineer.
```

**P4 — finance-zatca (مراجعة)**
```
راجع تنفيذ P4 مقابل SPEC.md أقسام 6.1 و 6.4: حسابات الضريبة والعمولة وتوزيع الخصم ورسوم الدفع، الـ ledger، ملف التحويل، كشف حساب التاجر، والفاتورة الضريبية حسب قرار O2. اكتب حالات اختبار بأرقام حقيقية (منتج 1,150 ر.س، كوبون 10%، عمولة 10%، رسوم دفع) والنتيجة المتوقعة بالهللة، وسلّمها لـ backend-engineer كاختبارات.
```

**P5 — التكاملات**
```
المهمة P5 حسب SPEC.md: Tabby و Tamara (session، redirect، webhook، capture، refund، ويدجت الأقساط)، بدون مزود شحن (الشحن يدوي حسب 6.6، و O4 متأجل)، SMS عبر Taqnyat (D20)، WhatsApp Cloud API للإشعارات والسلات المتروكة (لمن وافق فقط، D19)، Resend بقوالب عربية، cron jobs خلف `JobScheduler` (إلغاء غير المدفوع، إكمال الطلبات بعد holdDays، تحرير الأرصدة، السلات المتروكة، المطابقة). كل مزود خلف interface ومفاتيحه في .env، وكل الدفع في sandbox.
```

**P5 — tracking-analytics**
```
حسب SPEC.md: شريط موافقة كوكيز متوافق مع PDPL، GA4 و Meta/Snap/TikTok Pixels تُحمّل بعد الموافقة ومعرفاتها من Settings، أحداث e-commerce (view_item، add_to_cart، begin_checkout، purchase) مع منع تكرار purchase، و Meta Conversions API من السيرفر عند تأكيد الدفع.
```

**P6 — qa-tester + e2e-automation-engineer**
```
حسب SPEC.md قسم 10: اكتب خطة اختبار كاملة للعميل والتاجر والإدارة، ونفّذ سيناريوهات Playwright 1–6، واختبر عزل البيانات بين التجار بمحاولات تلاعب بالـ IDs، والوصولية بـ axe عربي/إنجليزي، والجوال والديسكتوب. سجّل كل bug بخطوات إعادة إنتاج وأولوية، وسلّم تقرير "جاهز/غير جاهز للإطلاق".
```

**P7 — devops-engineer + backend-engineer**
```
حسب SPEC.md: سكربت scripts/import-zid.ts يستورد CSV المصدّر من زد (المنتجات، الخيارات، الصور ورفعها للتخزين، العملاء) مع تقرير أخطاء؛ جدول Redirects 301 للروابط القديمة؛ تقييم الاستضافة (O6) المحدّث واختيار المرشح ونشر staging؛ backups يومية واختبار استرجاع؛ Sentry وتنبيهات؛ go-live checklist (مفاتيح Moyasar live، webhooks على الدومين، DNS، SSL، البريد) وقائمة الـ blockers. الاعتماد القانوني للاستضافة والنشر للإنتاج في P8، والتحويل إلى suqalzl.com بعد G6.
```

---

## 14. ما أحتاجه من المالك (قبل/أثناء التنفيذ)

**أثناء البناء (P1–P7):**
- مستودع GitHub (المالك ينشئه ويرسله لاحقاً).
- القرارات بانتظار المالك في جدول O (قسم 1): O1، O3، O7، O10–O13.
- إعدادات الشحن (المالك يضبطها لاحقاً، D17).
- تصدير CSV من زد (المنتجات والعملاء) والشعار والصور (قبل P7).

**في P8 "الأمور الورقية والاعتمادات" (D15):**
- السجل التجاري، الرقم الضريبي، شهادة الضريبة، العنوان الوطني، والآيبان.
- حساب Moyasar live + المفاتيح، وحسابات Tabby و Tamara، وعروض الأسعار.
- حسابات مزود الشحن والـ SMS (تسجيل `SuqAlZal` وخطاب التفويض) والـ WhatsApp Business (رقم مخصص).
- مراجعة الاتفاقية والسياسات مع محامٍ، والأسئلة الضريبية مع مستشار ضريبي/محاسب قانوني (`docs/decisions.md` §7).
- تراخيص التخفيضات (إن لزمت)، وأي تسجيل لدى الهيئات.
- اعتماد الاستضافة النهائي وعقد المزود، وربط ZATCA المرحلة الثانية.

---

## 15. تعديلات معلقة (لم تُدمج — مرتبطة بقرار متأجل أو بانتظار المالك)

> تُدمج بصياغة المختص عند صدور القرار. المرجع الكامل في ملف المختص. الحالة في `docs/decisions.md` §5.1.

| # | التعديل المقترح | المرجع | يعتمد على |
|---|---|---|---|
| S2 (جزء) | DB: Cloud SQL PostgreSQL 16؛ Storage: Cloud Storage؛ Jobs: Cloud Scheduler؛ Monitoring: + Cloud Monitoring؛ كل الموارد في `me-central2` عبر CNTXT | `devops.md` §5.1 | O6 (P7/P8) |
| S5 (جزء) | `docs/DISASTER-RECOVERY.md` | `devops.md` §6.3 | O6 |
| S8 (جزء) | `VendorPickupLocation` (H2)، `Product.shippingClass` (H4)، `CarrierCityAlias` (M4) | `backend.md` §5.2–5.3 | O4 |
| S10 (جزء) | `maxDiscount` إلزامي في الكوبون العام النسبي؛ `FREE_SHIPPING` العام تتحمله المنصة وتدفع للتاجر صاحب الشحن الذاتي رسومه | `decisions.md` T5 (2)(3) | O13 |
| S11 (جزء) | إظهار التقسيط فوق 10,000 ر.س حسب تأكيد سقف ساما والخطط الممتدة | `backend.md` 4.3-4، T4 | P8 |
| S13 (جزء) | منع غير المقيمين كقرار نهائي (الآن افتراضي مؤقت) | `finance.md` 3.4-7 | O10 |
| S14 (جزء) | المسارات الثلاثة عبر مجمّع (OTO/Torod)، المسار اليدوي المؤمَّن لـ `BLADE`/`HIGH_VALUE`/فوق 5,000 ر.س، `shippingMode` + `shippingClass` يمنع `SELF_SHIPPING` والتقسيط للسيوف | `backend.md` 1.5، T3 | O4، O11 |
| S18 (جزء) | القنوات النهائية للسلة المتروكة (SMS فقط باسم `-AD` إن سُجّل)، ونافذة الإرسال الترويجي 9:00–21:45 (ورمضان حسب الضوابط) | `backend.md` 2.3، T6 (2)(3) | P8 (Taqnyat + المحامي) |
| S19 (جزء) | PDPL: الإقامة داخل المملكة، خطة استجابة للحوادث (72 ساعة سدايا / 3 أيام التجارة)، مدد الاحتفاظ، RoPA و DPIA؛ النسخ: PITR + نسخة منطقية مشفرة + موقع ثانٍ + تمرين استرجاع شهري | `legal-review.md` §3، `devops.md` §6.3 | O6، P8 |
| S20 (جزء) | تمرين الاسترجاع على الاستضافة النهائية | `devops.md` 6.3-8 | O6 (P7) |
| T7 | احتياطي متدحرج لتغطية الضمان سنتين | `decisions.md` T7 | O12 |
| T9 | ربط ZATCA المرحلة الثانية (EGS، XML، التوقيع، Reporting/Clearance) | `finance.md` 1.4 و3.4 | P8 |
| T11 | بقاء Sentry أو استبداله بـ GlitchTip داخل المملكة | `devops.md` 6.4 | P8 (المحامي) |
| — | قيم O1 و O3 و O7 النهائية (الآن افتراضية) | `finance.md` §2، §4، §5 | O1، O3، O7 |
