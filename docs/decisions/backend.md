# قرارات الـ Backend — P0 (backend-engineer)

> **الحالة:** مقترح من backend-engineer، بانتظار الـ CEO والمالك في بوابة G1.
> **تاريخ الاطلاع على كل المصادر:** 2026-11-17.
> **النطاق:** O4 (الشحن)، O5 (SMS وواتساب)، التحقق التقني من Moyasar و Tabby و Tamara، ومراجعة نموذج البيانات (SPEC قسم 5) مقابل القواعد 6.1–6.8.
> **مسودة الـ CEO** (`docs/decisions.md`) تعاملت معها كمسودة غير موثوقة: أي رقم فيها راجعته من المصدر، والفروقات مكتوبة في كل قسم تحت "تصحيحات على المسودة".
> أي سعر أو ميزة لم أجد لها مصدراً رسمياً مكتوب عليها **"يحتاج تأكيد من المزود"**.
> لم أعدّل `SPEC.md` ولا أي ملف آخر، ولم أكتب كود تطبيق ولا migrations فعلية. أسماء الـ migrations في القسم 6 مقترحة فقط وتُنفذ في P1 بعد G1.

---

## 0. ملخص تنفيذي

| القرار | التوصية | الثقة | ما يمنع الاعتماد النهائي |
|---|---|---|---|
| O4 الشحن | **مجمّع شحن (OTO مرشح أول، Torod بديل) خلف `ShippingProvider`، + مسار "شحنة عالية القيمة" منفصل بتأمين** للسيوف وما فوق حد معين. بدون دفع عند الاستلام عند الإطلاق | متوسطة | الـ API في OTO منشور كميزة لباقة Enterprise فقط؛ وثائق Torod العامة غير كافية؛ لا يوجد حقل تأمين موثق في OTO |
| O5 SMS | **Taqnyat للـ SMS** (أسعار منشورة شاملة الضريبة، REST، تقارير تسليم webhook)، والـ OTP **نولّده ونتحقق منه بأنفسنا**. **واتساب عبر Meta Cloud API** (مباشرة أو عبر BSP) للإشعارات | عالية للـ SMS، متوسطة للواتساب | تأكيد اشتراط تسجيل قوالب الرسائل المحلية، ومدة تسجيل اسم المرسل |
| Moyasar | يغطي كل طرق SPEC (مدى، فيزا، ماستركارد، Apple Pay، STC Pay) + Samsung Pay و Google Pay. Apple Pay على الويب بدون حساب Apple Developer | عالية | التوقيع في الـ webhook **ليس HMAC** (سر مشترك في جسم الطلب)، فالتحقق بإعادة جلب الدفعة إلزامي. سقف العملية الواحدة واسترجاع STC Pay والاسترجاع الجزئي المتعدد تحتاج تأكيداً |
| Tabby / Tamara | كلاهما مناسب تقنياً. **سقف BNPL في السعودية 10,000 ر.س (تعميم ساما)**، فلا يغطي منتجاً بـ 25,000 ر.س إلا بمنتج تمويل أطول (تابي أعلنت خططاً حتى 50,000 ر.س) | متوسطة | الحدود الفعلية لكل عميل ديناميكية، والحد الأدنى للتاجر، والرسوم |
| الـ Schema | 7 ثغرات حرجة و 14 عالية الأهمية. أهمها: تسريب العروض بين التجار عبر قناة Realtime المشتركة، وحجز المخزون كعداد بلا انتهاء، والـ RLS لا يحمي استعلامات Prisma، وغياب جداول الاسترجاع والشحنات وتاريخ الأسعار | عالية | لا شيء؛ جاهزة لـ P1 بعد G1 |

---

## 1. O4 — مزود الشحن

### 1.1 المتطلبات المستخرجة من SPEC
- طلب واحد ينقسم إلى SubOrders، **كل تاجر يشحن من عنوانه** (multi-pickup)، ومنتجات المنصة من مستودع المالك (D3، D6، 6.6).
- وضعان: `PLATFORM_SHIPPING` (المنصة تصدر البوليصة) و `SELF_SHIPPING` (التاجر يُدخل رقم التتبع).
- webhook تتبع يحدّث `SHIPPED`/`DELIVERED` (6.3).
- منتجات حساسة: **سيوف حتى 25,000 ر.س** (قيمة + قيود أسلحة بيضاء)، **دهن عود وعطور** (سوائل قابلة للاشتعال)، **زعفران** (غذاء)، وخواتم (قد تُعامل كمجوهرات).
- الدفع عند الاستلام: **غير متاح حالياً** حسب مسودة سياسة الشحن (`docs/legal/shipping-policy.md` بند 9)، وغير موجود في `Order.paymentMethod`.

### 1.2 جدول المقارنة

| المعيار | OTO (مجمّع) | Torod (مجمّع) | SMSA مباشر | Aramex مباشر | SPL (البريد السعودي) مباشر |
|---|---|---|---|---|---|
| نوع الـ API | REST JSON على `https://api.tryoto.com/rest/v2/...` بـ Bearer token يُستخرج من refresh token في لوحة OTO | يذكر الموقع "API docs and webhooks" ويحيل لمركز المساعدة، ولم أجد مرجع API عاماً بمسارات كاملة. **يحتاج تأكيد من المزود** | API key من بوابة SMSA (مستخدم في تكامل سلة المباشر) | **SOAP** (Shipping Services API) | REST بـ Bearer token يتجدد، مع customer code و branch code معتمدين |
| وثائق منشورة | مقالات مساعدة لكل endpoint (createOrder، createPickupLocation، webhook) + مجموعة Postman | ضعيفة علناً | غير منشورة علناً (تُعطى مع الحساب). **يحتاج تأكيد من المزود** | دليل PDF كامل | صفحة مقدمة فقط |
| Sandbox | لم أجد بيئة staging موثقة. **يحتاج تأكيد من المزود** | غير مذكور | **يحتاج تأكيد من المزود** | بيئة اختبار `ws.dev.aramex.net` موثقة | **يحتاج تأكيد من المزود** |
| Webhooks التتبع | نعم: `orderStatus` و `shipmentError`، مع `secretKey` للتوقيع و `authorizationKey` في هيدر `Authorization` (خوارزمية التوقيع غير موثقة) | مذكورة بالاسم فقط | نعم (تسجيل رابط webhook في حساب SMSA) | صفحة المطورين لا تذكر webhooks (Tracking API، غالباً polling). **يحتاج تأكيد من المزود** | غير مذكور |
| تعدد نقاط الاستلام (تجار) | نعم: `createPickupLocation` بـ `code` و `brandName`، وتمرير `pickupLocationCode` لكل طلب؛ وحدة "Warehouses & Pick-up Locations" بنقاط غير محدودة | الواجهة تسمح باختيار/إنشاء عنوان استلام لكل شحنة؛ عبر الـ API **يحتاج تأكيد من المزود** | **يحتاج تأكيد من المزود** | عنوان الشاحن (Shipper) وعنوان الاستلام (Pickup) حقول في الطلب، فمبدئياً ممكن لكل شحنة | **يحتاج تأكيد من المزود** |
| الدفع عند الاستلام | نعم: `payment_method` = `cod`/`paid` و `amount_due` و `codFee`؛ تحويل مبالغ COD كل 14 يوماً (مجاني/Starter) أو 7 أيام (Scale/Pro) | نعم، بتحويل "نصف شهري أو أسبوعي أو فوري" | **يحتاج تأكيد من المزود** | نعم، خدمة `CODS` (الدليل يذكر أن العملة USD، وهذا غالباً قديم. **يحتاج تأكيد من المزود**) | **يحتاج تأكيد من المزود** |
| القيمة العالية والتأمين | **لا يوجد حقل تأمين** في createOrder؛ يوجد `amount` و `customsValue`. **يحتاج تأكيد من المزود** | غير مذكور | **يحتاج تأكيد من المزود** | حقل `Insurance Amount` موجود | يوجد تأمين: التعويض للشحنة المؤمنة = القيمة المصرّح بها + رسوم الشحن؛ وغير المؤمنة 75 ر.س فقط حتى 5 كجم. نسبة رسم التأمين غير منشورة |
| السيوف | المدونة العامة لـ OTO تذكر "الأدوات المعدنية مثل السيوف والسكاكين" ضمن الممنوعات، وممنوعة من الشحن الجوي | **يحتاج تأكيد من المزود** | **يحتاج تأكيد من المزود** | **يحتاج تأكيد من المزود** | **يحتاج تأكيد من المزود** |
| العطور ودهن العود | العطر سائل قابل للاشتعال يُشحن بقيود؛ أرامكس تذكر "السوائل" ضمن الممنوعات | — | — | السوائل ممنوعة حسب المصدر نفسه | — |
| تغطية المدن | تجميع أكثر من 15 شركة شحن محلية | يذكر أكثر من 240 شركة (وفي صفحة أخرى أكثر من 260) | شبكة وطنية. **يحتاج تأكيد من المزود** | شبكة وطنية. **يحتاج تأكيد من المزود** | أوسع تغطية متوقعة (عنوان وطني). **يحتاج تأكيد من المزود** |
| الأسعار المنشورة | **باقات (صفحة محدثة مايو 2026):** مجاني 0 ر.س؛ Starter 59 ر.س/شهر (50 شحنة بعقودك)؛ Scale 279 (250)؛ Pro 1,599 (1,000)؛ Enterprise بالاتفاق؛ خصم 25% سنوي. **الشحن بأسعار OTO غير محدود في كل الباقات**، والحصة المذكورة تخص الشحن بعقودك الخاصة | غير منشورة، و"بدون حد أدنى للشحنات أو عقود طويلة" | غير منشورة | غير منشورة | غير منشورة |
| أمثلة سعر لكل شحنة | مدونة OTO (منشورة يونيو 2025، والسعر فيها مكتوب عليه "[VERIFIED DATE — update before publishing]"، أي غير محدّث): 10–15 كجم الرياض–جدة: SPL 14.00، J&T 18.00، أرامكس 19.26، ناقل 19.80، سمسا 22.20 ر.س. **أرقام غير موثوقة، تحتاج تأكيداً من حاسبة OTO** | — | — | — | — |
| الـ API في أي باقة؟ | الصفحة الرسمية تذكر **"Custom Channels (API)" تحت Enterprise فقط**. **يحتاج تأكيد من المزود** هل الـ REST API متاح في Scale/Pro | **يحتاج تأكيد من المزود** | ضمن العقد | ضمن العقد | ضمن العقد |
| عبء الهندسة | تكامل واحد | تكامل واحد | تكامل لكل شركة | SOAP قديم، أثقل | تكامل لكل شركة |

### 1.3 المصادر
- OTO Create Order: https://help.tryoto.com/en/support/solutions/articles/150000213808-orders-apis
- OTO Create Webhook: https://help.tryoto.com/en/support/solutions/articles/150000200662-how-to-create-a-webhook
- OTO Create Pickup Location: https://help.tryoto.com/en/support/solutions/articles/150000200666-how-to-create-a-pickup-location
- OTO Create Order via API (المصادقة وإنشاء الشحنة تلقائياً): https://help.tryoto.com/en/support/solutions/articles/150000200661-how-to-create-an-order-thru-oto-apis
- OTO الباقات (آخر تحديث مايو 2026): https://help.tryoto.com/en/support/solutions/articles/150000211067-oto-packages-and-plans-features-explained — و https://www.tryoto.com/plans
- OTO مجموعة Postman: https://apis.tryoto.com/view/metadata/UzBnr6go
- OTO أمثلة الأسعار (غير محدّثة): https://www.tryoto.com/otopedia/blog/ارخص-شركة-شحن-داخلي-في-السعودية
- OTO الممنوعات: https://www.tryoto.com/otopedia/blog/ممنوعات-الشحن
- Torod: https://torod.co/en/about-us — https://torod.co/en/services/torod-system — https://help.torod.co/en
- Aramex دليل API (SOAP): https://www.aramex.com/content/uploads/109/232/42194/shipping-services-api-manual.pdf — https://www.aramex.com/developers/aramex-apis
- SMSA (تكامل مباشر بـ API key و webhook): https://help.salla.sa/en/article/direct-integration-with-smsa-express/a5sl5s3v2mfwhomnoof3b7lo
- SPL APIs: https://wiki.partners.splonline.com.sa/spl-apis/getting-started-with-lis-apis — سياسة التعويض: https://splonline.com.sa/en/compensation-policy/

### 1.4 تصحيحات على مسودة الـ CEO
1. **أسعار باقات OTO في المسودة خاطئة أو قديمة.** المسودة: Starter 199 ر.س/200 شحنة و Scale 399/1000. الصفحة الرسمية (مايو 2026): Starter 59/50، Scale 279/250، Pro 1,599/1,000. والحصة تخص **عقود التاجر الخاصة**، والشحن بأسعار OTO غير محدود في كل الباقات.
2. المسودة تقول إن Torod لديه "توثيق API و webhooks". لم أجد مرجع API عاماً؛ الموجود رابط بعنوان "API docs and webhooks" يحيل لمركز مساعدة فيه مقالات قليلة. **غير متحقق منه.**
3. مخاطرة "الـ API في Enterprise فقط" صحيحة وما زالت قائمة.

### 1.5 التوصية
**مجمّع شحن خلف `ShippingProvider`، بثلاث مسارات:**

1. **المسار العادي (أغلب المنتجات):** OTO كمرشح أول. السبب: الـ API الوحيد الموثق علناً بين المجمّعات (createOrder و createPickupLocation و webhooks)، وفيه نقطة استلام لكل تاجر (`pickupLocationCode` = `vendor:{vendorId}:{locationId}`)، وتسعير معلن. Torod بديل إذا كانت باقة الـ API في OTO مكلفة أو إذا قدّم Torod sandbox ووثائق كاملة.
2. **مسار القيمة العالية والمقيدة** (`Product.shippingClass` = `HIGH_VALUE` أو `BLADE` أو أن قيمة SubOrder فوق `highValueThreshold`، مقترح 5,000 ر.س): **لا تصدر له بوليصة تلقائياً.** الطلب الفرعي يظهر في لوحة الإدارة "يحتاج شحناً خاصاً" وتصدر البوليصة يدوياً عبر شركة تقبل الصنف وتؤمّن بالقيمة المصرّحة (SPL أو أرامكس لديهما تأمين موثق)، ويُدخل رقم التتبع يدوياً. يتحول إلى تكامل آلي لاحقاً عند وضوح الحجم. السبب: دون تأمين، تعويض الشحنة المفقودة عند SPL مثلاً 75 ر.س فقط مقابل سيف بـ 25,000 ر.س.
3. **`SELF_SHIPPING`:** التاجر يدخل اسم الشركة ورقم التتبع. لا webhook، فالتحديث بـ polling أو يدوياً، ويُقبل `DELIVERED` من التاجر بإثبات أو بعد مهلة.

**الدفع عند الاستلام:** لا يُفعّل في الإطلاق. السبب: نموذج D1/D2 (كل المال يدخل حساب المنصة ثم يُحوَّل يدوياً) يجعل COD تسوية إضافية مع المجمّع، ومخاطرة رفض الاستلام على منتجات غالية. الحقول تبقى في الـ interface (`codAmount = 0`) ليُفعّل لاحقاً بقرار المالك.

**شكل الـ interface** (توصيف فقط، وليس كوداً):
`quote(origin, destination, parcels, declaredValue)`، `createShipment(subOrder, pickupLocation, parcels, declaredValue, insured)`، `getLabel(shipmentId)`، `cancel(shipmentId)`، `track(shipmentId)`، `parseWebhook(headers, body) → ShipmentEvent[]`، `upsertPickupLocation(vendorLocation)`.

### 1.6 المخاطر
| الخطر | الأثر | المعالجة |
|---|---|---|
| الـ API في OTO يتطلب Enterprise | تكلفة شهرية غير معروفة | سؤال 1 أدناه؛ Torod بديل؛ الـ interface يسمح بالتبديل |
| توقيع webhook في OTO غير موثق | تزوير حالة `DELIVERED` يفتح رصيد التاجر مبكراً | هيدر `Authorization` سري + **إعادة جلب حالة الشحنة من الـ API قبل أي تحول** + قائمة IP إن وُجدت |
| رفض شحن السيوف أو دهن العود | منتجات لا تُشحن | `shippingClass` على المنتج يحدد الشركات المسموحة، ويخفي خيار الشحن غير المتاح؛ سؤال المزودين |
| التاجر الذي يغير عنوانه | بوليصة من عنوان قديم | `VendorPickupLocation` بنسخة، ومزامنة مع المزود عند التعديل |
| تعويض ضعيف بدون تأمين | خسارة كاملة للمنصة | المسار 2 + قرار المالك على من يتحمل رسم التأمين |
| تسعير الشحن في `ShippingZone` لا يطابق تكلفة المزود | خسارة على كل شحنة | تخزين `Shipment.cost` الفعلي ومقارنته بـ `SubOrder.shippingFee` في تقرير شهري |

### 1.7 أسئلة نرسلها لمزودي الشحن
**لـ OTO و Torod (نفس الأسئلة):**
1. هل الـ REST API و webhooks التتبع متاحة في باقة Scale أو Pro، أم Enterprise فقط؟ كم سعر Enterprise لحجم 150–500 شحنة شهرياً؟
2. هل توجد بيئة sandbox/staging بمفاتيح اختبار؟ ما الرابط؟
3. هل يمكن إنشاء نقاط استلام عبر الـ API لعدد غير محدود من التجار (عناوين وجوالات مختلفة) تحت حساب واحد، وإصدار بوليصة لكل طلب من نقطة استلام مختلفة؟ هل يظهر اسم المنصة أم اسم التاجر كمرسل على البوليصة؟
4. ما آلية توقيع الـ webhook بالضبط (اسم الهيدر، الخوارزمية HMAC-SHA256 أم غيرها، النص الموقّع)؟ وسياسة إعادة المحاولة؟ وعناوين IP للسيرفرات؟
5. التأمين: هل يوجد حقل للقيمة المصرّحة/التأمين في الـ API؟ ما النسبة والحد الأقصى؟ أي الشركات تؤمّن شحنة بـ 25,000 ر.س؟
6. أي شركات تقبل: (أ) السيوف التراثية/الأسلحة البيضاء المزخرفة، (ب) دهن العود والعطور، (ج) الزعفران، (د) الخواتم الفضية؟ بأي شروط تغليف؟
7. أسعار شحنة 1 كجم و 3 كجم و 5 كجم من الرياض وجدة والدمام إلى: الرياض، جدة، الدمام، أبها، تبوك، حائل، جازان. وتكلفة الشحنة المرتجعة.
8. هل تدعمون الشحنات المرتجعة (Return shipment) عبر الـ API بنفس الحساب؟
9. هل يدعم الـ API عدة طرود (multi-piece) للشحنة الواحدة؟ وإلغاء البوليصة قبل الاستلام بدون رسوم؟
10. حدود الطلبات (rate limits) ومدة صلاحية الـ access token.

**لـ SMSA و Aramex و SPL (للمسار عالي القيمة):**
1. هل تقبلون شحن سيوف تراثية بقيمة حتى 25,000 ر.س داخل المملكة؟ ما الإجراءات؟
2. رسوم التأمين (نسبة من القيمة) والحد الأقصى للقيمة المؤمنة، والمستندات المطلوبة للمطالبة.
3. هل يوجد خيار توقيع المستلم أو التحقق من الهوية عند التسليم؟
4. هل يوجد REST API وبيئة اختبار؟ (أرامكس: هل ما زال SOAP هو الوحيد؟)

---

## 2. O5 — مزود SMS (و WhatsApp)

### 2.1 المتطلبات
- OTP لتسجيل الدخول بالجوال (Rate limit: 5 محاولات/ساعة لكل رقم و IP — قسم 9).
- إشعارات قسم 8 (تأكيد الطلب، الشحن، التحويل المالي للتاجر، الفصال).
- واتساب: السلات المتروكة، الفصال (قسم 8)، و "WhatsApp Cloud API" مذكورة في برومبت P5.

### 2.2 جدول المقارنة

| المعيار | Taqnyat | Unifonic | Authentica (بديل OTP) | Meta WhatsApp Cloud API (مباشر) |
|---|---|---|---|---|
| API | REST: `POST https://api.taqnyat.sa/v1/messages`، Bearer token من لوحة المطور، حقول `recipients` و `body` و `sender` و `scheduledDatetime`؛ يدعم الإرسال بقالب `templateName` و `variables`؛ رصيد `GET /account/balance`؛ أسماء المرسلين `GET /v1/messages/senders` | وثائق الـ API تتطلب تسجيل دخول (لم أطّلع عليها) | منصة OTP سعودية | Graph API رسمي |
| تقارير التسليم | webhook برابط و passphrase من لوحة المطور، 3 محاولات إعادة | **يحتاج تأكيد من المزود** | **يحتاج تأكيد من المزود** | webhooks رسمية |
| OTP جاهز | `verify.php` يأخذ `apiKey` في جسم الطلب، **SMS فقط**، والمثال كود من 4 أرقام، ولا مدة صلاحية موثقة | "Authenticate" (الوثائق خلف تسجيل دخول) | SMS وواتساب وإيميل مع تحويل تلقائي بين القنوات (failover)، وتخزين البيانات داخل المملكة حسب الخبر الصحفي | قوالب Authentication |
| Sandbox | لا sandbox؛ رصيد تجريبي 1 ر.س | **يحتاج تأكيد من المزود** | 100 رصيد OTP مجاني عند التسجيل | رقم اختبار من Meta |
| الأسعار المنشورة | **شاملة الضريبة:** 5,000 رسالة 529 ر.س؛ 10,000 بـ 920؛ 25,000 بـ 2,185؛ 50,000 بـ 4,025؛ 100,000 بـ 6,325؛ الرصيد صالح حتى 365 يوماً؛ REST في كل الباقات | غير منشورة. **يحتاج تأكيد من المزود** | غير منشورة. **يحتاج تأكيد من المزود** | Meta تحاسب لكل رسالة قالب (marketing و utility و authentication)؛ قوالب utility مجانية داخل نافذة خدمة العملاء (24 ساعة). سعر السعودية حسب مصدر ثانوي (ساري من 1 أكتوبر 2026): marketing 0.0576$، utility 0.0107$، authentication 0.0107$. **يحتاج تأكيد من جدول أسعار Meta الرسمي** |
| اسم المرسل | 230 ر.س سنوياً شامل الضريبة لكل اسم إضافي (رسوم الهيئة) | 299 ر.س سنوياً شامل الضريبة، صالح سنة ويُجدد حتى 5 سنوات | — | لا ينطبق (رقم واتساب موثق) |
| واتساب | قناة WhatsApp API؛ عرض محدود "Quick Start" بـ 150 ر.س (إعداد ومساعدة توثيق Meta، 5 مقاعد، شهر أول مجاني)؛ **رسوم Meta تُحاسب مباشرة من Meta حسب الاستخدام** | WhatsApp Business API بقوالب جاهزة (منها OTP والسلة المتروكة)، ويذكرون أن الإعداد 48–72 ساعة. الأسعار غير منشورة | واتساب OTP | مباشرة |

### 2.3 تسجيل اسم المرسل في السعودية (من وثائق Unifonic الرسمية، وهي اشتراطات الهيئة عملياً)
- خطاب تفويض على ورق المنشأة موقّع ومختوم ومصدّق من الغرفة التجارية، والسجل التجاري، ونموذج إثبات التعاقد.
- إذا كان الاسم لا يطابق اسم المنشأة أو نشاطها: علامة تجارية أو امتياز أو تسجيل نطاق `.sa` أو مستند رسمي ("شهادة معروف لم تعد مقبولة").
- الاسم الخدمي (transactional) حتى 11 حرفاً لاتينياً، بدون أرقام أو حروف عربية. الاسم الإعلاني حتى 8 أحرف وينتهي بـ `-AD`. **لا يجوز استخدام الاسم الخدمي للرسائل الترويجية** (رسائل السلة المتروكة قد تُعد ترويجية — **يحتاج تأكيد من المزود**).
- الرسائل الترويجية فقط من 9:00 صباحاً حتى 9:45 مساءً (وفي رمضان 12:00 ظهراً حتى 1:00 بعد منتصف الليل).
- **مدة التسجيل غير منشورة رسمياً.** رقم "~20 يوم عمل" في مسودة الـ CEO من مصدر خارجي. **يحتاج تأكيد من المزود.**
- **قوالب الرسائل:** دليل Infobip للسعودية يشترط تسجيل القوالب المحلية بعد اعتماد اسم المرسل: النص الثابت مطابق حرفياً، متغيران كحد أقصى بطول 30 حرفاً لكل متغير ولا يتجاوزان 40% من النص، العربي والإنجليزي قالبان منفصلان، **الروابط بـ `https://` فقط و"لا يُسمح باختصار الروابط"**. هل تفرض Taqnyat نفس الاشتراط؟ **يحتاج تأكيد من المزود.** إذا كان مفروضاً فكل نص SMS في قسم 8 يجب أن يكون قالباً ثابتاً مسجلاً مسبقاً.

### 2.4 المصادر
- Taqnyat الباقات: https://taqnyat.sa/en/offers/packages
- Taqnyat SMS API: https://dev.taqnyat.sa/en/doc/sms — Verify: https://dev.taqnyat.sa/en/doc/verify/
- Taqnyat واتساب: https://taqnyat.sa/en/offers/2026/whatsapp-api-package/ — https://taqnyat.sa/en/channels/WhatsApp-Business-API-service-provider/
- Unifonic اشتراطات اسم المرسل: https://docs.unifonic.com/articles/products-documentation/ksa-sender-id-registration-requirmnets
- Unifonic واتساب: https://unifonic.com/whatsapp-business/ — وثائق API (تتطلب تسجيل دخول): https://docs.unifonic.com/docs/authenticate-apis
- Infobip تسجيل القوالب في السعودية: https://www.infobip.com/docs/essentials/mena-registration/saudi-arabia-letter-of-authorization-loa-guidelines/local-sms-sender-and-template-registration-guideline
- Authentica: https://www.eyeofriyadh.com/news/details/authentica-saudi-leadership-in-digital-identity-security-and-enhanced-user-experience-through-innovative-otp-and-authentication-solutions
- Meta التسعير: https://developers.facebook.com/docs/whatsapp/pricing — سعر السعودية (مصدر ثانوي): https://letsbot.net/en/blogs/whatsapp-business-api-pricing-ksa-2026-guide.html

### 2.5 تصحيحات على مسودة الـ CEO
- أرقام Taqnyat ورسوم اسم المرسل 230 ر.س **صحيحة** ومتحقق منها.
- رسم Unifonic 299 ر.س أصبح متحققاً منه من وثائق Unifonic الرسمية (المسودة أخذته من مصدر خارجي).
- "~20 يوم عمل" للتسجيل **غير متحقق منه**.
- المسودة لم تذكر **اشتراط تسجيل القوالب ومنع الروابط المختصرة**، وهذا يؤثر على تصميم نصوص قسم 8.

### 2.6 التوصية
1. **SMS: Taqnyat** خلف `SmsProvider` (`send(to, templateKey, vars, locale)`، `parseDeliveryReport()`)، و Unifonic بديل خلف نفس الـ interface.
2. **OTP: نولّده بأنفسنا** (6 أرقام، `crypto.randomInt`، تخزين hash فقط مع `expiresAt` = 5 دقائق، و `attempts` ≤ 5، وقفل بعد التجاوز) ونرسله كـ SMS عادي من قالب مسجل. **لا نستخدم `verify.php`** لأنه يضع الـ apiKey في جسم الطلب، ويدعم SMS فقط، ولا يوثق المدة ولا طول الكود. هذا يُبقي منطق OTP مستقلاً عن المزود ويسمح بالتحويل لواتساب لاحقاً.
3. **واتساب: Meta Cloud API** للإشعارات (قوالب utility) والسلات المتروكة (قوالب marketing بموافقة العميل)، مباشرة أو عبر BSP إذا احتجنا مساعدة التوثيق (عرض Taqnyat بـ 150 ر.س يغطي الإعداد، ورسوم Meta منفصلة). خلف `WhatsAppProvider`.
4. **نصوص الرسائل:** كل رسالة SMS قالب ثابت بمتغيرين كحد أقصى، روابط `https://suqalzl.com/...` كاملة بدون مختصرات، والـ OTP العربي قصير ليبقى مقطعاً واحداً (70 حرفاً للنص العربي). تسليم هذا الشرط لـ arabic-content-seo.
5. **Authentica** خيار للمستقبل إذا أصبح توطين البيانات (PDPL) أو التحويل التلقائي بين القنوات مطلباً. **الأسعار تحتاج تأكيداً من المزود.**

**تقدير التكلفة (افتراضي):** 7,000 رسالة شهرياً ≈ 0.092 ر.س للرسالة في باقة 10,000 ≈ **644 ر.س/شهر** + 230 ر.س سنوياً لكل اسم إضافي. يُقاس الاستهلاك الفعلي بعد الإطلاق.

### 2.7 المخاطر
| الخطر | المعالجة |
|---|---|
| تأخر تسجيل اسم المرسل يؤخر الإطلاق | البدء فوراً بعد G1؛ في التطوير يُطبع الكود في الـ console (حسب P1) |
| رفض قالب أو رسالة فيها رابط مختصر | قوالب ثابتة مسجلة؛ اختبار كل قالب قبل الإطلاق |
| إساءة OTP (SMS pumping) تستنزف الرصيد | rate limit لكل رقم و IP، وقبول أرقام `+9665XXXXXXXX` فقط، وتنبيه عند انخفاض الرصيد عبر `GET /account/balance` |
| webhook التسليم بـ passphrase فقط | مقارنة بزمن ثابت (constant-time)، وهو للإحصاء فقط ولا يغير حالة مالية |

### 2.8 أسئلة نرسلها لمزودي SMS
**لـ Taqnyat:**
1. هل يجب تسجيل قوالب الرسائل المحلية لدى الهيئة قبل الإرسال؟ كم قالباً، وما المدة؟
2. مدة تسجيل اسم المرسل الخدمي (`SuqAlZal`) والمستندات المطلوبة منكم بالتحديد.
3. هل رسائل السلة المتروكة تحتاج اسماً إعلانياً `-AD`؟
4. الـ rate limit على `/v1/messages`؟ وهل يوجد IP allowlist للـ API key؟
5. آلية التحقق من webhook تقارير التسليم: هل الـ passphrase في هيدر أم في الجسم؟ هل يوجد توقيع؟
6. هل توجد بيئة اختبار لا تخصم من الرصيد؟
7. سعر الرسالة لحجم 10,000–25,000 شهرياً بعقد شهري (فاتورة) بدل الباقات المسبقة؟
**لـ Unifonic:** نفس الأسئلة + سعر الرسالة المحلية + هل يوجد سعر مدمج SMS + WhatsApp + Authenticate.

---

## 3. Moyasar — التحقق التقني

### 3.1 ما تأكد من الوثائق

| الموضوع | ما وجدته | المصدر |
|---|---|---|
| طرق الدفع | مدى، البطاقات (Visa، Mastercard، American Express)، STC Pay، Apple Pay، Samsung Pay (الأسئلة الشائعة)، وفي الوثائق Google Pay على الويب و UnionPay | https://moyasar.com/en/resources/faqs/ — https://docs.moyasar.com/llms.txt |
| Apple Pay على الويب | "Web Registration" بدون حساب Apple Developer: Settings > Apple Pay Domains ← تحميل ملف التحقق ← رفعه على `/.well-known/apple-developer-merchantid-domain-association` **بدون امتداد** ← Validate ← Register. **يُسجّل النطاق الفرعي بالضبط** (مثال الوثائق: `store.company.com` وليس `company.com`). الجلسة عبر `applepay/initiate` بالمفتاح العام | https://docs.moyasar.com/docs/guides/apple-pay/web-registration.md — https://docs.moyasar.com/docs/guides/apple-pay/apple-pay-web.md |
| STC Pay | العميل يدخل جواله ← Moyasar تطلب OTP ← تفويض ← redirect إلى `callback_url` ← نجلب الدفعة ونتحقق من الحالة والمبلغ والعملة | https://docs.moyasar.com/docs/guides/stc-pay/basic-integration.md |
| Webhooks | الأحداث: `payment_paid`، `payment_faild` (بهذا الإملاء في الوثائق)، `payment_refunded`، `payment_voided`، `payment_authorized`، `payment_captured`، `payment_verified`. الحقول: `id`، `type`، `created_at`، **`secret_token`**، `account_name`، `live`، `data`. **لا يوجد توقيع HMAC في الهيدر**؛ التحقق الموثق الوحيد هو `secret_token` الذي نحدده نحن. إعادة الإرسال 5 مرات (بعد ~1 و10 و30 و60 و120 دقيقة) ثم يُسقط. يجب الرد بـ 2xx بسرعة قبل أي منطق ثقيل. webhooks المنشأة بالـ API قد تحتاج "تحقق ملكية" بكود من 6 أرقام صالح 30 دقيقة، ولا تستقبل أحداثاً قبل التحقق | https://docs.moyasar.com/api/other/webhooks/webhook-reference — https://docs.moyasar.com/docs/api/other/webhooks/verify-webhook.md |
| الحالات | `initiated`، `paid`، `failed`، `authorized`، `captured`، `refunded`، `voided` (فقط قبل التسوية في بنك التاجر)، `verified` | https://docs.moyasar.com/docs/api/payments/payment-status-reference.md |
| Authorize/Capture | `manual: true` في الـ source؛ capture جزئي مسموح بما لا يتجاوز المبلغ المفوّض؛ تفويض مدى يُلغى (void) خلال 14 يوماً؛ **الدفعة المدفوعة تُلغى (void) خلال ~ساعتين فقط**، وبعدها استرجاع | https://docs.moyasar.com/docs/guides/payment-operations/index.md |
| الاسترجاع | `amount` بالهللة، جزئي مسموح، الحد الأدنى 1 ر.س، لا يتجاوز المبلغ المدفوع/الملتقط؛ **استرجاع دفعة حالتها `refunded` يرجع خطأ**. الوصول للعميل: مدى من 24 ساعة إلى 3 أيام عمل، والبطاقات الائتمانية 7–14 يوم عمل | https://docs.moyasar.com/refund-payment — https://help.moyasar.com/en/article/moyasar-dashboard-refunding-payments-19fuzxp — الأسئلة الشائعة |
| Idempotency | حقل `given_id` (UUID v4) في جسم إنشاء الدفعة، ويصبح هو معرّف الدفعة؛ التكرار يرجع 400 "Payment is already created". مدة الاحتفاظ غير موثقة | https://docs.moyasar.com/docs/api/idempotency.md |
| Metadata | حتى 30 مفتاحاً، المفتاح ≤ 40 حرفاً، القيمة ≤ 500 حرف، قابلة للفلترة في قوائم الدفعات والفواتير | https://docs.moyasar.com/docs/api/metadata.md |
| Sandbox | مفاتيح اختبار وبطاقات اختبار لكل شبكة (مدى `4201320111111010`، Visa `4111111111111111`، ...) وبطاقات رفض لكل كود، ومحاكاة 3DS على Visa | https://docs.moyasar.com/docs/guides/card-payments/test-cards.md |
| المتطلبات | سجل تجاري أو وثيقة عمل حر، وحساب بنكي سعودي مرتبط، ومراجعة المنتجات وسياسة الاسترجاع قبل التفعيل | الأسئلة الشائعة |
| الأسعار | "فريق المبيعات يزودك بالأسعار" حسب الحجم. **يحتاج تأكيد من المزود** | الأسئلة الشائعة |

### 3.2 أثرها على التنفيذ (تُعدّل خطة 6.2 ولا تتعارض معها)
1. **التحقق من الـ webhook:** مقارنة `secret_token` بزمن ثابت، ثم **إعادة جلب الدفعة `GET /v1/payments/:id` بالمفتاح السري** ومطابقة `amount` و `currency` و `metadata.orderId` و `status` قبل أي تحول. لأن التحقق سر مشترك وليس توقيعاً، إعادة الجلب إلزامية وليست اختيارية.
2. **الاستقبال:** حفظ الحدث في `WebhookEvent` (فريد على `provider + eventId`) والرد 200 فوراً، ثم المعالجة في job. الحدث نفسه قد يصل حتى 6 مرات.
3. **`given_id` = `Payment.id`** لدينا (UUID نولّده قبل الطلب)، فإعادة المحاولة بعد انقطاع الشبكة لا تنشئ دفعة ثانية.
4. **Apple Pay:** تسجيل `new.suqalzl.com` الآن، ثم `suqalzl.com` و `www.suqalzl.com` قبل التحويل (P7). ملف `.well-known` يُخدم من Next.js كـ static route بدون امتداد. يُضاف لـ go-live checklist.
5. **الإلغاء قبل الشحن:** إذا أُلغي الطلب خلال ساعتين نستخدم void (بدون رسوم استرجاع محتملة)، وبعدها refund.
6. **الاسترجاع الجزئي المتعدد:** الوثائق لا تؤكد أن دفعة استُرجع جزء منها تقبل استرجاعاً جزئياً ثانياً (عبارة "refunding a payment that already has status refunded returns an error" تثير الشك). هذا حرج لأن طلباً واحداً فيه عدة SubOrders قد يُسترجع كل منها في وقت مختلف. **يحتاج تأكيد من المزود.** إذا لم يكن مدعوماً فالاسترجاع الثاني يكون تحويلاً بنكياً يدوياً للعميل، ويُسجل في `Refund` بطريقة `MANUAL_BANK_TRANSFER`.
7. **`metadata`:** `orderId`، `orderNumber`، `env`، بدون بيانات شخصية.

### 3.3 المخاطر
| الخطر | المعالجة |
|---|---|
| تسريب `secret_token` يسمح بتزوير webhooks | إعادة الجلب من الـ API تُفشل أي تزوير؛ تدوير السر دورياً |
| فقدان webhook بعد 6 محاولات | cron مطابقة كل 15 دقيقة: كل `Payment` بحالة `INITIATED` أكثر من 10 دقائق تُجلب حالتها من Moyasar |
| وصول `paid` بعد انتهاء حجز المخزون (30 دقيقة) | محاولة إعادة الحجز؛ إذا فشلت تتحول الحالة `PAID_NEEDS_REVIEW` وتُسترجع الدفعة بقرار الإدارة (القسم 5) |
| سقف عملية واحدة أقل من 25,000 ر.س | سؤال المزود؛ سقف مدى من البنك المصدر خارج تحكمنا |

### 3.4 أسئلة لـ Moyasar
1. هل يمكن تنفيذ **عدة استرجاعات جزئية** على نفس الدفعة حتى مجموع المبلغ؟ وما حالة الدفعة بعد أول استرجاع جزئي؟
2. هل استرجاع **STC Pay** و **Apple Pay** مدعوم عبر نفس Refund API؟ وجزئياً؟
3. هل يوجد **سقف للعملية الواحدة** على الحساب (نبيع منتجات حتى 25,000 ر.س)؟ وسقف يومي؟
4. هل يحمل الـ webhook أي توقيع غير `secret_token`؟ وهل توجد قائمة IP ثابتة للسيرفرات؟
5. هل يُرجع كائن الدفعة **الرسوم الفعلية** (`fee`) لكل عملية؟ نحتاجه لـ `gatewayFeeShare` (O1).
6. مدة التسوية لحساب المالك (T+?) لكل طريقة، وهل يوجد تقرير تسوية API لكل دفعة (نحتاجه لـ `Payment.settledAt` المقترح في O3).
7. رسوم الاسترجاع وهل تُعاد رسوم المعاملة الأصلية عند الاسترجاع.
8. أسعار مدى، البطاقات المحلية، الدولية، Apple Pay، STC Pay.
9. مدة الاحتفاظ بـ `given_id` لمنع التكرار.

---

## 4. Tabby و Tamara — التحقق التقني

### 4.1 جدول المقارنة

| المعيار | Tabby (السعودية: `api.tabby.sa`) | Tamara |
|---|---|---|
| إنشاء الجلسة | `POST /api/v2/checkout` بـ Bearer secret key و `merchant_code`؛ المبلغ نص عشري (منزلتان للريال)؛ مطلوب: `buyer` (الاسم، الإيميل، الجوال)، `order.items`، `reference_id`، `buyer_history`، `order_history` (5–10 طلبات سابقة)، `shipping_address`، و `merchant_urls` (success/cancel/failure) | `POST /checkout` يرجع `order_id` و `checkout_id` و `checkout_url`؛ قبله `POST /pre-checkout/v1/eligibility` (صحيح/خطأ) لإخفاء الزر |
| التأهيل والحدود | الرد `created` أو `rejected` مع `rejection_reason`: `order_amount_too_high` (فوق حد العميل الحالي)، `order_amount_too_low` (تحت الحد الأدنى)، `not_available`. **الحدود ديناميكية لكل عميل ولا توجد قيمة منشورة.** | `GET /checkout/payment-types` بـ `order_value` و `phone`، و Check Payment Options API الأحدث. **لا توجد حدود دنيا وقصوى منشورة** |
| السقف النظامي | تعميم ساما (24 ديسمبر 2025): **رفع الحد الأقصى لتمويل BNPL إلى 10,000 ر.س** (سقف وليس حقاً لكل عميل). تابي حصلت على رخصة تمويل استهلاكي (29 يونيو 2026) وأعلنت **خططاً ممتدة للمشتريات فوق 2,000 ر.س حتى 50,000 ر.س على 12 دفعة** (مرابحة، تُطرح تدريجياً) | نفس سقف ساما 10,000 ر.س لـ BNPL. منتج أعلى؟ **يحتاج تأكيد من المزود** |
| بعد الـ redirect | جلب الدفعة والتحقق من الحالة: `AUTHORIZED` (نجاح) / `EXPIRED` / `REJECTED`؛ الجلسة تنتهي بعد 20 دقيقة والدفعة `EXPIRED` بعد ~30 دقيقة | الطلب `new` ينتهي بعد 30 دقيقة؛ بعد `approved` **يجب استدعاء `POST /orders/{id}/authorise` خلال 72 ساعة** وإلا ينتهي (أو تفعيل auto-authorise) |
| Capture | `AUTHORIZED` → capture كامل (أفضل ممارسة فوراً بعد التحقق)، والجزئي يبقيها `AUTHORIZED`؛ **إذا لم تُلتقط خلال 21 يوماً قد تلتقطها تابي كاملة**؛ فقط الملتقط يُسوّى للتاجر | `POST /payments/capture` بعد الشحن، جزئي أو كامل؛ **التقاط تلقائي بعد 21 يوماً من التفويض**؛ المفوّض غير الملتقط ولا الملغى ينتهي بعد 90 يوماً |
| الإلغاء قبل الالتقاط | مذكور في اللوحة، وآلية الـ API غير موضحة في الصفحة التي قرأتها. **يحتاج تأكيد من المزود** | `POST /orders/{id}/cancel` للمفوّض، كامل أو جزئي (حالة `updated`) |
| Webhooks | تسجيل ذاتي `POST /api/v1/webhooks` (حتى 4 لكل merchant code)؛ التحقق بـ **هيدر اختياري (عنوان + قيمة) نحدده نحن**، وليس توقيعاً تشفيرياً؛ **قائمة 8 عناوين IP منشورة**؛ الأحداث `authorized` و `closed` و `rejected` و `expired` (الأخير يُفعّل من تابي)؛ إعادة المحاولة 4 مرات كل 1–4 دقائق، وأي رد غير 200 يُعد فشلاً (يمكن الرد 404 لطلب إعادة المحاولة) | تسجيل من Partner Portal أو API؛ **توقيع JWT (HS256) بـ Notification Token** يُرسل كـ query `tamaraToken` وكـ `Authorization: Bearer`؛ الأحداث `order_approved` (إلزامي)، `order_authorised`، `order_captured`، `order_refunded`، `order_canceled`، `order_expired`، `order_declined` |
| الاسترجاع | فقط للدفعة `CLOSED` (ملتقطة)، خلال **180 يوماً** من إنشاء الدفعة، **جزئي ومتعدد** بما لا يتجاوز الملتقط، `reference_id` إلزامي كمفتاح idempotency، ولا يُلغى بعد التنفيذ؛ 409 إذا كانت عليها منازعة | `POST /payments/simplified-refund/{order_id}` للطلبات الملتقطة، `total_amount {amount, currency}` و `comment` و `merchant_refund_id`؛ الطلب قد يحمل عدة `refund_id` من استرجاعات جزئية |
| Idempotency | `reference_id` على capture و refund (اشتقاقه من رقم الطلب، مثل `capture-{orderId}`) | `merchant_refund_id`؛ لا يوجد مفتاح موثق للـ capture. **يحتاج تأكيد من المزود** |
| Sandbox | مفاتيح `sk_test_...` وبيانات اختبار و Postman وقائمة اختبار كاملة | `https://api-sandbox.tamara.co` (الإنتاج `https://api.tamara.co`)، بطاقات وسيناريوهات اختبار |
| المنازعات | API كامل للمنازعات (قائمة، أدلة، قبول، اعتراض) | إدارة من Partner Portal |
| الويدجت | On-Site Messaging | Widgets + إرشادات خاصة بالسعودية |

### 4.2 المصادر
- Tabby: https://docs.tabby.sa/llms.txt — https://docs.tabby.ai/pay-in-4-custom-integration/webhooks.md — https://docs.tabby.sa/pay-in-4-custom-integration/payment-processing.md — https://docs.tabby.sa/api-reference/checkout/create-a-session.md — https://docs.tabby.sa/api-reference/payments/refund-a-payment.md — https://docs.tabby.sa/pay-in-4-custom-integration/payment-statuses.md
- Tabby رخص التمويل في السعودية: https://tabby.ai/en-AE/newsroom/finance-licences-ksa
- Tabby الأسعار (غير منشورة): https://tabby.ai/en-AE/help-business/about-tabby/pricing
- Tamara: https://docs.tamara.co/reference — https://docs.tamara.co/docs/direct-online-checkout — https://docs.tamara.co/docs/webhook-subscription — https://docs.tamara.co/reference/getting-started-with-webhooks — https://docs.tamara.co/reference/simplifiedrefund.md — https://docs.tamara.co/docs/online-order-status-flow.md — https://docs.tamara.co/reference/paymenttypes
- سقف ساما 10,000 ر.س: https://www.argaam.com/en/article/articledetail/id/1929545

### 4.3 التوصية التقنية
1. **الحالة "مدفوع" عندنا = تفويض ناجح ومتحقق منه** (`AUTHORIZED` في تابي بعد إعادة الجلب، و `authorised` في تمارا بعد التحقق من JWT وإعادة الجلب). عندها تُطبق خطوة 6.2(4).
2. **Tabby:** capture كامل فوراً بعد `AUTHORIZED` (أفضل ممارسة في الوثائق) بـ `reference_id = capture-{orderId}`، مع "مطالبة ذرية" في قاعدة البيانات (`PaymentTransaction` فريد على `paymentId + type=CAPTURE`) لأن الـ redirect والـ webhook كلاهما قد يطلقان الـ capture.
3. **Tamara:** authorise فوري عند `order_approved` (أو تفعيل auto-authorise)، ثم capture **كامل عند تأكيد الطلب** لتبسيط تعدد التجار، **أو** capture جزئي لكل SubOrder عند `SHIPPED`. التوصية: capture كامل مثل تابي، إلا إذا اشترطت تمارا ربط الـ capture بالشحن (سؤال 3 أدناه).
4. **سقف 10,000 ر.س:** لا يُعرض زر تابي/تمارا إلا إذا أكدت الجلسة أو الـ eligibility التأهيل. ويدجت الأقساط في صفحة المنتج لا يُعرض للمنتجات فوق سقف المنتج المتاح.
5. **حماية الـ webhooks:** تابي = الهيدر السري + IP allowlist + إعادة الجلب. تمارا = التحقق من JWT بـ HS256 + إعادة الجلب. كلاهما يُخزن في `WebhookEvent`.
6. **الاسترجاع:** كل استرجاع = سجل `Refund` بـ `idempotencyKey` (= `reference_id` في تابي و `merchant_refund_id` في تمارا). الاسترجاع الجزئي المتعدد مدعوم في كليهما، فيتوافق مع الاسترجاع لكل SubOrder.
7. **البيانات المطلوبة من تابي** (`order_history`، `buyer_history.registered_since`) تُبنى من جدول `Order` لدينا، وتحتاج DTO خاص يرسل فقط الحقول المطلوبة (PDPL: يُذكر في سياسة الخصوصية أن بيانات الطلبات تُشارك مع مزود التقسيط).

### 4.4 المخاطر
| الخطر | المعالجة |
|---|---|
| منتجات فوق 10,000 ر.س (سيوف، بشوت فاخرة) لا تُقسط بـ BNPL | خطط تابي الممتدة حتى 50,000 ر.س إن فُعّلت للتاجر؛ وإلا يُعرض للعميل أن التقسيط غير متاح لهذا المبلغ |
| الالتقاط التلقائي بعد 21 يوماً لطلب أُلغي ولم نلغه عند المزود | cron يومي: كل دفعة BNPL مفوّضة وطلبها ملغى ← cancel/refund فوراً |
| رسوم BNPL عالية (قرار O1) | `gatewayFeeBearer` لكل طريقة دفع (مقترح الـ CEO) يحتاج `Payment.fee` الفعلي من تقرير التسوية |
| Tamara لا تذكر مفتاح idempotency للـ capture | مطالبة ذرية في قاعدتنا قبل الاستدعاء + جلب حالة الطلب قبل إعادة المحاولة |

### 4.5 أسئلة لتابي وتمارا
1. الحد الأدنى والأقصى للطلب لحسابنا (تاجر منتجات فاخرة)، وهل خطط تابي الممتدة (حتى 50,000 ر.س) متاحة لحسابنا ومتى؟ وما يقابلها في تمارا؟
2. الرسوم: النسبة + الرسم الثابت + رسوم الاسترجاع + مدة التسوية + هل يتوفر تقرير تسوية عبر API برسوم كل عملية.
3. (تمارا) هل يُقبل capture كامل عند تأكيد الطلب قبل الشحن، أم يجب ربطه بالشحن؟ وهل يُطلب `shipping_info` في الـ capture؟
4. (تمارا) مفتاح idempotency للـ capture؟ وسياسة إعادة إرسال الـ webhook؟
5. (تابي) API إلغاء دفعة مفوّضة قبل الالتقاط؟ وتفعيل حدث `expired`؟
6. نحن منصة سوق بعدة تجار وكل المال يدخل حساب المنصة: هل لديكم شروط إضافية للـ marketplace (فئات ممنوعة، توثيق التجار، عرض اسم البائع)؟
7. هل الأسلحة البيضاء التراثية (السيوف) فئة مسموحة للتقسيط؟

---

## 5. مراجعة نموذج البيانات (SPEC قسم 5) مقابل القواعد 6.1–6.8

> اقتراحات فقط. لم أعدّل `SPEC.md`. التنفيذ في `prisma/schema.prisma` في P1 بعد G1، وأي تغيير يغير قاعدة تجارية مُعلّم "**قرار للمالك**".
> الأولوية: **حرج** = ثغرة أمان أو خطأ مالي أو بيع بدون مخزون؛ **عالٍ** = تعارض مع قاعدة في SPEC أو خطر سباق؛ **متوسط** = جودة وأداء.

### 5.1 الثغرات الحرجة

| # | الثغرة | القاعدة | المقترح |
|---|---|---|---|
| C1 | **تسريب العروض بين التجار عبر Realtime.** برومبت P4.5 يقترح "قناة خاصة لكل PriceRequest (العميل + المستلمين)". أي عرض يُبث على هذه القناة يصل لكل التجار المستلمين، وهذا يكسر السرية (Sealed offers) | 6.8 السرية، سيناريو 8 | قنوات منفصلة لكل جمهور: `pr:{requestId}:customer` (العميل فقط)، `pr:{requestId}:vendor:{vendorId}` (خيط هذا التاجر فقط)، `vendor:{vendorId}:inbox`. **Broadcast من السيرفر بـ DTO مُصغّر** (معرّفات وحالة، والواجهة تجلب التفاصيل من API محمي)، **وممنوع `postgres_changes` على جداول الفصال**. RLS على `realtime.messages` يطابق `realtime.topic()` مع claims في الـ JWT، وتعطيل "Allow public access" في إعدادات Realtime |
| C2 | **RLS لا يحمي استعلامات Prisma.** Prisma يتصل بدور `postgres` الذي يتجاوز RLS، والمصادقة Better Auth وليست Supabase Auth فلا يوجد `auth.uid()`. الـ RLS بالشكل المكتوب في SPEC لا يضيف حماية فعلية للتطبيق | قسم 4، 9 | (أ) **طبقة العزل الأساسية في السيرفر**: `vendorId` من الجلسة + repository لكل نطاق (`vendorScope(vendorId)`) + اختبارات العزل (سيناريو 5 و 8). (ب) **RLS مفعّل على كل الجداول بدون أي policy لـ `anon`/`authenticated`** (رفض كامل) و `REVOKE ALL` على الـ schema من `anon` و `authenticated`، أو نقل جداول التطبيق لـ schema غير مكشوف في Data API. (ج) policies فقط على `realtime.messages` و `storage.objects`. (د) Realtime يحتاج JWT من Supabase: السيرفر يصدر JWT قصير العمر (`sub` = userId، `role` = authenticated، `vendor_id`، مدة 15 دقيقة). **Spike في P1** للتأكد من آلية التوقيع مع مفاتيح JWT الجديدة في Supabase (المفاتيح القديمة `anon`/`service_role` تعمل حتى نهاية 2026 حسب الوثائق) |
| C3 | **`reservedStock` عداد بلا انتهاء صلاحية.** حجز 30 دقيقة (6.2) و PriceLock 24 ساعة (6.8) لا يمكن فكهما بدقة من عداد واحد؛ cron يفك "كم؟ ولمن؟" | 6.2، 6.8 | جدول `StockReservation` (variantId، qty، sourceType: `ORDER`\|`PRICE_LOCK`، sourceId، expiresAt، status: `ACTIVE`\|`CONSUMED`\|`RELEASED`). `reservedStock` يُحدّث في نفس الـ transaction. CHECK: `stock >= 0`، `reservedStock >= 0`، `reservedStock <= stock`. الحجز **بـ UPDATE شرطي ذري**: `UPDATE ... SET reserved = reserved + q WHERE id = ? AND stock - reserved >= q` (صفر صفوف = نفد)، **وليس SELECT ثم UPDATE**. ترتيب الأقفال حسب `variantId` تصاعدياً لتجنب deadlock في سلة متعددة الأصناف. الباقات تُفك لأصنافها |
| C4 | **لا يوجد جدول للاسترجاعات ولا للـ capture.** `Payment.refundedAmount` رقم مجمّع لا يربط الاسترجاع بـ SubOrder ولا بـ Return، ولا يحمل مفتاح idempotency، ولا يسجل فشله | 6.2(6)، سيناريو 4 | `PaymentTransaction` (paymentId، type: `AUTHORIZE`\|`CAPTURE`\|`REFUND`\|`VOID`، amount، subOrderId?، returnId?، gatewayRef، **idempotencyKey unique**، status: `PENDING`\|`SUCCEEDED`\|`FAILED`، method: `GATEWAY`\|`MANUAL_BANK_TRANSFER`، requestedByUserId، rawResponse، error). CHECK: مجموع الاسترجاع ≤ المبلغ الملتقط (يُفرض في الخدمة تحت قفل على صف `Payment`) |
| C5 | **لا يوجد جدول لأحداث الـ webhooks.** Idempotency على `gatewayRef` غير كافية: نفس الدفعة لها أحداث متعددة (`paid` ثم `refunded`) وكل حدث قد يتكرر حتى 6 مرات (Moyasar) | 6.2(3)، 9 | `WebhookEvent` (provider، eventId، **unique(provider, eventId)**، type، payload JSONB، signatureValid، receivedAt، processedAt?، attempts، lastError). المعالجة بعد التخزين في job |
| C6 | **`floorPrice` لكل منتج وليس لكل variant.** منتج فيه خيارات بأسعار مختلفة (مثلاً بشت مقاسات) يجعل حداً أدنى واحداً بلا معنى أو يكشف هامش أحد الخيارات | 6.8 الحد الأدنى | `floorPrice` و `autoAcceptPrice` على مستوى `ProductVariant` في جدول منفصل `VariantNegotiationSettings` (variantId PK، floorPrice، autoAcceptPrice)، مع إبقاء `NegotiationSettings` للإعدادات العامة (allowBargain، maxRounds، responseWindowHours). CHECK: `floorPrice > 0`، `autoAcceptPrice >= floorPrice`. **قرار للمالك:** هل الحد يكون مبلغاً أم نسبة من سعر الـ variant |
| C7 | **منع إنشاء دفعتين لنفس الطلب أو قيدين لنفس البيع.** لا قيد يمنع `SALE_CREDIT` مكرر عند وصول webhook مرتين | 6.4 | `WalletTransaction.idempotencyKey` **unique** (مثل `sale:{subOrderId}`، `commission:{subOrderId}`، `refund:{paymentTransactionId}`). وتريغر يمنع `UPDATE` على amount/type/vendorId ويمنع `DELETE` (6.4: ممنوع تعديل أو حذف) |

### 5.2 ثغرات عالية الأهمية

| # | الثغرة | القاعدة | المقترح |
|---|---|---|---|
| H1 | **`Vendor` لا يحمل وضع الشحن** رغم أن 6.6 يقول "وضعان لكل تاجر"، و `vendorNet` (6.1) يعتمد عليه | 6.1، 6.6 | `Vendor.shippingMode` (`PLATFORM_SHIPPING`\|`SELF_SHIPPING`) + تجميده في `SubOrder.shippingMode` لحظة الدفع |
| H2 | **`pickupAddress` حقل JSON واحد.** المجمّع يحتاج نقطة استلام مسجلة لكل مستودع (`pickupLocationCode`)، والتاجر قد يملك فرعين | 6.6، O4 | `VendorPickupLocation` (vendorId، label، city، district، street، nationalAddressShort، lat/lng، contactName، phone، providerCode، isDefault، isActive) + `SubOrder.pickupLocationId` |
| H3 | **لا يوجد جدول شحنات.** حقول التتبع على `SubOrder` (trackingNumber، labelUrl) لا تكفي لإعادة الشحن بعد فشل التسليم، أو تعدد الطرود، أو شحنة الإرجاع، أو سجل التتبع | 6.3، 6.6 | `Shipment` (subOrderId، direction: `OUTBOUND`\|`RETURN`، provider، carrier، providerShipmentId، trackingNumber، labelPath، status، cost (التكلفة الفعلية)، declaredValue، insuredAmount، codAmount=0، pickupLocationId) و `ShipmentEvent` (shipmentId، providerEventId unique، status، occurredAt، raw). webhook الشحن يكتب حدثاً، والخدمة تحوّل الـ SubOrder |
| H4 | **لا يوجد تصنيف شحن للمنتج.** السيوف ودهن العود لها قيود والقيمة العالية تحتاج تأمين | 6.6، O4 | `Product.shippingClass` (`STANDARD`\|`LIQUID_FLAMMABLE`\|`BLADE`\|`HIGH_VALUE`\|`FOOD`) يحدد الشركات المسموحة ومسار الشحن |
| H5 | **لا يوجد تاريخ للأسعار** رغم أن 6.7 يشترط رفض العرض لو تغير السعر الأساسي خلال 14 يوماً، وأن "السعر قبل" هو آخر سعر بيع فعلي | 6.7 | `PriceHistory` (variantId، price، compareAtPrice، changedByUserId، changedAt) يُكتب بتريغر أو في الخدمة عند أي تغيير. `compareAtPrice` المعروض يُتحقق منه بنفس القاعدة (حماية من الخصم الوهمي) |
| H6 | **"عرض واحد نشط لكل variant" غير قابل للفرض** مع `Deal.variantIds[]` كمصفوفة | 6.7 | `DealVariant` (dealId، variantId، startsAt، endsAt، isBlocking) بدل المصفوفة، و "فارغ = كل الخيارات" يُحوّل لصفوف عند الإنشاء. **Exclusion constraint** (`btree_gist`): `EXCLUDE USING gist (variant_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (is_blocking)`، و `isBlocking = true` للحالات PENDING/APPROVED/LIVE. Prisma لا يدعمه فيُكتب في migration SQL يدوي |
| H7 | **`stockLimit` و `perCustomerLimit` في FLASH تحت التزامن.** `soldCount` يُحدّث بعد الدفع فقط، فعرض "باقي 3" يمكن أن يُباع 10 مرات في نفس اللحظة | 6.7، سيناريو 10 | `Deal.reservedCount` + UPDATE شرطي ذري (`WHERE soldCount + reservedCount + q <= stockLimit`) عند إنشاء الطلب `PENDING_PAYMENT`، ويُفك مع حجز المخزون. `DealRedemption` (dealId، userId، orderId، qty، status) لحساب `perCustomerLimit` تحت قفل استشاري `pg_advisory_xact_lock(hash(dealId, userId))`. حالة "نشط" تُحسب في الاستعلام (`now() BETWEEN startsAt AND endsAt AND status IN (APPROVED, LIVE)`) ولا تعتمد على الـ cron للصحة؛ الـ cron للإشعارات وتحديث الحالة فقط |
| H8 | **قفل سعر FLASH 15 دقيقة في السلة بلا حقول** | 6.7 | `CartItem.dealId?`، `lockedUnitPrice?`، `priceLockedUntil?`. القفل للسعر فقط؛ حصة `stockLimit` تُحجز عند الـ checkout (H7). **قرار للمالك:** هل يحجز وضعه في السلة حصة من العرض؟ (التوصية: لا، لتجنب حجز وهمي) |
| H9 | **الجولات والسرية في الفصال بدون "خيط" لكل تاجر.** `PriceOffer` مسطح؛ عدّ الجولات لكل طرف، ومنع عرضين معلقين، وقفل القبول المتزامن، كلها صعبة | 6.8 | `NegotiationThread` (requestId، vendorId، productId، variantId، vendorRounds، customerRounds، status، lastOfferId، version) **unique(requestId, vendorId)**. `PriceOffer.threadId`. فهرس فريد جزئي: عرض `PENDING` واحد لكل خيط. استعلامات التاجر تبدأ دائماً من `NegotiationThread WHERE vendorId = session.vendorId` |
| H10 | **سباق القبول.** العميل يقبل عرضين في نفس اللحظة، أو يقبل بينما التاجر يرسل سعراً مضاداً | 6.8 | `acceptOffer` يقفل صف `PriceRequest` (`SELECT ... FOR UPDATE`) ثم الخيط؛ فهرس فريد جزئي على `PriceOffer(requestId) WHERE status = 'ACCEPTED'`؛ `PriceLock.offerId` unique؛ المخزون يُحجز داخل نفس الـ transaction (C3)، وإذا لم يكف المخزون يفشل القبول برسالة "الكمية لم تعد متاحة" ويبقى الطلب مفتوحاً |
| H11 | **انتهاء PriceLock أثناء الدفع.** القفل 24 ساعة؛ إذا بدأ العميل الدفع قبل الانتهاء بدقيقة، يفك الـ cron الحجز والعميل في صفحة الدفع | 6.8 | حالة `IN_CHECKOUT` على `PriceLock` مع `pendingOrderId`؛ الـ cron يتجاهل القفل المرتبط بطلب `PENDING_PAYMENT` حتى ينتهي حجز الطلب؛ `usedOrderId` يُكتب عند الدفع الفعلي فقط. حجز القفل ينتقل لحجز الطلب (نفس `StockReservation` بتغيير المصدر) بدل حجز مزدوج |
| H12 | **توزيع الخصم والضريبة على مستوى السطر مفقود.** `OrderItem` فيه `unitPrice` و `lineTotal` فقط؛ الاسترجاع الجزئي لصنف من طلب عليه كوبون، والإشعار الدائن (ZATCA)، يحتاجان خصم وضريبة كل سطر | 6.1، 6.2(6)، O2 | `OrderItem`: `discountAmount`، `netAmount` (قبل الضريبة)، `vatAmount`، `vatRateBp`. التوزيع بطريقة "أكبر باقٍ" (largest remainder) ليطابق المجموع مجموع SubOrder بالهللة. `Order.vatRateBp` و `SubOrder.vatRateBp` تُجمّد لحظة الدفع |
| H13 | **الخصم لا يميّز من يتحمله.** `SubOrder.discountShare` واحد، بينما 6.1 يفرق بين كوبون عام (المنصة) وكوبون تاجر (التاجر) | 6.1 | `SubOrder.platformDiscountShare` و `vendorDiscountShare`، و `Order.couponId` (FK) بدل `couponCode` نصياً فقط. كوبون `FREE_SHIPPING`: **قرار للمالك** من يتحمل الشحن للتاجر صاحب `SELF_SHIPPING` |
| H14 | **حالات `Order` و `Payment` غير كاملة.** `paymentStatus` بلا `AUTHORIZED` (BNPL)، و `Order.status` بلا `SHIPPED`/`DELIVERED`/`PARTIALLY_CANCELLED`، ولا حالة لدفعة وصلت بعد نفاد المخزون | 6.2، 6.3 | `PaymentStatus`: `INITIATED`، `AUTHORIZED`، `PAID` (ملتقط)، `FAILED`، `VOIDED`، `PARTIALLY_REFUNDED`، `REFUNDED`. `OrderStatus` مشتق: `PENDING_PAYMENT`، `PAID`، `PROCESSING`، `PARTIALLY_SHIPPED`، `SHIPPED`، `DELIVERED`، `COMPLETED`، `PARTIALLY_CANCELLED`، `CANCELLED`، `PAID_NEEDS_REVIEW`. `Payment` 1:N مع `Order` (محاولة فاشلة ثم ناجحة) مع unique(gateway, gatewayRef) |

### 5.3 ثغرات متوسطة

| # | الثغرة | المقترح |
|---|---|---|
| M1 | أرقام الطلبات `SZ-100001` و `PR-10001` "تسلسلية": `max + 1` يسبب تكراراً تحت التزامن | `SEQUENCE` في Postgres (`order_number_seq START 100001`) تُقرأ بـ `nextval` داخل الـ transaction؛ `SubOrder.number` = رقم الطلب + ترتيب |
| M2 | `Vendor.iban` يتغير مباشرة، بينما 7.3 يشترط موافقة الإدارة | `VendorBankChangeRequest` (vendorId، iban، bankName، holder، letterDocumentId، status، reviewedBy). `Payout.bankSnapshot` يبقى كما هو |
| M3 | `VendorDocument.fileUrl` "private" | تخزين `storagePath` فقط، والروابط الموقّعة تُنشأ عند الطلب بمدة قصيرة (5 دقائق) بعد التحقق من الصلاحية. الرفع عبر `createSignedUploadUrl` من السيرفر |
| M4 | `ShippingZone.cities[]` نصوص حرة، والمجمّع يحتاج أسماء مدن مطابقة | `City` (id، nameAr، nameEn، regionCode، isActive) + `CarrierCityAlias` (cityId، provider، providerCityName). `Address.cityId` و `ShippingZone` ↔ `City` بجدول وسيط. **قرار للمالك:** هل يختلف السعر حسب مدينة التاجر (المصدر)؟ |
| M5 | تعديل منتج منشور يرجعه `PENDING` فيختفي من المتجر أثناء المراجعة | `ProductRevision` (productId، changes JSONB، status) يبقي النسخة المنشورة ظاهرة حتى الموافقة. **قرار للمالك/CEO** لأنه تفسير لـ 6.5 |
| M6 | تطابق الملكية المكررة (`Deal.vendorId` مع `Product.vendorId`، `PriceOffer.variantId` مع `productId`) غير مفروض | Foreign keys مركبة: `unique(Product.id, vendorId)` ثم `FK (productId, vendorId)`؛ و `unique(ProductVariant.id, productId)` ثم `FK (variantId, productId)`. (حالة `vendorId = null` للمنصة تحتاج قيمة ثابتة أو تحقق في الخدمة) |
| M7 | `PriceOffer.shippingFee` يتعارض مع حساب الشحن من `ShippingZone` في الـ checkout | `PriceLock.shippingFee` يتجاوز حساب المنطقة لذلك الصنف. **قرار للمالك:** هل يحدد التاجر الشحن في الفصال أم يُحسب من المنطقة دائماً؟ |
| M8 | فلتر الملاحظات يحذف النص الأصلي فلا يمكن للإدارة مراجعة التحايل | `noteRaw` (للإدارة فقط) و `noteSanitized`، و `ModerationFlag` (actorType، actorId، entity، reason، createdAt) لعدّ المحاولات المتكررة (O9) |
| M9 | حدود O9 (5 مفتوحة، 10 يومياً، طلب واحد لكل منتج) تحت التزامن | فهرس فريد جزئي `PriceRequest(customerId, productId) WHERE status IN ('OPEN','HAS_OFFERS')`؛ العد تحت `pg_advisory_xact_lock(hash(customerId))` |
| M10 | حذف الحساب (PDPL) مقابل الاحتفاظ بالفواتير | `User.deletedAt` + إخفاء الهوية (anonymization) بدل الحذف؛ الطلبات والفواتير تبقى بلقطات العنوان. مدة الاحتفاظ الضريبية: **سؤال لـ finance-zatca** |
| M11 | `AuditLog` قابل للتعديل | تريغر يمنع UPDATE/DELETE + `REVOKE UPDATE, DELETE` |
| M12 | `Deal.type = BUNDLE` مع `productId` إلزامي يتعارض مع أن الباقات للمنصة فقط ولها جدول مستقل | `Deal.bundleId?` و CHECK (`productId` أو `bundleId` واحد فقط)، أو حذف `BUNDLE` من أنواع العروض في المرحلة الأولى |
| M13 | `dealPrice أو discountPercent` | عمودان nullable مع CHECK: واحد فقط غير فارغ، و `discountPercent` بالـ basis points (1–9999) |
| M14 | `User.email` اختياري و unique | `citext` + فهرس فريد جزئي `WHERE email IS NOT NULL` |

### 5.4 الـ Indexes المقترحة (بالإضافة للـ PK والـ unique الطبيعية)

| الجدول | الفهرس | الاستخدام |
|---|---|---|
| `Product` | `(status, categoryId, createdAt DESC)`؛ `(vendorId, status)`؛ GIN على `searchVector`؛ `unique(slug)` | الكتالوج، لوحة التاجر، البحث |
| `ProductVariant` | `(productId)`؛ `unique(sku)` | |
| `VendorCategory` | `unique(vendorId, categoryId)`؛ `(categoryId, vendorId)` | اختيار مستلمي الفصال |
| `Order` | `unique(number)`؛ `(userId, placedAt DESC)`؛ `(status, placedAt)` جزئي `WHERE status = 'PENDING_PAYMENT'` | حساب العميل، cron الإلغاء |
| `SubOrder` | `(vendorId, status, createdAt DESC)`؛ `(orderId)`؛ `(status, deliveredAt)` | لوحة التاجر، cron الإكمال بعد `holdDays` |
| `Payment` | `unique(gateway, gatewayRef)`؛ `(orderId)`؛ `(status, createdAt)` | المطابقة |
| `WebhookEvent` | `unique(provider, eventId)`؛ `(processedAt)` جزئي `WHERE processedAt IS NULL` | |
| `StockReservation` | `(status, expiresAt)` جزئي `WHERE status = 'ACTIVE'`؛ `(sourceType, sourceId)` | cron الفك |
| `WalletTransaction` | `(vendorId, status, availableAt)`؛ `unique(idempotencyKey)`؛ `(payoutId)` | الأرصدة، الدفعات |
| `Deal` | `(status, startsAt, endsAt)`؛ `(vendorId, status)`؛ `(isPinned, priority)` | `/souq` |
| `DealVariant` | exclusion gist (H6)؛ `(variantId)` | |
| `PriceRequest` | `(status, expiresAt)`؛ `(customerId, status)`؛ `(categoryId, status, createdAt DESC)`؛ جزئي فريد (M9) | |
| `PriceRequestRecipient` | `unique(requestId, vendorId)`؛ `(vendorId, status, createdAt DESC)` | صندوق التاجر |
| `NegotiationThread` | `unique(requestId, vendorId)`؛ `(vendorId, status)` | |
| `PriceOffer` | `(threadId, createdAt)`؛ `(status, expiresAt)`؛ جزئي فريد `(threadId) WHERE status='PENDING'`؛ جزئي فريد `(requestId) WHERE status='ACCEPTED'` | |
| `PriceLock` | `unique(offerId)`؛ `(status, expiresAt)`؛ `(customerId, status)` | |
| `Shipment` | `unique(provider, providerShipmentId)`؛ `(trackingNumber)`؛ `(subOrderId)` | webhook الشحن |
| `Notification` | `(userId, readAt, createdAt DESC)` | |
| `Job` | `(status, runAt)` جزئي `WHERE status = 'PENDING'` | العامل يسحب بـ `FOR UPDATE SKIP LOCKED` |
| `AuditLog` | `(entity, entityId, createdAt DESC)`؛ `(actorUserId, createdAt DESC)` | |

### 5.5 قيود CHECK مقترحة
- كل المبالغ `>= 0` (ما عدا `WalletTransaction.amount` الذي يحمل الإشارة، مع CHECK أن الإشارة تطابق النوع: `SALE_CREDIT > 0`، `*_DEBIT < 0`، `ADJUSTMENT <> 0`).
- النسب بالـ basis points: `0 <= commissionRate <= 10000`.
- `qty > 0` في `CartItem` و `OrderItem` و `PriceRequest` و `PriceOffer`.
- `compareAtPrice IS NULL OR compareAtPrice > price`.
- `Deal.endsAt > startsAt`، و `PriceRequest.expiresAt > createdAt`.
- `CartItem`: بالضبط واحد من `variantId` و `bundleId` (نفس الشيء في `OrderItem`).
- `Review.rating BETWEEN 1 AND 5`؛ `unique(Review.orderItemId)`.
- `SubOrder`: `total = subtotal - platformDiscountShare - vendorDiscountShare + shippingFee` (أو يُتحقق منه في اختبار unit إن كان الـ CHECK معقداً).
- IBAN: `iban ~ '^SA[0-9]{22}$'`.
- `User.phone ~ '^\+9665[0-9]{8}$'` للعملاء (أو E.164 عام إن قُبلت أرقام خليجية — **قرار للمالك**).

### 5.6 الأمان: DTOs و `floorPrice`
1. **Prisma global `omit`** لـ `VariantNegotiationSettings.floorPrice` و `autoAcceptPrice` و `User.passwordHash` و `Vendor.iban` (يُكشف مقنّعاً فقط `SA****1234`)، فأي `findMany` عادي لا يرجعها، ولا تُطلب إلا صراحة من `negotiation/service.ts`.
2. **DTOs بمخطط Zod للمخرجات** (`.strict()`، والتحقق قبل الإرجاع): `ProductPublicDTO`، `ProductVendorOwnerDTO` (يحتوي إعدادات الفصال لصاحب المنتج فقط)، `PriceRequestVendorDTO` (طلب العميل والسعر المطلوب وعلامة `belowYourFloor: boolean` فقط)، `OfferCustomerDTO`، `OfferVendorDTO` (عروضه فقط)، `SubOrderVendorDTO` (الاسم، المدينة، العنوان، جوال الاستلام فقط — قسم 4).
3. **رسائل الخطأ والتوقيت:** طلب سعر تحت `floorPrice` يأخذ نفس الرد ونفس المسار مثل أي طلب آخر (يُرسل للتاجر مع علامة)، فلا يمكن استنتاج الحد من اختلاف الرد أو زمنه.
4. **القبول التلقائي يكشف الحد بالتجربة:** عميل يجرب أسعاراً متتالية حتى يحصل على قبول فوري يعرف `autoAcceptPrice`. المعالجة: حدود O9 (طلب واحد مفتوح لكل منتج + 10 يومياً)، **وقرار للمالك:** هل يُؤخر القبول التلقائي عشوائياً (1–10 دقائق) ليبدو كرد طبيعي.
5. **Realtime:** C1. **Storage:** bucket `vendor-docs` خاص، و `product-images` عام للقراءة فقط، والكتابة عبر روابط رفع موقّعة من السيرفر.
6. **اختبار آلي للتسريب:** اختبار يمر على كل route handler و server action للتاجر والعميل ويتحقق أن JSON الرد لا يحتوي المفاتيح `floorPrice` و `autoAcceptPrice` وأي `vendorId` غير تاجر الجلسة في عروض الفصال.

### 5.7 مخطط البيانات (نصي) للأجزاء الجديدة أو المعدّلة

```
Vendor 1─* VendorPickupLocation
Vendor 1─* VendorBankChangeRequest
Product 1─* ProductVariant 1─* PriceHistory
ProductVariant 1─1 VariantNegotiationSettings   (floorPrice, autoAcceptPrice — omit افتراضي)
Product 1─1 NegotiationSettings                 (allowBargain, maxRounds, responseWindowHours)
ProductVariant 1─* StockReservation ─→ (ORDER | PRICE_LOCK)

Order 1─* SubOrder 1─* OrderItem
Order 1─* Payment 1─* PaymentTransaction (AUTHORIZE|CAPTURE|REFUND|VOID) ─→ SubOrder?, Return?
SubOrder 1─* Shipment 1─* ShipmentEvent
SubOrder *─1 VendorPickupLocation
WebhookEvent (provider, eventId) ← مستقل، يُعالج إلى Payment/Shipment

Deal 1─* DealVariant (exclusion: variant × [startsAt,endsAt))
Deal 1─* DealRedemption ─→ User, Order
CartItem ─→ Deal? (lockedUnitPrice, priceLockedUntil) | PriceLock?

PriceRequest 1─* PriceRequestRecipient (unique requestId+vendorId)
PriceRequest 1─* NegotiationThread (unique requestId+vendorId) 1─* PriceOffer
PriceOffer 1─0..1 PriceLock (unique offerId) ─→ StockReservation, Order? (pending/used)

WalletTransaction (idempotencyKey unique, append-only) ─→ SubOrder?, Payout?, PaymentTransaction?
City 1─* CarrierCityAlias ; Address ─→ City ; ShippingZone *─* City
ModerationFlag ; AuditLog (append-only)
```

---

## 6. Migrations المقترحة (أسماء وترتيب فقط، تُنفذ في P1 بعد G1)

| # | الاسم | المحتوى |
|---|---|---|
| 1 | `0001_init_core` | المستخدمون، التجار، التصنيفات، الكتالوج، المدن (الـ schema الأساسي من قسم 5 + H1، H2، H4، M4) |
| 2 | `0002_inventory_reservations` | `StockReservation`، قيود المخزون (C3) |
| 3 | `0003_orders_payments` | Order، SubOrder، OrderItem (H12، H13، H14)، Payment، PaymentTransaction (C4)، WebhookEvent (C5)، SEQUENCE الأرقام (M1) |
| 4 | `0004_shipping` | Shipment، ShipmentEvent (H3)، CarrierCityAlias |
| 5 | `0005_ledger_payouts` | WalletTransaction بـ idempotencyKey وتريغر عدم التعديل (C7)، Payout، PayoutBatch، VendorBankChangeRequest (M2)؛ الحقول المالية من O1/O2/O3 بعد اعتماد finance-zatca |
| 6 | `0006_price_history` | PriceHistory + تريغر (H5) |
| 7 | `0007_deals` | Deal، DealVariant + `CREATE EXTENSION btree_gist` + exclusion constraint (H6)، DealRedemption (H7)، حقول CartItem (H8) — SQL يدوي داخل migration Prisma |
| 8 | `0008_negotiation` | NegotiationSettings، VariantNegotiationSettings (C6)، PriceRequest، Recipient، NegotiationThread (H9)، PriceOffer، PriceLock (H11)، الفهارس الجزئية (H10، M9)، ModerationFlag (M8) |
| 9 | `0009_security_hardening` | تفعيل RLS على كل جداول `public` بدون policies، `REVOKE` من `anon`/`authenticated`، تريغر منع تعديل AuditLog (M11)، policies على `realtime.messages` و `storage.objects` (C2) |

بعد كل migration: `get_advisors` (security + performance) وإصلاح الملاحظات، و `generate_typescript_types` لزملاء الواجهة. التغييرات الخطرة (7، 8، 9) تُجرب على Supabase branch أولاً.

---

## 7. طريقة الاختبار (لما يُنفذ في P1–P5)

| الموضوع | الاختبار |
|---|---|
| حجز المخزون | Vitest + Postgres حقيقي: 50 طلب متزامن على variant مخزونه 5 ← 5 نجاحات بالضبط و `reservedStock` = 5؛ انتهاء الحجز يعيد المخزون |
| FLASH | 20 عميل متزامن على عرض `stockLimit = 3` ← 3 طلبات فقط؛ `perCustomerLimit = 1` مع طلبين متزامنين لنفس العميل ← واحد فقط |
| الفصال | قبول متزامن لعرضين ← واحد يُقبل؛ تجاوز `maxRounds` مرفوض؛ PriceLock `IN_CHECKOUT` لا يُفك بالـ cron |
| السرية | اختبار التسريب الآلي (5.6 بند 6)؛ تاجر B يشترك في `pr:{id}:vendor:{A}` ← رفض من Realtime |
| Webhooks | إعادة إرسال نفس حدث Moyasar 6 مرات ← قيد ledger واحد؛ `secret_token` خاطئ ← 401 بدون معالجة؛ مبلغ مختلف عند إعادة الجلب ← `PAID_NEEDS_REVIEW` |
| الاسترجاع | استرجاع جزئي مرتين على طلب بثلاث SubOrders في Moyasar sandbox (يتأكد هل المزود يقبل الثاني) وفي Tabby/Tamara sandbox |
| Tabby/Tamara | الـ redirect والـ webhook يطلقان capture معاً ← capture واحد؛ JWT تمارا مزوّر ← رفض |
| الشحن | webhook OTO بـ `Authorization` خاطئ ← رفض؛ حالة `DELIVERED` لا تُطبق إلا بعد إعادة جلب الشحنة |
| SMS | OTP: 6 محاولات خاطئة ← قفل؛ 6 طلبات في ساعة ← 429 |

---

## 8. أسئلة للمالك (عبر الـ CEO)

1. **الشحنات عالية القيمة:** ما الحد الذي يتحول عنده الطلب للمسار اليدوي المؤمَّن (مقترح 5,000 ر.س)؟ ومن يتحمل رسم التأمين: المنصة، التاجر، أم العميل كبند ظاهر؟
2. **الدفع عند الاستلام:** نؤكد أنه غير مفعّل عند الإطلاق؟
3. **السيوف:** هل تتوفر لديكم وثائق أو اشتراطات نظامية لبيعها وشحنها (للتاجر وللمنصة)؟ (تُرسل أيضاً لـ legal-contracts)
4. **اسم المرسل:** الاسم المطلوب (`SuqAlZal` أو غيره، حتى 11 حرفاً لاتينياً) وتجهيز خطاب التفويض المصدّق من الغرفة.
5. **رقم واتساب الأعمال** المخصص للمنصة (لا يكون مستخدماً على تطبيق واتساب العادي).
6. **قرارات الـ schema:** الحد الأدنى السري مبلغ أم نسبة (C6)؛ تأخير القبول التلقائي (5.6 بند 4)؛ إبقاء المنتج ظاهراً أثناء مراجعة التعديل (M5)؛ شحن الفصال من التاجر أم من المنطقة (M7)؛ هل يحجز وضع منتج FLASH في السلة حصة (H8)؛ تسعير الشحن حسب مدينة التاجر (M4)؛ قبول أرقام جوال غير سعودية (5.5).
7. **طلب عروض الأسعار:** المالك يرسل أسئلة الأقسام 1.7 و 2.8 و 3.4 و 4.5 للمزودين من حساب المنشأة (بعضها لا يجيب إلا لتاجر مسجل).

---

## 9. ملاحظة تسليم (Hand-off)

**إلى `qa-tester`:**
- خطة الاختبار في القسم 7 هي الحد الأدنى؛ أضفها لخطة P6. أولويتك: سيناريو 8 (السرية) مع قنوات Realtime (C1)، وسيناريو 5 (العزل) مع العلم أن RLS لا يحمي Prisma (C2) فالعزل كله في طبقة الخدمة ويجب اختباره بالتلاعب بالمعرّفات في كل route.
- سيناريوهات تزامن (حجز المخزون، FLASH، القبول المزدوج) تحتاج أداة حمل (k6 أو سكربت متوازي)، وليست Playwright فقط.

**إلى `frontend-engineer`:**
- لا تشترك في `postgres_changes` على أي جدول. الاشتراك فقط في قنوات Broadcast الخاصة (`private: true`) بالأسماء في C1، والرسالة تحمل معرّفات وحالة فقط، ثم اجلب التفاصيل من الـ API.
- الـ Realtime يحتاج JWT قصيراً من endpoint في السيرفر (يُحدد في P1) وتجديده قبل الانتهاء، وإلا ينقطع الاتصال.
- Apple Pay: زر Apple Pay يظهر فقط إذا `ApplePaySession.canMakePayments()`؛ ملف `.well-known/apple-developer-merchantid-domain-association` بدون امتداد يُخدم من التطبيق.
- تابي/تمارا: الزر يُعطّل حسب رد eligibility/session (`order_amount_too_high` إلخ)، وويدجت الأقساط لا يظهر للمنتجات فوق سقف 10,000 ر.س إلا إذا أكد المزود خطة ممتدة.
- لا تعرض `floorPrice` ولا تتوقعه في أي DTO؛ التاجر يرى `belowYourFloor` فقط.
- الأنواع: `generate_typescript_types` بعد migrations P1، والـ DTOs (Zod) هي العقد، وليس جداول قاعدة البيانات.

**إلى `flutter-engineer`** (إن وُجد تطبيق جوال لاحقاً):
- نفس قواعد Realtime: `supabase_flutter` بقنوات `RealtimeChannelConfig(private: true)` و JWT من سيرفرنا، بدون `postgres_changes`.
- Apple Pay في التطبيق **يحتاج حساب Apple Developer وشهادة معالجة** (Web Registration للويب فقط حسب وثائق Moyasar). Moyasar لديها SDK لـ Flutter، ولتابي وتمارا SDKs للجوال.
- النماذج (Dart) تُبنى من DTOs الـ API وليس من الجداول: المبالغ `int` بالهللة دائماً، والتواريخ UTC بصيغة ISO 8601.

**لم يُحدّث `company/board.md`** لأن المهمة حصرت التعديل في هذا الملف؛ الـ CEO يحدّث P0-06 ويضيف رابط هذا الملف.

---

## 10. ملاحظات تنفيذ P1-01 (backend-engineer، 2026-11-18)

> قرارات تقنية اتخذت أثناء P1-01. اللي محتاج اعتماد الـ CEO مكتوب عليه **[CEO]**.

1. **مكتبة الـ Auth [CEO]:** SPEC §2 بيقول Better Auth أو Auth.js. نفذت جلسات سيرفر داخلية (`src/lib/auth/`): توكن عشوائي في cookie `httpOnly` و SHA-256 بس في جدول `sessions`، والتحقق من القاعدة في كل طلب. السبب: Better Auth بيفرض `User.email` إلزامي (عملاءنا بالجوال بس، و SPEC §5 بيقول `email?`)، و Auth.js مع Credentials بيشتغل بـ JWT بس مش جلسات سيرفر، والاتنين بيعدوا على Prisma من غير سياق RLS (`FORCE` بيرفضهم). التبديل لاحقاً محصور في `src/lib/auth/session.ts` و `service.ts`.
2. **أسماء الأدوار والمتغيرات:** SPEC §2 فيه أسماء الـ spike (`suq_owner`/`suq_app`، `APP_DATABASE_URL`). المشروع ماشي على أسماء devops (`suqalzl_migrator`/`suqalzl_app`، `DIRECT_URL`/`DATABASE_URL`). نفس المعنى. الـ migrations مبتكتبش اسم دور: `app.runtime_roles()`.
3. **`VendorPickupLocation` [CEO]:** التكليف طلبه، لكن SPEC §15 (S8) بيقول إنه معلّق مع O4. **ما اتعملش**؛ `Vendor.pickupAddress` (JSON) زي SPEC §5. نفس الكلام لـ `Product.shippingClass` و `CarrierCityAlias`.
4. **Migrations:** binary الـ schema-engine محجوب (زي P1-00). الـ baseline اتولد من الـ DMMF بمولد بتسميات Prisma (`scripts/db/`)، واختبار drift بيقارن القاعدة بالـ schema. `docs/runbooks/db-migrations.md`.
5. **`SessionScope`:** دخول موظف بـ OTP العميل بيدي جلسة عميل بس؛ صلاحيات الإدارة/التاجر محتاجة دخول الإدارة (D31).
6. **`SubOrder`:** حقول التتبع (`trackingNumber`، `labelUrl`) في `Shipment` بس (H3)، و حالة `PENDING_PAYMENT` للطلب الفرعي قبل تأكيد الدفع (6.2-4 بيحوله لـ `NEW`).
7. **"المواسم" (6.7):** مفيش جدول لسه؛ يتضاف في P4.5-02.

**ردود على `docs/runbooks/notes-for-backend.md` §9 (devops):**
1. مكتبة الـ Auth: داخلية (بند 1). `AUTH_SECRET` محجوز ومش إلزامي؛ مفيش `BETTER_AUTH_*`.
2. الـ Prisma client في `src/generated/prisma/` (متجاهل في git، بيتولد بـ `postinstall`).
3. الـ seed بيشتغل بدور **التطبيق** في سياق `system` (مش الـ migrator)، لأن `FORCE` بيطبق RLS على المالك كمان.
4. job slugs: `run-queue`، `release-expired-reservations`، `purge-auth`، `purge-realtime-events` (`CRON_JOBS` في `src/lib/providers/jobs/index.ts`).
- الـ CI: مقترح خطوة `prisma migrate diff --from-migrations ... --to-schema ... --exit-code`، و `TEST_DB_POOL_MAX=20` لاختبارات التزامن.
