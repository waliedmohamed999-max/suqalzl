# خطة المهام — سوق الزل

> مصدرها: `SPEC.md` قسم 11 (المراحل) وقسم 10 (معايير القبول). أي تعارض: الـ SPEC هو المرجع.
> **Definition of Done (DoD)** لكل مهمة هندسية: الكود يعمل محلياً + types بدون أخطاء + lint نظيف + الاختبارات المتعلقة تنجح + النصوص في `messages/ar.json` و `messages/en.json` + لا بيانات وهمية في الواجهة + تحديث `.env.example` والتوثيق + ملخص (ما تم، الملفات، الأوامر، متغيرات البيئة، الاختبار اليدوي، ما بقي).
> كل مخرجات هندسية تمر على `qa-tester` قبل Done، وكل مخرجات تصميم تمر على `designer`/`design-system-performance` للمراجعة.
> لا يتم صرف مال أو إرسال إيميلات خارجية أو نشر أو إطلاق إعلانات بدون موافقة المالك.

## البوابات (Gates)

| البوابة | بعد | ما يوافق عليه المالك |
|---|---|---|
| G1 | P0 | القرارات O1–O9، اتفاقية التاجر والسياسات (بعد مراجعة المستشار)، الهوية والشاشات |
| G2 | P2 | تجربة شراء حقيقية في sandbox |
| G3 | P4 | دورة تاجر كاملة حتى التحويل |
| G4 | P4.5 | عرض FLASH حقيقي + صفقة فصال كاملة حتى الدفع |
| G5 | P6 | قبل P7 (الإطلاق) |

---

## P0 — التجهيز (لا كود تطبيق)

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P0-01 | قرارات المال والضريبة O1، O2، O3، O7 | لكل قرار: البدائل، الإيجابيات والسلبيات، التوصية، مثال رقمي بالهللة | finance-zatca (+ legal-contracts في O2) | — | مكتوبة في `docs/decisions.md`؛ الأمثلة متسقة مع قاعدة `vat = round(total*15/115)` وسلسلة أولوية العمولة (6.1)؛ أي رقم مزود له مصدر أو "يحتاج تأكيد" |
| P0-02 | مسودة اتفاقية التاجر | العمولة، التسوية اليدوية (6.4)، الالتزام بأسعار الفصال المقبولة (6.8)، منع التواصل خارج المنصة، الاسترجاع، المنتجات الممنوعة، الفوترة حسب O2 | legal-contracts | P0-01 (O1، O2، O3، O7) | `docs/legal/vendor-agreement.md` فيه نسخة وتاريخ (لحقل `agreementVersion`) وتنويه "مسودة تحتاج مستشار" |
| P0-03 | مسودات سياسات المتجر | الخصوصية (PDPL)، الاسترجاع والاستبدال، الشروط والأحكام، الشحن والتوصيل | legal-contracts | P0-01 | 4 ملفات في `docs/legal/` بتنويه المراجعة؛ تغطي حذف الحساب والكوكيز (قسم 9)، ونافذة الاسترجاع المتسقة مع `holdDays` (O3) |
| P0-04 | الهوية و Design tokens | ألوان (ذهبي/بيج/أسود/بني غامق) بنسب تباين WCAG AA، خط IBM Plex Sans Arabic، المقاسات والمسافات والزوايا والظلال، RTL، خريطة Tailwind | designer + design-system-performance | — | `docs/design/tokens.md`؛ كل زوج نص/خلفية مستخدم ≥ 4.5:1 (أو 3:1 للنص الكبير)؛ قابل للنقل مباشرة لـ `tailwind.config` في P1 |
| P0-05 | تصميم الشاشات الرئيسية | الرئيسية، المنتج مع "اطلب سعرك"، `/souq`، مقارنة عروض الفصال، السلة/Checkout، لوحة admin الرئيسية، لوحة vendor مع صندوق طلبات الأسعار | designer (مراجعة: design-system-performance) | P0-04 | تصاميم منشورة برابط في `docs/design/README.md`؛ جوال أولاً للمتجر؛ حالات فارغة/تحميل/انتهاء مهلة موصوفة؛ `floorPrice` لا يظهر في أي شاشة للعميل |
| P0-06 | تقييم O4، O5، O6 | الشحن، SMS، الاستضافة: البدائل والتكلفة التقريبية بمصادر والتوصية | backend-engineer + devops-engineer (+ ceo في O4) | — | في `docs/decisions.md`؛ لا أسعار مخترعة |
| P0-07 | قرارات المنتج O8، O9 | ظهور اسم التاجر في العروض، حدود طلبات الأسعار | ceo | — | في `docs/decisions.md` بتوصية وقيم إعدادات |
| P0-08 | سجل القرارات والحالة وبوابة G1 | جدول القرارات، `docs/status.md`، أسئلة المالك | ceo | P0-01 … P0-07 | جدول بالحالة "بانتظار موافقة المالك"؛ تقرير للمالك |

**⟵ توقف: بوابة G1**

---

## P1 — الأساس

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P1-01 | أساس الـ Backend | Next.js 15 + TS strict، `prisma/schema.prisma` كامل (قسم 5 + تعديلات G1)، migrations، seed (التصنيفات الـ 14، SUPER_ADMIN من env، Settings الافتراضية)، `lib/money.ts`، `lib/vat.ts`، Auth جوال + OTP عبر `SmsProvider` وإيميل/كلمة مرور للإدارة والتجار، `lib/permissions.ts` + middleware، AuditLog helper | backend-engineer | G1 | Unit: الضريبة، التقريب ROUND_HALF_UP، التحقق من الآيبان (SA + 22 رقم)؛ لا Float في أي مبلغ؛ `/admin` و `/vendor` و `/account` محمية؛ Rate limit للـ OTP (5/ساعة لكل رقم و IP)؛ DoD |
| P1-02 | أساس الـ Frontend | Tailwind + shadcn بالـ tokens، RTL، next-intl، layouts المتجر/admin/vendor، المكونات المشتركة (ProductCard، Price، DataTable، FormField، ImageUploader، StatusBadge، EmptyState، Skeletons)، صفحات الدخول و OTP | frontend-engineer | P0-04، G1، P1-01 (auth) | لا نص ثابت خارج ملفات الترجمة؛ لا بيانات وهمية؛ axe بدون أخطاء حرجة على صفحات الدخول؛ DoD |
| P1-03 | CI والبيئات | GitHub Actions (lint، typecheck، tests)، بيئات dev/staging/prod، مشروع Supabase حسب O6، Sentry | devops-engineer | G1 (O6) | CI يفشل على أي خطأ types/lint/test؛ `.env.example` محدث؛ backups يومية مفعلة |

## P2 — المتجر

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P2-01 | الكتالوج والبحث | الرئيسية من `HomeSection`، التصنيف، كل المنتجات بفلاتر URL، صفحة المنتج بالخيارات، الباقات، صفحة التاجر، البحث العربي المطبّع | frontend-engineer + backend-engineer | P1 | Unit: تطبيع البحث (أ إ آ ← ا، ة ← ه، ى ← ي، التشكيل)؛ Lighthouse جوال ≥ 90 للرئيسية والمنتج |
| P2-02 | السلة والكوبونات والـ Checkout | سلة الزائر ودمجها، الكوبونات (6.1)، المفضلة، Checkout بالخطوات، Order + SubOrders + حجز المخزون في transaction | backend-engineer + frontend-engineer | P2-01 | Unit: الضريبة، العمولة، توزيع الخصم، رسوم الدفع (O1)، تقسيم الطلب على التجار |
| P2-03 | Moyasar والـ webhooks | `PaymentProvider` + Moyasar (مدى، بطاقات، Apple Pay، STC Pay)، webhook مصدر الحقيقة، التوقيع، Idempotency، cron إلغاء غير المدفوع | backend-engineer | P2-02 | **E2E 1**: زائر ← منتجان من تاجرين + منتج من المنصة ← تسجيل بالجوال ← دفع sandbox ← 3 طلبات فرعية |
| P2-04 | حساب العميل | الطلبات وتتبع الطلبات الفرعية، العناوين، المفضلة، طلب الاسترجاع، حذف الحساب (PDPL) | frontend-engineer + backend-engineer | P2-03 | العميل لا يصل لطلبات غيره؛ DoD |
| P2-05 | النصوص والسياسات و SEO | `messages/*.json`، صفحات السياسات من مسودات P0 بعد مراجعة المستشار، title/description، JSON-LD، sitemap و robots | arabic-content-seo (مراجعة legal-contracts) | P1، P0-03 | JSON-LD صالح (Product، Organization، BreadcrumbList)؛ السياسات المنشورة = النسخة المعتمدة |

**⟵ بوابة G2**

## P3 — لوحة الإدارة

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P3-01 | لوحة `/admin` | الأرقام، المنتجات (مراجعة، استيراد/تصدير)، التصنيفات بالسحب، الباقات، الطلبات + Timeline + state machine، الاسترجاع عبر Moyasar Refund API، العملاء، الكوبونات، التقييمات، المحتوى، الإعدادات، الموظفون والصلاحيات، سجل العمليات | frontend-engineer + backend-engineer | P2 | Unit: state machine (6.3)؛ كل صفحة محمية بـ `requirePermission`؛ كل عملية حساسة في `audit_logs` |
| P3-02 | الفاتورة الضريبية PDF | فاتورة مبسطة بـ QR (TLV) وإشعار دائن حسب O2 | backend-engineer (مراجعة finance-zatca) | P3-01، G1 (O2) | الحقول الإلزامية حسب قرار O2؛ مراجعة finance-zatca |

## P4 — نظام الشركات والتجار

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P4-01 | تسجيل التجار والمراجعة | `/sell` متعدد الخطوات، الوثائق في bucket خاص، قبول الاتفاقية (نسخة + تاريخ)، `/admin/vendors` | backend-engineer + frontend-engineer | P3 | **E2E 2** (تاجر يسجل ← قبول بتصنيفين ← رفض التصنيف الثالث ← قبول المنتج ← يظهر) |
| P4-02 | لوحة التاجر والمنتجات | `/vendor` حسب 7.3، قصر التصنيفات على `VendorCategory` على السيرفر، إرجاع المنتج PENDING عند التعديل الجوهري | frontend-engineer + backend-engineer | P4-01 | **E2E 5** (عزل البيانات بتغيير الـ IDs) |
| P4-03 | تنفيذ الطلبات الفرعية | الطلبات الفرعية للتاجر بحقول الشحن فقط، التجهيز، رقم التتبع | backend-engineer + frontend-engineer | P4-02 | التاجر لا يرى جوال/إيميل العميل خارج حقول الشحن |
| P4-04 | الـ Ledger والتسويات | قيود الدفع والإكمال والاسترجاع، `/admin/payouts`، ملف التحويل، تسجيل المرجع والإيصال، كشف حساب PDF، التقرير الشهري | backend-engineer + frontend-engineer | P4-03 | Unit: الـ ledger والأرصدة وإنشاء دفعة التسوية؛ **E2E 3** و **E2E 4** |
| P4-05 | الإشعارات | حسب جدول قسم 8 | backend-engineer | P4-04 | كل حدث في الجدول له اختبار إرسال |
| P4-06 | مراجعة مالية | مراجعة 6.1 و 6.4 وحالات اختبار بأرقام حقيقية (1,150 ر.س، كوبون 10%، عمولة 10%، رسوم) | finance-zatca | P4-04 | حالات الاختبار مسلمة لـ backend-engineer وتنجح |

**⟵ بوابة G3**

## P4.5 — سوق الزل والفصال

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P4.5-01 | تصميم تجربة السوق والفصال | بطاقة العرض، العداد، نافذة "اطلب سعرك"، مقارنة العروض والجولات، صندوق التاجر، إعدادات الفصال + handoff | designer | P0-05 | مواصفات handoff كاملة بحالات فارغة/تحميل/انتهاء مهلة |
| P4.5-02 | الـ schema ودورة العروض (Deals) | الجداول الجديدة والـ indexes، `/vendor/deals`، موافقة الإدارة، الانطلاق والانتهاء بالـ cron، حماية السعر المرجعي 14 يوم، `stockLimit` و `perCustomerLimit`، قفل FLASH 15 دقيقة | backend-engineer | P4 | **E2E 10**؛ Unit: تسعير العروض وحماية السعر المرجعي |
| P4.5-03 | صفحة `/souq` الحية | الأقسام، الفلاتر والترتيب في URL، العدادات، Realtime، شارة "مباشر" | frontend-engineer + backend-engineer | P4.5-02 | تحديث لحظي للكمية والانتهاء |
| P4.5-04 | محرك الفصال | `features/negotiation/service.ts` كـ state machine، اختيار المستلمين، `floorPrice` لا يخرج من السيرفر، القبول التلقائي، PriceLock، فلتر وسائل التواصل، حدود O9، قنوات Realtime بـ RLS | backend-engineer | P4.5-02 | **E2E 7، 8، 9، 11**؛ Unit: آلة حالات PriceRequest/PriceOffer، اختيار المستلمين، الحد الأدنى والقبول التلقائي، PriceLock، فلتر التواصل |
| P4.5-05 | واجهات الفصال | نافذة "اطلب سعرك"، `/souq/request/new`، `/account/requests/[number]`، `/vendor/requests`، إعدادات الفصال في نموذج المنتج | frontend-engineer | P4.5-01، P4.5-04 | العميل يرى العروض مرتبة بالإجمالي؛ التاجر يرى عروضه فقط |
| P4.5-06 | مراقبة الإدارة `/admin/souq` | العروض، المواسم، الطلبات، تعليق الفصال، التقارير | frontend-engineer + backend-engineer | P4.5-04 | كل إجراء في `audit_logs` |
| P4.5-07 | قواعد عمولة الصفقات وحماية السعر | مراجعة تنفيذ O7 وقاعدة الـ 14 يوم | finance-zatca + legal-contracts | P4.5-04 | العمولة في سيناريو 7 محسوبة على 950 ر.س |

**⟵ بوابة G4**

## P5 — التكاملات

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P5-01 | تابي وتمارا | session، redirect، webhook، capture، refund، ويدجت الأقساط | backend-engineer + platform-api-engineer | P4 | توزيع الرسوم حسب O1 |
| P5-02 | الشحن | `ShippingProvider` حسب O4: السعر، بوليصة لكل SubOrder، webhook التتبع | backend-engineer | P4، G1 (O4) | webhook يحدث SHIPPED/DELIVERED |
| P5-03 | SMS وواتساب والإيميل | SMS حسب O5، WhatsApp Cloud API، Resend بقوالب عربية | backend-engineer + platform-api-engineer | P4 | كل مزود خلف interface ومفاتيحه في `.env` |
| P5-04 | Cron jobs | إلغاء غير المدفوع، الإكمال بعد `holdDays`، تحرير الأرصدة، السلات المتروكة، مهلات الفصال | backend-engineer | P4.5 | اختبارات للمهلات |
| P5-05 | الكوكيز والتتبع | شريط موافقة PDPL، GA4 و Pixels بعد الموافقة، أحداث e-commerce، Meta CAPI | tracking-analytics | P2 | لا تحميل لأي pixel قبل الموافقة؛ purchase بدون تكرار |

## P6 — الجودة

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P6-01 | خطة الاختبار والتنفيذ | خطة كاملة، Playwright للسيناريوهات 1–11، عزل البيانات، axe عربي/إنجليزي، الجوال والديسكتوب، الأداء | qa-tester + e2e-automation-engineer + design-system-performance | P5 | **E2E 1–11 تنجح**؛ **E2E 6** (axe)؛ Lighthouse ≥ 90 و LCP < 2.5s؛ تقرير "جاهز/غير جاهز" |

**⟵ بوابة G5**

## P7 — النقل والإطلاق

| ID | العنوان | الوصف | المسؤول | يعتمد على | معايير القبول |
|---|---|---|---|---|---|
| P7-01 | الاستيراد من زد | `scripts/import-zid.ts` (المنتجات، الخيارات، الصور، العملاء) + تقرير أخطاء + Redirects 301 | backend-engineer | P6 | كل منتج قديم له redirect 301 |
| P7-02 | النشر والتشغيل | `new.suqalzl.com` ثم التحويل، backups يومية واختبار استرجاع، Sentry وتنبيهات، go-live checklist | devops-engineer | P6 | اختبار استرجاع ناجح موثق؛ مفاتيح live و webhooks على الدومين |
| P7-03 | خطة الإطلاق والتسويق | جذب التجار والعملاء | marketing-lead + social-media-manager | P6 | خطة فقط؛ أي نشر أو صرف بموافقة المالك |
