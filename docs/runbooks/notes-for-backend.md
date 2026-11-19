# ملاحظات من devops-engineer لـ backend-engineer (P1-03 ← P1-01)

> **الحالة:** مقترحات. أي بند تختلف فيه اكتب ردك هنا أو في ملفك، وأنا أظبط البنية عليه. أنا ما لمستش `src/` ولا `package.json` ولا `spikes/`.
> **آخر تحديث:** 2026-11-19 (P1-03b، §10)

## 1. أسماء الـ npm scripts (الـ CI و `dev-setup.sh` و compose بيعتمدوا عليها)

| السكربت | المتوقع | مين بيستخدمه |
|---|---|---|
| `dev` | `next dev` (يقبل `--hostname` و `--port`) | compose `app` |
| `build` | `next build` | CI `build`, `e2e` |
| `lint` | ESLint (flat config)، **بدون** `--fix` | CI `lint` |
| `typecheck` | `tsc --noEmit` | CI `typecheck` |
| `test` | `vitest run` (مش watch) | CI `unit` |
| `test:e2e` | `playwright test` (الـ `webServer` بتاع Playwright يشغّل `npm run start` لو مفيش حاجة على 3000) | CI `e2e` |
| `db:migrate:deploy` | `prisma migrate deploy` باستخدام `DIRECT_URL` | CI، `dev-setup.sh`، compose |
| `db:seed` | `prisma db seed` / `tsx prisma/seed.ts` | CI `e2e`، `dev-setup.sh`، compose |

- لازم `package-lock.json` (الـ CI بيستخدم `npm ci`). مدير الحزم **npm** (`devops.md` §6.6). لو عايز pnpm قولّي.
- Node: `.nvmrc` = **24** (LTS). لو عندك سبب لـ 22 غيّره، والـ CI و compose (`node:24-bookworm-slim`) يتغيروا معاه.
- أي job سكربته مش موجود بيتعمله skip، فمش لازم تعملهم كلهم مرة واحدة.

## 2. قاعدة البيانات

- **دوران:** `DATABASE_URL` = `suqalzl_app` (DML بس، مش مالك، NOBYPASSRLS)، و `DIRECT_URL` = `suqalzl_migrator` (مالك الـ schema). في Prisma: `directUrl` للـ migrations (أو `prisma.config.ts` في Prisma 7). **التطبيق والـ seed لازم ما يتصلوش بـ `postgres`**، وإلا الـ RLS بيتخطى ونتيجة spike P1-00 تبقى مضللة.
- **الجداول بيملكها الـ migrator**، فهو بيتخطى RLS. لو عايز الـ RLS يطبق على المالك كمان استخدم `ALTER TABLE ... FORCE ROW LEVEL SECURITY` في الـ migration.
- **الامتدادات موجودة مسبقاً** في dev و test و `template1`: `btree_gist`، `citext`، `pg_trgm`. في migration 0007 استخدم `CREATE EXTENSION IF NOT EXISTS btree_gist` عشان تشتغل في البيئات الجاية كمان. لو محتاج امتداد تاني (مثلاً `unaccent`) قولّي أضيفه للـ init.
- **Default privileges:** أي جدول/sequence/function يعمله الـ migrator بياخد عليه `suqalzl_app` صلاحيات DML/USAGE/EXECUTE تلقائياً. لو عملت schema غير `public` محتاج GRANT صريح في الـ migration.
- **Timeouts على دور التطبيق:** `statement_timeout=15s`، `idle_in_transaction_session_timeout=30s`، `timezone=UTC`. لو في query في الـ seed أو الـ jobs محتاجة أطول، اعمل `SET LOCAL statement_timeout` جوه الـ transaction.
- **Pool:** `DB_POOL_MAX` (5) و `DB_POOL_TIMEOUT_MS` (10000) متغيرات منفصلة، مش query params في الـ URL، عشان تشتغل مع Prisma 6 (`connection_limit`/`pool_timeout`) أو Prisma 7 + `@prisma/adapter-pg` (إعدادات `pg.Pool`). اربطهم في `lib/db.ts`.
- **Realtime:** `REALTIME_DATABASE_URL` (فاضي = `DATABASE_URL`) لاتصال `pg` المخصص لـ `LISTEN`. لازم ما يعديش على pooler بوضع transaction.
- **الاختبارات:** `TEST_DATABASE_URL` / `TEST_DIRECT_URL` على `suqalzl_test`. الـ CI بيعمل `db:migrate:deploy` على `suqalzl_test` قبل `npm test`، وبيضبط `DATABASE_URL` و `DIRECT_URL` على قاعدة الاختبار.

## 3. التخزين (`StorageProvider`)

- S3-compatible بـ AWS SDK v3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)، `forcePathStyle: S3_FORCE_PATH_STYLE`، `region: S3_REGION`.
- **عميلين:** واحد بـ `S3_ENDPOINT` للعمليات من السيرفر، وواحد بـ `S3_PUBLIC_ENDPOINT` **لتوقيع** الروابط اللي المتصفح هيفتحها (التوقيع بيشمل الـ host). على الجهاز الاتنين واحد؛ جوه Docker مختلفين.
- رابط الصورة العامة: `${S3_PUBLIC_ENDPOINT}/${S3_BUCKET_PUBLIC}/<key>` (path-style). في الإنتاج غالباً CDN، فخليه دالة `publicUrl(key)` في الـ provider مش string في الكود.
- الـ bucket الخاص: presigned GET/PUT بـ `S3_SIGNED_URL_TTL_SECONDS`، و validate النوع والحجم على السيرفر قبل إصدار PUT.

## 4. الـ Jobs (`JobScheduler`)

- الـ trigger المحلي (`scripts/dev-cron.mjs` وخدمة `cron` في compose) بيبعت `POST /api/cron/<job>` بـ `Authorization: Bearer ${CRON_SECRET}`، و body `{}`، كل `DEV_CRON_INTERVAL_SECONDS`، للأسماء في `DEV_CRON_JOBS` (slug: `a-z0-9-`).
- المطلوب منك: الـ handler يتحقق من الـ secret بمقارنة constant-time، ويرجع 2xx بسرعة، والـ lease/heartbeat/idempotency حسب `devops.md` §6.5. الـ trigger ممكن يبعت نفس الـ job مرتين في نفس الوقت، وده لازم يكون آمن.
- **مقترح:** `GET /api/health` (التطبيق شغال + commit SHA) و `GET /api/ready` (DB + Storage). الـ healthcheck بتاع compose `app` بيستخدم `/api/health`.

## 5. الإيميل والـ SMS والواتساب

- `EMAIL_PROVIDER`: `smtp` (Mailpit في التطوير، `SMTP_*`)، `resend`، `console`. **محتاج adapter بـ SMTP** (nodemailer) جنب Resend عشان Mailpit، لأن Mailpit ما بيدعمش Resend API.
- `SMS_PROVIDER` و `WHATSAPP_PROVIDER` افتراضياً `console` (SPEC §2: الـ OTP بيتطبع في الـ console).
- `OTP_HMAC_SECRET`: مقترح لتخزين الـ OTP كـ `HMAC-SHA256(secret, phone + code)` بدل hash من غير مفتاح (6 أرقام بس = 10^6 احتمال، فأي hash من غير سر بيتكسر في ثانية لو القاعدة اتسربت).

## 6. الدفع

- `PAYMENTS_MODE=sandbox|live`. **مقترح fail-safe:** عند التشغيل، ارفض `live` لو `APP_ENV != production`، وارفض أي مفتاح يبدأ بـ `sk_live_`/`pk_live_` في غير `live`.
- أسماء المتغيرات في `.env.example` §8. مفاتيح الـ publishable/public ليها `NEXT_PUBLIC_` لأنها بتتحط في المتصفح.

## 7. الأسرار والتشفير

- `FIELD_ENCRYPTION_KEY` (32 بايت base64، AES-256-GCM) + `FIELD_ENCRYPTION_KEY_ID` يتخزن جنب كل ciphertext + `FIELD_ENCRYPTION_PREVIOUS_KEYS` (`id:key,...`) للفك بس أثناء التدوير. منفصل عن `AUTH_SECRET`.
- `AUTH_SECRET` / `AUTH_URL`: لو اخترت Better Auth وهو بيقرأ `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`، إما تعمل mapping في `lib/auth.ts` أو تغيّر الأسماء في `.env.example` (قولّي عشان الـ CI و `dev-setup.sh`).
- **مقترح:** تحقق من الـ env بـ Zod عند التشغيل (`lib/env.ts`)، والـ CI بيوفر قيم اختبار لكل المتغيرات الإلزامية. لو أضفت متغير إلزامي جديد، ضيفه في `.env.example` وفي `env:` بتاع `.github/workflows/ci.yml`.

## 8. Sentry (P1-03 بند متبقي، الكود عندك)

- مفيش DSN في التطوير = Sentry مقفول. لما تضيفه: `sendDefaultPii: false`، و `beforeSend`/`beforeBreadcrumb` يمسحوا الجوال (`\+?9665\d{8}` والأرقام العربية)، والإيميل، والعنوان، والآيبان (`SA\d{22}`)، والـ cookies والـ headers `authorization`، ومن غير Session Replay. `SENTRY_ENVIRONMENT` افتراضياً `APP_ENV`. `SENTRY_AUTH_TOKEN` في الـ CI بس.
- مقترح اختبار unit للـ scrubber بأمثلة عربية، وأنا أضيفه في قائمة فحوصات الـ CI.

## 9. أسئلة محتاج ردك عليها

1. اسم مكتبة الـ Auth النهائي (عشان أسماء المتغيرات في §7).
2. مكان الـ Prisma client المولّد (`.gitignore` فيه `src/generated/prisma/` افتراضياً).
3. هل الـ seed هيشتغل بدور الـ migrator (أسهل، بيتخطى RLS) ولا التطبيق؟ اقتراحي: الـ migrator، لأن الـ seed مش كود تطبيق.
4. أي job slugs في P5-03 عشان أحط أمثلة في `DEV_CRON_JOBS`.

## 10. اتفاقات P1-03b ↔ P1-01d (2026-11-19)

| الموضوع | الاتفاق | مين |
|---|---|---|
| IP العميل (QA-B1) | الاسم **`TRUSTED_PROXY_HOPS`**، رقم صحيح 0–10، **الافتراضي 0** = تجاهل `X-Forwarded-For`/`X-Real-IP` (IP = `null`). N = عدد الـ proxies بتاعتنا، والعميل هو القيمة رقم N من اليمين. أي قيمة غلط = 0. التنفيذ `src/lib/http.ts` (backend)؛ القيمة لكل بيئة وطريقة التحقق `docs/runbooks/trusted-proxy.md` (devops، P7) | متنفذ في الاتنين |
| الـ shadow DB | `SHADOW_DATABASE_URL` ← `prisma.config.ts` `datasource.shadowDatabaseUrl`. سكربت الـ init بيعمل `suqalzl_shadow` (مالكها الـ migrator، دور التطبيق ممنوع)، و `.env.example` بيشاور عليها. الـ CI بيعمل قاعدة جديدة كل مرة. **volume قديم:** `docker compose exec postgres createdb -U postgres -O suqalzl_migrator -T template1 suqalzl_shadow` | متنفذ |
| `prisma/migrate-diff.expected.sql` | ملك backend. الـ CI بيقارن **الـ SQL بس** (من غير سطور `--` والسطور الفاضية). المرحلة 1 تحذير، والـ SQL الحقيقي بيترفع كـ artifact `migrate-diff-actual`؛ أول تشغيل على GitHub: لو الفرق في الترتيب بس، الـ CI بيقول كده، وانت تستبدل الملف بالـ artifact. المرحلة 2 بعد ما يطابق: المالك يحط `MIGRATE_DIFF_ENFORCE=true` | backend: الملف؛ devops: الخطوة |
| interop | الـ CI بيتأكد إن `db:migrate:local` و `prisma migrate deploy` بيكتبوا نفس صفوف `_prisma_migrations` في الاتجاهين. أي تغيير في `scripts/db/apply-migrations.ts` لازم يفضل متوافق | backend |
| `GIT_COMMIT_SHA` | `/api/health` بيقراه **وقت التشغيل** (`force-dynamic`). الـ CI بيحطه ويتأكد منه (smoke بعد الـ build). في الاستضافة لازم يتحط كمتغير بيئة للعملية. لو استضافة P7 ما بتسمحش بمتغير لكل release: اقتراح `env: { GIT_COMMIT_SHA }` في `next.config.ts` وقت الـ build (قرار backend) | devops + backend (P7) |
| متغيرات P1-01d | `CRON_LEASE_SECONDS=120`، `REALTIME_REVALIDATE_SECONDS=60`، `REALTIME_PING_SECONDS=30`، و `REALTIME_DATABASE_URL` إلزامي في staging/prod: موجودين في `.env.example` ومحسوبين في ميزانية الاتصالات (`docs/decisions/devops.md` §6.4) | متنفذ |
| `dev-cron.mjs` | بيقرا `CRON_JOBS` (slug + schedule) من `src/lib/providers/jobs/index.ts` بـ regex من غير ما يشغّل TypeScript. **حافظ على الشكل** `{ slug: "...", schedule: "..." }` (slug قبل schedule، نص بين علامتين). لو الشكل اتغير السكربت بيفشل بـ exit 2 وبيقول ليه. جرب: `node scripts/dev-cron.mjs --list`. (ده بيقفل سؤال §9 رقم 4) | backend: الشكل |

**مطلوب من backend-engineer (مش بيوقف P1-03b):**
1. `package.json` `engines.node`: من `>=22.12` لـ `>=24 <25` (قرار Node 24، `devops.md` §6.6). اتجرب: 238/238 و `next build` على 22 و 24.
2. **vitest 3.2.7 → نسخة مصلّحة** (`npm audit` الكامل: `tinypool` و `vitest` **critical**، dev بس، فمش في البوابة، بس بيشتغلوا في الـ CI على كود الـ PRs).
3. `docs/runbooks/db-migrations.md` "مطلوب من devops": الخطوة اتعملت (P1-03b)؛ ممكن تشيل البند أو تحوّله لرابط على `local-dev.md` §8.
4. ملاحظة بيئة محجوبة: `prisma generate` بيشتغل بـ `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` (الـ generate مش محتاج الـ schema engine)، لكن `migrate deploy/diff` لأ.
