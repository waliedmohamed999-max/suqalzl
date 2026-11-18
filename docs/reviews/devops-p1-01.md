# مراجعة devops-engineer: P1-00b (T10) والمراجعة التشغيلية لـ P1-01

> كتبها devops-engineer، وحفظها المنسق كما هي ملخصةً بالبنود (البيئة بتمنع الإيجنتس الفرعيين من كتابة ملفات التقارير).

## الخلاصة
الكود سليم: typecheck و lint نضاف، 195/195 اختبار على Postgres 16، والـ build ناجح من غير قاعدة. لكن الـ CI مش هيطلع أخضر على GitHub بسبب: (1) job الـ e2e هيفشل، (2) `security-ok` هيفشل بسبب 8 ثغرات high في اعتماديات الإنتاج. وخطوة `prisma migrate diff` المقترحة مش هتشتغل بالشكل المكتوب.

**T10: موافق بشروط.**

## التحقق
- clone نضيف للفرع في `/tmp` بمتغيرات `ci.yml`، على Postgres 16.15 مؤقت (`max_connections=100`) بنفس سكربت init.
- `npm ci` ✅ — `prisma validate` ✅ — typecheck/lint ✅ — `npm test` 195/195 ✅ — `npm run build` ✅ (admin/vendor/account مش prerendered) — `next start`: `/api/health` 200، `/api/ready` 503 (storage مش شغال، متوقع)، SSE فيه `x-accel-buffering: no` ومن غير `Content-Encoding`، topic تاجر من غير جلسة 401.
- actionlint / shellcheck / `docker compose config` ✅.
- `npm audit --omit=dev --audit-level=high` ❌ (8 high + 5 moderate).
- `prettier --check`: 3 ملفات devops مش متنسقة (هتتصلح).
- قيد البيئة: `binaries.prisma.sh` 403، فـ `prisma migrate deploy/diff` ما اتشغلوش هنا.

## 1) T10 — موافق بشروط

| النقطة | الحالة | الرأي |
|---|---|---|
| `compress:false` و `X-Accel-Buffering: no` | موجودين ومتجربين | موافق |
| اتصال LISTEN مباشر | `pg-hub.ts` بيستخدم `REALTIME_DATABASE_URL` ولو فاضي بيرجع لـ `DATABASE_URL` بصمت | **شرط 1:** إلزامي في staging/prod ويفشل وقت التشغيل لو ناقص |
| اكتشاف موت اتصال LISTEN | `keepAlive: true` بس (التأخير الافتراضي ساعتين) | **شرط 2:** ping كل 30 ثانية أو `keepAliveInitialDelayMillis: 30000` |
| مهلة الطلب > 15 دقيقة | `REALTIME_MAX_LIFETIME_SECONDS=900`، heartbeat 25 ثانية | موافق؛ إعدادات الاستضافة تتحدد في P7 |
| قفل NOTIFY وقت COMMIT | الحمولة ليها حد 7000 byte | موافق. **شرط 3 (devops):** تنبيه لما `pg_notification_queue_usage() > 0.1`، وقياس في اختبار الحمل P6 |
| cron مسح `realtime_events` | يومياً، احتفاظ 24 ساعة | موافق. ملاحظة: عميل `Last-Event-ID` أقدم من الاحتفاظ أو >1000 حدث يفقد أحداث بصمت → يتبعتله `event: resync` |
| دوري القاعدة | migrator مالك، app من غير BYPASSRLS | موافق. `app.runtime_roles()` يتحول لـ group role صريح لاحقاً |
| عدد الاتصالات | `DB_POOL_MAX` + 1 LISTEN + اتصال لكل cron | المعادلة: `max_instances × (DB_POOL_MAX + 2) + jobs` < 80% |

## 2) المشاكل بالأولوية

**P0 — بتمنع الـ CI:**
1. job الـ e2e: `@playwright/test` مش في `package.json`، ومفيش config، و `tests/e2e/` فاضي → يفشل على GitHub. (Diff 1)
2. `security-ok`:
   - **nodemailer 7.0.13** — ثغرات high (SSRF، قراءة ملفات، DoS) في كود بيشتغل فعلاً → **backend: ترقية لـ nodemailer@10.6.0** (مش هيتحط في الاستثناءات).
   - **picomatch ≤4.0.7** (ReDoS) — مفيش نسخة مصلّحة؛ من أدوات build/dev.
   - **postcss** جوه next@15.5.29 — وقت الـ build بس؛ backend يجرب `overrides: { next: { postcss: "8.5.33" } }`.
   - بوابة بقائمة استثناءات ليها تاريخ انتهاء (Diff 2). OSV-Scanner معلوماتي لحد P6.

**P1 — الـ migrations:**
3. Prisma 7 مفيهوش `--shadow-database-url`؛ الـ shadow من `prisma.config.ts`. و `--exit-code` هيرجع 2 دايماً بسبب ~14 index في `prisma/sql/` مش في الـ schema → المقارنة بملف متوقع (Diff 3).
4. توافق `apply-migrations.ts` مع Prisma مش متختبر → خطوة interop (Diff 3).

**P1 — تشغيل (backend):**
5. قفل الـ cron بـ `pg_try_advisory_lock` على مستوى الجلسة مش آمن مع pooler → lease في جدول بـ `locked_until`.
6. مفيش heartbeat لكل cron (`lastRunAt`, `lastSuccessAt`, `lastError`) → جدول (تغيير schema).
7. شرطي T10 (1 و 2) وإشارة `resync`.
8. `asSystem`: الـ `finally` بيعمل `set_config` على transaction ملغية والخطأ الجديد بيغطي على الأصلي.

**P2 — devops (بعد الموافقة):**
9. تنسيق prettier للـ 3 ملفات.
10. `dev-cron.mjs` بيتجاهل `CRON_JOBS[].schedule`، و `DEV_CRON_JOBS` فاضي في `.env.example`.
11. `/api/health` بيرجع `commit:null` → `GIT_COMMIT_SHA` وقت الـ build.
12. `.nvmrc` = 24 والتجارب على Node 22 → نثبّت واحد لو حصل اختلاف.

## 3) تعديلات الـ CI المقترحة (ما اتطبقتش)

**Diff 1 — `ci.yml`:** e2e يتشغل بس لو `test:e2e` + `playwright.config.*` + `@playwright/test` في الاعتماديات.

**Diff 2 — `security.yml`:** `npm audit --omit=dev --json` + `.github/scripts/audit-gate.mjs` + `.github/audit-allowlist.json` (picomatch GHSA-fc5q-39xc-vjpf، postcss GHSA-6g55-p6wh-862q و GHSA-r28c-9q8g-f849، كلها لحد 2026-12-31)، و OSV-Scanner `continue-on-error: true` لحد P6.

**Diff 3 — `ci.yml` job unit:** خطوة interop (`db:migrate:local` ثم `prisma migrate deploy` لازم يقول "No pending migrations")، وخطوة `prisma migrate diff --from-migrations … --to-schema … --script` مقارنة بـ `prisma/migrate-diff.expected.sql` (المرحلة 1 تحذير، المرحلة 2 إلزامية). مطلوب من backend: `shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL` في `prisma.config.ts`.

> النص الكامل للـ diffs موجود في تقرير devops-engineer للمهمة، وهيتطبق في مهمة devops منفصلة.

## التسليم
- **backend-engineer:** nodemailer 10.6.0، override postcss أو Sentry 11، `shadowDatabaseUrl`، `migrate-diff.expected.sql`، شرطي LISTEN، lease و heartbeat للـ cron، `event: resync`، إصلاح `asSystem`.
- **qa-tester:** بعد تطبيق الـ diffs، أول CI على GitHub؛ وفي P6 اختبار حمل NOTIFY وقطع اتصال LISTEN.
- **CEO:** موافقة على مهمة devops لتطبيق Diffs 1–3 وبنود P2.
