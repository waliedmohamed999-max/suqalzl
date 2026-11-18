# لوحة الشركة — مشروع سوق الزل

> مصدر الحقيقة الوحيد لحالة المهام. التفاصيل ومعايير القبول في `docs/plan.md`، والقرارات في `docs/decisions.md`.
> الحالات: Todo / Doing / Review / Done / Blocked. أي مهمة تحتاج موافقة المالك تبقى في Review.
> آخر تحديث: 2026-11-18 — الفرع: `agent/ceo/p0-setup`
> قاعدة التنفيذ (CLAUDE.md 13، 14): كل مهمة ينفذها المختص بنفسه في ملفاته، والـ CEO ينسق ويجمع ويراجع فقط.
> **بوابة G1: معتمدة** (القرارات 2026-11-17 + التصميم 2026-11-18). P1 جاهزة ولم تبدأ.

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
| P1-00 | spike العزل و RLS و SSE + LISTEN/NOTIFY على Postgres محلي (T10، C1، C2) | backend-engineer + devops-engineer | Todo | **جاهز للبدء** |
| P1-01 | أساس الـ Backend (schema كامل، seed بالافتراضيات، Auth + OTP ذاتي) | backend-engineer | Todo | جاهز بعد P1-00 |
| P1-02 | أساس الـ Frontend (tokens 1.1، layouts، الدخول/OTP) | frontend-engineer | Todo | يعتمد على P1-01 (auth)؛ رمز الريال حسب tokens.md 1.1 §8.4 |
| P1-03 | `docker compose` + interfaces + ملفات CI + Sentry بتنظيف PII | devops-engineer | Todo | **جاهز للبدء**؛ تشغيل الـ CI فعلياً ينتظر مستودع GitHub من المالك |
| P2-01 | الكتالوج والبحث | frontend-engineer + backend-engineer | Todo | يعتمد على P1 |
| P2-02 | السلة والكوبونات (ضابط D18) والـ Checkout | backend-engineer + frontend-engineer | Todo | يعتمد على P2-01 |
| P2-03 | Moyasar sandbox والـ webhooks | backend-engineer | Todo | يعتمد على P2-02 |
| P2-04 | حساب العميل (تجهيل، تصدير، موافقة تسويقية) | frontend-engineer + backend-engineer | Todo | يعتمد على P2-03 |
| P2-05 | النصوص والسياسات و SEO | arabic-content-seo | Todo | يعتمد على P1؛ السياسات مسودات حتى P8-03 |
| P3-01 | لوحة الإدارة | frontend-engineer + backend-engineer | Todo | يعتمد على G2 |
| P3-02 | تأسيس الفاتورة (بدون ZATCA) | backend-engineer (مراجعة finance-zatca) | Todo | يعتمد على P3-01. الربط في P8-06 |
| P4-01 | تسجيل التجار والمراجعة | backend-engineer + frontend-engineer | Todo | يعتمد على P3 |
| P4-02 | لوحة التاجر والمنتجات | frontend-engineer + backend-engineer | Todo | يعتمد على P4-01 |
| P4-03 | الطلبات الفرعية والشحن اليدوي | backend-engineer + frontend-engineer | Todo | يعتمد على P4-02؛ لا مزود شحن |
| P4-04 | الـ Ledger والتسويات وفواتير التجار | backend-engineer + frontend-engineer | Todo | يعتمد على P4-03؛ قيم O3 افتراضية |
| P4-05 | الإشعارات | backend-engineer | Todo | يعتمد على P4-04 |
| P4-06 | مراجعة مالية | finance-zatca | Todo | يعتمد على P4-04 |
| P4.5-01 | تصميم الشاشات الباقية للسوق والفصال | designer | Todo | يمكن البدء بعد G1 |
| P4.5-02 | الـ schema ودورة العروض + إعداد الترخيص | backend-engineer | Todo | يعتمد على G3 |
| P4.5-03 | صفحة /souq الحية | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-02 |
| P4.5-04 | محرك الفصال | backend-engineer | Todo | يعتمد على P4.5-02 |
| P4.5-05 | واجهات الفصال | frontend-engineer | Todo | يعتمد على P4.5-01 + P4.5-04 |
| P4.5-06 | مراقبة الإدارة /admin/souq | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-04 |
| P4.5-07 | قواعد عمولة الصفقات | finance-zatca + legal-contracts | Todo | يعتمد على P4.5-04 |
| P5-01 | تابي وتمارا sandbox | backend-engineer + platform-api-engineer | Todo | يعتمد على G4 |
| P5-02 | SMS (Taqnyat) وواتساب (Meta) والإيميل | backend-engineer + platform-api-engineer | Todo | يعتمد على P4؛ مفاتيح اختبار/console |
| P5-03 | Cron jobs خلف JobScheduler | backend-engineer + devops-engineer | Todo | يعتمد على P4.5 |
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
