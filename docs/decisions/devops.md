# O6 — الاستضافة والبنية التحتية (P0) — قرار devops-engineer

> **الحالة:** مقترح، ينتظر موافقة المالك في بوابة G1. ويحتاج **رأي مستشار قانوني في PDPL** قبل الاعتماد النهائي.
> **أعدّه:** devops-engineer — **تاريخ الاطلاع على كل المصادر:** 2026-11-17 (إلا لو ذُكر تاريخ آخر).
> **يحل محل:** قسم O6 في `docs/decisions.md`، وهو مسودة كتبها الـ CEO وفيها أخطاء جوهرية (التفاصيل في القسم 1).
> **قاعدة الأرقام:** كل سعر مكتوب بمصدره. كل رقم غير مؤكد مكتوب عليه **"يحتاج تأكيد"**. الأسعار بالدولار وبدون ضريبة، والتحويل للريال على سعر الربط الثابت 3.75.

---

## 0. الخلاصة التنفيذية

| | التوصية |
|---|---|
| **للإطلاق** | **Google Cloud منطقة الدمام `me-central2`، والشراء عن طريق CNTXT**: التطبيق على Cloud Run، وقاعدة البيانات Cloud SQL for PostgreSQL (مُدارة، فيها PITR)، والملفات على Cloud Storage، والمهام المجدولة بـ Cloud Scheduler، والأسرار في Secret Manager. الـ Realtime نشغّله بأنفسنا خلف واجهة `RealtimeProvider`. **كل البيانات الشخصية تبقى داخل المملكة.** |
| **للمستقبل** | نبقى على نفس المنصة ونكبر تدريجياً: قاعدة بيانات HA، ثم Redis و Centrifugo، ثم Meilisearch. وننسخ النسخ الاحتياطية لموقع ثاني داخل المملكة (Oracle جدة). نعيد التقييم لما تشتغل منطقة AWS السعودية (مخطط لها ديسمبر 2026) أو منطقة Azure Saudi Arabia East (مُعلنة لنوفمبر 2026)، **بعد ما تكون متاحة فعلاً وفيها Postgres مُدار متعدد المناطق**. |
| **البديل لو القانوني سمح بالاستضافة خارج المملكة** | Vercel Pro (`bom1`) + Supabase Pro (Mumbai). هذا الأبسط والأرخص في البداية. لكنه **غير مناسب لو اعتُمد شرط التوطين المقترح** في مسودة تعديل اللائحة (أكتوبر 2026). |
| **مرفوض** | Vercel `dxb1` (مش موجودة في قائمة مناطق Vercel الرسمية الحالية)، وأي هجين فيه الدوال خارج المملكة وقاعدة البيانات داخلها (تأخير عالي، والبيانات الشخصية بتتعالج برضه خارج المملكة)، وSupabase self-hosted على VPS للإنتاج (عبء تشغيل وخطر على بيانات مالية). |

**ليه غيّرت توصية المسودة (A: Vercel + Supabase في Mumbai)؟** فيه ثلاث حقائق جديدة:
1. **مسودة تعديل اللائحة التنفيذية لنظام حماية البيانات (SDAIA، 6 أكتوبر 2026)** فيها شرط توطين صريح. المادة 23(2) المقترحة تقول إن المتحكم لازم "يخزّن البيانات الشخصية داخل المملكة"، والتعديل يُطبق بعد 60 يوماً من النشر في الجريدة الرسمية. وفيه كمان تسجيل إلزامي في السجل الوطني لمن ينقل بيانات للخارج. المصادر: [Clyde & Co، 8 أكتوبر 2026](https://www.clydeco.com/es/insights/2026/10/sdaia-publishes-draft-amendments-to-the-pdpl) و [Gowling WLG، 16 أكتوبر 2026](https://gowlingwlg.com/insights-resources/articles/2026/saudi-arabias-proposed-pdpl-amendments). **هذه لسه مسودة، والاستشارة العامة انتهت 5 نوفمبر 2026. النص النهائي يحتاج تأكيد من المستشار القانوني.** حتى لو اتعدّل النص، الإطلاق (P7) بعد شهور، ولو بنينا على Supabase ثم احتجنا ننقل، الانتقال هيكلف إعادة كتابة Realtime و Storage والـ cron.
2. **Supabase ما عندها أي منطقة في الشرق الأوسط.** أقرب مناطقها Mumbai `ap-south-1` و Frankfurt `eu-central-1` ([Supabase Regions](https://supabase.com/docs/guides/platform/regions)).
3. **في 2026 اتضربت مراكز بيانات في الخليج فعلاً.** مراكز AWS في الإمارات `me-central-1` تضررت من ضربات في 1 مارس 2026، وAWS قالت إنها مش قادرة تسترجع البيانات المخزنة في `mec1-az2` بس ([w.media، 17 سبتمبر 2026](https://w.media/aws-cant-recover-resources-and-data-stored-in-uae-region-hit-during-us-iran-conflict/)، [Cybersecurity News](https://cybersecuritynews.com/aws-middle-east-services-disrupted/)). منطقة Vercel `dxb1` توقفت 14 يوماً (2–16 مارس 2026) واتحوّل الترافيك لـ `bom1` ([IsDown، سجل حوادث Vercel](https://isdown.app/status/vercel/incidents/545104-dubai-region-dxb1-is-unavailable)). **الدرس:** ما نعتمد على منطقة واحدة. نسخة احتياطية في موقع ومزود مختلف **إلزامية** من اليوم الأول.

---

## 1. تصحيحات على مسودة O6 في `docs/decisions.md`

| ما قالته المسودة | الصحيح الآن (بالدليل) |
|---|---|
| "Vercel أطلقت منطقة دبي `dxb1`" وكأنها خيار متاح | قائمة المناطق الرسمية ([vercel.com/docs/regions](https://vercel.com/docs/concepts/edge-network/regions)، آخر تحديث 2026-08-11) فيها **19 منطقة وما فيهاش `dxb1`**. وفي 7 سبتمبر 2026 مستخدم نشر رسالة الـ dashboard: "dxb1 is currently under maintenance and cannot be used as a target region" ([منتدى Vercel](https://community.vercel.com/t/dxb1-dubai-region-unavailable-maintenance-eta-and-hobby-availability/48932)). **لا نخطط على `dxb1`.** |
| "~60–80$/شهر" | ما بتحسبش: مقعد النشر الثاني (20$)، ومشروع الـ staging (Micro بـ10$، والرصيد بيغطي مشروع واحد)، و PITR (100$). والـ PITR ضروري لقاعدة بيانات فيها ledger مالي. التقدير الصحيح للخيار A **~106$ بدون PITR و ~206$ مع PITR** عند الإطلاق (القسم 4). |
| "PDPL: رأي قانوني قبل P7" | التأجيل لـ P7 خطر. شرط التوطين المقترح (أكتوبر 2026) بيغير معمارية الـ Storage والـ Realtime والـ Jobs. **القرار القانوني لازم قبل P1.** |
| "Sentry غير محسوب" | Sentry Team بـ 26$/شهر (سنوي) أو 29$ (شهري) ([sentry.io/pricing](https://sentry.io/pricing/)). ومهم: Sentry بيخزن الأحداث خارج المملكة، فلازم ننظف أي بيانات شخصية قبل الإرسال (القسم 6.4). |

---

## 2. الخيارات التي تمت مقارنتها

| # | الخيار | البيانات داخل المملكة؟ |
|---|---|---|
| A | Vercel Pro (`bom1` Mumbai) + Supabase Pro (`ap-south-1` Mumbai) | لا |
| B | VM داخل المملكة (GCE في الدمام أو VPS سعودي) + Supabase self-hosted بـ Docker | نعم |
| **C** | **Google Cloud الدمام `me-central2` (عن طريق CNTXT): Cloud Run + Cloud SQL Postgres + Cloud Storage + Realtime نشغّله بأنفسنا** | **نعم** |
| D | Oracle Cloud (جدة `me-jeddah-1` / الرياض `me-riyadh-1`) | نعم |
| E | AWS السعودية / Azure Saudi Arabia East / Alibaba Cloud الرياض / STC Cloud | نعم (عند التوفر) |

### 2.1 الحقائق لكل مزود (المصدر والتاريخ)

**A — Vercel + Supabase**
- Vercel Pro: رسم منصة 20$/شهر، يشمل مقعد نشر واحد و20$ رصيد استخدام. كل مقعد نشر إضافي بـ 20$، ومقاعد المشاهدة مجانية. الـ Flat Rate CDN بيشمل مليون طلب و 1 TB نقل. الأسعار بدون ضريبة. ([Vercel Pro Plan](https://vercel.com/docs/plans/pro-plan)، آخر تحديث 2026-09-15)
- مناطق Vercel الحالية: 19 منطقة، الأقرب للسعودية `bom1` Mumbai. فيه 126 PoP، **ومش معروف إذا كان منها PoP داخل المملكة (يحتاج تأكيد)**. ([Vercel Regions](https://vercel.com/docs/concepts/edge-network/regions)، 2026-08-11)
- Supabase Pro: 25$/شهر، ورصيد حوسبة 10$ يغطي Micro واحد. أسعار الحوسبة: Small بـ 15$، Medium بـ 60$، Large بـ 110$، XL بـ 210$. المشمول: 8 GB قاعدة بيانات لكل مشروع، 100 GB ملفات، 250 GB نقل، 100k MAU، 5 مليون رسالة Realtime، 500 اتصال Realtime متزامن (وكل 1,000 زيادة بـ 10$). النسخ الاحتياطية تتحفظ 7 أيام. **PITR بـ 100$/شهر لكل 7 أيام احتفاظ.** Team بـ 599$/شهر. ([Supabase Pricing](https://supabase.com/pricing.md)، اطلاع 2026-11-17)
- Supabase: ما فيه أي منطقة في الإمارات أو السعودية أو البحرين. ([Supabase Regions](https://supabase.com/docs/guides/platform/regions)، اطلاع 2026-11-17)

**C — Google Cloud الدمام**
- **شرط الشراء:** العميل اللي عنوان الفوترة بتاعه في السعودية لازم يشتري خدمات Google Cloud عن طريق **CNTXT** (الموزع الحصري). الوصول متاح بس للعملاء السعوديين المسجلين مع CNTXT. والعملاء السعوديون الحاليون لازم ينقلوا حساب الفوترة لـ CNTXT. ([Dammam region access](https://docs.cloud.google.com/docs/dammam-region-access)، آخر تحديث 2026-11-10)
- CNTXT ما بتقبلش حسابات أفراد ("Individual onboarding is temporarily unavailable"، يوليو–سبتمبر 2026)، فلازم **حساب منشأة بالسجل التجاري** ([Google Developer forums](https://discuss.google.dev/t/ksa-region-cntxt-individual-onboarding-unavailable-completely-blocks-sandbox-testing/378547)). المالك عنده سجل تجاري، فده مش عائق، **لكن مدة التفعيل تحتاج تأكيد من CNTXT.**
- Cloud SQL for PostgreSQL متاح في `me-central2` (Enterprise: shared core و dedicated core و N4، بحد أقصى 80 vCPU؛ و Enterprise Plus: N2). ([Cloud SQL region availability](https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview)، اطلاع 2026-11-17)
- Cloud Run متاح في `me-central2` ضمن **Tier 2**. **ربط الدومين المباشر (domain mapping) مش متاح في المنطقة دي**، فلازم Load Balancer أو بديل. ([Cloud Run locations](https://docs.cloud.google.com/run/docs/locations)، اطلاع 2026-11-17)
- Cloud Scheduler متاح في `me-central2`. ([Cloud Scheduler locations](https://docs.cloud.google.com/scheduler/docs/locations)، اطلاع 2026-11-17)
- أسعار Cloud SQL في أيوا (`us-central1`)، وهي الأسعار الوحيدة المنشورة نصاً: vCPU بـ 0.0413$/ساعة، الذاكرة بـ 0.007$/GiB-ساعة، SSD بـ ~0.17$/GiB-شهر، النسخ الاحتياطية بـ ~0.08$/GiB-شهر. الـ HA ضعف سعر الحوسبة والتخزين. db-f1-micro بـ 0.0105$/ساعة، و db-g1-small بـ 0.035$/ساعة. الـ shared-core خارج الـ SLA. ([Cloud SQL pricing](https://cloud.google.com/sql/pricing?hl=en)، اطلاع 2026-11-17) **سعر الدمام نفسه يحتاج تأكيد من CNTXT أو الحاسبة.**
- **معامل تقدير لأسعار الدمام:** e2-medium في الدمام بـ 0.0536$/ساعة مقابل 0.0335$ في أيوا، يعني **~1.6×** ([gcloud-compute.com](https://gcloud-compute.com/e2-medium.html)، تحديث 2026-11-15، موقع غير رسمي ومكتوب فيه إن دقته غير مضمونة). كل أرقام الدمام في القسم 4 محسوبة بالمعامل ده، **فهي تقديرات تحتاج تأكيد**.
- أسعار Cloud Run (الجدول المنشور، ومش واضح فيه هو Tier 1 ولا Tier 2): request-based: CPU نشط 0.000024$/vCPU-ث، والخامل لـ min-instances 0.0000025$، والطلبات 0.40$ لكل مليون. instance-based: CPU 0.000018$/vCPU-ث، والذاكرة 0.000002$/GiB-ث. الحصة المجانية محسوبة على سعر Tier 1. ([Cloud Run pricing](https://cloud.google.com/run/pricing?hl=nl)، اطلاع 2026-11-17) **سعر Tier 2 يحتاج تأكيد.**
- أسعار الـ VM في الدمام: e2-small ~19.57$/شهر، e2-medium ~39.13$، e2-standard-2 ~78.27$، e2-standard-4 ~156.54$ ([gcloud-compute.com/me-central2](https://gcloud-compute.com/me-central2.html)، 2026-11-15، غير رسمي، **يحتاج تأكيد**).

**D — Oracle Cloud**
- منطقتين داخل المملكة: Saudi Arabia Central (الرياض) `me-riyadh-1`، و Saudi Arabia West (جدة) `me-jeddah-1`. **كل منطقة فيها Availability Domain واحد بس.** والحسابات التجريبية و pay-as-you-go محدودة بمنطقة واحدة مشترك فيها. ([OCI Regions](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm)، تحديث الصفحة 2026-06-22)
- "OCI services are priced the same for all global regions"، وأول 10 TB نقل شهرياً مجانية. ([OCI Pricing](https://www.oracle.com/sa/cloud/pricing/)، اطلاع 2026-11-17)
- **توفر OCI Database with PostgreSQL في جدة أو الرياض: يحتاج تأكيد.** صفحة توفر الخدمات ما بتذكرش المنطقتين ([Service availability](https://www.oracle.com/il/cloud/distributed-cloud/service-availability/)).

**E — الباقي**
- AWS السعودية: مخطط إطلاقها **بحلول ديسمبر 2026** بثلاث Availability Zones ([w.media، 1 سبتمبر 2026](https://w.media/aws-saudi-arabia-cloud-region-set-for-december-2026-launch/)، [The Stack، 31 أغسطس 2026](https://www.thestack.technology/while-its-other-persian-gulf-data-centers-remain-idle-aws-prepares-to-open-in-saudi-arabia/)). **مش متاحة النهارده.**
- Azure Saudi Arabia East: Microsoft أعلنت إنها "will be available to customers in November 2026" ([Microsoft، 31 أغسطس 2026](https://news.microsoft.com/source/emea/2026/08/microsoft-announces-saudi-arabia-east-datacenter-region-will-be-available-in-november-2026/)). **التوفر الفعلي و Azure Database for PostgreSQL فيها يحتاجوا تأكيد.**
- Alibaba Cloud الرياض `me-central-1`، وتشغلها SCCC (مشروع مشترك مع STC) ([getdeploying.com](https://getdeploying.com/datacenters-in-saudi-arabia)). **الأسعار وتوفر RDS PostgreSQL تحتاج تأكيد.**
- STC Cloud: ما لقيتش أسعار منشورة لـ Postgres مُدار. **يحتاج عرض سعر.**
- VPS سعودي محلي: فيه عروض بالريال (مثلاً 70–312 ر.س/شهر حسب [whtop](https://www.whtop.com/plans/wafaicloud.com/130644))، **لكن موقع مركز البيانات والشهادات والـ SLA تحتاج تأكيد**، وكل التشغيل علينا.
- Cloudflare عنده PoPs في الرياض وجدة والدمام ([getdeploying.com](https://getdeploying.com/datacenters-in-saudi-arabia)).

---

## 3. المقارنة حسب المعايير

| المعيار | A: Vercel + Supabase (Mumbai) | B: VM + Supabase self-hosted (داخل المملكة) | **C: GCP الدمام (مُدار)** | D: Oracle جدة/الرياض |
|---|---|---|---|---|
| **إقامة البيانات (PDPL)** | خارج المملكة. محتاج SCCs وتقييم مخاطر نقل، **ومخالف لشرط التوطين المقترح** | داخل المملكة | **داخل المملكة**. ونخلي الـ logs والـ backups والـ Artifact Registry في نفس المنطقة | داخل المملكة، وفيه منطقتين للتعافي من الكوارث |
| **زمن الاستجابة للسعودية** | الصفحات الثابتة من الـ CDN سريعة. الصفحات الديناميكية (السلة، checkout، الفصال) بتروح Mumbai. **الرقم يحتاج قياس** | قريب جداً (داخل المملكة)، **يحتاج قياس** | قريب جداً، والدالة وقاعدة البيانات في نفس المنطقة. **يحتاج قياس** | قريب جداً، **يحتاج قياس** |
| **مطابقة الـ SPEC (قسم 2)** | كاملة (Realtime، Storage، RLS، Cron) | كاملة (نفس مكونات Supabase) | **محتاج تعديل في SPEC**: الـ Storage يبقى GCS، والـ Realtime خلف interface، والـ Jobs بـ Cloud Scheduler. الـ RLS نفسه ميزة في Postgres، فبيفضل متاح | محتاج تعديل في SPEC |
| **مجهود التشغيل** | الأقل | **الأعلى**: تحديثات أمنية، backups، WAL، مراقبة، توسع. ووثيقة Supabase للـ self-hosting ما بتغطيش الـ backups أصلاً ([Supabase self-hosting](https://supabase.com/docs/guides/self-hosting/docker)) | متوسط. الـ DB والـ backups والـ PITR والـ TLS مُدارين، والـ Realtime بس علينا | متوسط إلى عالي. توفر Postgres المُدار يحتاج تأكيد |
| **النسخ الاحتياطي والاسترجاع** | يومي بحفظ 7 أيام، و PITR بـ 100$ | علينا بالكامل (WAL-G أو pgBackRest) | backups يومية مُدارة + PITR + نسخة منطقية بنعملها بنفسنا (القسم 6.3) | يحتاج تأكيد |
| **التوسع** | تلقائي للتطبيق، والقاعدة بالمقاسات | يدوي | تلقائي لـ Cloud Run (min/max instances)، والقاعدة بالمقاسات + HA + read replica | يدوي غالباً |
| **المراقبة** | Vercel Observability + Supabase logs (7 أيام في Pro) + Sentry | نبنيها بأنفسنا | Cloud Logging و Monitoring (alerts و uptime checks) + Sentry | OCI Monitoring |
| **CI/CD** | Previews لكل PR جاهزة | GitHub Actions + SSH/Docker | GitHub Actions + Workload Identity Federation (من غير مفاتيح JSON) + revisions بـ tags لكل PR + rollback بتحويل الترافيك | GitHub Actions |
| **مخاطر المزود** | اعتماد على مزودين، والفاتورة متغيرة | مخاطر التشغيل عالية | الشراء لازم يكون عن طريق CNTXT، ومنطقة واحدة في الدمام على ساحل الخليج | AD واحد في كل منطقة |

**ملاحظة عن زمن الاستجابة:** ما نشرتش أي رقم ms لأني ما لقيتش مصدر رسمي موثوق للقياس من الرياض. **الأرقام تحتاج قياس في P1-03** بالطريقة دي: المالك يفتح [gcping.com](https://gcping.com) من الرياض وجدة والدمام على STC و Mobily و Zain، ونسجل الـ median لـ `me-central2` و `asia-south1` (Mumbai) و `europe-west3` (Frankfurt). ونشغّل كمان `curl -w "%{time_connect} %{time_starttransfer}\n"` على endpoint تجريبي في كل خيار. **معيار القبول:** p75 لـ TTFB للصفحة الديناميكية من الرياض أقل من 300 ms.

---

## 4. التكلفة الشهرية في 3 مراحل (بالدولار، بدون ضريبة)

**الافتراضات:** الإطلاق = حوالي 100–300 طلب/شهر مع ترافيك تصفح منخفض. المرحلة 2 = 1,000 طلب/شهر. المرحلة 3 = 10,000 طلب/شهر (~330 طلب/يوم) مع استخدام نشط للفصال والـ Realtime. **كل الأرقام دي تقديرات حجم.** الأسعار الأساسية من المصادر في القسم 2.1، وأي حاجة فيها معامل الدمام 1.6× أو استخدام متوقع **تحتاج تأكيد**.

### A — Vercel Pro + Supabase Pro (Mumbai) — أسعار القوائم مؤكدة، والاستخدام تقديري

| البند | الإطلاق | 1,000 طلب/شهر | 10,000 طلب/شهر |
|---|---|---|---|
| Vercel Pro + مقعد نشر إضافي | 40 | 40 | 40 |
| Vercel استخدام فوق رصيد الـ 20$ | 0 | 0–30 (يحتاج تأكيد) | 30–150 (يحتاج تأكيد) |
| Supabase Pro (25) + prod (Small 15 / Medium 60 / Large 110) + staging Micro 10 − رصيد 10 | 40 | 85 | 135 |
| PITR 7 أيام | 100 | 100 | 100 |
| Sentry Team (سنوي) | 26 | 26 | 26–80 (حسب حجم الأحداث) |
| **المجموع** | **~206** (106 بدون PITR) | **~250–280** | **~330–465** |
| بالريال | ~773 | ~940–1,050 | ~1,240–1,745 |

### C — GCP الدمام (موصى به) — **كله تقديري بمعامل 1.6× على أسعار أيوا، ويحتاج تأكيد من CNTXT**

| البند | الإطلاق | 1,000 طلب/شهر | 10,000 طلب/شهر |
|---|---|---|---|
| Cloud SQL prod: 1 vCPU / 3.75 GB، zone واحدة، 20 GB SSD + backups ← في المرحلة 3: HA بـ 2 vCPU / 7.5 GB و 100 GB | ~88 | ~95 | ~370 |
| Cloud SQL staging (db-f1-micro، 10 GB) | ~15 | ~15 | ~15 |
| Cloud Run prod: min 1 instance (1 vCPU / 1 GiB) ← في المرحلة 3: 2–4 instances | 50–70 | 60–100 | 120–250 |
| Cloud Run staging (scale to zero) | 0–5 | 0–5 | 0–5 |
| Load Balancer عام + شهادة مُدارة (لأن domain mapping مش متاح في `me-central2`) | ~18–25 (يحتاج تأكيد) | ~20–30 | ~25–40 |
| Cloud Storage (صور + وثائق) + egress للإنترنت | 5–15 | 10–25 | 30–70 |
| Cloud Scheduler و Secret Manager و Artifact Registry و Logging | 3–8 | 3–8 | 5–15 |
| Redis (Memorystore) للـ rate limit والكاش | — | — | 40–70 (يحتاج تأكيد) |
| VM لـ Centrifugo للـ Realtime (e2-small) | — | — | ~20 |
| نسخة احتياطية خارج GCP في Oracle جدة (Object Storage) | 1–3 | 1–5 | 3–10 |
| Sentry Team | 26 | 26 | 26–80 |
| **المجموع** | **~205–255** | **~230–310** | **~655–945** |
| بالريال | ~770–960 | ~860–1,160 | ~2,460–3,540 |

### B — VM في الدمام + Supabase self-hosted (للمقارنة بس)

| البند | الإطلاق | 1,000 طلب/شهر | 10,000 طلب/شهر |
|---|---|---|---|
| VM prod (e2-standard-2، 8 GB) + قرص 80 GB ← e2-standard-4 ← VM منفصلة للقاعدة + replica | ~90 | ~170 | ~400–550 |
| VM staging (e2-medium) | ~39 | ~39 | ~39 |
| LB + backups (GCS) + Oracle + Sentry | ~50 | ~55 | ~80–130 |
| **المجموع (بدون تكلفة ساعات التشغيل)** | **~180** | **~265** | **~520–720** |

**القراءة:** C أغلى من A بحوالي 0–50$/شهر في البداية، وبحوالي 300–500$/شهر في المرحلة 3. والفرق ده أساساً تمن قاعدة بيانات HA ووجود البيانات داخل المملكة. B قريب من C في السعر، لكنه بينقل مسؤولية الـ PITR والتحديثات والـ HA لفريق صغير، وده خطر غير مقبول على ledger مالي.

---

## 5. التوصية ومتى ننتقل

### 5.1 للإطلاق: الخيار C (GCP الدمام عن طريق CNTXT)

**المعمارية:**
```
المستخدم ──HTTPS──► Global External ALB (+ Cloud CDN للصور والأصول العامة فقط)
                        │
                        ▼
              Cloud Run (me-central2): Next.js 15 standalone container
              ├─ /api/webhooks/* (Moyasar, Tabby, Tamara, Shipping)
              ├─ /api/cron/*  ◄── Cloud Scheduler (OIDC)
              ├─ /api/realtime/* (SSE)  ◄── LISTEN/NOTIFY
              └─ /api/health , /api/ready
                        │  (Cloud SQL connector / Unix socket)
                        ▼
              Cloud SQL for PostgreSQL 16 (me-central2) + PITR + daily backups
              Cloud Storage (me-central2): public-media (عام عبر CDN) + vendor-docs (خاص، signed URLs V4)
              Secret Manager (regional secrets في me-central2)
              Cloud Logging: log bucket في me-central2
                        │
                        └─► نسخة منطقية مشفرة يومياً ─► GCS bucket في مشروع backup منفصل
                                                     └─► نسخة أسبوعية ─► Oracle Object Storage (جدة)
```

**التغييرات المطلوبة في SPEC قسم 2 (تحتاج موافقة المالك عبر الـ CEO، حسب قاعدة CLAUDE.md رقم 1):**

| مكوّن SPEC | البديل | ملاحظة للـ backend-engineer |
|---|---|---|
| DB: PostgreSQL على Supabase | Cloud SQL for PostgreSQL 16 | Prisma ومن غير أي تغيير في الـ schema. الـ RLS ميزة في Postgres، فنستخدمها بـ `SET LOCAL app.vendor_id` داخل الـ transaction كطبقة حماية إضافية (SPEC قسم 4) |
| Storage: Supabase Storage | Cloud Storage: bucket عام للصور وbucket خاص للوثائق بروابط موقعة مؤقتة | واجهة `StorageProvider` في `lib/providers/storage/` |
| Realtime: Supabase Realtime | **مرحلة 1:** SSE من Next.js + Postgres `LISTEN/NOTIFY` (بمكتبة `pg` مش Prisma). **مرحلة 3:** Centrifugo (مفتوح المصدر) على VM في نفس المنطقة، بـ subscription tokens لكل قناة | واجهة `RealtimeProvider`. صلاحية الاشتراك في القناة تتفحص على السيرفر (بدل RLS على القنوات)، وده بيحقق شرط SPEC 6.8 إن التاجر ما يشتركش في قناة غيره |
| Jobs/Cron: Vercel Cron أو pg_cron | Cloud Scheduler ← `POST /api/cron/<job>` بـ OIDC + جدول `Job` مع leasing (`FOR UPDATE SKIP LOCKED`) و heartbeat و idempotency | القسم 6.5 |
| Monitoring: Sentry | Sentry + Cloud Monitoring | تنظيف البيانات الشخصية إلزامي (6.4) |

**مبدأ يحمينا (fail-safe):** كل مزود خلف interface، ومفيش أي استيراد لـ `@supabase/*` في كود التطبيق. كده لو القانوني قال إن الاستضافة خارج المملكة مقبولة وقررنا نرجع لـ A، أو لو انتقلنا لـ AWS أو Azure السعودية، التغيير يبقى في الـ adapters والبنية بس.

### 5.2 للمستقبل ومتى ننتقل

| المحفّز (قابل للقياس) | الإجراء |
|---|---|
| CPU القاعدة فوق 60% لمدة 7 أيام، **أو** أكتر من ~3,000 طلب/شهر، **أو** أول بيع فوق 10,000 ر.س يوميًا بانتظام | Cloud SQL HA (regional) + مقاس أكبر. وده بيكون قبل المرحلة 3 |
| أكتر من ~1,000 اتصال Realtime متزامن، **أو** latency الـ SSE p95 فوق 1 ث (الحدود تقديرية وتتأكد باختبار حمل في P6) | ننقل `RealtimeProvider` لـ Centrifugo |
| الـ rate limit أو الكاش بيضغطوا على Postgres | Memorystore Redis |
| البحث العربي بطيء (p95 فوق 500 ms) | Meilisearch على VM في نفس المنطقة (SPEC قال "لاحقاً") |
| RTO المطلوب أقل من 4 ساعات | Standby دافي في منطقة ثانية داخل المملكة (Oracle جدة، أو AWS/Azure السعودية لما تتوفر) |
| AWS السعودية أو Azure Saudi Arabia East **متاحة فعلاً** وفيها Postgres مُدار متعدد الـ AZ، **مع** مشاكل حقيقية في دعم أو فوترة CNTXT | نعيد تقييم الانتقال في **P6** (قبل الإطلاق) أو بعد 6 شهور من الإطلاق. الانتقال: dump/restore أو logical replication + نشر نفس الـ container |
| النص النهائي لـ PDPL اتشال منه شرط التوطين **والمستشار وافق كتابياً** على الاستضافة خارج المملكة | ممكن نرجع لـ A لتقليل التكلفة والتشغيل. وده قرار مالك، مش تلقائي |

---

## 6. التشغيل: البيئات والأسرار والنسخ والمراقبة والـ jobs

### 6.1 البيئات

| البيئة | C (الموصى به) | A (البديل) | البيانات |
|---|---|---|---|
| **dev** | محلي: `docker compose` فيه Postgres 16 + fake-gcs-server + Next.js. والـ OTP يتطبع في الـ console (SPEC P1) | محلي: Supabase CLI (`supabase start`) | seed بس |
| **preview (لكل PR)** | Cloud Run revision بـ tag `pr-<n>` ومن غير ترافيك، على قاعدة staging | Vercel Preview + Supabase Branch (0.01344$/ساعة لكل branch) | seed بس |
| **staging** | مشروع GCP `suqalzl-staging`، دومين `staging.suqalzl.com` ورا IAP أو كلمة مرور، و Moyasar/Tabby/Tamara في وضع sandbox | مشروع Vercel + مشروع Supabase منفصل | **بيانات اصطناعية بس**. ممنوع نسخ بيانات عملاء حقيقية. تمرين الاسترجاع بيتعمل على instance منفصلة وتتمسح بعده |
| **prod** | مشروع GCP `suqalzl-prod`، الدومين `new.suqalzl.com` ثم `suqalzl.com` (D9) | Vercel prod + Supabase prod | حقيقية |
| **backup** | مشروع GCP `suqalzl-backup` منفصل وبصلاحيات قليلة، والـ bucket فيه retention lock | — | نسخ مشفرة |

- كل بيئة في **مشروع GCP منفصل** بحساب فوترة واحد، وفيه حدود إنفاق وتنبيهات ميزانية عند 50% و 80% و 100%.
- كل الموارد في `me-central2`. ونقيّد المواقع بـ Organization Policy `gcp.resourceLocations` على `in:me-central2-locations`. **دعم الـ policy دي مع CNTXT يحتاج تأكيد.**
- مهم: الـ log bucket الافتراضي `_Default` ممكن يكون global، فلازم ننشئ log bucket في `me-central2` ونوجّه السجلات ليه. **يحتاج تأكيد إن ده مدعوم في المنطقة.**

### 6.2 الأسرار

- **المكان:** Secret Manager (regional secrets في `me-central2`). مفيش أسرار في الكود ولا في الـ CI logs، والـ `.env.example` بيتحدّث مع كل متغير جديد (SPEC قسم 9). Cloud Run بيقرأ الأسرار كـ env vars مربوطة بـ secret version، والصلاحية لكل خدمة بـ service account خاص بيها.
- **الـ CI:** GitHub Actions بـ **Workload Identity Federation**، يعني من غير مفاتيح JSON. وفيه GitHub Environments (`staging` و `production`)، والإنتاج محتاج موافقة يدوية.
- **فصل المفاتيح:** كل بيئة ليها مفاتيح مستقلة، ومفاتيح live مش موجودة إلا في `prod`.

| السر | ملاحظة |
|---|---|
| `DATABASE_URL` (+ `DIRECT_URL` للـ migrations) | مستخدم للتطبيق صلاحياته DML بس، ومستخدم منفصل للـ migrations |
| `AUTH_SECRET` | تدوير كل 6 شهور مع فترة سماح للجلسات |
| `FIELD_ENCRYPTION_KEY` | لتشفير حقول الآيبان والوثائق الحساسة على مستوى التطبيق. **منفصل عن أي مفتاح تاني**، والتدوير بـ key versioning (فك بالقديم وتشفير بالجديد) |
| `MOYASAR_SECRET_KEY`، `MOYASAR_WEBHOOK_SECRET`، `TABBY_*`، `TAMARA_*` | لكل بيئة. التدوير عند مغادرة أي موظف أو أي اشتباه |
| `SMS_*`، `RESEND_API_KEY`، `SHIPPING_*`، `WHATSAPP_*` | لكل بيئة |
| `SENTRY_DSN`، `SENTRY_AUTH_TOKEN` (للـ CI بس) | — |
| `BACKUP_ENCRYPTION_PUBLIC_KEY` (age) | المفتاح الخاص **مش موجود على السيرفر**، المالك وحده بيحتفظ بيه offline مع نسخة ثانية في خزنة |

- مصادقة الـ cron في C بتكون بـ OIDC token من Cloud Scheduler، والسيرفر بيتحقق من الـ audience والـ service account، فمفيش سر مشترك. وفي A بنستخدم `CRON_SECRET`.

### 6.3 النسخ الاحتياطي والاسترجاع

**الأهداف:** RPO ≤ 5 دقائق (عن طريق PITR) و RTO ≤ 4 ساعات عند الإطلاق.

| الطبقة | C (الموصى به) | A (البديل) |
|---|---|---|
| 1. backups مُدارة | Cloud SQL automated backups يومية، بحفظ 30 نسخة. **أقصى حفظ ومدة سجلات الـ PITR في Enterprise تحتاج تأكيد** | Supabase يومية بحفظ 7 أيام |
| 2. PITR | مفعّل من أول يوم | add-on بـ 100$/شهر |
| 3. نسخة منطقية مستقلة | Cloud Run Job يومي الساعة 03:00 بتوقيت الرياض: `pg_dump -Fc` ← تشفير بـ `age` ← رفع لـ bucket في مشروع `suqalzl-backup` (Object Versioning + Retention Lock 35 يوم) | GitHub Action أو VM بيعمل `pg_dump` ← S3/GCS **خارج Supabase** |
| 4. نسخة في مكان ومزود مختلف | أسبوعياً لـ Oracle Object Storage في جدة (داخل المملكة، على الساحل الغربي). **سماح القانوني بنسخة مشفرة خارج المملكة يحتاج تأكيد، والافتراضي إن النسخ تفضل داخل المملكة** | نفس الفكرة |
| 5. الملفات | Object Versioning + soft delete على الـ buckets، ونسخ يومي لـ bucket الوثائق الخاصة لمشروع الـ backup | سكربت نسخ من Supabase Storage |
| 6. التحقق | `db:verify-backup` بعد كل نسخة: الـ checksum، و `pg_restore --list`، وعدد الصفوف للجداول المالية (`Order` و `Payment` و `WalletTransaction` و `Payout`) مقارنة بالإنتاج | نفس الشيء |
| 7. التنظيف | `backup:prune`: 7 يومية + 4 أسبوعية + 12 شهرية. **التنظيف من خلال الـ lifecycle policy بس، ومفيش حذف يدوي** | نفس الشيء |
| 8. تمرين استرجاع شهري | استرجاع على Cloud SQL instance مؤقتة في staging، وتشغيل smoke tests وحساب أرصدة 3 تجار ومقارنتها، وتسجيل الوقت الفعلي (RTO)، وبعدين مسح الـ instance. **qa-tester يوقّع على النتيجة** | نفس الشيء |

**ممنوع:** أي استرجاع فوق قاعدة الإنتاج الحية. الاسترجاع دايماً يكون لـ instance جديدة، وبعدين نحوّل الاتصال بموافقة المالك.

### 6.4 المراقبة والتنبيهات

| الأداة | الاستخدام | ملاحظة PDPL |
|---|---|---|
| **Sentry** (Team: 26$ سنوي / 29$ شهري، 50k خطأ) | أخطاء السيرفر والمتصفح، والـ releases مربوطة بالـ commit SHA | الأحداث بتتخزن خارج المملكة. **إلزامي:** `sendDefaultPii: false`، و `beforeSend` يمسح الجوال والإيميل والعنوان والآيبان، وتعطيل Session Replay أو تقنيعه بالكامل. البديل لو القانوني رفض: GlitchTip self-hosted في `me-central2`. **خيار تخزين البيانات (US/EU) يحتاج تأكيد** |
| **Cloud Monitoring uptime checks** | `GET /api/health` (التطبيق شغال) و `GET /api/ready` (DB + Storage) كل دقيقة | — |
| **Cloud Logging** | سجلات منظمة JSON بـ `requestId`، من غير بيانات شخصية في الرسائل | log bucket في `me-central2` |
| **Alert policies** | 5xx فوق 2% لمدة 5 دقائق • p95 latency فوق 1.5 ث • CPU القاعدة فوق 80% أو اتصالاتها فوق 80% من `max_connections` • فشل webhook Moyasar أكتر من 3 مرات في 10 دقائق • **heartbeat الـ cron متأخر أكتر من مرتين قد الفترة** • فشل backup أو verify • ميزانية 80% | الإشعارات بالإيميل + SMS للمالك و devops |
| **سجل التدقيق** | `AuditLog` في القاعدة (SPEC) + Cloud Audit Logs للبنية | — |

**حدود اتصالات Prisma:** `max_instances × connection_limit + اتصالات الـ jobs` لازم يفضل أقل من 80% من `max_connections`. مثال: 4 instances × 5 اتصالات + 5 = 25. وبنظبط `pool_timeout=10` و `statement_timeout=15s` و `idle_in_transaction_session_timeout=30s`. **الـ timezone:** القاعدة والتطبيق على UTC (SPEC قسم 5)، والعرض بس بيكون بتوقيت `Asia/Riyadh`.

### 6.5 الـ cron والـ jobs

**التصميم:** Cloud Scheduler في C، أو Vercel Cron في A، بيستدعي `POST /api/cron/<job>`. والـ handler بيعمل كده:
1. يتحقق من الـ OIDC (أو `CRON_SECRET`).
2. ياخد lease على الـ job بـ `UPDATE ... WHERE lockedUntil < now() ... RETURNING` أو `FOR UPDATE SKIP LOCKED`، عشان ما يشتغلش نفس الـ job مرتين.
3. يشتغل على دفعات صغيرة داخل transactions، وكل خطوة idempotent.
4. يكتب heartbeat (`lastRunAt` و `lastSuccessAt` و `lastError`)، والتنبيه بيعتمد عليه.
5. لو المهمة كبيرة يحطها في جدول `Job` (SPEC) ويعالجها worker endpoint بـ retries و backoff.

| الـ Job | الفترة | المرجع في SPEC |
|---|---|---|
| إلغاء الطلبات غير المدفوعة وفك الحجز (30 دقيقة) | كل 5 دقائق | 6.2 (5) |
| تفعيل وإنهاء العروض (Deals) ونفاد `stockLimit` | كل دقيقة | 6.7 |
| انتهاء طلبات السعر (48 س) والعروض والـ PriceLock (24 س) وفك المخزون | كل 5 دقائق | 6.8 |
| تذكيرات قبل انتهاء المهلة بساعتين | كل 15 دقيقة | 8 |
| `COMPLETED` بعد `holdDays` وتحويل القيود لـ `AVAILABLE` | كل ساعة | 6.3 و 6.4 |
| السلات المتروكة (بعد ساعة و 24 ساعة) | كل 30 دقيقة | 8 |
| مطابقة حالة الدفع مع Moyasar للطلبات المعلقة (احتياطي لو الـ webhook ما وصلش) | كل 10 دقائق | 6.2 (3) |
| `db:backup` ← `db:verify-backup` ← نسخة خارجية | يومياً 03:00 بتوقيت الرياض / أسبوعياً | 9 |
| تقرير الصحة اليومي (عدد الـ jobs الفاشلة، المعلقة، المدفوعات غير المطابقة) | يومياً | — |

حدود الأداة: Cloud Scheduler بيدعم فاصل دقيقة. **سعره لكل job (أول 3 مجانية لكل حساب فوترة حسب علمي) يحتاج تأكيد.** في A: **حدود Vercel Cron على Pro تحتاج تأكيد** (صفحة الحدود ما قدرتش أفتحها).

### 6.6 CI/CD (GitHub Actions)

1. **كل PR:** `npm ci` ← `lint` ← `typecheck` ← `vitest` ← `prisma validate` + `prisma migrate diff` (يفشل لو فيه migration مدمّرة من غير وسم) ← `next build` ← Playwright على preview (السيناريوهات الحرجة) ← axe.
2. **merge على `main`:** نبني الـ container مرة واحدة بالـ SHA ونرفعه لـ Artifact Registry في `me-central2`، وبعدين:
   - staging: Cloud Run Job لـ `prisma migrate deploy` ← نشر ← smoke tests.
   - prod (بموافقة يدوية في GitHub Environment): نفس الـ image ← migrate ← نشر revision بـ 0% ترافيك ← smoke على الـ tag URL ← 10% ← 100%.
3. **Rollback:** نحوّل الترافيك للـ revision السابقة في أقل من دقيقة. الـ migrations بأسلوب expand/contract، يعني ما نحذفش عمود في نفس الـ release اللي بطّلت تستخدمه.
4. **`release:verify` بعد النشر:** `/api/ready` يرجع 200، الـ commit SHA في `/api/health` مطابق، Sentry release اتسجلت، و webhooks sandbox بتوصل في staging.

---

## 7. المخاطر

| الخطر | الاحتمال / الأثر | المعالجة |
|---|---|---|
| شرط التوطين في PDPL يتعتمد (أو ما يتعتمدش) | متوسط / عالي | C متوافق في الحالتين. والـ interfaces بتسيب الرجوع لـ A ممكن |
| تأخير أو تعقيد في التسجيل مع CNTXT (مستندات، فوترة بالفاتورة، دعم) | متوسط / عالي على الجدول الزمني | **نبدأ التسجيل الأسبوع ده.** البديل الجاهز: Oracle جدة/الرياض (أسعار موحدة عالمياً)، بس توفر Postgres المُدار يحتاج تأكيد |
| منطقة واحدة في الدمام على ساحل الخليج، وفي 2026 اتضربت مراكز بيانات في الإمارات والبحرين | منخفض إلى متوسط / عالي جداً | نسخ مشفرة في مزود ومكان مختلف (Oracle جدة)، وتمرين استرجاع شهري، وخطة standby في منطقة ثانية (القسم 5.2) |
| أسعار الدمام أعلى من تقديري (المعامل 1.6× غير رسمي، وأسعار Tier 2 مش منشورة نصاً) | متوسط / متوسط | عرض سعر رسمي من CNTXT قبل الالتزام، وتنبيهات ميزانية |
| الـ Realtime اللي بنشغّله بنفسنا يكون أقل نضجاً من Supabase Realtime | متوسط / متوسط | SSE بسيط في البداية، واختبار حمل في P6، و Centrifugo جاهز كبديل خلف نفس الواجهة |
| مزودين خارج المملكة بيعالجوا بيانات شخصية (Sentry، Resend، Pixels، وربما مزود الـ SMS) | عالي / متوسط | تنظيف البيانات الشخصية، وقائمة معالجين فيها SCCs، والقرار للمستشار القانوني. **مش من قراراتي** |
| اتصالات قاعدة البيانات تخلص مع توسع Cloud Run | متوسط / عالي | `max_instances` محدد، و `connection_limit` صغير، وتنبيه عند 80% |
| تعديل SPEC قسم 2 مش متوافق عليه | — | القرار لازم يعدي على المالك عبر الـ CEO قبل P1 |

---

## 8. المطلوب من المالك يدوياً (بالترتيب)

1. **الموافقة** على O6 = الخيار C، وعلى تعديل SPEC قسم 2 (Storage و Realtime و Jobs) حسب الجدول في 5.1.
2. **إرسال سؤال للمستشار القانوني (PDPL)**، والرد مطلوب قبل بداية P1:
   - (أ) حالة المادة 23(2) المقترحة (التخزين داخل المملكة) بعد انتهاء الاستشارة في 5 نوفمبر 2026.
   - (ب) هل مسموح بنسخة احتياطية مشفرة خارج المملكة؟
   - (ج) المعالجون خارج المملكة: Sentry و Resend و Pixels و Moyasar/Tabby/Tamara.
   - (د) هل محتاجين تسجيل في السجل الوطني للمتحكمين؟
3. **فتح حساب منشأة مع CNTXT** (cloud.cntxt.com) بالسجل التجاري والرقم الضريبي، وطلب عرض سعر رسمي بالريال يجاوب على الأسئلة دي:
   - أسعار `me-central2` لـ Cloud Run (Tier 2) و Cloud SQL PostgreSQL (1 و 2 vCPU، zone واحدة و HA) والتخزين والـ egress والـ Load Balancer.
   - توفر هذه الخدمات في `me-central2`: Secret Manager regional، و Artifact Registry، و log buckets إقليمية، و Cloud Monitoring uptime checks، و Cloud Armor، و Memorystore، و Org Policy لتقييد المواقع.
   - أقصى حفظ للـ backups ومدة سجلات PITR في Cloud SQL Enterprise.
   - خطة الدعم وسعرها، ومدة التفعيل، وأي حد أدنى للالتزام، والفوترة والضريبة.
   - دعم Workload Identity Federation مع GitHub.
4. **قياس زمن الاستجابة:** افتح https://gcping.com من الرياض وجدة والدمام (على STC و Mobily و Zain)، وابعت screenshot فيها `me-central2` و `asia-south1` و `europe-west3`.
5. **إنشاء GitHub Organization ومستودع خاص** للمشروع، وإضافة devops-engineer كـ maintainer. حالياً مفيش remote (`docs/status.md`).
6. (اختياري للتعافي من الكوارث) فتح حساب Oracle Cloud والاشتراك في منطقة جدة `me-jeddah-1`، عشان نسخة الـ backup الأسبوعية.
7. **حفظ مفتاح فك تشفير النسخ الاحتياطية** (هسلّمه في P1-03) offline، مع نسخة ثانية في خزنة. من غيره ما نقدرش نرجّع أي نسخة.

> كل ما سبق محتاج حسابات وموافقات من المالك. أنا ما لمستش أي خدمة مدفوعة، ولا DNS، ولا أسرار.

---

## 9. التسليم للفرق

- **backend-engineer (في P1):**
  - نبني واجهات `StorageProvider` و `RealtimeProvider` و `JobRunner` (cron handler بـ lease و heartbeat)، ومن غير أي استيراد لـ `@supabase/*` في كود التطبيق.
  - Prisma بـ `connection_limit` و `pool_timeout` من الـ env.
  - RLS كطبقة إضافية بـ `SET LOCAL`.
  - `/api/health` و `/api/ready`.
  - تشفير الآيبان بـ `FIELD_ENCRYPTION_KEY`.
  - `beforeSend` في Sentry لتنظيف البيانات الشخصية.
  - تحديث `.env.example` بالمتغيرات في 6.2.
- **devops-engineer (أنا، P1-03 بعد G1):** Terraform للمشاريع الثلاثة، و CI/CD حسب 6.6، و jobs الـ backup و verify، والتنبيهات حسب 6.4، و runbook للاسترجاع في `docs/DISASTER-RECOVERY.md`.
- **qa-tester (في P6):** يوقّع على أول تمرين استرجاع، واختبار حمل على Realtime (السيناريو 7) و checkout، واختبار إن الـ cron ما يشتغلش مرتين (نشغّل نفس الـ job مرتين في نفس الوقت).
- **legal-contracts:** الأسئلة في البند 2 من القسم 8، وتحديث قائمة المعالجين في `docs/legal/privacy-policy.md` بعد القرار (الملف ده مش بتاعي).
- **ceo:** تحديث جدول O6 في `docs/decisions.md` و `company/board.md` بحيث يشاوروا على الملف ده. أنا ما عدّلتهمش لأن المهمة حصرت تعديلاتي في الملف ده.

## 10. المصادر (كلها اطلاع 2026-11-17)

- Supabase Regions — https://supabase.com/docs/guides/platform/regions
- Supabase Pricing — https://supabase.com/pricing.md
- Supabase Self-Hosting with Docker — https://supabase.com/docs/guides/self-hosting/docker
- Vercel Regions (آخر تحديث 2026-08-11) — https://vercel.com/docs/concepts/edge-network/regions
- Vercel Pro Plan (آخر تحديث 2026-09-15) — https://vercel.com/docs/plans/pro-plan
- Vercel dxb1 incident 2–16 مارس 2026 — https://isdown.app/status/vercel/incidents/545104-dubai-region-dxb1-is-unavailable
- Vercel community, dxb1 unavailable (7 سبتمبر 2026) — https://community.vercel.com/t/dxb1-dubai-region-unavailable-maintenance-eta-and-hobby-availability/48932
- Google Cloud Dammam region access (آخر تحديث 2026-11-10) — https://docs.cloud.google.com/docs/dammam-region-access
- Cloud SQL region availability — https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview
- Cloud SQL pricing — https://cloud.google.com/sql/pricing?hl=en
- Cloud Run locations — https://docs.cloud.google.com/run/docs/locations
- Cloud Run pricing — https://cloud.google.com/run/pricing?hl=nl
- Cloud Scheduler locations — https://docs.cloud.google.com/scheduler/docs/locations
- gcloud-compute.com (غير رسمي، 2026-11-15) — https://gcloud-compute.com/me-central2.html و https://gcloud-compute.com/e2-medium.html
- CNTXT individual onboarding (يوليو–سبتمبر 2026) — https://discuss.google.dev/t/ksa-region-cntxt-individual-onboarding-unavailable-completely-blocks-sandbox-testing/378547
- OCI Regions (2026-06-22) — https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm
- OCI Pricing — https://www.oracle.com/sa/cloud/pricing/
- AWS Saudi region December 2026 — https://w.media/aws-saudi-arabia-cloud-region-set-for-december-2026-launch/
- AWS UAE region damage and data loss — https://w.media/aws-cant-recover-resources-and-data-stored-in-uae-region-hit-during-us-iran-conflict/ و https://cybersecuritynews.com/aws-middle-east-services-disrupted/
- Azure Saudi Arabia East (November 2026) — https://news.microsoft.com/source/emea/2026/08/microsoft-announces-saudi-arabia-east-datacenter-region-will-be-available-in-november-2026/
- Data centers in Saudi Arabia (مُجمِّع) — https://getdeploying.com/datacenters-in-saudi-arabia
- SDAIA draft PDPL amendments (أكتوبر 2026) — https://www.clydeco.com/es/insights/2026/10/sdaia-publishes-draft-amendments-to-the-pdpl و https://gowlingwlg.com/insights-resources/articles/2026/saudi-arabias-proposed-pdpl-amendments
- Saudi transfer risk assessment guideline (مارس 2025) — https://www.clydeco.com/en/insights/2025/03/update-on-saudi-arabia-risk-assessment-guidelines
- Sentry pricing — https://sentry.io/pricing/
