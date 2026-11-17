# سوق الزل — المواصفات الكاملة للمشروع (Project Spec)

> هذا الملف هو **المرجع الوحيد** لكل الإيجنتس. أي قرار غير مذكور هنا يُرفع للـ CEO قبل التنفيذ.
> ضع الملف في جذر المستودع باسم `SPEC.md` وانسخ قسم "قواعد العمل للإيجنتس" إلى `CLAUDE.md`.

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

### قرارات مفتوحة (يحسمها الإيجنت المسؤول ويرفعها للمالك)

| # | السؤال | المسؤول |
|---|---|---|
| O1 | من يتحمل رسوم Moyasar/تابي/تمارا: المنصة، أم تُخصم من التاجر بنسبة مبيعاته؟ (إعداد قابل للتغيير `gatewayFeeBearer`) | finance-zatca |
| O2 | الفاتورة الضريبية تصدر باسم من؟ (المنصة كبائع، أم المنصة كوكيل عن التاجر) وأثرها على ZATCA وضريبة العمولة | finance-zatca + legal-contracts |
| O3 | مدة الحجز قبل إتاحة رصيد التاجر (افتراضي 7 أيام بعد التسليم) ودورية التسوية (افتراضي أسبوعية) | finance-zatca |
| O4 | مزود الشحن: مجمّع (OTO أو Torod) أو ربط مباشر (SMSA/Aramex/SPL) | backend-engineer + CEO |
| O5 | مزود SMS: Unifonic أو Taqnyat | backend-engineer |
| O6 | الاستضافة: Vercel + Supabase أم VPS | devops-engineer |
| O7 | عمولة صفقات الفصال: نفس عمولة التاجر أم نسبة خاصة `negotiationCommission`؟ | finance-zatca |
| O8 | هل يرى العميل اسم التاجر في العروض قبل القبول أم بعده؟ (افتراضي: يراه مع تقييمه) | ceo + المالك |
| O9 | حدود الاستخدام: عدد طلبات السعر المفتوحة لكل عميل (افتراضي 5 في نفس الوقت و10 يومياً) | ceo |

---

## 2. التقنيات (Stack)

- **Framework:** Next.js 15 (App Router) + TypeScript (strict) + React Server Components + Server Actions
- **UI:** Tailwind CSS + shadcn/ui + lucide-react — RTL افتراضي — خط IBM Plex Sans Arabic (أو Tajawal)
- **i18n:** next-intl (ar افتراضي، en)
- **DB:** PostgreSQL على Supabase + Prisma ORM + Prisma Migrate
- **Auth:** Better Auth (أو Auth.js) — دخول بالجوال + OTP، وإيميل/كلمة مرور للإدارة والتجار، مع جلسات من السيرفر
- **Storage:** Supabase Storage (صور المنتجات، وثائق التجار في bucket خاص private)
- **Validation:** Zod — **Forms:** react-hook-form — **Tables:** TanStack Table — **Charts:** Recharts
- **Email:** Resend + react-email (قوالب عربية)
- **SMS:** Unifonic أو Taqnyat عبر interface
- **Payments:** Moyasar (mada، Visa، Mastercard، Apple Pay، STC Pay) + Tabby + Tamara
- **Shipping:** عبر interface `ShippingProvider` (التنفيذ الأول حسب O4)
- **Jobs/Cron:** Vercel Cron أو Supabase pg_cron + جدول `jobs`
- **Realtime:** Supabase Realtime (قنوات خاصة لكل طلب سعر وللوحة التاجر) لتحديث العروض والعدادات لحظياً في `/souq`
- **Search:** Postgres Full-text + تطبيع عربي (لاحقاً Meilisearch)
- **Testing:** Vitest (unit) + Playwright (e2e) + axe-core
- **Monitoring:** Sentry + سجل أخطاء
- **Analytics:** GA4 + Meta/Snap/TikTok Pixels (بموافقة الكوكيز)

---

## 3. هيكل المستودع

```
/
├─ SPEC.md                 ← هذا الملف
├─ CLAUDE.md               ← قواعد العمل
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
│  ├─ features/            ← منطق كل ميزة (catalog, cart, checkout, orders, vendors, wallet, payouts, coupons, reviews, cms, settings, notifications, deals, negotiation)
│  │  └─ <feature>/{actions.ts, queries.ts, schema.ts, service.ts, components/}
│  ├─ lib/
│  │  ├─ db.ts, auth.ts, permissions.ts, money.ts, vat.ts, arabic-search.ts
│  │  └─ providers/{payment, sms, shipping, email}/  ← interfaces + implementations
│  ├─ components/ui/       ← shadcn
│  └─ messages/{ar.json, en.json}
├─ tests/{unit, e2e}
└─ scripts/import-zid.ts
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
- تفعيل RLS على Supabase كطبقة حماية إضافية للجداول الحساسة.
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
- `Setting`: key, value (JSON) — مثال: storeInfo، vatRate=1500، defaultCommission=1000، holdDays=7، payoutCycle=WEEKLY، gatewayFeeBearer، shippingRates، whatsappNumber، pixels
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

---

## 6. قواعد العمل التجارية (Business Rules)

### 6.1 المال والضريبة
- `lib/money.ts`: دوال `toHalalas`, `formatSAR` (عرض: `1,250.00 ر.س`)، وتقريب `ROUND_HALF_UP` موحد.
- الأسعار شاملة الضريبة: `vat = round(total * 15 / 115)`.
- العمولة تُحسب على **قيمة المنتجات بعد الخصم وقبل الشحن** (قابل للتغيير بإعداد).
- أولوية نسبة العمولة: `Vendor.commissionRate` ← `Category.commissionRate` ← `Setting.defaultCommission`. تُجمّد النسبة في `SubOrder.commissionRate` لحظة الدفع.
- خصم الكوبون العام يتوزع على الطلبات الفرعية بنسبة قيمتها (`discountShare`) وتتحمله المنصة، أي أنه **لا** يقلل `vendorNet`. كوبون التاجر (`vendorId` محدد) يتحمله التاجر.
- رسوم الدفع حسب `gatewayFeeBearer` (قرار O1): `PLATFORM` = صفر على التاجر، `VENDOR` = توزع على الطلبات الفرعية بنسبة القيمة.
- `vendorNet = subtotal - discountShare(إن كان كوبون تاجر) - commissionAmount - gatewayFeeShare + shippingFee(إن كان التاجر يشحن بنفسه)`.

### 6.2 الدفع (Moyasar → حساب المنصة)
1. Checkout ينشئ `Order` بحالة `PENDING_PAYMENT` + `SubOrders` + حجز مخزون (`reservedStock`) لمدة 30 دقيقة، كله داخل transaction واحدة.
2. الدفع عبر Moyasar Payment Form/API (مدى، بطاقات، Apple Pay، STC Pay) مع `callback_url`.
3. **مصدر الحقيقة هو الـ webhook** + جلب حالة الدفع من Moyasar API على السيرفر (لا نثق في redirect المتصفح). التحقق من الـ secret/التوقيع، و Idempotency على `gatewayRef`.
4. عند `paid`: `Order.paymentStatus=PAID`، الحالة `PAID`، خصم المخزون الفعلي، كل SubOrder إلى `NEW`، تجميد العمولة، إنشاء قيود `PENDING` في الـ ledger، إشعار العميل والتجار والإدارة.
5. عند الفشل أو انتهاء المهلة: إلغاء الطلب وفك الحجز (cron كل 5 دقائق).
6. الاسترجاع (Refund) من لوحة الإدارة فقط عبر Moyasar Refund API، كامل أو جزئي لكل SubOrder، مع قيد `REFUND_DEBIT` على التاجر إن كان رصيده دخل.
7. تابي وتمارا: نفس النمط (session ← redirect ← webhook ← capture/refund)، ويُعرض ويدجت الأقساط في صفحة المنتج والسلة.

### 6.3 دورة حياة الطلب الفرعي (State Machine)
```
NEW → PREPARING → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED
  ↘ CANCELLED (من NEW/PREPARING فقط)
DELIVERED → RETURN_REQUESTED → RETURNED
```
- التحولات المسموحة فقط تمر عبر `features/orders/service.ts::transition()` وتسجل في `OrderStatusHistory`.
- التاجر يغير: NEW→PREPARING→READY_TO_SHIP→SHIPPED (مع رقم تتبع). الإدارة تغير أي حالة. webhook الشحن يحدث SHIPPED/DELIVERED.
- `COMPLETED` تلقائياً بعد `holdDays` من `DELIVERED` بدون طلب استرجاع.
- حالة `Order` الرئيسية تُشتق من حالات الطلبات الفرعية.

### 6.4 المحفظة والتحويل اليدوي للتجار
- عند الدفع: قيد `SALE_CREDIT` (+subtotal بعد الخصم المناسب) و `COMMISSION_DEBIT` (−) و `GATEWAY_FEE_DEBIT` (− إن وجد)، كلها `PENDING`.
- عند `COMPLETED`: القيود تصبح `AVAILABLE` (`availableAt`).
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
- أي تعديل على (الاسم، الوصف، الصور، التصنيف) لمنتج منشور من تاجر غير موثوق يرجعه `PENDING`. تعديل السعر والمخزون لا يحتاج مراجعة.
- تعليق التاجر `SUSPENDED` يخفي كل منتجاته فوراً ويوقف الطلبات الجديدة، ويبقي الطلبات الحالية والرصيد.

### 6.6 الشحن
- رسوم الشحن تُحسب لكل SubOrder حسب المدينة والوزن (`ShippingZone`) مع شحن مجاني فوق حد معين.
- وضعان لكل تاجر: `PLATFORM_SHIPPING` (المنصة تصدر البوليصة من حسابها ويُخصم المبلغ أو لا حسب الإعداد) أو `SELF_SHIPPING` (التاجر يشحن ويدخل رقم التتبع، ورسوم الشحن تذهب له).

### 6.7 صفحة "سوق الزل" والعروض (Deals)
- `/souq` صفحة سوق حي: تعرض العروض النشطة (`LIVE`) من كل التجار والمنصة، مقسمة إلى: **عروض الساعة (FLASH)** بعداد تنازلي وشريط "باقي X قطعة"، **عروض اليوم**، **عروض الأسبوع**، **تصفية**، **باقات**، و**أحدث طلبات الفصال المفتوحة** (بدون بيانات العميل) لتحفيز التجار والعملاء.
- فلاتر: التصنيف، التاجر، نسبة الخصم، السعر، المدينة، "ينتهي قريباً". ترتيب: الأعلى خصماً، ينتهي قريباً، الأكثر مبيعاً، الأحدث.
- بطاقة العرض: صورة، اسم المنتج، اسم التاجر وتقييمه، السعر قبل وبعد، نسبة الخصم، العداد، الكمية المتبقية، زر "اشترِ الآن"، وزر "فاصل" لو `allowBargain`.
- تحديث لحظي (Realtime): الكمية المتبقية، انتهاء العرض، عروض جديدة.
- التاجر ينشئ العرض من `/vendor/deals` ← الحالة `PENDING` ← الإدارة توافق (إلا الموثوق) ← يصبح `LIVE` تلقائياً عند `startsAt` وينتهي عند `endsAt` أو نفاد `stockLimit` (cron + فحص لحظي في السلة).
- **قواعد العروض:**
  - سعر العرض لازم يكون أقل من السعر الأساسي الحالي، والسعر "قبل" المعروض هو آخر سعر بيع فعلي (ممنوع رفع السعر قبل الخصم؛ النظام يحفظ تاريخ السعر ويرفض العرض لو السعر الأساسي اتغير خلال آخر 14 يوم). هذا حماية للعميل وللمصداقية.
  - عرض واحد نشط لكل variant في نفس الوقت.
  - `perCustomerLimit` يُفرض في السلة وفي الـ checkout.
  - السعر يُقفل في السلة 15 دقيقة لعروض FLASH، وبعدها يُعاد حسابه.
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
  → العميل يشوف كل العروض جنب بعض (السعر، الشحن، مدة التوصيل، التاجر وتقييمه) مرتبة بالإجمالي
  → العميل: يقبل عرض | يرد بسعر مضاد على عرض تاجر معين | يرفض
  → الجولات بين العميل وكل تاجر مستقلة، بحد أقصى maxRounds لكل طرف
  → عند القبول: الطلب ACCEPTED + إنشاء PriceLock (سعر مقفول + حجز مخزون) لمدة 24 ساعة
  → العميل يدفع عادي من السلة (عنصر بسعر مقفول) → الطلب CONVERTED
  → باقي العروض تُغلق تلقائياً (EXPIRED) ويُبلّغ التجار
```

**قواعد إلزامية:**
- **السرية:** التجار لا يرون عروض بعضهم ولا أسعار بعضهم (Sealed offers). يرون فقط طلب العميل وسعره المطلوب. العميل يرى كل العروض.
- **الحد الأدنى السري:** لو العميل طلب أقل من `floorPrice` لمنتج تاجر، يُرسل للتاجر مع تنبيه "أقل من حدك الأدنى"، ولا يُكشف `floorPrice` للعميل أبداً (لا في الـ API ولا في رسائل الخطأ).
- **القبول التلقائي:** لو سعر العميل ≥ `autoAcceptPrice` على منتج محدد، يُنشأ عرض مقبول تلقائياً (`isAuto`) فوراً من صاحب المنتج.
- **الالتزام:** العرض المقبول ملزم للتاجر بالسعر والكمية لمدة الـ PriceLock. لو ألغاه التاجر بعد الدفع يُسجل عليه في التقييم الداخلي، والإدارة تقدر تعلّق ميزة الفصال له.
- **مهلات:** طلب السعر ينتهي بعد 48 ساعة، والعرض بعد `responseWindowHours`، والـ PriceLock بعد 24 ساعة بدون دفع (يفك حجز المخزون). كلها عبر cron.
- **منع التحايل:** حقل الملاحظات يُفلتر من أرقام الجوال والإيميلات والروابط وحسابات السوشيال (regex عربي وإنجليزي وأرقام عربية ٠-٩)، والمحاولات المتكررة تُبلّغ للإدارة. كل الاتفاق والدفع داخل المنصة.
- **حدود العميل (O9):** جوال موثّق شرط، 5 طلبات مفتوحة في نفس الوقت، 10 يومياً، ولا يتجاوز `targetPrice` نطاقاً منطقياً (مثلاً لا أقل من 30% من أقل سعر في التصنيف لنفس المنتج؛ إعداد قابل للتعديل) لتقليل الإزعاج للتجار.
- **حدود التاجر:** يرد بمنتج منشور من منتجاته فقط وفي نفس التصنيف، والسعر بالهللة، والكمية ≤ المخزون المتاح.
- **العمولة:** على سعر الصفقة النهائي حسب O7.
- **الشفافية:** صفحة الطلب للعميل فيها Timeline لكل جولة، وعداد للمهلة، وتحديث لحظي.
- **الإدارة:** مراقبة كل الطلبات والعروض، إخفاء طلب مسيء، تعليق ميزة الفصال لعميل أو تاجر، وتقارير: نسبة الطلبات التي تحولت لمبيعات، متوسط الفرق بين السعر المطلوب والنهائي، أسرع التجار رداً.
- **ترتيب التجار:** "أسرع رد" و"نسبة القبول" تظهر كشارات في عروض التاجر وتؤثر على ترتيبه.

---

## 7. الصفحات والمسارات

### 7.1 المتجر
`/` الرئيسية (أقسام تُدار من `HomeSection`) — `/c/[slug]` التصنيف — `/products` كل المنتجات — `/p/[slug]` المنتج — `/bundles/[slug]` الباقة — `/store/[slug]` صفحة التاجر — `/search?q=` — `/cart` — `/checkout` (العنوان ← الشحن ← الدفع ← المراجعة) — `/checkout/success/[orderNumber]` — `/pages/[slug]` — `/sell` — `/login` — `/account` (طلباتي، تتبع، العناوين، المفضلة، الاسترجاع، **طلبات الأسعار والفصال**، بياناتي).
**سوق الزل:** `/souq` (العروض الحية + الطلبات المفتوحة) — `/souq/deals/[id]` — `/souq/request/new` (طلب مفتوح) — `/p/[slug]?bargain=1` (نافذة "اطلب سعرك") — `/account/requests` و `/account/requests/[number]` (العروض جنب بعض + الجولات + القبول + الدفع). رابط "سوق الزل" في القائمة الرئيسية بشارة "مباشر".

**متطلبات الواجهة:** Mobile-first، هوية فخمة (ذهبي/بيج/أسود/بني غامق)، بطاقة منتج (صورة، اسم، سعر وسعر قبل الخصم، "متوفر بعدة خيارات" أو زر "أضف إلى السلة"، المفضلة)، فلاتر في الـ URL، بحث عربي يطبّع (أ إ آ ← ا، ة ← ه، ى ← ي، إزالة التشكيل)، زر واتساب عائم، Breadcrumbs، Product + Organization + BreadcrumbList JSON-LD، sitemap.xml و robots.txt، Open Graph لكل منتج، صفحات 404/500 عربية، Skeleton loading.

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
| سلة متروكة (بعد ساعة و24 ساعة) | SMS/واتساب/إيميل | — | — |
| طلب سعر جديد في تصنيفه | — | لحظي داخل اللوحة + Push + SMS/واتساب (قابل للإيقاف) | — |
| عرض جديد أو سعر مضاد على طلبه | لحظي + SMS/واتساب | — | — |
| سعر مضاد من العميل | — | لحظي + واتساب | — |
| قبول العرض | تأكيد + رابط الدفع + مهلة الـ PriceLock | لحظي + إيميل | — |
| قرب انتهاء المهلة (قبل ساعتين) | تذكير بالدفع | تذكير بالرد | — |
| إغلاق الطلب لصالح تاجر آخر | — | داخل اللوحة | — |
| عرض التاجر بانتظار الموافقة / انطلق / انتهى | — | داخل اللوحة | داخل اللوحة (عند الطلب) |
| محاولة مشاركة وسيلة تواصل في الملاحظات | — | تحذير | تنبيه |

---

## 9. الأمان والجودة والأداء

- Rate limit على: OTP (5 محاولات/ساعة لكل رقم وIP)، الدخول، الـ checkout، الكوبونات.
- التحقق من توقيع كل webhook، و Idempotency keys.
- أسرار في `.env` فقط، و`.env.example` محدّث دائماً.
- Security headers + CSP، وحماية CSRF في Server Actions، وتنظيف HTML في الأوصاف (sanitize).
- رفع الملفات: أنواع وأحجام محددة، والوثائق في bucket خاص بروابط موقعة مؤقتة.
- نظام حماية البيانات الشخصية (PDPL): موافقة الكوكيز، سياسة خصوصية، حذف الحساب عند الطلب.
- الأداء: Lighthouse ≥ 90 على الجوال للرئيسية والمنتج، next/image، caching/ISR للصفحات العامة، LCP < 2.5s.
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

**Unit إضافي:** آلة حالات PriceRequest/PriceOffer، اختيار المستلمين (التصنيف + المعتمدين + عندهم منتج منشور)، قواعد الحد الأدنى والقبول التلقائي، الـ PriceLock، تسعير العروض وحماية السعر المرجعي، فلتر وسائل التواصل.

**Definition of Done لأي مهمة:** الكود يعمل محلياً + الـ types بدون أخطاء + lint نظيف + الاختبارات المتعلقة تنجح + نصوص الواجهة في ملفات الترجمة + لا بيانات وهمية في الواجهة + تحديث `.env.example` والتوثيق + ملخص قصير لما تم وطريقة الاختبار.

---

## 11. المراحل وتوزيع المهام على الإيجنتس

| المرحلة | المهام | الإيجنت المسؤول | يعتمد على |
|---|---|---|---|
| **P0 التجهيز** | حسم القرارات O1–O6؛ نموذج اتفاقية التاجر وسياسات المتجر؛ قرار الفاتورة وZATCA | ceo، finance-zatca، legal-contracts | — |
| | هوية بصرية + Design tokens + شاشات رئيسية (الرئيسية، المنتج، السلة، Checkout، لوحة admin، لوحة vendor) | designer، design-system-performance | — |
| **P1 الأساس** | المستودع، Prisma schema كامل، migrations، seed (التصنيفات، SUPER_ADMIN، الإعدادات)، Auth + OTP، الصلاحيات، layouts، i18n، RTL | backend-engineer، frontend-engineer | P0 design tokens |
| | CI (lint, typecheck, tests)، بيئات، Supabase، Sentry | devops-engineer | — |
| **P2 المتجر** | الكتالوج، البحث، صفحة المنتج، السلة، الكوبونات، Checkout، Moyasar + webhooks، حساب العميل | frontend-engineer، backend-engineer | P1 |
| | نصوص الواجهة، صفحات السياسات، SEO و JSON-LD | arabic-content-seo | P1 |
| **P3 لوحة الإدارة** | الأرقام، المنتجات، التصنيفات، الباقات، الطلبات، الاسترجاع، العملاء، المحتوى، الإعدادات، الموظفون، سجل العمليات، فاتورة PDF بـ QR | frontend-engineer، backend-engineer | P2 |
| **P4 نظام التجار** | `/sell`، المراجعة، لوحة التاجر، مراجعة المنتجات، تقسيم الطلبات، الـ ledger، دفعات التسوية والتحويل اليدوي، التقارير، الإشعارات | backend-engineer، frontend-engineer | P3 |
| | مراجعة حسابات العمولة والضريبة والـ ledger | finance-zatca | P4 |
| **P4.5 سوق الزل والفصال** | صفحة `/souq` الحية، العروض (Deals) ودورتها، نظام طلب السعر والفصال، PriceLock في السلة، Realtime، صناديق التاجر والعميل، مراقبة الإدارة | backend-engineer، frontend-engineer | P4 |
| | تصميم تجربة السوق والفصال (بطاقة العرض، العداد، مقارنة العروض، صندوق التاجر، جولات الفصال) | designer | P0 |
| | قواعد العمولة على الصفقات وحماية السعر المرجعي للعروض | finance-zatca، legal-contracts | P4 |
| **P5 التكاملات** | Tabby، Tamara، الشحن، SMS، واتساب، Resend، cron jobs | backend-engineer، platform-api-engineer | P4 |
| | الكوكيز، GA4، Pixels، أحداث التحويل | tracking-analytics | P2 |
| **P6 الجودة** | خطة اختبار، e2e، عزل البيانات، الوصولية، الأداء | qa-tester، e2e-automation-engineer، design-system-performance | P5 |
| **P7 النقل والإطلاق** | سكربت الاستيراد من زد، Redirects 301، go-live checklist، backups، المراقبة، ربط الدومين | backend-engineer، devops-engineer | P6 |
| | خطة إطلاق وتسويق لجذب التجار والعملاء | marketing-lead، social-media-manager | P6 |

**بوابات المراجعة (Gates):** المالك يوافق بعد P0 (التصميم والقرارات)، وبعد P2 (تجربة شراء حقيقية sandbox)، وبعد P4 (دورة تاجر كاملة حتى التحويل)، وبعد P4.5 (عرض FLASH حقيقي + صفقة فصال كاملة حتى الدفع)، وقبل P7 (الإطلاق).

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
- أنشئ مشروع Next.js 15 + TypeScript strict حسب قسم 2 و 3.
- اكتب prisma/schema.prisma كاملاً حسب قسم 5 (كل الجداول والـ enums والعلاقات والـ indexes، والمبالغ Int بالهللة).
- migrations + seed: التصنيفات (بشت، فروة، زل، عقال، مباخر، فيس، خاتم ومسابح، سيوف فاخرة، حزام محالة، زعفران سوبر، عود ودهن عود، شالات، سداري، عبايات)، SUPER_ADMIN من متغيرات البيئة، Settings الافتراضية (vatRate 1500، defaultCommission 1000، holdDays 7، payoutCycle WEEKLY، minPayout 10000).
- lib/money.ts و lib/vat.ts مع اختبارات.
- Auth: جوال سعودي + OTP عبر SmsProvider interface (في التطوير يطبع الكود في الـ console)، وإيميل/كلمة مرور للإدارة والتجار.
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
المهمة P3 حسب SPEC.md قسم 7.2: نفّذ كل صفحات /admin ما عدا المالية والتجار (في P4): الأرقام بفلتر فترة، المنتجات (مع قسم المراجعة والاستيراد والتصدير CSV)، التصنيفات بالسحب، الباقات، الطلبات بالطلبات الفرعية والـ Timeline والـ state machine من 6.3، الاسترجاع عبر Moyasar Refund API، العملاء، الكوبونات، التقييمات، المحتوى (البنرات، أقسام الرئيسية، الصفحات)، الإعدادات، الموظفون والصلاحيات، سجل العمليات، فاتورة PDF ضريبية بـ QR (TLV) حسب قرار finance-zatca. كل صفحة محمية بالصلاحية المناسبة.
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
ج) صفحة /souq: أقسام عروض الساعة/اليوم/الأسبوع/التصفية/الباقات/الطلبات المفتوحة، فلاتر وترتيب في الـ URL، عداد تنازلي، "باقي X قطعة"، تحديث لحظي بـ Supabase Realtime، شارة "مباشر" في القائمة.
د) الفصال:
  - features/negotiation/service.ts فيه كل التحولات كـ state machine واحدة (createRequest، selectRecipients، vendorRespond، customerCounter، acceptOffer، expire*)، وكل تحول في transaction ومسجل.
  - selectRecipients = صاحب المنتج + كل تاجر APPROVED عنده VendorCategory للتصنيف ومنتج PUBLISHED فيه، مع استبعاد المعلّقين من الفصال.
  - floorPrice لا يخرج من السيرفر أبداً (اعمل DTOs منفصلة للعميل والتاجر)، و autoAcceptPrice ينشئ عرضاً مقبولاً فوراً.
  - السرية بين التجار: كل استعلام عروض للتاجر يرجع عروضه فقط.
  - acceptOffer ينشئ PriceLock ويحجز المخزون ويغلق باقي العروض ويضيف العنصر للسلة بسعر مقفول؛ الـ checkout يتحقق من صلاحية الـ PriceLock.
  - فلتر وسائل التواصل في الملاحظات (أرقام عربية وإنجليزية، روابط، إيميلات، @handles، wa.me، t.me) مع اختبارات.
  - حدود الاستخدام والـ rate limit حسب O9.
  - Realtime: قناة خاصة لكل PriceRequest (العميل + المستلمين) وقناة صندوق وارد لكل تاجر، مع RLS يمنع الاشتراك في قنوات غيرك.
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
المهمة P5 حسب SPEC.md: Tabby و Tamara (session، redirect، webhook، capture، refund، ويدجت الأقساط)، الشحن عبر ShippingProvider حسب قرار O4 (حساب السعر، إصدار بوليصة لكل SubOrder، webhook التتبع)، SMS حسب O5، WhatsApp Cloud API للإشعارات والسلات المتروكة، Resend بقوالب عربية، cron jobs (إلغاء غير المدفوع، إكمال الطلبات بعد holdDays، تحرير الأرصدة، السلات المتروكة). كل مزود خلف interface ومفاتيحه في .env.
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
حسب SPEC.md: سكربت scripts/import-zid.ts يستورد CSV المصدّر من زد (المنتجات، الخيارات، الصور ورفعها للتخزين، العملاء) مع تقرير أخطاء؛ جدول Redirects 301 للروابط القديمة؛ النشر على new.suqalzl.com ثم التحويل؛ backups يومية واختبار استرجاع؛ Sentry وتنبيهات؛ go-live checklist (مفاتيح Moyasar live، webhooks على الدومين، DNS، SSL، البريد) وقائمة الـ blockers.
```

---

## 14. ما أحتاجه من المالك (قبل/أثناء التنفيذ)

- حساب Moyasar live + المفاتيح، وحسابات Tabby و Tamara للتاجر.
- حسابات مزود الشحن والـ SMS والـ WhatsApp Business.
- تصدير CSV من زد (المنتجات والعملاء) والشعار والصور.
- السجل التجاري، الرقم الضريبي، شهادة الضريبة (موجودة)، والآيبان.
- الموافقة على القرارات المفتوحة O1–O6 وعلى التصاميم.
- مراجعة الاتفاقية والسياسات مع محاسب/مستشار قانوني.
