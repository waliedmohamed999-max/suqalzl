# خطة المهام — سوق الزل

> مصدرها: `SPEC.md` قسم 11 (المراحل) وقسم 10 (معايير القبول). أي تعارض: الـ SPEC هو المرجع.
> **آخر تحديث: 2026-11-18** — بعد قرارات المالك (2026-11-17) واعتماد التصميم (2026-11-18). السجل: `docs/decisions.md` §0.
> **تحديث 2026-11-18 (مساءً):** نتيجة P1-00 (54/54)، و D31 (التحقق للإدارة والتجار)، و D32 (سطر التقسيط)، و D33 (قرارات الـ CEO)، و D34 (T10). السجل: `docs/decisions.md` §10.
> **Definition of Done (DoD)** لكل مهمة هندسية: الكود يعمل محلياً + types بدون أخطاء + lint نظيف + الاختبارات المتعلقة تنجح + النصوص في `messages/ar.json` و `messages/en.json` + لا بيانات وهمية في الواجهة + تحديث `.env.example` والتوثيق + ملخص (ما تم، الملفات، الأوامر، متغيرات البيئة، الاختبار اليدوي، ما بقي).
> كل مخرجات هندسية تمر على `qa-tester` قبل Done، وكل مخرجات تصميم تمر على `designer`/`design-system-performance` للمراجعة.
> لا يتم صرف مال أو إرسال إيميلات خارجية أو نشر أو إطلاق إعلانات أو تواصل مع أي جهة خارجية بدون موافقة المالك. كل التواصل الخارجي في P8 ويقوم به المالك.

## مبادئ الخطة الجديدة (قرارات المالك)
1. **الكود مستقل عن الاستضافة** (D12): Postgres محلي بـ Docker، SSE، `StorageProvider` (S3-compatible)، `JobScheduler`. قرار الاستضافة في P7/P8.
2. **الدفع في sandbox** (D14) حتى P8.
3. **الفاتورة: تأسيس في P3** (D13)، وربط ZATCA في P8.
4. **الشحن يدوي فقط** (D17) حتى يضبطه المالك؛ لا مزود شحن في P5.
5. **كل الأوراق والاستشارات في P8** (D15) قبل الإطلاق الفعلي.
6. **لغة اللوحات** (D29): الإدارة والتاجر عربي فقط عند الإطلاق، والمتجر عربي + إنجليزي.
7. **الواجهة بالتوازي** (D30): بيانات Zod في الاختبارات و Storybook/dev فقط.
8. **القرارات بانتظار المالك** (O1، O3، O7، O10–O13) لا توقف البناء: إعدادات بقيم افتراضية (`docs/decisions.md` §8).

## البوابات (Gates)

| البوابة | بعد | ما يوافق عليه المالك | الحالة |
|---|---|---|---|
| G1 | P0 | القرارات والتصميم | **معتمدة 2026-11-18** (القرارات 2026-11-17 + "اعتمد التصميم حاليا" 2026-11-18، مع تعديلات لاحقة ممكنة) |
| G2 | P2 | تجربة شراء حقيقية في sandbox | — |
| G3 | P4 | دورة تاجر كاملة حتى التحويل | — |
| G4 | P4.5 | عرض FLASH حقيقي + صفقة فصال كاملة حتى الدفع | — |
| G5 | P6 | قبل P7 | — |
| G6 | P8 | كل الأوراق والاعتمادات والاستضافة النهائية قبل الإطلاق الفعلي | — |

---

## P0 — التجهيز (منتهية، G1 معتمدة)

| ID | العنوان | المسؤول | الحالة |
|---|---|---|---|
| P0-01 | قرارات المال والضريبة O1، O2، O3، O7 | finance-zatca | O2 معتمد؛ O1/O3/O7 بانتظار المالك (افتراضيات في الكود) |
| P0-02 | مسودة اتفاقية التاجر v0.2 | legal-contracts | مسودة؛ المحامي في P8 |
| P0-03 | مسودات سياسات المتجر v0.2 + سجل المخاطر + PDPL | legal-contracts | مسودة؛ المحامي في P8 |
| P0-04 | الهوية و Design tokens (v1.1 بحل رمز الريال وزر واتساب) | designer + design-system-performance | معتمد |
| P0-09 | تحديث التصاميم برمز الريال U+20C1 وزر واتساب الأخضر حسب tokens.md 1.1 | designer | Todo (board: P0-17) |
| P0-05 | تصميم الشاشات الرئيسية | designer | معتمد |
| P0-06 | تقييم O4، O5، O6 | backend-engineer + devops-engineer | O5 معتمد؛ O4 و O6 متأجلان |
| P0-07 | قرارات المنتج O8، O9 | ceo | معتمد |
| P0-08 | سجل القرارات وبوابة G1 ودمج SPEC | ceo | منتهية (2026-11-18) |

---

## P1 — الأساس

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P1-00 | spike العزل والـ Realtime على Postgres محلي | العزل في طبقة الخدمة + RLS بـ `SET LOCAL app.vendor_id` كطبقة إضافية، و SSE + `LISTEN/NOTIFY` بقنوات منفصلة (C1)، وإعادة كتابة C2 و migration 0009 على Postgres عام (T10) | backend-engineer + devops-engineer | G1 | قرار مكتوب في ملفات المختصين؛ اختبار: تاجر B لا يشترك في قناة تاجر A. **النتيجة (2026-11-18):** backend-engineer نفذ الـ spike على `agent/backend/p1-00-spike`: **54/54** في 3 تشغيلات، `tsc` و `next build` ناجحين؛ T10 معتمد من ناحية backend (D34). **باقي:** مراجعة devops-engineer (P1-00b) و qa-tester (P1-00c) |
| P1-01 | أساس الـ Backend | Next.js 15 + TS strict على Postgres 16 محلي، `prisma/schema.prisma` كامل (قسم 5 + 5.1)، migrations، seed (التصنيفات الـ 14، SUPER_ADMIN من env، Settings الافتراضية ومنها قيم O1/O3/O7 و D22)، `lib/money.ts` (رمز الريال حسب tokens)، `lib/vat.ts`، Auth جوال `+9665` + OTP ذاتي عبر `SmsProvider`، إيميل/كلمة مرور للإدارة والتجار، `lib/permissions.ts` + middleware، AuditLog helper append-only. **من P1-00:** `withCtx` و RLS بـ `FORCE` على كل جدول في نفس الـ migration، الدوران `suq_owner`/`suq_app`، `0009_security_hardening` و `0010_realtime_outbox`، outbox الـ Realtime. **D31:** دخول الإدارة والتجار بكلمة السر + 2FA بـ OTP الجوال و"تذكر الجهاز 30 يوماً" خلف `staffTwoFactorEnabled = false` و `staffLoginMethod = PASSWORD` (`staffLogin` يرجع `requires2fa`) | backend-engineer | P1-00 (backend؛ مراجعة devops لا توقف البدء) | Unit: الضريبة، ROUND_HALF_UP، الآيبان، دوال `netOfGross`/`vatOnNet`، OTP (6 محاولات خاطئة ← قفل)؛ لا Float؛ `/admin` و `/vendor` و `/account` محمية؛ Rate limit للـ OTP؛ لا استيراد `@supabase/*`؛ اختبارات الـ spike الـ 54 منقولة وتنجح على Postgres حقيقي؛ تبديل `staffTwoFactorEnabled` يفعّل الـ 2FA بدون كود؛ لا استدعاء خارجي جوه `withCtx`؛ DoD |
| P1-02 | أساس الـ Frontend (بالتوازي، D30) | Tailwind + shadcn بالـ tokens v1.1، IBM Plex Sans Arabic (400/600/700)، RTL، next-intl، layouts المتجر/admin/vendor، المكونات المشتركة (`docs/design/README.md` §4)، صفحات الدخول و OTP، ودخول الإدارة والتجار + شاشة 2FA و"تذكر هذا الجهاز 30 يوماً" (تظهر فقط لو `requires2fa`، D31)، `Price` برمز الريال U+20C1، زر واتساب أخضر | frontend-engineer | P0-04، P0-05، **هيكل المشروع في بداية P1-01** (الربط بالـ auth الحقيقي عند جاهزيته) | المكونات تُبنى ببيانات مولّدة من مخططات Zod داخل الاختبارات و Storybook/صفحات dev فقط، ولا بيانات وهمية في واجهات الإنتاج (القاعدة 7)؛ المتجر ar + en، و `/admin` و `/vendor` عربي فقط ونصوصهما في ملفات الترجمة (D29)؛ axe بدون أخطاء حرجة؛ DoD |
| P1-03 | بيئة التطوير والـ CI | `docker compose` (Postgres 16 + تخزين S3-compatible محلي)، interfaces `StorageProvider` و `JobScheduler` و `RealtimeProvider` مع تنفيذ محلي، ملفات GitHub Actions (lint، typecheck، tests على Postgres حقيقي) جاهزة، Sentry بتنظيف PII. **من P1-00:** سكربت init للأدوار، مصادر الـ binaries (`PRISMA_ENGINES_MIRROR`) و registry لـ `postgres:16`، اتصال LISTEN مباشر، `X-Accel-Buffering: no` | devops-engineer (+ backend-engineer للـ interfaces) | G1 | `docker compose up` يشغّل التطبيق بالـ seed؛ `.env.example` محدث؛ الـ CI يعمل فعلياً بعد وصول مستودع GitHub من المالك |

## P2 — المتجر

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P2-01 | الكتالوج والبحث | الرئيسية من `HomeSection`، التصنيف، كل المنتجات بفلاتر URL (**عند الإطلاق: السعر والتاجر والأعلام فقط**، D33-3)، صفحة المنتج بالخيارات، الباقات، صفحة المتجر، البحث العربي المطبّع | frontend-engineer + backend-engineer | P1 | Unit: تطبيع البحث؛ Lighthouse جوال ≥ 90 |
| P2-02 | السلة والكوبونات والـ Checkout | سلة الزائر ودمجها، الكوبونات (6.1 + ضابط D18)، المفضلة، سطر التقسيط لكل الزوار (D32: بدون وعد بالموافقة وبدون رقم قسط فوق سقف المزود)، Checkout، Order + SubOrders + `StockReservation` في transaction | backend-engineer + frontend-engineer | P2-01 | Unit: TC1–TC6 (`finance.md` §8)؛ اختبار تزامن المخزون |
| P2-03 | Moyasar sandbox والـ webhooks | `PaymentProvider` + Moyasar، `WebhookEvent`، `secret_token` + إعادة الجلب، `given_id`، void/refund، cron المطابقة وإلغاء غير المدفوع | backend-engineer | P2-02 | **E2E 1** في sandbox؛ إعادة إرسال webhook 6 مرات ← قيد واحد |
| P2-04 | حساب العميل | الطلبات وتتبع الطلبات الفرعية، العناوين، المفضلة، طلب الاسترجاع، حذف الحساب بالتجهيل، تصدير البيانات، الموافقة التسويقية | frontend-engineer + backend-engineer | P2-03 | العميل لا يصل لطلبات غيره؛ DoD |
| P2-05 | النصوص والسياسات و SEO | `messages/*.json`، صفحات السياسات من مسودات v0.2 (تُعتمد في P8)، title/description، JSON-LD، sitemap و robots، **نص سطر التقسيط (D32) بمراجعة legal-contracts** (board P2-05b) | arabic-content-seo (مراجعة legal-contracts) | P1 | JSON-LD صالح؛ قوالب SMS ثابتة (متغيران، روابط https كاملة) |

**⟵ بوابة G2**

## P3 — لوحة الإدارة

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P3-01 | لوحة `/admin` | الأرقام، المنتجات (مراجعة، `ProductRevision`)، التصنيفات، الباقات، الطلبات + Timeline + state machine، الاسترجاع، العملاء، الكوبونات (موافقة D18)، التقييمات، المحتوى، الإعدادات (كل إعدادات جدول O)، الموظفون والصلاحيات، سجل العمليات | frontend-engineer + backend-engineer | P2 | Unit: state machine؛ كل صفحة بـ `requirePermission`؛ كل عملية حساسة في `audit_logs` |
| P3-02 | تأسيس الفاتورة | `TaxInvoice`، ترقيم تسلسلي، الحقول المطلوبة، PDF عربي، QR بصيغة TLV كهيكل، إشعار دائن عند الاسترجاع (SPEC 6.9). **بدون ربط ZATCA** | backend-engineer (مراجعة finance-zatca) | P3-01 | مراجعة finance-zatca للحقول؛ لا تعديل ولا حذف لفاتورة |

## P4 — نظام الشركات والتجار

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P4-01 | تسجيل التجار والمراجعة | `/sell` متعدد الخطوات + حاسبة "صافيك"، الوثائق في bucket خاص عبر `StorageProvider`، `vatStatus`، `isResident`، قبول الاتفاقية، `/admin/vendors`، `holdDaysOverride`، قفل تصنيف السيوف | backend-engineer + frontend-engineer | P3 | **E2E 2** |
| P4-02 | لوحة التاجر والمنتجات | `/vendor` حسب 7.3، قصر التصنيفات على السيرفر، `ProductRevision` | frontend-engineer + backend-engineer | P4-01 | **E2E 5** |
| P4-03 | تنفيذ الطلبات الفرعية والشحن اليدوي | الطلبات الفرعية بحقول الشحن فقط، `ManualShippingProvider` (شركة الشحن + رقم التتبع من التاجر أو الإدارة)، `Shipment` | backend-engineer + frontend-engineer | P4-02 | التاجر لا يرى بيانات العميل خارج حقول الشحن |
| P4-04 | الـ Ledger والتسويات وفواتير التجار | قيود finance 6.3، شروط الإتاحة، الجدولة الافتراضية، `VendorPurchaseInvoice` والجزء الضريبي المحجوز، `/admin/payouts`، ملف التحويل، المرجع والإيصال، كشف الحساب | backend-engineer + frontend-engineer | P4-03 | Unit: TC7–TC12؛ **E2E 3** و **E2E 4** |
| P4-05 | الإشعارات | حسب قسم 8 (السلة المتروكة لمن وافق فقط) | backend-engineer | P4-04 | كل حدث له اختبار إرسال (مزودات في وضع التطوير) |
| P4-06 | مراجعة مالية | مراجعة 6.1 و 6.4 مقابل TC1–TC12 | finance-zatca | P4-04 | كل الحالات تنجح |

**⟵ بوابة G3**

## P4.5 — سوق الزل والفصال

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P4.5-01 | تصميم تجربة السوق والفصال (المتبقي) | `/vendor/deals`، `/admin/souq`، حساب العميل، `/sell`، صفحة 500 + handoff | designer | G1 | مواصفات handoff كاملة |
| P4.5-02 | الـ schema ودورة العروض | `DealVariant` + exclusion، `DealRedemption`، `PriceHistory`، حقول الترخيص + `souqDiscountsRequireLicense`، الانطلاق والانتهاء، حصة FLASH عند الـ checkout | backend-engineer | P4 | **E2E 10**؛ اختبار تزامن FLASH |
| P4.5-03 | صفحة `/souq` الحية | الأقسام، الفلاتر، العدادات، `RealtimeProvider` (SSE)، شارة "مباشر"، الوضعان (مع/بدون خصومات) | frontend-engineer + backend-engineer | P4.5-02 | تحديث لحظي؛ تبديل الإعداد يغيّر العرض بدون كود |
| P4.5-04 | محرك الفصال | state machine، `NegotiationThread`، `VariantNegotiationSettings`، القبول التلقائي بتأخير 2–10 دقائق، PriceLock (`IN_CHECKOUT`)، فلتر التواصل + `noteRaw`، حدود D22، قنوات منفصلة (C1) بعقد الـ outbox و `/api/realtime/stream` (6.8)، انتهاء PriceLock في السلة (D33-1) | backend-engineer | P4.5-02 | **E2E 7، 8، 9، 11**؛ اختبار التسريب الآلي |
| P4.5-05 | واجهات الفصال | نافذة "اطلب سعرك"، `/souq/request/new`، `/account/requests/[number]`، `/vendor/requests`، إعدادات الفصال، صياغة "المتجر"، بانر انتهاء الـ PriceLock و dialog الحذف (D33-1)، بدون أزرار "نبّهني" (D33-2) | frontend-engineer | P4.5-01، P4.5-04 | العميل يرى العروض مرتبة بالإجمالي؛ التاجر يرى عروضه فقط |
| P4.5-06 | مراقبة الإدارة `/admin/souq` | العروض، المواسم، الطلبات، تعليق الفصال، التقارير | frontend-engineer + backend-engineer | P4.5-04 | كل إجراء في `audit_logs` |
| P4.5-07 | قواعد عمولة الصفقات وحماية السعر | O7 (افتراضي) وقاعدة الـ 14 يوم | finance-zatca + legal-contracts | P4.5-04 | العمولة في سيناريو 7 على صافي 950 ر.س |

**⟵ بوابة G4**

## P5 — التكاملات (sandbox / وضع التطوير)

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P5-01 | تابي وتمارا sandbox | session، redirect، webhook، capture ذري، refund، زر الدفع حسب التأهيل، وسطر التقسيط لكل الزوار بدون رقم قسط فوق السقف (D32) | backend-engineer + platform-api-engineer | P4 | توزيع الرسوم حسب `gatewayFeeBearer`؛ capture واحد عند تزامن redirect و webhook |
| P5-02 | SMS وواتساب والإيميل | Taqnyat خلف `SmsProvider`، Meta Cloud API خلف `WhatsAppProvider`، Resend بقوالب عربية — بمفاتيح اختبار أو وضع console | backend-engineer + platform-api-engineer | P4 | كل مزود خلف interface ومفاتيحه في `.env` |
| P5-03 | Cron jobs | خلف `JobScheduler`: إلغاء غير المدفوع، الإكمال بعد `holdDays`، تحرير الأرصدة، السلات المتروكة (لمن وافق)، مهلات الفصال، المطابقة، مسح `realtime_events` كل 24 ساعة | backend-engineer + devops-engineer | P4.5 | اختبارات للمهلات و leasing |
| P5-04 | الكوكيز والتتبع | شريط موافقة PDPL، GA4 و Pixels بعد الموافقة، أحداث e-commerce، Meta CAPI | tracking-analytics | P2 | لا pixel قبل الموافقة؛ purchase بدون تكرار |

> **الشحن:** لا مهمة تكامل شحن في P5 (O4 متأجل). تُضاف عندما يضبط المالك الشحن.

## P6 — الجودة

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P6-01 | خطة الاختبار والتنفيذ | Playwright 1–11، عزل البيانات، التزامن بأداة حمل، اختبار التسريب، axe عربي/إنجليزي، الجوال والديسكتوب، الأداء | qa-tester + e2e-automation-engineer + design-system-performance | P5 | **E2E 1–11 تنجح**؛ Lighthouse ≥ 90 و LCP < 2.5s؛ تقرير "جاهز/غير جاهز" |

**⟵ بوابة G5**

## P7 — النقل والتشغيل (الاستضافة هنا)

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P7-01 | الاستيراد من زد | `scripts/import-zid.ts` + تقرير أخطاء + Redirects 301 | backend-engineer | P6 | كل منتج قديم له redirect 301 |
| P7-02 | الاستضافة (O6) | تحديث تقييم devops (`devops.md`) واختيار المرشح، adapters للمزود المختار، بيئة staging، backups وتمرين استرجاع، المراقبة والتنبيهات، go-live checklist | devops-engineer | P6 | تمرين استرجاع ناجح على staging؛ لا تغيير في منطق التطبيق (adapters فقط) |
| P7-03 | خطة الإطلاق والتسويق | جذب التجار والعملاء | marketing-lead + social-media-manager | P6 | خطة فقط؛ أي نشر أو صرف بموافقة المالك |

## P8 — الأمور الورقية والاعتمادات (قبل الإطلاق الفعلي)

> كل التواصل الخارجي يقوم به المالك من حساب المنشأة. الإيجنتس يجهزون الأسئلة والمستندات ويدمجون الردود في ملفاتهم.

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P8-01 | مستندات المنشأة | السجل التجاري ونشاطه لكل التصنيفات، الرقم الضريبي وشهادته، العنوان الوطني، الآيبان، الشعار | المالك | — | بيانات في الإعدادات والفوتر |
| P8-02 | المستشار الضريبي | أسئلة `docs/decisions.md` §7 و `finance.md` 3.6؛ تأكيد A1 والموجة و EGS ثانٍ بجانب زد؛ قيم O1/O3/O7 النهائية | المالك + finance-zatca | P8-01 | ردود مكتوبة مدمجة في `finance.md`؛ أي تعديل على الـ ledger بـ migration |
| P8-03 | المحامي | `legal-review.md` §6 و§8 (13 سؤالاً): PDPL والاستضافة والمعالجون خارج المملكة، حماية المستهلك، التخفيضات، السيوف، SFDA، الاتفاقية والسياسات، قرارات B4–B12، صياغة O8، T11 | المالك + legal-contracts | P8-01 | الاتفاقية والسياسات معتمدة ونسختها في `agreementVersion` |
| P8-04 | المزودون والعقود | Moyasar، تابي، تمارا (عروض الأسعار، الأسئلة، المفاتيح الحية، Apple Pay للدومينات)، Taqnyat (تسجيل `SuqAlZal` وخطاب التفويض والقوالب)، رقم واتساب الأعمال، الشحن (حسب ما يضبطه المالك)، البنك | المالك + backend-engineer | P8-01 | مفاتيح live في الإنتاج فقط |
| P8-05 | تراخيص وتسجيلات | تراخيص التخفيضات (وتفعيل `souqDiscountsRequireLicense` إن لزم)، تسجيل المتجر الإلكتروني، أي تسجيل لدى الهيئات | المالك + legal-contracts | P8-03 | — |
| P8-06 | ربط ZATCA المرحلة الثانية | EGS، XML، التوقيع وحقول QR الخاصة به، Reporting/Clearance، `zatcaStatus` | backend-engineer (مراجعة finance-zatca) | P3-02، P8-02 | فواتير sandbox فاتورة ناجحة ثم الإنتاج |
| P8-07 | اعتماد الاستضافة والنشر للإنتاج | رأي المحامي في PDPL، عقد المزود، النشر على `new.suqalzl.com` | devops-engineer + المالك | P7-02، P8-03 | النشر بموافقة المالك |

**⟵ بوابة G6 ← الإطلاق الفعلي** (المفاتيح الحية، التحويل إلى `suqalzl.com` حسب D9)
