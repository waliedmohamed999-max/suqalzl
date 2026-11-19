# لوحة الشركة — مشروع سوق الزل

> مصدر الحقيقة الوحيد لحالة المهام. التفاصيل ومعايير القبول في `docs/plan.md`، والقرارات في `docs/decisions.md`.
> الحالات: Todo / Doing / Review / Done / Blocked. أي مهمة تحتاج موافقة المالك تبقى في Review.
> آخر تحديث: 2026-11-18 (ليلاً، بعد مراجعتي P1-01) — الفرع: `main`
> قاعدة التنفيذ (CLAUDE.md 13، 14): كل مهمة ينفذها المختص بنفسه في ملفاته، والـ CEO ينسق ويجمع ويراجع فقط.
> **بوابة G1: معتمدة** (القرارات 2026-11-17 + التصميم 2026-11-18). **P1 بدأت:** P1-00 نجح 54/54 (2026-11-18). قرارات جديدة: D31–D34 (`docs/decisions.md` §10)، و D35 نقاط P1-01 (§11)، و **D36 قرارات مراجعتي P1-01 (§12)**. **P1-01 في Review لحد P1-01d و P1-03b، و P1-02 شغال.**

## P0 — التجهيز (منتهية)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P0-01 | O1، O2، O3، O7 + المعادلة + TC1–TC12 | finance-zatca | Done | O2 معتمد. O1/O3/O7 **بانتظار المالك** بافتراضيات في الكود (`docs/decisions.md` §8) |
| P0-02 | اتفاقية التاجر v0.2 | legal-contracts | Done | مسودة؛ المحامي → P8-03 |
| P0-03 | السياسات v0.2 + سجل المخاطر + PDPL | legal-contracts | Done | مسودة؛ المحامي → P8-03 |
| P0-04 | Design tokens v1.0 + مراجعة التصاميم | design-system-performance | Done | معتمد 2026-11-18 |
| P0-04b | الحل التقني لرمز الريال U+20C1 وزر واتساب في `docs/design/tokens.md` | design-system-performance | Done | tokens.md **1.1** (2026-11-18): خط `Souq Riyal Sign`، و"ر.س"/SAR في JSON-LD والـ SMS والإيميل |
| P0-17 | تحديث التصاميم برمز الريال U+20C1 وزر واتساب الأخضر حسب tokens.md 1.1 | designer | Todo | قرارا المالك 2026-11-17 (البندان 12 و13). مراجعة design-system-performance بعدها |
| P0-05 | الشاشات الرئيسية والحالات | designer | Done | **معتمد** 2026-11-18 ("اعتمد التصميم حاليا")، مع تعديلات لاحقة ممكنة |
| P0-06 | O4، O5، تحقق Moyasar/تابي/تمارا، مراجعة الـ schema | backend-engineer | Done | O5 والقرارات الست معتمدة؛ O4 متأجل |
| P0-07 | O6 الاستضافة | devops-engineer | Done | متأجل إلى P7-02 / P8-07؛ التقييم الحالي مرجع |
| P0-08 | O8، O9 | ceo | Done | معتمد |
| P0-09 | سجل القرارات + دمج SPEC + الخطة الجديدة | ceo | Done | 2026-11-18. المعلق في `SPEC.md` §15 |
| P0-14 | النص النهائي للتعديلات المعلقة (SPEC §15) | أصحاب التعديلات | Todo | عند صدور قرار المالك أو في P7/P8 |
| P0-16 | قائمة المعالجين في سياسة الخصوصية بعد O5 والاستضافة | legal-contracts | Todo | O5 معتمد؛ الاستضافة في P7/P8 |

## P1 وما بعدها

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P1-00 | spike العزل و RLS و SSE + LISTEN/NOTIFY على Postgres محلي (T10، C1، C2) | backend-engineer + devops-engineer | Done | **54/54** (`spikes/p1-00/REPORT.md`). T10 (D34) **معتمد نهائياً من devops بالشروط 1–3** (D36-5)؛ مراجعتا P1-00b و P1-00c خلصوا |
| P1-00b | مراجعة devops للـ spike: القسم 1، الـ pooler، اتصال LISTEN، الـ buffering، أدوار `docker compose`، موافقة T10 | devops-engineer | Done | `docs/reviews/devops-p1-01.md` (فرع backend، `6ad1745`): T10 موافق بشروط → D36-5 |
| P1-00c | مراجعة qa-tester لاختبارات الـ spike كأساس سيناريو 5 و 8 | qa-tester | Done | `docs/reviews/qa-p1-01.md`: الاختبارات أساس سيناريو 5 و 8؛ خطة اختبار P2–P6 في القسم 4 |
| O14 | سؤال المالك: الطريقة المفعّلة لدخول الإدارة والتجار (كلمة السر أم OTP بالجوال) | المالك | Review | الافتراضي: كلمة السر، و 2FA مقفول (D31) |
| O15 | سؤال المالك: مزود CAPTCHA خارجي (Turnstile مجاني / hCaptcha / reCAPTCHA)؟ مزود ومعالج بيانات جديد | المالك | Review | الافتراضي: PoW ذاتي (`captchaProvider = POW`)، بلا تكلفة (D36-2) |
| O16 | سؤال المالك: تجميد تحويلات المتجر المعلّق تلقائياً؟ (مالي/تعاقدي) | المالك | Review | الافتراضي: لا تجميد آلي؛ استبعاد يدوي من الدفعة بسبب في `audit_logs` (D36-3) |
| P1-01 | أساس الـ Backend (schema كامل، seed بالافتراضيات، Auth + OTP ذاتي) | backend-engineer | Review | على `agent/backend/p1-01-foundation` (`6ad1745`). المراجعتان خلصوا: qa ناجح مع ملاحظات (مفيش حرج، **D35-1 مؤكد**)، devops الكود سليم والـ CI محتاج إصلاح. **Done بعد P1-01d و P1-03b ومراجعة qa-tester ثم الدمج في `main`** |
| P1-01b | مراجعة qa-tester لـ P1-01: الاختبارات + **أمان الجلسات الذاتية (D35-1)**: التوكن والـ hash، أعلام الـ cookie، تدوير الجلسة بعد الدخول و2FA، الإبطال، CSRF، rate limit، "تذكر الجهاز"، عدم تسريب وجود الحساب | qa-tester | Done | `docs/reviews/qa-p1-01.md`: 195/195، QA-B1–B10؛ قرارات B3/B5/B8 → **D36** (`docs/decisions.md` §12) |
| P1-01c | مراجعة devops-engineer لـ P1-01: الأدوار والمتغيرات (D35-3)، قائمة الجداول المسموح فيها `DELETE` لدور التشغيل، الـ CI و compose بعد الدمج | devops-engineer | Done | `docs/reviews/devops-p1-01.md`: P0 الـ CI (e2e، audit)، P1 الـ migrations والـ cron؛ مهمة devops → P1-03b (D36-4) |
| P1-01d | إصلاحات مراجعتي P1-01: QA-B1، B2، **B3** (`session.revoked` يقفل SSE + تحقق كل 60 ث)، B4، **B5** (عدّادات فاشلة بـ إيميل/رقم + IP، تحدي `CaptchaProvider` PoW ذاتي، الجهاز الموثوق يعدّي)، B6، B7 (مع devops)، **B8** (قائمة سماح لكل `Vendor.status`)، B10، `omit` أعمدة vendors؛ ومن devops: nodemailer 10.6.0، postcss، `shadowDatabaseUrl`، شرطا T10، resync، cron lease/heartbeat، `asSystem` | backend-engineer | Review | 2026-11-19 على `agent/backend/p1-01-foundation` (`622f4b7`..`3edb77e`، بدون push): كل البنود اتنفذت + migration `0011_session_revocation_cron_leases`؛ 238/238 اختبار (منها 26 regression جديدة)، tsc و lint و build نضاف، `npm audit --omit=dev` high = 0. CSP السكربتات report-only لحد P2-03. **بانتظار:** مراجعة qa-tester؛ قيم `TRUSTED_PROXY_HOPS` و `smsBudget` الافتراضية للتأكيد |
| P1-02 | أساس الـ Frontend (tokens 1.1، layouts، الدخول/OTP، المكونات) | frontend-engineer | Review | 2026-11-19 على `agent/frontend/p1-02-ui-foundation` (بدون push، مدموج معه P1-01d): خط Plex subset (3 أوزان، ~59KB)، المكونات المشتركة، layouts المتجر واللوحات، دخول العميل OTP + دخول الإدارة/التجار + 2FA لو `requires2fa` + حل تحدي PoW (428)، 404/500، `/dev/components` (dev فقط، Zod)، Vitest (45) + Playwright (37، axe عربي/إنجليزي). **بانتظار:** ملف ساما (RIYAL_SIGN_READY=false)، مراجعة designer و qa-tester |
| P1-03 | `docker compose` + interfaces + ملفات CI + Sentry بتنظيف PII | devops-engineer | Review | فيه commit على `agent/devops/p1-03-local-env` (`882e4c3`)، **مدموج في فرع backend P1-01**؛ أسماء الأدوار بتاعته معتمدة في SPEC (D35-3). **مضاف من P1-00:** سكربت init للأدوار، `PRISMA_ENGINES_MIRROR` و registry لـ `postgres:16`، CI على Postgres حقيقي. تشغيل الـ CI فعلياً ينتظر مستودع GitHub |
| P1-03b | تطبيق Diffs 1–3 + بنود P2 (9–12) من مراجعة devops: e2e مشروط، بوابة audit باستثناءات لحد 2026-12-31، interop و `migrate diff`، prettier، `dev-cron`، `GIT_COMMIT_SHA`، Node 24 | devops-engineer | Todo | **معتمدة من الـ CEO (D36-4).** فرع `agent/devops/p1-03b-ci-fixes`، ملفات devops بس. Diff 3 يكمّل بعد `shadowDatabaseUrl` من P1-01d. مراجعة qa-tester |
| P2-01 | الكتالوج والبحث | frontend-engineer + backend-engineer | Todo | يعتمد على P1. الفلاتر عند الإطلاق: السعر والتاجر والأعلام؛ الخصائص لاحقاً (D33-3)؛ **إلزامي D36-6:** `PublicVendorDTO` + اختبار تسريب أعمدة vendors |
| P2-02 | السلة والكوبونات (ضابط D18) والـ Checkout | backend-engineer + frontend-engineer | Todo | يعتمد على P2-01. سطر التقسيط لكل الزوار (D32) |
| P2-03 | Moyasar sandbox والـ webhooks | backend-engineer | Todo | يعتمد على P2-02 |
| P2-04 | حساب العميل (تجهيل، تصدير، موافقة تسويقية) | frontend-engineer + backend-engineer | Todo | يعتمد على P2-03؛ **إلزامي D36-6:** تغيير الإيميل بتحقق (`pendingEmail`) |
| P2-05 | النصوص والسياسات و SEO | arabic-content-seo | Todo | يعتمد على P1؛ السياسات مسودات حتى P8-03 |
| P2-05b | نص سطر التقسيط (D32): بدون وعد بالموافقة، بدون رقم قسط فوق السقف | arabic-content-seo (مراجعة legal-contracts في ملف مراجعة منفصل) | Todo | مرتبط بالشروط 5-2 و R-02 |
| P3-01 | لوحة الإدارة | frontend-engineer + backend-engineer | Todo | يعتمد على G2؛ **إلزامي QA-G11 (D36-6):** الموظفين والأدوار لـ SUPER_ADMIN بس، ممنوع رفع الصلاحيات (خدمة + trigger) |
| P3-02 | تأسيس الفاتورة (بدون ZATCA) | backend-engineer (مراجعة finance-zatca) | Todo | يعتمد على P3-01. الربط في P8-06 |
| P4-01 | تسجيل التجار والمراجعة | backend-engineer + frontend-engineer | Todo | يعتمد على P3؛ **إلزامي D36-3/6:** قائمة السماح حسب `Vendor.status` على كل `/vendor`، و DTO أعمدة vendors |
| P4-02 | لوحة التاجر والمنتجات | frontend-engineer + backend-engineer | Todo | يعتمد على P4-01؛ **إلزامي QA-G7/G9 (D36-6):** الملف والآيبان والفريق لـ VENDOR_OWNER بس؛ السعر عبر الخدمة + `PriceHistory` + منع على Deal LIVE/PriceLock |
| P4-03 | الطلبات الفرعية والشحن اليدوي | backend-engineer + frontend-engineer | Todo | يعتمد على P4-02؛ لا مزود شحن |
| P4-04 | الـ Ledger والتسويات وفواتير التجار | backend-engineer + frontend-engineer | Todo | يعتمد على P4-03؛ قيم O3 افتراضية |
| P4-05 | الإشعارات | backend-engineer | Todo | يعتمد على P4-04 |
| P4-06 | مراجعة مالية | finance-zatca | Todo | يعتمد على P4-04 |
| P4.5-01 | تصميم الشاشات الباقية للسوق والفصال | designer | Todo | يمكن البدء بعد G1. يشمل: بانر PriceLock المنتهي في السلة، وإزالة أزرار "نبّهني" من التصاميم (D33) |
| P4.5-02 | الـ schema ودورة العروض + إعداد الترخيص | backend-engineer | Todo | يعتمد على G3 |
| P4.5-03 | صفحة /souq الحية | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-02 |
| P4.5-04 | محرك الفصال | backend-engineer | Todo | يعتمد على P4.5-02 |
| P4.5-05 | واجهات الفصال | frontend-engineer | Todo | يعتمد على P4.5-01 + P4.5-04. بانر انتهاء PriceLock (D33-1)؛ بدون "نبّهني" (D33-2) |
| P4.5-06 | مراقبة الإدارة /admin/souq | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-04 |
| P4.5-07 | قواعد عمولة الصفقات | finance-zatca + legal-contracts | Todo | يعتمد على P4.5-04 |
| P5-01 | تابي وتمارا sandbox | backend-engineer + platform-api-engineer | Todo | يعتمد على G4 |
| P5-02 | SMS (Taqnyat) وواتساب (Meta) والإيميل | backend-engineer + platform-api-engineer | Todo | يعتمد على P4؛ مفاتيح اختبار/console |
| P5-03 | Cron jobs خلف JobScheduler | backend-engineer + devops-engineer | Todo | يعتمد على P4.5. يشمل مسح `realtime_events` كل 24 ساعة |
| P5-04 | الكوكيز والتتبع | tracking-analytics | Todo | يعتمد على P2 |
| P6-01 | الجودة والاختبارات | qa-tester + e2e-automation-engineer + design-system-performance | Todo | يعتمد على P5 |
| P7-01 | الاستيراد من زد | backend-engineer | Todo | يعتمد على G5 |
| P7-02 | الاستضافة (O6): التقييم والـ adapters و staging والنسخ والمراقبة | devops-engineer | Todo | يعتمد على G5 |
| P7-03 | خطة الإطلاق والتسويق | marketing-lead + social-media-manager | Todo | خطة فقط؛ أي نشر أو صرف بموافقة المالك |
| P8-01 | مستندات المنشأة | المالك | Todo | بعد P7 |
| P8-02 | المستشار الضريبي (+ قيم O1/O3/O7) | المالك + finance-zatca | Todo | الأسئلة في `docs/decisions.md` §7 |
| P8-03 | المحامي (PDPL، التخفيضات، السيوف، الاتفاقية، B4–B12) | المالك + legal-contracts | Todo | الأسئلة في `docs/legal/legal-review.md` §6 و§8 |
| P8-04 | المزودون والعقود والمفاتيح الحية (+ `SuqAlZal`، واتساب الأعمال) | المالك + backend-engineer | Review | ممنوع على أي إيجنت التواصل الخارجي؛ المالك يرسل |
| P8-05 | تراخيص التخفيضات والتسجيلات | المالك + legal-contracts | Todo | — |
| P8-06 | ربط ZATCA المرحلة الثانية | backend-engineer (مراجعة finance-zatca) | Todo | يعتمد على P3-02 + P8-02 |
| P8-07 | اعتماد الاستضافة والنشر للإنتاج | devops-engineer + المالك | Review | بموافقة المالك فقط |
| GO-LIVE | الإطلاق الفعلي (G6) | devops-engineer + backend-engineer | Todo | بعد G6 |
