# لوحة الشركة — مشروع سوق الزل

> مصدر الحقيقة الوحيد لحالة المهام. التفاصيل ومعايير القبول في `docs/plan.md`، والقرارات في `docs/decisions.md`.
> الحالات: Todo / Doing / Review / Done / Blocked. أي مهمة تحتاج موافقة المالك تبقى في Review.
> آخر تحديث: 2026-11-18 — الفرع: `agent/ceo/p0-setup`
> قاعدة التنفيذ (CLAUDE.md 13، 14): كل مهمة ينفذها المختص بنفسه في ملفاته، والـ CEO ينسق ويجمع ويراجع فقط.

## P0 — التجهيز (متوقف عند بوابة G1)

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P0-01 | O1، O2، O3، O7 + معادلة مستحق التاجر + TC1–TC12 | finance-zatca | Review | `docs/decisions/finance.md`. بانتظار المالك + المستشار الضريبي + عروض أسعار البوابات |
| P0-02 | اتفاقية التاجر v0.2 | legal-contracts | Review | `docs/legal/vendor-agreement.md`. بانتظار المحامي وقرارات B1–B17 |
| P0-03 | السياسات v0.2 + سجل المخاطر + قائمة PDPL | legal-contracts | Review | `docs/legal/*.md`، `docs/legal/legal-review.md`. بانتظار المحامي |
| P0-04 | Design tokens v1.0 + مراجعة التصاميم | design-system-performance | Review | `docs/design/tokens.md`، `docs/design/review-design-system.md`. قرار رمز الريال للمالك |
| P0-05 | الشاشات الرئيسية والحالات | designer | Doing | تعديل أ1–أ8 و ت1–ت7 + الشاشات الناقصة (الدخول/OTP، LTR، ديسكتوب، الحالات). بعد التسليم: مراجعة design-system-performance ثم المالك |
| P0-06 | O4، O5، تحقق Moyasar/تابي/تمارا، مراجعة الـ schema | backend-engineer | Review | `docs/decisions/backend.md`. بانتظار المالك وردود المزودين و6 قرارات schema |
| P0-07 | O6 الاستضافة والتشغيل | devops-engineer | Review | `docs/decisions/devops.md` (GCP الدمام عبر CNTXT). بانتظار المالك + رأي المحامي PDPL + عرض CNTXT |
| P0-08 | O8، O9 | ceo | Review | `docs/decisions.md` §1 و§3 |
| P0-09 | الملخص الموحد، التعارضات T1–T16، الأسئلة، تعديلات SPEC S1–S22 | ceo | Review | `docs/decisions.md`. **بوابة G1** |
| P0-10 | إرسال الأسئلة للمستشار الضريبي والمحامي | المالك | Blocked | ينتظر المالك. القوائم في `docs/decisions.md` §7. سؤال PDPL قبل P1 |
| P0-11 | عروض أسعار وردود المزودين (Moyasar، تابي، تمارا، OTO، Torod، SMSA/أرامكس/SPL، Taqnyat، CNTXT، البنك) | المالك | Blocked | ينتظر المالك. الأسئلة في `docs/decisions.md` §7. ممنوع على أي إيجنت التواصل الخارجي |
| P0-12 | حساب منشأة CNTXT + قياس gcping + مستودع GitHub | المالك | Blocked | ينتظر المالك. `docs/decisions/devops.md` §8 |
| P0-13 | تسجيل اسم المرسل SMS ورقم واتساب الأعمال | المالك | Blocked | ينتظر موافقة O5. `docs/decisions/backend.md` §2.3 |
| P0-14 | كتابة النص النهائي لتعديلات SPEC S1–S22 (كل صاحب تعديل في ملفه) | finance-zatca، backend-engineer، devops-engineer، legal-contracts، design-system-performance، ceo | Todo | بعد G1. الدمج في `SPEC.md` و `docs/plan.md` بعد اعتماد المالك |
| P0-15 | spike: RLS و Realtime على Cloud SQL (T10) وإعادة كتابة C1/C2/migration 0009 | backend-engineer + devops-engineer | Todo | بعد اعتماد O6 |
| P0-16 | تحديث قائمة المعالجين في سياسة الخصوصية بعد O6 و O5 | legal-contracts | Todo | بعد اعتماد O6 و O5 ورأي المحامي |

## P1 وما بعدها

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P1-01 | أساس الـ Backend | backend-engineer | Blocked | ينتظر G1 + P0-15. جداول المالية تنتظر رأي المستشار الضريبي (O2) |
| P1-02 | أساس الـ Frontend | frontend-engineer | Blocked | ينتظر G1 + P0-05 + P1-01 (auth) |
| P1-03 | CI والبيئات (GCP حسب O6) | devops-engineer | Blocked | ينتظر G1 (O6) + P0-12 |
| P2-01 | الكتالوج والبحث | frontend-engineer + backend-engineer | Todo | يعتمد على P1 |
| P2-02 | السلة والكوبونات والـ Checkout | backend-engineer + frontend-engineer | Todo | يعتمد على P2-01؛ ضابط الكوبون العام (T5) |
| P2-03 | Moyasar والـ webhooks | backend-engineer | Todo | يعتمد على P2-02؛ ردود Moyasar (P0-11) |
| P2-04 | حساب العميل | frontend-engineer + backend-engineer | Todo | يعتمد على P2-03 |
| P2-05 | النصوص والسياسات و SEO | arabic-content-seo | Todo | يعتمد على P1 + اعتماد P0-03 من المحامي |
| P3-01 | لوحة الإدارة | frontend-engineer + backend-engineer | Todo | يعتمد على G2 |
| P3-02 | الفاتورة الضريبية وربط فاتورة المرحلة الثانية | backend-engineer (مراجعة finance-zatca) | Todo | يعتمد على P3-01 + O2 + تأكيد الموجة (T9). قد يصبح مساراً حرجاً |
| P4-01 | تسجيل التجار والمراجعة | backend-engineer + frontend-engineer | Todo | يعتمد على P3 |
| P4-02 | لوحة التاجر والمنتجات | frontend-engineer + backend-engineer | Todo | يعتمد على P4-01 |
| P4-03 | تنفيذ الطلبات الفرعية | backend-engineer + frontend-engineer | Todo | يعتمد على P4-02 |
| P4-04 | الـ Ledger والتسويات | backend-engineer + frontend-engineer | Todo | يعتمد على P4-03 |
| P4-05 | الإشعارات | backend-engineer | Todo | يعتمد على P4-04؛ موافقة التسويق (T6) |
| P4-06 | مراجعة مالية | finance-zatca | Todo | يعتمد على P4-04 |
| P4.5-01 | تصميم السوق والفصال (تفصيلي) | designer | Todo | بعد G1؛ `/souq` تعمل بدون عروض خارج فترات الترخيص (T1) |
| P4.5-02 | الـ schema ودورة العروض | backend-engineer | Todo | يعتمد على G3؛ حقل ترخيص التخفيض (S9) |
| P4.5-03 | صفحة /souq الحية | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-02 |
| P4.5-04 | محرك الفصال | backend-engineer | Todo | يعتمد على P4.5-02؛ قنوات منفصلة (C1) |
| P4.5-05 | واجهات الفصال | frontend-engineer | Todo | يعتمد على P4.5-01 + P4.5-04 |
| P4.5-06 | مراقبة الإدارة /admin/souq | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-04 |
| P4.5-07 | قواعد عمولة الصفقات | finance-zatca + legal-contracts | Todo | يعتمد على P4.5-04 |
| P5-01 | تابي وتمارا | backend-engineer + platform-api-engineer | Todo | يعتمد على G4؛ سقف 10,000 ر.س (T4) |
| P5-02 | الشحن (3 مسارات) | backend-engineer | Todo | يعتمد على O4 + ردود المزودين؛ السيوف (T3) |
| P5-03 | SMS وواتساب والإيميل | backend-engineer + platform-api-engineer | Todo | يعتمد على O5 + P0-13 |
| P5-04 | Cron jobs | backend-engineer | Todo | يعتمد على P4.5 |
| P5-05 | الكوكيز والتتبع | tracking-analytics | Todo | يعتمد على P2 |
| P6-01 | الجودة والاختبارات + تمرين الاسترجاع | qa-tester + e2e-automation-engineer + design-system-performance | Todo | يعتمد على P5 |
| P7-01 | الاستيراد من زد | backend-engineer | Todo | يعتمد على G5 |
| P7-02 | النشر والتشغيل | devops-engineer | Todo | يعتمد على G5 |
| P7-03 | خطة الإطلاق والتسويق | marketing-lead + social-media-manager | Todo | يعتمد على G5؛ أي نشر أو صرف بموافقة المالك |
