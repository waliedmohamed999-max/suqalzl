# قاعدة البيانات والـ migrations — دليل تشغيل (backend-engineer)

> آخر تحديث: 2026-11-18 (P1-01). المرجع: SPEC §2 DB و §4 RLS و §5، و `spikes/p1-00/REPORT.md`.

## الأدوار
| الدور | المتغير | الاستخدام |
|---|---|---|
| `suqalzl_migrator` (مالك الجداول) | `DIRECT_URL` | `prisma migrate deploy` و `npm run db:migrate:local` فقط |
| `suqalzl_app` (تشغيل، `NOBYPASSRLS`، مش مالك) | `DATABASE_URL` | التطبيق والـ seed والـ jobs، دايماً عبر `withCtx` |

- أسماء الـ SPEC (`suq_owner`/`suq_app` و `APP_DATABASE_URL`) من الـ spike؛ في المشروع بنستخدم أسماء devops (`suqalzl_*` و `DATABASE_URL`/`DIRECT_URL`) لأن الـ CI و compose مبنيين عليها. نفس المعنى بالظبط.
- الـ migrations مبتكتبش اسم دور التشغيل: `app.runtime_roles()` بيلاقيه من صلاحية `USAGE` على schema `public` اللي بيديها سكربت الـ init.

## الـ baseline (0001–0010)
- `prisma/migrations/NNNN_*/migration.sql` = `prisma/sql/NNNN_*.pre.sql` + DDL متولد من `schema.prisma` + `prisma/sql/NNNN_*.sql` (RLS والـ CHECK والـ triggers).
- المولد: `npx tsx scripts/db/generate-baseline-migrations.ts` (بنفس تسميات Prisma: `_pkey` و `_key` و `_idx` و `_fkey`). **يُستخدم للـ baseline بس قبل ما أي بيئة تطبقه.** بعد كده أي تغيير = migration جديدة.
- السبب: binary الـ schema-engine بتاع Prisma محجوب في بيئة العمل (403 من `binaries.prisma.sh`)، فـ `prisma migrate dev/diff` مش شغالين هنا. على الـ CI وأي جهاز عادي `prisma migrate deploy` شغال على نفس المجلدات.
- `tests/db/schema-drift.test.ts` بيقارن القاعدة المطبقة بالـ DMMF (الجداول والأعمدة والأنواع والـ nullability والـ enums).

## التشغيل
```bash
npm run db:migrate:deploy     # Prisma (CI، أي جهاز فيه الـ engines)
npm run db:migrate:local      # بديل محلي بنفس جدول _prisma_migrations ونفس الـ checksum
npm run db:seed               # التصنيفات، المدن، SUPER_ADMIN من env، الإعدادات الافتراضية
npm test                      # unit + اختبارات Postgres الحقيقي (TEST_DATABASE_URL)
```

## قواعد إلزامية
1. كل جدول جديد: `SELECT app.secure_table('<table>'[, allow_delete][, force]);` في **نفس** الـ migration، مع سياساته. migration `0009_security_hardening` بتفشل لو جدول من غير `ENABLE`+`FORCE`.
2. ممنوع `set_config(..., false)` (مستوى الجلسة) و `$queryRawUnsafe`/`$executeRawUnsafe` (قاعدة lint).
3. ممنوع أي استدعاء لمزود خارجي جوه `withCtx` (SPEC §9).
4. الكائنات اللي Prisma مبيعرفهاش (CHECK، الفهارس الجزئية، exclusion، triggers، RLS، sequences، `search_vector`) في `prisma/sql/`. لو اتشغل `prisma migrate dev` على جهاز فيه الـ engines: **احذف أي `DROP` بيولده لها** قبل الـ commit.
5. `price_history` و `realtime_events` من غير `FORCE` عن قصد: بيكتب فيهم owner عبر دوال `SECURITY DEFINER`، ودور التشغيل ممنوع يكتب فيهم مباشرة.

## مطلوب من devops-engineer
- إضافة خطوة في الـ CI: `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --shadow-database-url ... --exit-code` (بتتأكد إن الـ SQL المكتوب مطابق للـ schema من ناحية Prisma).
- `PRISMA_ENGINES_MIRROR` أو إتاحة `binaries.prisma.sh` في أي بيئة محجوبة.
