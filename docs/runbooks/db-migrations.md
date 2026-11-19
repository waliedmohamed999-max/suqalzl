# قاعدة البيانات والـ migrations — دليل تشغيل (backend-engineer)

> آخر تحديث: 2026-11-19 (P1-01d). المرجع: SPEC §2 DB و §4 RLS و §5، و `spikes/p1-00/REPORT.md`.

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

## بعد الـ baseline
- `0011_session_revocation_cron_leases` (P1-01d): جدول `cron_leases` (lease + heartbeat للـ cron)، triggers إلغاء الجلسات (QA-B3/B4) وإشعار `session.revoked` على قناة `realtime_ctl`، ودالة `app.event_bounds()` لـ `event: resync`.
- المولد اتمدّ لـ 0011 لأن الـ engines محجوبة هنا؛ بيعيد كتابة 0001–0010 **بنفس البايتات**. قبل أي commit: `git diff --exit-code prisma/migrations/000*` لازم يطلع فاضي. على جهاز فيه الـ engines: الـ migrations الجديدة بـ `prisma migrate dev --create-only` وبعدين نضيف الجزء اليدوي.
- `prisma/migrate-diff.expected.sql`: المتوقع من `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (12 `DROP INDEX` للفهارس اللي في `prisma/sql/` بس). **مكتوب يدوياً** لأن الـ binary محجوب؛ أول تشغيل حقيقي على الـ CI يأكده أو يستبدله (لو الفرق ترتيب بس). الـ shadow من `SHADOW_DATABASE_URL` في `prisma.config.ts` (Prisma 7 مفيهوش flag).

## التشغيل
```bash
npm run db:migrate:deploy     # Prisma (CI، أي جهاز فيه الـ engines)
npm run db:migrate:local      # بديل محلي بنفس جدول _prisma_migrations ونفس الـ checksum
npm run db:seed               # التصنيفات، المدن، SUPER_ADMIN من env، الإعدادات الافتراضية
npm test                      # unit + اختبارات Postgres الحقيقي (TEST_DATABASE_URL)
```

### بيئة محجوبة (`binaries.prisma.sh` → 403)
| بدل | استخدم | ليه |
|---|---|---|
| `npm run db:seed` (`prisma db seed`) | `npx tsx prisma/seed.ts` | `prisma db seed` بيحمّل الـ schema-engine قبل ما يشغّل الـ seed؛ الـ seed نفسه مش محتاجه (QA P1-00c) |
| `npm run db:migrate:deploy` | `npm run db:migrate:local` | نفس `_prisma_migrations` ونفس الـ checksum |
| `npm install` / `npm ci` (الـ postinstall بيفشل) | `npm ci --ignore-scripts` ثم `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true npx prisma generate` | `prisma generate` مش محتاج الـ engine فعلاً، بس بيحاول ينزله؛ أي ملف تنفيذي في المتغير بيكفي |

## قواعد إلزامية
1. كل جدول جديد: `SELECT app.secure_table('<table>'[, allow_delete][, force]);` في **نفس** الـ migration، مع سياساته. migration `0009_security_hardening` بتفشل لو جدول من غير `ENABLE`+`FORCE`.
2. ممنوع `set_config(..., false)` (مستوى الجلسة) و `$queryRawUnsafe`/`$executeRawUnsafe` (قاعدة lint).
3. ممنوع أي استدعاء لمزود خارجي جوه `withCtx` (SPEC §9).
4. الكائنات اللي Prisma مبيعرفهاش (CHECK، الفهارس الجزئية، exclusion، triggers، RLS، sequences، `search_vector`) في `prisma/sql/`. لو اتشغل `prisma migrate dev` على جهاز فيه الـ engines: **احذف أي `DROP` بيولده لها** قبل الـ commit.
5. `price_history` و `realtime_events` من غير `FORCE` عن قصد: بيكتب فيهم owner عبر دوال `SECURITY DEFINER`، ودور التشغيل ممنوع يكتب فيهم مباشرة.

## مطلوب من devops-engineer
- خطوة الـ CI (P1-03b Diff 3): `SHADOW_DATABASE_URL=… prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` ومقارنتها بـ `prisma/migrate-diff.expected.sql` (من غير `--shadow-database-url` ومن غير `--exit-code`).
- `PRISMA_ENGINES_MIRROR` أو إتاحة `binaries.prisma.sh` في أي بيئة محجوبة.
