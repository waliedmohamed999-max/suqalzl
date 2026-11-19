# Runbook — بيئة التطوير المحلية (P1-03)

> **المالك:** devops-engineer — **آخر تحديث:** 2026-11-18
> **النطاق:** التطوير على جهازك فقط. مفيش أي سيرفر أو مزود سحابي (SPEC D12). الاستضافة في P7/P8.
> **الملفات:** `docker-compose.yml`، `.env.example`، `scripts/dev-setup.sh`، `scripts/dev-db-backup.sh`، `scripts/preview.sh` (معاينة المالك: [preview-mac.md](preview-mac.md))، `scripts/dev-cron.mjs`، `docker/postgres/init/`، `docker/seaweedfs/s3.json`، `.github/workflows/`.

## 0. الخلاصة (لو مستعجل)

```bash
git clone <repo-url> suqalzl && cd suqalzl
bash scripts/dev-setup.sh          # .env + Postgres + التخزين + Mailpit (+ npm ci/migrate/seed بعد P1-01)
npm run dev                        # بعد P1-01 — http://localhost:3000
```

| الخدمة | العنوان | ملاحظات |
|---|---|---|
| التطبيق (بعد P1-01) | http://localhost:3000 | `npm run dev` على جهازك، أو `bash scripts/dev-setup.sh --app` جوه Docker |
| PostgreSQL 16 | `localhost:5432` | قاعدة `suqalzl` للتطوير و `suqalzl_test` للاختبارات |
| تخزين S3 (SeaweedFS) | http://localhost:8333 | bucket عام `suqalzl-public` وخاص `suqalzl-private` |
| الإيميلات (Mailpit) | http://localhost:8025 | كل إيميل بيتبعت في التطوير بيظهر هنا ومش بيطلع برا الجهاز |
| SMS / OTP | سجل التطبيق (الـ terminal) | `SMS_PROVIDER=console` (SPEC §2) |

كل المنافذ مربوطة على `127.0.0.1` بس، يعني محدش على الشبكة يقدر يوصلها.

---

## 1. المتطلبات حسب نظام التشغيل

| | Windows 10/11 | macOS | Linux |
|---|---|---|---|
| Docker | **Docker Desktop** مع **WSL 2 backend** | Docker Desktop (أو OrbStack / Colima) | Docker Engine + `docker-compose-plugin` |
| Shell | **Ubuntu على WSL 2** (موصى به) أو Git Bash | Terminal (zsh) | bash |
| Node.js | نفس رقم `.nvmrc` (حالياً **24**) جوه WSL عن طريق `nvm` | `nvm` أو `fnm` أو Volta | `nvm` أو `fnm` |
| Git | جوه WSL: `sudo apt install git` | `xcode-select --install` | من مدير الحزم |
| VS Code | + إضافة **WSL** (`ms-vscode-remote.remote-wsl`) | — | — |

الحد الأدنى: Docker Compose **v2.24** أو أحدث (`docker compose version`)، وحوالي 4 GB رام فاضية لـ Docker.

### 1.1 Windows (الطريقة الموصى بها: WSL 2)

ليه WSL؟ لأن الـ scripts بتاعتنا bash، والحاويات Linux، وقراءة الملفات من `C:\` جوه Docker بطيئة جداً وبتعمل مشاكل في الـ hot reload.

1. في PowerShell كمسؤول: `wsl --install -d Ubuntu` ثم أعد التشغيل وافتح Ubuntu واعمل مستخدم.
2. نزّل Docker Desktop، ومن **Settings > General** فعّل "Use the WSL 2 based engine"، ومن **Settings > Resources > WSL integration** فعّل Ubuntu.
3. جوه Ubuntu:
   ```bash
   sudo apt update && sudo apt install -y git curl
   git config --global core.autocrlf input      # مهم: ما يحولش LF إلى CRLF
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash   # أو أي طريقة تثبيت nvm تفضلها
   exec $SHELL && nvm install 24
   ```
4. **اعمل clone جوه ملفات WSL** (مثلاً `~/code/suqalzl`) **مش** في `/mnt/c/...`.
5. افتح المشروع: `cd ~/code/suqalzl && code .` (VS Code هيفتح في وضع WSL تلقائياً).

> لو لازم تشتغل من Git Bash بدل WSL: `bash scripts/dev-setup.sh` شغال، بس لازم `git config --global core.autocrlf input` **قبل** الـ clone، وإلا ملفات `.sh` هتاخد CRLF والحاوية هتفشل برسالة `\r: command not found`. (`.gitattributes` بيفرض LF على ملفات `.sh`، بس الإعداد ده بيحمي باقي الملفات.)

### 1.2 macOS

```bash
xcode-select --install                # git
brew install --cask docker            # أو OrbStack: brew install --cask orbstack
brew install nvm && nvm install 24    # أو: brew install fnm
```
شغّل Docker Desktop مرة واحدة لحد ما يقول "Engine running".

### 1.3 Linux (Ubuntu/Debian)

ثبّت Docker Engine من الوثائق الرسمية (docs.docker.com/engine/install) ومعاه `docker-compose-plugin`، وبعدين:
```bash
sudo usermod -aG docker "$USER" && newgrp docker   # تشغيل docker من غير sudo
```

---

## 2. التشغيل من الصفر

```bash
bash scripts/dev-setup.sh --check    # (اختياري) يفحص Docker و Node والمنافذ بس
bash scripts/dev-setup.sh            # الإعداد الكامل
```

السكربت بيعمل بالترتيب:
1. يتأكد إن Docker و `docker compose` v2 شغالين، ويقارن Node بـ `.nvmrc`.
2. يفحص إن المنافذ 5432 و 8333 و 1025 و 8025 فاضية (لو مشغولة بيقولك تغيّرها في `.env`).
3. لو مفيش `.env` بينسخه من `.env.example`. لو موجود **ما بيغيّرش أي قيمة**، وبيقولك على المتغيرات الجديدة اللي ناقصة عندك.
4. بيولّد قيم عشوائية للأسرار الفاضية بس: `AUTH_SECRET`، `OTP_HMAC_SECRET`، `FIELD_ENCRYPTION_KEY`، `CRON_SECRET`، `SUPER_ADMIN_PASSWORD`، وأسرار الـ webhooks المحلية.
5. `docker compose up -d --wait postgres storage mail` ويستنى الـ healthchecks.
6. **بعد P1-01 بس:** `npm ci` ثم `npm run db:migrate:deploy` ثم `npm run db:seed`.

بعدها: `npm run dev` وافتح http://localhost:3000. باسورد الـ SUPER_ADMIN في `.env` (`SUPER_ADMIN_PASSWORD`).

### 2.1 تشغيل كل حاجة جوه Docker (اختياري)

```bash
bash scripts/dev-setup.sh --app          # أو: docker compose --profile app up -d
docker compose logs -f app
```
بيشغّل التطبيق (`npm ci` ← migrate ← seed ← `next dev`) ومعاه `cron` المحلي. ده أبطأ في الـ hot reload على Windows و macOS، فالافتراضي إن التطبيق يشتغل على جهازك والبنية بس في Docker.

### 2.2 أوامر يومية

| الأمر | ليه |
|---|---|
| `docker compose ps` | حالة الخدمات والـ healthchecks |
| `docker compose logs -f postgres` | سجل خدمة |
| `docker compose stop` / `docker compose start` | إيقاف وتشغيل من غير ما البيانات تتمسح |
| `docker compose exec postgres psql -U postgres -d suqalzl` | psql كمستخدم superuser |
| `bash scripts/dev-db-backup.sh` | نسخة احتياطية محلية (القسم 6) |
| `node scripts/dev-cron.mjs --once` | تشغيل الـ cron jobs مرة واحدة (كل اللي في `DEV_CRON_JOBS`، من غير جدول) |
| `node scripts/dev-cron.mjs --list` | الـ jobs وجدول كل واحد (UTC) والتشغيل الجاي. الجدول من `CRON_JOBS` في `src/lib/providers/jobs/index.ts`؛ `DEV_CRON_INTERVAL_SECONDS=N` بيتجاهل الجدول ويشغّل كل N ثانية للتجربة السريعة |
| `bash scripts/dev-setup.sh --reset` | **يمسح** كل البيانات المحلية ويبدأ من جديد (بيطلب تأكيد) |

---

## 3. قاعدة البيانات

- **الصورة:** `postgres:16-bookworm` (Debian، مش alpine، عشان الـ locale الافتراضي `en_US.utf8` زي الـ Postgres المُدار).
- **الوقت:** السيرفر والأدوار والقواعد كلها UTC (SPEC §2). العرض بتوقيت `Asia/Riyadh` في الكود.
- **أول تشغيل** (volume فاضي) بيشغّل `docker/postgres/init/10-roles-databases-extensions.sh`:

| الدور | بيستخدمه | الصلاحيات |
|---|---|---|
| `suqalzl_migrator` | `DIRECT_URL`: `prisma migrate` | مالك الـ schema، CREATEDB (لـ shadow DB) |
| `suqalzl_app` | `DATABASE_URL`: التطبيق | SELECT/INSERT/UPDATE/DELETE بس، **مش مالك و NOBYPASSRLS**، فالـ RLS بيتطبق عليه. `statement_timeout=15s` و `idle_in_transaction_session_timeout=30s` |
| `postgres` | الـ init والنسخ المحلية | superuser، **التطبيق ما يتصلش بيه أبداً** (الـ superuser بيتخطى RLS) |

- **قاعدة الـ shadow** `suqalzl_shadow` (`SHADOW_DATABASE_URL`): فاضية ومالكها الـ migrator، و Prisma **بيمسح كل اللي فيها** في `prisma migrate diff --from-migrations` و `migrate dev`. دور التطبيق ما يقدرش يتصل بيها. لو الـ volume عندك أقدم من السكربت ده: `docker compose exec postgres createdb -U postgres -O suqalzl_migrator -T template1 suqalzl_shadow`.
- **الامتدادات** في `template1` و `suqalzl` و `suqalzl_test`: `btree_gist` (exclusion constraint للعروض، backend H6)، `citext` (الإيميل، M14)، `pg_trgm` (مساعد للبحث العربي).
- **لو غيّرت السكربت أو الباسوردات** في `.env`: السكربت بيشتغل بس على volume فاضي، فلازم `bash scripts/dev-setup.sh --reset`.

## 4. التخزين (S3-compatible)

- **SeaweedFS `weed mini`** (Apache-2.0) في حاوية واحدة. الـ buckets بتتعمل تلقائياً عند التشغيل.
- `suqalzl-public`: قراءة عامة من غير توقيع (صور المنتجات): `http://localhost:8333/suqalzl-public/<key>`.
- `suqalzl-private`: وثائق التجار. **مفيش قراءة عامة**، الوصول بروابط موقعة بس (`S3_SIGNED_URL_TTL_SECONDS`).
- مفاتيح الأدمن المحلية هي `S3_ACCESS_KEY_ID` و `S3_SECRET_ACCESS_KEY` من `.env` (قيم dev-only).
- الـ CORS مسموح لـ `APP_URL` بس. وإحصائيات الاستخدام (telemetry) متقفلة.
- `S3_ENDPOINT` للسيرفر، و `S3_PUBLIC_ENDPOINT` للمتصفح (الاتنين `localhost:8333` على جهازك؛ جوه Docker السيرفر بيستخدم `storage:8333`).

## 5. الإيميل والـ SMS والدفع في التطوير

- **الإيميل:** `EMAIL_PROVIDER=smtp` بيبعت لـ Mailpit (http://localhost:8025). Resend بيشتغل بس مع `EMAIL_PROVIDER=resend` ومفتاح.
- **SMS/OTP و واتساب:** `console` افتراضياً، الكود بيتطبع في سجل التطبيق.
- **الدفع:** sandbox بس (`PAYMENTS_MODE=sandbox`، D14). حط مفاتيح `pk_test_`/`sk_test_` بتاعة Moyasar و Tabby و Tamara في `.env` بتاعك لما تحتاجها (P2-03، P5-01).
- **الـ webhooks من المزود لجهازك** محتاجة رابط عام (tunnel). ده **مش جزء من الإعداد الافتراضي**: أي أداة tunnel أو حساب خارجي محتاج موافقة المالك. البديل من غير tunnel: اختبارات تبعت الـ webhook للـ endpoint محلياً بنفس الشكل.

## 6. النسخ الاحتياطي للتطوير (خفيف)

قاعدة التطوير فيها بيانات seed بس، فالنسخ هنا للراحة قبل أي حاجة خطرة (migration كبيرة، `prisma migrate reset`، تبديل branch بـ schema مختلف):

```bash
bash scripts/dev-db-backup.sh                      # pg_dump -Fc ← تحقق بـ pg_restore --list ← sha256 ← يحتفظ بآخر 10
bash scripts/dev-db-backup.sh --list
bash scripts/dev-db-backup.sh --restore backups/suqalzl-20261118T090000Z.dump
```
- النسخ في `./backups` (متجاهَل في git) وعددها `DEV_BACKUP_KEEP`.
- **الاسترجاع ما بيكتبش فوق القاعدة الحالية أبداً**: بيعمل قاعدة جديدة `suqalzl_restore_<وقت>`، وأنت اللي تغيّر `DATABASE_URL`/`DIRECT_URL` لو عايز تستخدمها.
- الملفات المرفوعة (SeaweedFS) والإيميلات مش داخلة في النسخة؛ بيانات seed بتتعمل تاني.
- **نسخ الإنتاج** نظام مختلف تماماً (PITR + نسخة مشفرة بـ age خارج الموقع + تمرين استرجاع شهري): P7-02، `docs/decisions/devops.md` §6.3.

## 7. ليه SeaweedFS ومش MinIO؟

| | MinIO CE | **SeaweedFS** (المختار) | Garage | RustFS |
|---|---|---|---|---|
| الحالة 2026 | وقف نشر الصور والـ binaries (أكتوبر 2025) والمستودع archived (2026) | نشط، Apache-2.0، إصدار 4.54 | نشط، AGPL | alpha/beta |
| الإعداد للتطوير | — | أمر واحد `weed mini` بيعمل الـ buckets | محتاج layout ومفاتيح بأوامر منفصلة | — |
| قراءة عامة لـ bucket + روابط موقعة | — | identity `anonymous` لـ bucket محدد + SigV4 | website mode | — |

المصدر: [MinIO CE in 2026: Retired Upstream, Source-Only](https://dev.to/rosgluk/minio-ce-in-2026-retired-upstream-source-only-and-what-to-use-1k02)، وإعدادات SeaweedFS متحقق منها من كود الإصدار 4.54 (`weed/command/mini.go`، `weed/s3api/auth_credentials.go`). الكود بيتعامل مع أي S3-compatible عن طريق `StorageProvider`، فتغيير الخادم المحلي ما يأثرش على التطبيق.

## 8. الـ CI (GitHub Actions)

| الملف | الوظائف | قبل P1-01 |
|---|---|---|
| `.github/workflows/ci.yml` | `detect` ← `infra` (actionlint، shellcheck، `docker compose config`، فحص إن `.env.example` ما فيهوش أسرار) ← `lint` ← `typecheck` (+ `prisma validate/generate`) ← `unit` (Vitest + Postgres 16 service + نفس سكربت الـ init، وبعده: **interop** بين `db:migrate:local` و `prisma migrate deploy` في الاتجاهين، و **`prisma migrate diff`** مقارنة بـ `prisma/migrate-diff.expected.sql`) ← `build` (+ smoke: `next start` و `/api/health` لازم يرجّع `commit` = `GIT_COMMIT_SHA`) ← `e2e` (Playwright على نفس `docker-compose.yml`، **بيتشغل بس** لما يكون فيه `test:e2e` و `playwright.config.*` و `@playwright/test` وملف `*.spec.*`) ← `ci-ok` | `detect` و `infra` بيشتغلوا، والباقي **skipped** مع سبب في الـ summary |
| `.github/workflows/security.yml` | `gitleaks` (كل الـ history) ← `dependencies` (بوابة `npm audit` على الـ production deps بقائمة استثناءات ليها تاريخ انتهاء، وتقرير كامل و OSV-Scanner معلوماتيين لحد P6) ← `dependency-review` (على الـ PR) ← `security-ok`. وكمان أسبوعياً يوم الأحد | gitleaks بيشتغل، الباقي skipped |
| `.github/dependabot.yml` | تحديثات أسبوعية: actions، صور compose (من غير ترقية Postgres الـ major)، npm | — |

- كل job بيتفعّل لوحده لما الـ npm script بتاعه يظهر في `package.json` (الأسماء في `notes-for-backend.md`).
- **بوابة الـ audit:** أي ثغرة high/critical في اعتماديات الإنتاج بتوقف الـ CI، إلا لو ليها سطر في `.github/audit-allowlist.json` (رقم GHSA + الحزمة + السبب + المسؤول + تاريخ انتهاء ≤ 120 يوم). بعد التاريخ البوابة بتفشل تاني، والسطر اللي ما بقاش له لازمة بيطلع تحذير. التشغيل محلياً: `npm audit --omit=dev --json > /tmp/a.json; node .github/scripts/audit-gate.mjs /tmp/a.json`.
- **`migrate diff` على مرحلتين:** المرحلة 1 (دلوقتي) أي اختلاف أو ملف ناقص = تحذير، والـ SQL المتولد بيترفع كـ artifact اسمه `migrate-diff-actual`. المرحلة 2: المالك يضيف متغير المستودع `MIGRATE_DIFF_ENFORCE=true` (Settings > Secrets and variables > Actions > Variables) فيبقى إلزامي.
- **نسخة Node:** `.nvmrc` = 24 هو المصدر الوحيد؛ الـ CI (`node-version-file: .nvmrc`) و compose (`node:24-bookworm-slim`) ماشيين عليه. القرار والتجربة في `docs/decisions/devops.md` §6.6.
- الـ actions مثبتة بالـ commit SHA، والأدوات (gitleaks، OSV-Scanner) بتتنزل بإصدار محدد وبيتحقق من الـ SHA-256 بتاعها.
- `permissions: contents: read` بس، ومفيش `pull_request_target`، فالـ PRs من forks ما بتاخدش أسرار.
- **الـ CI ما بيشتغلش فعلياً غير لما المالك يعمل مستودع GitHub** (`docs/plan.md` P1-03). بعدها: Settings > Branches > حماية `main` بشرط `ci-ok` و `security-ok`.

## 9. مشاكل شائعة

| العَرَض | الحل |
|---|---|
| `port is already allocated` | برنامج تاني على المنفذ (غالباً Postgres متثبت على الجهاز). غيّر `POSTGRES_PORT` في `.env` **وكمان** المنفذ في `DATABASE_URL` و `DIRECT_URL` و `TEST_*`. |
| `\r: command not found` أو `bad interpreter` | الملف اتسحب بـ CRLF. `git config core.autocrlf input` ثم `git rm --cached -r . -q && git reset --hard`، ثم `--reset`. |
| `password authentication failed for user "suqalzl_app"` | غيّرت الباسورد في `.env` بعد أول تشغيل. يا ترجّعه، يا `bash scripts/dev-setup.sh --reset`. |
| `permission denied for schema public` من التطبيق | التطبيق بيعمل DDL بـ `DATABASE_URL`. الـ migrations لازم تستخدم `DIRECT_URL` (دور الـ migrator). |
| الـ RLS مش بيمنع حاجة | اتأكد إن التطبيق متصل بـ `suqalzl_app` مش `postgres` أو `suqalzl_migrator` (المالك والـ superuser بيتخطوا RLS إلا مع `FORCE ROW LEVEL SECURITY`). |
| رابط الصورة الموقّع بيرجع `SignatureDoesNotMatch` | الرابط اتوقّع على host غير اللي المتصفح بيفتحه. التوقيع لازم يكون على `S3_PUBLIC_ENDPOINT`. |
| hot reload مش شغال على Windows | المشروع في `/mnt/c/...`. انقله جوه WSL (`~/code`). |
| `docker compose` يقول `env_file ... required` | Docker Compose قديم. حدّث لـ v2.24+. |

## 10. التحقق (ما تم تجربته في P1-03)

الحالة في `company/board.md` (P1-03). باختصار: `docker compose config` نجح (مع وبدون `.env`، ومع profile `app`)، و actionlint و shellcheck و yamllint نضاف، و `dev-setup.sh` اتجرب لحد خطوة سحب الصور (توليد الأسرار، ومنع الكتابة فوق `.env` في التشغيل التاني)، و `dev-cron.mjs` اتجرب على server تجريبي، وسكربت الـ init اتجرب مرتين على PostgreSQL 16.15 (idempotent) واتأكد منه: RLS على دور التطبيق، منع DDL، UTC، `statement_timeout`، وراثة الامتدادات في قاعدة جديدة، و LISTEN/NOTIFY. **تشغيل الحاويات نفسها (`up` والـ healthchecks) ما اتجربش** لأن بيئة العمل كانت بتمنع سحب الصور من Docker Hub و ghcr.io، **ولازم يتجرب على جهاز المالك أو في أول تشغيل CI.**
