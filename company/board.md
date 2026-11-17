# لوحة الشركة — مشروع سوق الزل

> مصدر الحقيقة الوحيد لحالة المهام. التفاصيل ومعايير القبول في `docs/plan.md`.
> الحالات: Todo / Doing / Review / Done / Blocked. أي مهمة تحتاج موافقة المالك تبقى في Review.
> آخر تحديث: 2026-11-17 — الفرع: `agent/ceo/p0-setup`

| ID | Task | Owner | Status | Notes |
|---|---|---|---|---|
| P0-01 | قرارات O1، O2، O3، O7 | finance-zatca | Review | في `docs/decisions.md`. بانتظار G1 + مراجعة مستشار ضريبي لـ O2 + عروض أسعار البوابات |
| P0-02 | مسودة اتفاقية التاجر | legal-contracts | Review | `docs/legal/vendor-agreement.md` نسخة 0.1 — تحتاج مستشار قانوني |
| P0-03 | مسودات السياسات | legal-contracts | Review | الخصوصية، الاسترجاع، الشروط، الشحن في `docs/legal/` — تحتاج مستشار قانوني |
| P0-04 | الهوية و Design tokens | designer + design-system-performance | Review | `docs/design/tokens.md` — التباين محسوب. بانتظار G1 |
| P0-05 | الشاشات الرئيسية | designer | Review | منشورة، الرابط في `docs/design/README.md`. بانتظار G1 |
| P0-06 | تقييم O4، O5، O6 | backend-engineer + devops-engineer | Review | في `docs/decisions.md`. تحتاج عروض أسعار من OTO/Torod وتأكيد Unifonic |
| P0-07 | O8، O9 | ceo | Review | في `docs/decisions.md` |
| P0-08 | سجل القرارات والحالة و G1 | ceo | Review | `docs/decisions.md` + `docs/status.md`. **متوقف عند بوابة G1** |
| P1-01 | أساس الـ Backend | backend-engineer | Blocked | ينتظر G1 (تعديلات الـ schema من O1/O2/O3) |
| P1-02 | أساس الـ Frontend | frontend-engineer | Blocked | ينتظر G1 + P1-01 |
| P1-03 | CI والبيئات | devops-engineer | Blocked | ينتظر G1 (O6) |
| P2-01 | الكتالوج والبحث | frontend-engineer + backend-engineer | Todo | يعتمد على P1 |
| P2-02 | السلة والكوبونات والـ Checkout | backend-engineer + frontend-engineer | Todo | يعتمد على P2-01 |
| P2-03 | Moyasar والـ webhooks | backend-engineer | Todo | يعتمد على P2-02 |
| P2-04 | حساب العميل | frontend-engineer + backend-engineer | Todo | يعتمد على P2-03 |
| P2-05 | النصوص والسياسات و SEO | arabic-content-seo | Todo | يعتمد على P1 + اعتماد P0-03 |
| P3-01 | لوحة الإدارة | frontend-engineer + backend-engineer | Todo | يعتمد على G2 |
| P3-02 | الفاتورة الضريبية PDF | backend-engineer | Todo | يعتمد على P3-01 + O2 |
| P4-01 | تسجيل التجار والمراجعة | backend-engineer + frontend-engineer | Todo | يعتمد على P3 |
| P4-02 | لوحة التاجر والمنتجات | frontend-engineer + backend-engineer | Todo | يعتمد على P4-01 |
| P4-03 | تنفيذ الطلبات الفرعية | backend-engineer + frontend-engineer | Todo | يعتمد على P4-02 |
| P4-04 | الـ Ledger والتسويات | backend-engineer + frontend-engineer | Todo | يعتمد على P4-03 |
| P4-05 | الإشعارات | backend-engineer | Todo | يعتمد على P4-04 |
| P4-06 | مراجعة مالية | finance-zatca | Todo | يعتمد على P4-04 |
| P4.5-01 | تصميم السوق والفصال (تفصيلي) | designer | Todo | يمكن البدء بعد G1 بالتوازي مع P1 |
| P4.5-02 | الـ schema ودورة العروض | backend-engineer | Todo | يعتمد على G3 |
| P4.5-03 | صفحة /souq الحية | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-02 |
| P4.5-04 | محرك الفصال | backend-engineer | Todo | يعتمد على P4.5-02 |
| P4.5-05 | واجهات الفصال | frontend-engineer | Todo | يعتمد على P4.5-01 + P4.5-04 |
| P4.5-06 | مراقبة الإدارة /admin/souq | frontend-engineer + backend-engineer | Todo | يعتمد على P4.5-04 |
| P4.5-07 | قواعد عمولة الصفقات | finance-zatca + legal-contracts | Todo | يعتمد على P4.5-04 |
| P5-01 | تابي وتمارا | backend-engineer + platform-api-engineer | Todo | يعتمد على G4 |
| P5-02 | الشحن | backend-engineer | Todo | يعتمد على O4 |
| P5-03 | SMS وواتساب والإيميل | backend-engineer + platform-api-engineer | Todo | يعتمد على O5 |
| P5-04 | Cron jobs | backend-engineer | Todo | يعتمد على P4.5 |
| P5-05 | الكوكيز والتتبع | tracking-analytics | Todo | يعتمد على P2 |
| P6-01 | الجودة والاختبارات | qa-tester + e2e-automation-engineer + design-system-performance | Todo | يعتمد على P5 |
| P7-01 | الاستيراد من زد | backend-engineer | Todo | يعتمد على G5 |
| P7-02 | النشر والتشغيل | devops-engineer | Todo | يعتمد على G5 |
| P7-03 | خطة الإطلاق والتسويق | marketing-lead + social-media-manager | Todo | يعتمد على G5؛ أي نشر أو صرف بموافقة المالك |

## ملاحظة تشغيلية
في جلسة P0 لم تكن أداة تكليف الإيجنتس (Agent) متاحة، فنفّذ الـ CEO مهام P0 بنفسه بأدوار الإيجنتس المذكورين. المراجعة المستقلة (designer ↔ design-system-performance، finance ↔ legal) يُفضل إعادتها بالإيجنتس الفعليين قبل G1 إن أمكن.
