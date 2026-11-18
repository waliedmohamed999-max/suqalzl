# لوحة الشركة — مشروع سوق الزل

> مصدر الحقيقة الوحيد لحالة المهام. التفاصيل ومعايير القبول في `docs/plan.md`، والقرارات في `docs/decisions.md`.
> الحالات: Todo / Doing / Review / Done / Blocked. أي مهمة تحتاج موافقة المالك تبقى في Review.
> آخر تحديث: 2026-11-18 (ليلاً) — الفرع: `main`
> قاعدة التنفيذ (CLAUDE.md 13، 14): كل مهمة ينفذها المختص بنفسه في ملفاته، والـ CEO ينسق ويجمع ويراجع فقط.
> **بوابة G1: معتمدة** (القرارات 2026-11-17 + التصميم 2026-11-18). **P1 بدأت:** P1-00 نجح 54/54 (2026-11-18). قرارات جديدة: D31–D34 (`docs/decisions.md` §10)، و D35 نقاط P1-01 (§11). **P1-01 في Review، و P1-02 بدأ.**

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
| P1-00 | spike العزل و RLS و SSE + LISTEN/NOTIFY على Postgres محلي (T10، C1، C2) | backend-engineer + devops-engineer | Review | **54/54 في 3 تشغيلات**، `tsc` و `next build` ناجحين (`agent/backend/p1-00-spike`، `spikes/p1-00/REPORT.md`). T10 **معتمد من ناحية backend** (D34)؛ Done بعد P1-00b و P1-00c. تعديلات SPEC §7 مدمجة |
| P1-00b | مراجعة devops للـ spike: القسم 1، الـ pooler، اتصال LISTEN، الـ buffering، أدوار `docker compose`، موافقة T10 | devops-engineer | Todo | المراجعة في ملف مراجعة منفصل (CLAUDE.md 14) |
| P1-00c | مراجعة qa-tester لاختبارات الـ spike كأساس سيناريو 5 و 8 | qa-tester | Todo | قاعدة: مخرجات هندسية تمر على qa-tester قبل Done |
| O14 | سؤال المالك: الطريقة المفعّلة لدخول الإدارة والتجار (كلمة السر أم OTP بالجوال) | المالك | Review | الافتراضي: كلمة السر، و 2FA مقفول (D31) |
| P1-01 | أساس الـ Backend (schema كامل، seed بالافتراضيات، Auth + OTP ذاتي) | backend-engineer | Review | **مُسلَّم** على `agent/backend/p1-01-foundation` (آخر commit `93f65f3`، worktree `/home/claude/suqalzl-backend`، فيه P1-03 مدموج). نقاط القرار الثلاث محسومة **D35** (`docs/decisions.md` §11): جلسات سيرفر ذاتية بدل Better Auth/Auth.js، `pickupAddress` بدل `VendorPickupLocation` (O4)، أسماء الأدوار `suqalzl_*`. Done بعد P1-01b و P1-01c ثم الدمج في `main` |
| P1-01b | مراجعة qa-tester لـ P1-01: الاختبارات + **أمان الجلسات الذاتية (D35-1)**: التوكن والـ hash، أعلام الـ cookie، تدوير الجلسة بعد الدخول و2FA، الإبطال، CSRF، rate limit، "تذكر الجهاز"، عدم تسريب وجود الحساب | qa-tester | Doing | ملف مراجعة منفصل (CLAUDE.md 14). ملاحظة مانعة = D35-1 يرجع للنقاش |
| P1-01c | مراجعة devops-engineer لـ P1-01: الأدوار والمتغيرات (D35-3)، قائمة الجداول المسموح فيها `DELETE` لدور التشغيل، الـ CI و compose بعد الدمج | devops-engineer | Doing | ملف مراجعة منفصل |
| P1-02 | أساس الـ Frontend (tokens 1.1، layouts، الدخول/OTP، المكونات) | frontend-engineer | Doing | **بدأ** على `agent/frontend/p1-02-ui-foundation` (worktree `/home/claude/suqalzl-frontend`) فوق هيكل Next.js من P1-01 (D30): بيانات Zod في الاختبارات و Storybook/dev فقط؛ اللوحات عربي فقط والمتجر ar + en (D29)؛ رمز الريال حسب tokens.md 1.1 §8.4؛ شاشة 2FA و"تذكر الجهاز 30 يوماً" تظهر فقط لو `requires2fa` (D31). الجلسة cookie `httpOnly` من السيرفر (D35-1)، فالواجهة ما تقراش التوكن. مراجعة designer و qa-tester قبل Done |
| P1-03 | `docker compose` + interfaces + ملفات CI + Sentry بتنظيف PII | devops-engineer | Review | فيه commit على `agent/devops/p1-03-local-env` (`882e4c3`)، **مدموج في فرع backend P1-01**؛ أسماء الأدوار بتاعته معتمدة في SPEC (D35-3). **مضاف من P1-00:** سكربت init للأدوار، `PRISMA_ENGINES_MIRROR` و registry لـ `postgres:16`، CI على Postgres حقيقي. تشغيل الـ CI فعلياً ينتظر مستودع GitHub |
| P2-01 | الكتالوج والبحث | frontend-engineer + backend-engineer | Todo | يعتمد على P1. الفلاتر عند الإطلاق: السعر والتاجر والأعلام؛ الخصائص لاحقاً (D33-3) |
| P2-02 | السلة والكوبونات (ضابط D18) والـ Checkout | backend-engineer + frontend-engineer | Todo | يعتمد على P2-01. سطر التقسيط لكل الزوار (D32) |
| P2-03 | Moyasar sandbox والـ webhooks | backend-engineer | Todo | يعتمد على P2-02 |
| P2-04 | حساب العميل (تجهيل، تصدير، موافقة تسويقية) | frontend-engineer + backend-engineer | Todo | يعتمد على P2-03 |
| P2-05 | النصوص والسياسات و SEO | arabic-content-seo | Todo | يعتمد على P1؛ السياسات مسودات حتى P8-03 |
| P2-05b | نص سطر التقسيط (D32): بدون وعد بالموافقة، بدون رقم قسط فوق السقف | arabic-content-seo (مراجعة legal-contracts في ملف مراجعة منفصل) | Todo | مرتبط بالشروط 5-2 و R-02 |
| P3-01 | لوحة الإدارة | frontend-engineer + backend-engineer | Todo | يعتمد على G2 |
| P3-02 | تأسيس الفاتورة (بدون ZATCA) | backend-engineer (مراجعة finance-zatca) | Todo | يعتمد على P3-01. الربط في P8-06 |
| P4-01 | تسجيل التجار والمراجعة | backend-engineer + frontend-engineer | Todo | يعتمد على P3 |
| P4-02 | لوحة التاجر والمنتجات | frontend-engineer + backend-engineer | Todo | يعتمد على P4-01 |
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
