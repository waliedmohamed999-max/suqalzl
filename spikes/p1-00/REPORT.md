# P1-00 Spike — تقرير backend-engineer

> كتبه backend-engineer، وحفظه المنسق كما هو (البيئة بتمنع الإيجنتس الفرعيين من كتابة ملفات التقارير).
> النتيجة: **54/54 اختبار نجحوا في 3 تشغيلات كاملة متتالية**، و `tsc` نظيف و `next build` ناجح.

## الملخص

| # | النتيجة | القرار |
|---|---|---|
| 1. العزل | تاجر A حاول بـ IDs تاجر B يقرا ويعدّل ويضيف وينقل الملكية: اترفض في الطبقتين. كود فيه bug عن قصد (نسي `where vendorId`) ما سرّبش حاجة بفضل RLS. السياق ما بيتسربش بين طلبات على نفس الاتصال. التكلفة +1.0 لحد 1.3 ms لكل طلب | الطبقتين معتمدين: الخدمة أساسية، و RLS بـ `SET LOCAL` طبقة رفض تانية، ولو مفيش سياق مفيش بيانات. **T10 محسوم من ناحية backend** |
| 2. SSE | 13 حالة صلاحية صح. تاجر ما استلمش أي ID لتاجر تاني، ومفيش أي سعر ولا `floorPrice` في أي رسالة. التأخير p95 بين 5.6 و 7.2 ms، وتوزيع حدث واحد على 500 اتصال خلص في 44 لحد 67 ms | **NOTIFY مع جدول outbox**، مش NOTIFY لوحده. الحدث بيتبعت بعد الـ COMMIT بس، واللي فات بيترجع بـ `Last-Event-ID`، ومفيش حدث بيضيع لو اتصال LISTEN وقع |
| 3. المخزون | 60 جولة × 50 طلب متزامن على آخر 3 قطع: **3 نجحوا بالظبط في كل جولة**. النسخة الساذجة (SELECT ثم UPDATE) باعت 50 مقابل 3. مفيش deadlock، والانتهاء والاستهلاك والإلغاء المتزامنين حافظوا على القيود | معتمد زي C3 |

**مشاكل وملاحظات:**
- Docker Hub محجوب (403) في بيئة الـ sandbox؛ استُخدم PostgreSQL 16.15 محلي. `docker-compose.yml` ما اتجربش.
- binary الـ schema-engine بتاع Prisma محجوب: `prisma generate` شغال و `prisma migrate` لأ. الـ migrations اتكتبت يدوياً بنفس شكل مجلدات Prisma واتطبقت بـ `scripts/migrate.ts`. على جهاز المالك/CI المفروض يشتغلوا عادي.
- أهم قيد تشغيلي: كل طلب transaction ماسكة اتصال طول وقتها، فممنوع أي استدعاء لمزود خارجي جوه `withCtx`.
- RLS هنا بيحمي من الـ bugs مش من SQL injection، علشان كده ممنوع `$queryRawUnsafe` و `$executeRawUnsafe`.
- محتاج مراجعة devops-engineer (المهمة مشتركة، ونفذها backend لوحده).
- محتاج قرار المالك: 2FA، وصياغة سطر التقسيط مع تابي وتمارا.
- محتاج قرار الـ CEO: العنصر في السلة لما مهلة PriceLock تخلص، وأزرار "نبّهني"، وتصنيف الخصائص للفلاتر.

## 1. البيئة
- Node 22.23، Next.js 15.5.29، React 19.1، Prisma 7.10.1 مع `@prisma/adapter-pg`، `pg` 8.23.1، Zod 4.6.7، Vitest 3.2.7، TypeScript 5.9.3.
- Postgres 16.15 محلي على المنفذ 55432، و `max_connections=200`.
- مطلوب من devops-engineer: إتاحة `binaries.prisma.sh` (أو `PRISMA_ENGINES_MIRROR`) و registry لـ `postgres:16` في أي بيئة محجوبة.

## 2. التشغيل
```bash
cd spikes/p1-00 && cp .env.example .env && npm install
npm run db:up        # أو أي Postgres 16 على المنفذ 55432
PRISMA_SCHEMA_ENGINE_BINARY=/path/to/any-file npm run generate   # في البيئة المحجوبة بس
npm test             # next build، بعدين drop + bootstrap + migrate، بعدين 4 ملفات اختبار
```
- `tests/realtime.test.ts` بيشغّل `next start` حقيقي على المنفذ 3999 ويقفله في الآخر.
- اختبار يدوي: `curl -N "http://127.0.0.1:3999/api/realtime/stream?topics=souq"` → `retry` ثم `ready` ثم `: hb`.
- متغيرات البيئة: `ADMIN_DATABASE_URL`، `DATABASE_URL` (migrations)، `APP_DATABASE_URL` (تشغيل)، `APP_DB_POOL_MAX`، `SPIKE_SESSION_SECRET`، `SSE_HEARTBEAT_MS`، `SSE_MAX_LIFETIME_MS`.

## 3. العزل بين التجار

**التصميم:**
- دوران: `suq_owner` مالك الجداول ويشغّل الـ migrations بس. `suq_app` دور التشغيل: `NOBYPASSRLS`، مش مالك، ومن غير `DELETE` ولا `TRUNCATE`.
- `withCtx(ctx, fn)`: transaction واحدة لكل طلب، تبدأ بـ `set_config('app.role'|'app.vendor_id'|'app.user_id', …, true)`. السياق من الجلسة الموقّعة بس.
- الطبقة 1 (الخدمة): `vendorScope` و `customerScope`؛ كل استعلام مفلتر بالـ id اللي في الجلسة؛ المدخلات `.strict()`؛ "مش موجود" و"مش بتاعك" نفس الخطأ.
- الطبقة 2 (RLS): `ENABLE` و `FORCE` على كل الجداول، مع سياسات staff/vendor/customer/public و `WITH CHECK`. `variant_negotiation_settings` مفيهوش أي سياسة للعميل.
- رفع الصلاحية: `asSystem()` صريح، واتستخدم في 3 أماكن بس (توزيع الطلب على المستلمين، تغيير حالة الطلب، حجز المخزون).

**النتائج (23 اختبار):**

| الاختبار | النتيجة |
|---|---|
| من غير سياق | 0 صف، والإدراج مرفوض |
| A يعدّل منتج B | 0 صف |
| A يعدّل من غير `WHERE` | 2 صف بس (بتوعه) |
| A يضيف منتج لـ B أو ينقل منتجه لـ B | مرفوض |
| الحدود السرية | كل تاجر يشوف صفه بس. العميل والزائر: 0 |
| العروض والخيوط | A: 0/0. B: 1/1. العميل 1: 1/1. العميل 2: 0/0 |
| كود بـ bug عبر Prisma | ما سرّبش حاجة |
| نفس الاتصال بعد طلب A (pool باتصال واحد) | السياق فاضي، 0 صف |
| مقارنة عكسية: `set_config` على مستوى الجلسة | بيتسرب، فبقى ممنوع |
| جدول `realtime_events` مباشرة | `permission denied` |

**التكلفة (متوسط ms):** `findFirst` 0.91–1.04 — `$transaction` مع `findFirst` 1.23–1.81 — `withCtx` مع `findFirst` 1.99–2.22.

**نقاط لـ P1-01:**
- RLS بيحمي من الـ bugs بس، مش من الـ injection.
- سياسة الكتالوج العام معناها إن RLS مش هيمسك bug **قراءة** منتجات تجار تانيين المنشورة في لوحة التاجر؛ اختبارات طبقة الخدمة إلزامية.
- `FORCE` بيطبق RLS على المالك نفسه، فالـ seed يمشي عبر `suq_app` في سياق `system`.
- ممنوع أي استدعاء خارجي جوه `withCtx`.
- متوافق مع pooler في وضع transaction.
- الآيبان محمي بـ `omit` و DTO، مش بـ RLS.
- الـ IDs `gen_random_uuid()` من القاعدة.

## 4. SSE وسرية الفصال

**مسار الحدث:**
1. الخدمة تنادي `publish(tx, …)` جوه transaction العمل، والحمولة تعدّي على Zod `.strict()`.
2. `app.publish_event()` (SECURITY DEFINER) يكتب في `realtime_events` ويعمل `pg_notify`؛ الإشعار يوصل بعد الـ COMMIT بس.
3. `PgListenHub` في Next.js: اتصال `pg` واحد بيعمل LISTEN ويوزّع في الذاكرة حسب الـ topic.
4. `GET /api/realtime/stream?topics=`: الصلاحية كلها أو لا شيء (400/401/403 من غير body، أقصى 10 topics)؛ الترتيب subscribe → buffer → replay → flush → `ready`؛ heartbeat كل 25 ثانية؛ السيرفر يقفل الاتصال كل 15 دقيقة علشان الصلاحية تتراجع؛ بعد رجوع اتصال LISTEN الـ streams تعيد إرسال اللي فاتها.

**القنوات:** `souq`، `pr:{requestId}:customer`، `pr:{requestId}:vendor:{vendorId}`، `vendor:{vendorId}:inbox`، `user:{userId}` (UUID الطلب، مش رقم `PR-`).

**ليه مش البدائل:** NOTIFY لوحده بيضيّع الأحداث ومفيهوش replay؛ Redis بنية زيادة و NOTIFY بيوصل لكل الـ instances؛ Polling بطيء؛ Centrifugo لاحقاً خلف نفس الـ interface.

**النتائج (21 اختبار):**
- السيناريو الكامل (طلب، عرضين، رد بسعر، قبول): frames العميل 7، خيط A 4، خيط B 3، صندوق C صفر.
- السرية: مفيش IDs متبادلة بين A و B. A (اللي خسر) استلم `{status:"CLOSED"}` بس. مفيش أي سعر أو رقم سري في أي frame.
- الـ API: صاحب المنتج استلم `belowYourFloor` كـ boolean، والمنافس `null`، والعميل 2 وتاجر C أخدوا 404.
- التسليم: الـ rollback ما سلّمش حاجة؛ `Last-Event-ID` رجّع الـ 3 أحداث اللي فاتت بس؛ لما اتصال LISTEN اتقفل بالقوة الـ 3 أحداث وصلوا بالترتيب.
- الأداء: p50 بين 3.4 و 3.7 ms، p95 بين 5.6 و 7.2 ms؛ التوزيع على 500 اتصال: آخر واحد خلال 44–67 ms.

**نقاط لـ devops-engineer:** اتصال LISTEN مباشر مش من pooler؛ `compress: false` في Next.js وهيدر `X-Accel-Buffering: no`؛ مهلة الطلب في الاستضافة أطول من 15 دقيقة؛ NOTIFY بياخد قفل عام وقت الـ COMMIT (يتأكد في اختبار الحمل P6)؛ `realtime_events` محتاج cron يمسح كل 24 ساعة (P5-03)؛ stream واحد لكل تبويب.

## 5. حجز المخزون
- `reserve`: ترتيب السطور حسب `variantId` ثم `UPDATE … WHERE stock - reserved_stock >= q`؛ لو صفر صفوف `OUT_OF_STOCK` والسلة كلها ترجع.
- `consume`: يفشل لو الحجز انتهى (مسار `PAID_NEEDS_REVIEW`).
- `releaseExpired`: `FOR UPDATE SKIP LOCKED`.
- قيود في القاعدة: `reserved_stock <= stock` و `stock >= 0`.

**النتائج (10 اختبارات):** 60 جولة × 50 طلب: 3 نجحوا بالظبط كل جولة، 47 `OUT_OF_STOCK`، صفر أخطاء تانية. النسخة الساذجة: 50 حجز مقابل 3 قطع. 40 سلة بترتيب معاكس من غير deadlock. السباقات (consume ضد release ضد 4 cron بالتوازي) حافظت على كل القيود.

**ما اتجربش:** حصة FLASH و `IN_CHECKOUT` (في P4.5).

## 6. الـ Migrations

| الاسم | المحتوى | ملاحظة لـ P1-01 |
|---|---|---|
| `0001_spike_init` | الجداول والـ sequence | — |
| `0002_inventory_reservations` | الـ CHECKs والفهارس الجزئية | — |
| `0003_security_rls` | الأدوار والسياسات | إعادة كتابة `0009_security_hardening` على Postgres عام |
| `0004_realtime_outbox` | دوال الـ outbox | يبقى `0010_realtime_outbox` |

**قاعدة:** RLS يتضاف مع كل جدول في نفس الـ migration اللي بيعمله.

## 7. تعديلات مقترحة على SPEC (اقتراح بس)
- §4: نص قرار RLS النهائي: `FORCE`، دور تشغيل `NOBYPASSRLS`، `withCtx` بس، ممنوع `set_config` على مستوى الجلسة و `*RawUnsafe`.
- §2 DB: دوران `owner` و `app`، الـ seed عبر `app`، و `gen_random_uuid()`.
- §2 و §6.8: outbox وعقد `/api/realtime/stream`، القنوات بـ `requestId`، `compress: false`، اتصال LISTEN مباشر.
- §5.1: إضافة `RealtimeEvent` مع cron مسح.
- §9: ممنوع استدعاء خارجي جوه transaction الطلب.
- §10: اختبارات الـ spike تتنقل للـ CI على Postgres حقيقي.
- §11 P1-03: سكربت init للأدوار، ومصادر الـ binaries والـ images.

## 8. إجابات على أسئلة frontend-engineer

**[قرار المالك]** = محتاج موافقة المالك عبر الـ CEO. **[CEO]** = قرار نطاق أو منتج. الباقي قرار تقني.

1. **2FA [قرار المالك]:** التوصية إلزامي للإدارة ولـ `VENDOR_OWNER` بنفس محرك OTP، مع "تذكر الجهاز 30 يوم" للتجار. `staffLogin` يرجع `requires2fa`.
2. **عقود Zod:** موافق، المدخلات والمخرجات `.strict()`، والمخطط يتسلم قبل كل مرحلة. تقييم التاجر وشاراته أعمدة مجمعة يحدّثها job، و `iconKey` وحقول البانر موافق. `shippingClass` تابع لـ O4. تصنيف الخصائص للفلاتر [CEO]، والإطلاق بفلاتر السعر والتاجر والأعلام.
3. **`previewOffer`:** يرجع `itemsNet` و `commission` و `vendorNet` و `vendorVat` و `vendorPayable` و `belowYourFloor`، و `yourFloorPrice` لـ variant تاجر الجلسة بس؛ في الصندوق المنافس `null`. الصياغة تتراجع من finance-zatca.
4. **SSE (اتنفذ واتختبر):** العقد في القسم 4. قناة `souq` تحمل بيانات عامة `deal.updated {dealId,left,status,endsAt,version}`؛ القنوات الخاصة IDs و status و version بس؛ الأحداث `request.created` و `thread.changed` و `request.changed` و `notification.created`؛ الـ topic بـ UUID، و `request.created` بدل `inbox.changed`؛ الجلسة بالـ cookie علشان `EventSource`.
5. **Moyasar Form:** الرسمي جوه تخطيطنا، `language:'ar'`، وما نرسمش حقول البطاقة. Apple Pay بالزر الرسمي مع تسجيل الدومين الفرعي بالظبط. STC Pay بـ OTP و redirect. حدود تخصيص الشكل تتأكد في sandbox في P2-03.
6. **سطر التقسيط [قرار المالك جزئياً]:** نص مننا من `bnpl:{provider,eligible,installments,installmentAmount}|null`، يظهر بس لو التأهيل نجح وتحت السقف. هل المزود بيفرض صياغة أو ويدجت؟ سؤال للمزود في P8.
7. **انتهاء مهلة PriceLock [CEO]:** العنصر يتحول لعنصر عادي بالسعر الحالي مع بانر يوضح الفرق، أو "غير متاح"، وما يتمسحش من غير ما العميل يعرف. الحذف بـ dialog تأكيد ثم `release()`. مدينة الشحن: آخر عنوان، وإلا `defaultShippingCity`.
8. **الجولات:** `rounds:{customerLeft,vendorLeft}`. القبول مش مسموح وفيه رد معلّق من العميل (الواجهة تعرض "اسحب ردي"). كل action ياخد `expectedVersion` ويرجع `STALE` لو اتغير.
9. **فلتر التواصل:** `lib/contact-filter.ts` نقي ومشترك، يطبّع الأرقام العربية، والسيرفر هو الحَكَم.
10. **"نبّهني" [CEO أو المالك]:** التوصية إخفاء الأزرار في الإطلاق.
11. **إدخال السعر:** العميل بالريال الصحيح، والـ API بالهللة دايماً، مع تحقق `% 100` لمدخلات العميل.
12. **الصور المشتقة:** موافق مبدئياً؛ job يولّد AVIF و WebP و loader مخصص، مع devops.

**ملاحظتين:** المهلة الفعلية للعرض = `min(offer.expiresAt, request.expiresAt)`. النص "لا يقل عن حدك الأدنى" (الـ CHECK `>=`).

## 9. التسليم
- **qa-tester:** الـ 54 اختبار أساس سيناريو 5 و 8؛ المقارنة العكسية تفضل؛ اختبار التسريب يتعمم على كل route؛ اختبار الحمل في P6.
- **frontend-engineer:** التنفيذ المرجعي في `route.ts` و `events.ts`؛ ما تعتمدش على بيانات في القنوات الخاصة؛ `belowYourFloor` قيمته `boolean|null`.
- **flutter-engineer:** نفس الـ SSE بـ Bearer و `Last-Event-ID`؛ المبالغ `int` بالهللة والتواريخ UTC ISO.
- **devops-engineer:** القسم 1، الـ pooler، اتصال LISTEN، الـ buffering، أدوار `docker compose`، وموافقة T10.

## الملفات (تحت `spikes/p1-00/`)
- الإعداد: `package.json`، `docker-compose.yml`، `.env.example`، `prisma.config.ts`، `next.config.mjs`، `vitest.config.ts`، `tsconfig.json`
- الـ schema والـ migrations: `prisma/schema.prisma`، `prisma/migrations/0001_spike_init` … `0004_realtime_outbox`
- السكربتات: `scripts/bootstrap-db.ts`، `scripts/migrate.ts`
- المكتبة: `src/lib/{db,context,session}.ts`، `src/lib/realtime/{events,publish,provider,pg-hub,authorize}.ts`
- الخدمات: `src/features/negotiation/{schema,service}.ts`، `src/features/inventory/reservations.ts`
- الـ routes: `src/app/api/realtime/stream/route.ts`، `src/app/api/requests/[id]/route.ts`، `src/app/api/vendor/requests/[id]/route.ts`
- الاختبارات: `tests/{isolation.service,isolation.rls,stock,realtime}.test.ts`، `tests/{helpers,sse-client,global-setup}.ts`
