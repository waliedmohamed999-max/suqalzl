# Design System و Design Tokens — سوق الزل

> **الحالة:** مقترح للمراجعة في بوابة G1. **النسخة 1.1** بتاريخ 2026-11-18 (تطبيق قرارات المالك 2026-11-17: رمز الريال وزر واتساب، وملاحظات designer). تحلّ محل 1.0 والمسودة 0.1.
> **المالك:** design-system-performance. القرارات البصرية (الهوية والمزاج) بالتنسيق مع `designer`.
> **المصدر الوحيد للقيم** لملف `src/app/globals.css` (Tailwind v4 + shadcn/ui) في المهمة P1-02. ممنوع أي لون أو مقاس أو مسافة hardcoded خارج هذا الملف.
> **ملف المراجعة المرافق:** `docs/design/review-design-system.md` (ملاحظات على التصاميم الحالية).

## 0. ما تغيّر عن المسودة 0.1 ولماذا

نسب التباين في المسودة أعدت حسابها بسكربت (الملحق أ)، والأرقام المكتوبة فيها كانت صحيحة. المشكلة كانت في أزواج ألوان لم تُفحص أصلاً. هذه الأخطاء صُحّحت:

| # | في المسودة 0.1 | المشكلة (مقاسة) | القرار في 1.0 |
|---|---|---|---|
| 1 | حلقة التركيز `gold-500` على الفاتح والداكن | 2.45:1 على `sand-50` و 2.62:1 على الأبيض، أي أقل من 3:1 المطلوبة في WCAG 1.4.11 | `--ring` = `gold-700` على الفاتح (5.54) و `gold-500` على الداكن (6.00) |
| 2 | حدود الحقل `sand-200` | 1.42:1، فحدود الحقل لا تُرى (1.4.11) | توكن جديد `--input` = `sand-500` بنسبة 4.04 على الأبيض و 3.39 على `sand-100`. `sand-200` يبقى للفواصل فقط |
| 3 | `--accent: gold-500` في shadcn | shadcn يستخدم `accent` كخلفية hover في القوائم والـ ghost buttons، فكل قائمة منسدلة كانت ستصير ذهبية | `--accent` = `sand-100` (سطح hover)، والذهبي صار توكن مستقلاً اسمه `--gold` |
| 4 | الخط بأربعة أوزان 400/500/600/700 + Tajawal في الـ fallback | 4 أوزان × (عربي + لاتيني) = 257KB woff2 مقاسة. و Tajawal خط ويب غير مثبت على الأجهزة، فوجوده في الـ fallback لا يفيد | 3 أوزان (400/600/700) بـ subset مخصص: حوالي 70KB إجمالاً (القسم 3.2). أُزيل Tajawal |
| 5 | `xs` = 12/16 و `body` = 15 | ارتفاع سطر 1.33 يقص الحركات والنقاط في العربي (مقاييس الخط: ascent 1085 و descent 415 من 1000 = 1.5em). وحقل نصه أقل من 16px يجعل iOS Safari يكبّر الصفحة عند التركيز | مقياس واحد من 12 إلى 36، ونسبة السطر لا تقل عن 1.5 في النص الجاري، والحقول 16px |
| 6 | `font-variant-numeric: tabular-nums` للعدادات | IBM Plex Sans Arabic **لا يحتوي feature `tnum`** (فحصته بـ fontTools). لكن الأرقام اللاتينية فيه عرضها ثابت أصلاً (600 وحدة لكل رقم)، أما الأرقام الهندية (٠–٩) فعرضها متغير من 263 إلى 635 | نعتمد الأرقام اللاتينية (عرضها ثابت تلقائياً)، ونبقي `tabular-nums` للخطوط البديلة فقط |
| 7 | الألوان الدلالية: `*-bg` = اللون بشفافية 10% | الشفافية تغيّر التباين حسب السطح تحتها، فلا يمكن ضمانه | خلفيات ثابتة بقيم hex (`*-subtle`) ومفحوصة |
| 8 | لا يوجد نطاق للأسطح الداكنة | البطاقة البيضاء داخل شريط داكن ترث لون النص الفاتح وتختفي | نطاق `data-surface="inverse"` يعيد تعريف المتغيرات نفسها، ونطاق `data-surface="default"` يرجعها للفاتح داخل الداكن (القسم 2.3) |
| 9 | ظلال `sm` و `md` فقط، بدون z-index ولا حالات طلبات | ناقص | 3 مستويات ظلال، وطبقات z-index، وخريطة لكل حالات الطلبات والفصال والعروض (القسم 2.5) |

### 0.1 ما تغيّر في 1.1 (2026-11-18)

| # | التغيير | السبب | الأقسام |
|---|---|---|---|
| 1 | **رمز الريال السعودي الجديد (U+20C1) بدل "ر.س" في الواجهة**، عبر خط صغير بحرف واحد `Souq Riyal Sign` مبني من ملف ساما الرسمي، بـ `unicode-range: U+20C1`. ونص "ر.س" أو `SAR` في القنوات التي لا نتحكم في خطها | قرار المالك 2026-11-17 (`docs/decisions.md` بند 13) | 3.2، 8.4، 9.1، 9.2، 11، 12.2 |
| 2 | **توكن مستقل لزر واتساب** `whatsapp` = `#16803E` (نفس درجة لون واتساب، أغمق) بدل `success` | قرار المالك "زر أخضر" (بند 12)، وفصل لون علامة خارجية عن معنى "نجاح" | 2.1، 2.2، 2.6، 11.2 |
| 3 | توكنا `progress-fill` و `progress-fill-urgent`، ومسار داكن `brown-700` في النطاق المعكوس | ملاحظة designer 1 | 2.2، 2.3، 2.6، 11.3 |
| 4 | `DealCard` داخل الجزر الداكنة يستخدم `primary` (= ذهبي هناك) | ملاحظة designer 2 | 11.3 |
| 5 | دور `input-lg` (24px) لحقول الـ OTP والسعر الكبير | ملاحظة designer 4 | 3.3، 9.1، 11.1 |
| 6 | حجم الزر 36px اسمه `dense` (للوحات فقط، ممنوع في المتجر بالـ lint)، وأُلغي `sm` | ملاحظة designer 5، وتعارض بين 11.1 (sm = 36) و README 4.3 (sm = 44) | 4، 10، 11.1 |
| 7 | 99 زوج تباين بدل 90، و 0 فشل | الأزواج الجديدة أعلاه | 2.6، الملحق أ |

### 0.2 الرد على ملاحظات designer (README القسم 6)

| # | الملاحظة | الرد | ما تغيّر هنا |
|---|---|---|---|
| 1 | `progress-fill` غير المستعجل غير معرّف | **موافق.** اختيارك مقاس وصحيح: `brown-700` على `sand-200` = 8.19، و `danger-700` = 4.64، وعلى الداكن `gold-500` على `brown-700` = 4.43 و `danger-300` على `brown-700` = 5.60. غيّرت مسار النطاق المعكوس من `brown-600` إلى `brown-700` كما رسمته (مع `brown-600` كانت النسبة 3.47 فقط). ملاحظة: الشريط زخرفي (`aria-hidden`) والنص "باقي 3 قطع" هو المعلومة (11.3)، لذلك يكون في README `StockMeter` بدل `StockBar` وبدون `role="progressbar"` | `--progress-fill`، `--progress-fill-urgent`، و `--progress-track` المعكوس |
| 2 | `DealCard` داخل الداكن يستخدم `primary` | **موافق.** أضفت نصاً صريحاً في 11.3: "اشترِ الآن" = `Button variant="primary"`، والنطاق يجعله ذهبياً على الداكن و `ink` على الفاتح، فيبقى قرار "الذهبي داخل السوق فقط" صحيحاً تلقائياً. `variant="gold"` لا يُستخدم في `DealCard` | 11.3 |
| 3 | واتساب أخضر يجذب أكثر من زر الشراء، والبديل `ink` + ذهبي | **قرار المالك: أخضر** (2026-11-17). نفذته بتوكن مستقل لا بـ `success`، وبلون من نفس درجة واتساب (`#25D366` بعد تغميقه) حتى يُعرف من أول نظرة: أيقونة بيضاء 5.01، وحدود الزر على `sand-50` 4.69، وعلى الجزر الداكنة 3.14 و 3.72. ولتقليل منافسته لزر الشراء: 56×56 فقط، بلا نبض أو حركة، `shadow-md`، مخفي في السلة والدفع، ويرتفع فوق شريط الشراء الثابت. لون `#25D366` الأصلي مرفوض لأن الأيقونة البيضاء عليه 1.98 | 2.1، 2.2، 9.1، 11.2 |
| 4 | ذكر صريح أن الـ OTP والسعر في الحقول 24px | **موافق.** دور `input-lg` = `text-2xl font-bold` (24/36) بأرقام لاتينية و `dir="ltr"`. يبقى ≥ 16px فلا يكبّر iOS الصفحة | 3.3، 9.1، 11.1 |
| 5 | تسمية 36px بـ `size="dense"` | **موافق.** الأحجام الآن: `md` 44 (الافتراضي)، `lg` 52، `icon` 44، و `dense` / `icon-dense` 36 للوحات على الديسكتوب فقط. `sm` أُلغي لأنه كان 36 هنا و 44 في README. قاعدة lint تمنع `dense` تحت مسارات المتجر | 4، 10، 11.1 |

---

## 1. المبادئ

1. **الفخامة من الهدوء:** أرضية بيج عاجية، ونص أسود دافئ، والبني الغامق للأسطح القوية، والذهبي **للتمييز فقط** (حدود وشارات وأيقونات وأزرار على خلفية داكنة). لا تدرجات ذهبية لامعة.
2. **لا لون بدون معنى، ولا معنى باللون وحده:** كل حالة لها لون + أيقونة + نص.
3. **توكنات دلالية فقط في المكونات:** المكون يستخدم `bg-card` أو `text-muted-foreground` أو `bg-success-subtle`، ولا يستخدم `sand-100` أو hex مباشرة. الألوان الأساسية (Primitives) لا يراها إلا هذا الملف و `globals.css`.
4. **العربي أولاً:** RTL افتراضي، بلا letter-spacing، بأسطر مريحة، وأرقام لاتينية معزولة اتجاهياً.
5. **الأداء جزء من النظام:** 3 أوزان خط، صور بمقاسات صحيحة، مكونات Server افتراضياً، وجزر Client صغيرة.

---

## 2. الألوان

### 2.1 الألوان الأساسية (Primitives)
تُعرّف في `globals.css` بالبادئة `--c-*`. **ممنوع استخدامها في المكونات.**

| المجموعة | القيم |
|---|---|
| Ink | `ink #16120E` |
| Brown | `brown-900 #2E2018` · `brown-800 #3B2B21` · `brown-700 #4A3426` · `brown-600 #5C4334` · `brown-500 #6E5240` |
| Gold | `gold-50 #FAF3E3` · `gold-300 #DDBE7C` · `gold-500 #C29A4B` · `gold-600 #A67F35` · `gold-700 #7E5F22` |
| Sand | `sand-50 #FBF7F0` · `sand-100 #F3EADB` · `sand-200 #E6D7BE` · `sand-300 #BCAA92` · `sand-500 #8F7B66` |
| Neutral | `white #FFFFFF` · `muted #6B5E52` |
| Success | `success-50 #E8F1EA` · `success-300 #8FC79C` · `success-700 #2F6B3F` |
| Warning | `warning-50 #F8EEDC` · `warning-300 #E8B866` · `warning-700 #8A5A0F` |
| Danger | `danger-50 #F8E7E3` · `danger-300 #F0A08F` · `danger-700 #A23B2A` |
| Info | `info-50 #E6EEF4` · `info-300 #8DB8D6` · `info-700 #2D5B7A` |
| WhatsApp (1.1) | `whatsapp-600 #16803E` · `whatsapp-700 #15783A` — نفس درجة لون واتساب `#25D366` (hue 142°)، مغمّقة حتى يصل الأبيض عليها ≥ 5:1. **لزر واتساب فقط** |

> القاعدة: درجة 700 للنص والخلفية الصلبة على الفاتح، ودرجة 50 للخلفية الهادئة، ودرجة 300 للنص على الداكن.

### 2.2 التوكنات الدلالية (الوضع الفاتح، وهو الافتراضي)
أسماء shadcn/ui كما هي، ومعها إضافات سوق الزل. كل اسم يصير utility في Tailwind (`bg-*`، `text-*`، `border-*`).

| Token | القيمة | الاستخدام |
|---|---|---|
| `background` / `foreground` | sand-50 / ink | خلفية الصفحة والنص الأساسي |
| `foreground-secondary` | brown-700 | عناوين ثانوية، نص في صناديق المعلومات |
| `card` / `card-foreground` | white / ink | البطاقات، الحقول، النوافذ |
| `popover` / `popover-foreground` | white / ink | القوائم المنسدلة |
| `primary` / `primary-foreground` / `primary-hover` | ink / sand-50 / brown-900 | الزر الأساسي ("أضف إلى السلة"، "ادفع الآن") |
| `secondary` / `secondary-foreground` | sand-100 / ink | زر ثانوي ممتلئ |
| `muted` / `muted-foreground` | sand-100 / muted | أسطح هادئة، والنص الثانوي (السعر قبل الخصم، التلميحات، الحقل المعطل) |
| `accent` / `accent-foreground` | sand-100 / ink | **سطح الـ hover في shadcn** (عناصر القوائم، ghost). ليس الذهبي |
| `gold` / `gold-foreground` / `gold-hover` | gold-500 / ink / gold-600 | الذهبي: CTA في سوق الزل، الشارات الذهبية، الأزرار على الداكن |
| `gold-subtle` / `gold-text` | gold-50 / gold-700 | شارة "الأفضل إجمالاً"، "سعر مقفول"، ونص ذهبي على الفاتح |
| `link` | gold-700 | الروابط |
| `destructive` / `destructive-foreground` | danger-700 / white | الحذف والإلغاء |
| `border` | sand-200 | فواصل وحدود بطاقات (زخرفية) |
| `border-strong` | ink | حدود العنصر المختار (مقاس، طريقة دفع)، مؤشر التبويب |
| `input` | sand-500 | **حدود الحقول** والـ checkbox والـ select |
| `ring` | gold-700 | حلقة التركيز |
| `success` · `warning` · `danger` · `info` · `neutral` | درجة 700 (و brown-700 للـ neutral) | نص الحالة، أو خلفية صلبة |
| `*-foreground` | white (و sand-50 للـ neutral) | النص على الخلفية الصلبة للحالة |
| `*-subtle` | درجة 50 (و sand-100 للـ neutral) | خلفية شارة الحالة |
| `discount` / `discount-foreground` | danger-700 / white | شارة نسبة الخصم |
| `live` | danger-700 | نقطة وشارة "مباشر" |
| `progress-track` / `progress-fill` / `progress-fill-urgent` | sand-200 / brown-700 / danger-700 | مسار وتعبئة `StockMeter` ("باقي X")، والمستعجل (≤ 3 قطع). الشريط زخرفي والنص هو المعلومة |
| `whatsapp` / `whatsapp-foreground` / `whatsapp-hover` | whatsapp-600 / white / whatsapp-700 | **زر واتساب العائم فقط.** لا يُعاد تعريفه في النطاق المعكوس (حدوده ≥ 3:1 على الفاتح والداكن). ممنوع استخدامه كلون نجاح أو العكس |
| `inverse` / `inverse-foreground` | brown-900 / sand-50 | لتلوين سطح داكن من الخارج (الأفضل استخدام النطاق في 2.3) |
| `chart-1..4` | gold-600 · brown-700 · info-700 · success-700 | سلاسل الرسوم البيانية. **أقصى 4 سلاسل**، وكلها ≥ 3:1 على الأبيض |
| `sidebar*` | انظر `globals.css` | Sidebar داكن في admin و vendor |

### 2.3 النطاق المعكوس (Inverse scope) بدل الوضع الداكن الكامل

**القرار:** لا يوجد Dark mode كامل في الإطلاق، لا للمتجر ولا للوحات. الأسباب: عالم الهوية مبني على البيج، وصور المنتجات مصورة على خلفيات فاتحة، ووضع داكن كامل يضاعف اختبار الوصولية والصور. لكن التصميم فيه **جزر داكنة** (الهيدر، شريط عروض الساعة، رأس `/souq`، الفوتر، Sidebar الإدارة والتاجر). لها نطاق يعيد تعريف **المتغيرات نفسها**، فتعمل كل المكونات داخلها بدون variants إضافية:

| النطاق | الخلفية | متى |
|---|---|---|
| `data-surface="inverse"` | brown-900 | شريط عروض الساعة، رأس السوق، الفوتر، الـ Sidebar |
| `data-surface="inverse-strong"` | ink | هيدر المتجر |
| `data-surface="default"` | يرجع للفاتح | بطاقة منتج بيضاء داخل شريط داكن |

القيم داخل النطاق المعكوس: `foreground` sand-50، و `foreground-secondary` sand-200، و `muted-foreground` sand-300، و `card` brown-800، و `border` brown-600، و `primary` **gold-500 بنص ink** (الزر الأساسي على الداكن يصير ذهبياً)، و `ring` gold-500، و `link` gold-300، والحالات بدرجة 300 مع خلفيات subtle ثابتة (success `#3E3B2D`، warning `#4C3824`، danger `#4D342B`، info `#3D3836`)، و `progress-track` brown-700 مع `progress-fill` gold-500 (4.43) و `progress-fill-urgent` danger-300 (5.60). `whatsapp` لا يتغير.

> **لو احتجنا Dark mode كامل لاحقاً:** `<html data-surface="inverse-strong">` يعطي 90% منه، ويبقى فحص الصور والرسوم. التوكنات جاهزة ومفحوصة (الجدول 2.6.2).

### 2.4 نغمات الحالة (Tones)
كل حالة في النظام تُعرض بنغمة من ست نغمات فقط. **لكل نغمة أيقونة ثابتة** حتى لا يُعتمد على اللون وحده (أسماء الأيقونات من lucide-react):

| Tone | الشارة الهادئة (افتراضي) | الشارة الصلبة | الأيقونة | المعنى |
|---|---|---|---|---|
| `neutral` | `bg-neutral-subtle text-neutral` | `bg-neutral text-neutral-foreground` | `circle-dashed` / `minus-circle` | مسودة، منتهٍ، ملغي، مؤرشف |
| `info` | `bg-info-subtle text-info` | `bg-info text-info-foreground` | `info` / `truck` | جديد، معتمد، في الطريق، بانتظار الطرف الآخر |
| `accent` (gold) | `bg-gold-subtle text-gold-text` | `bg-gold text-gold-foreground` | `sparkles` / `lock` | قيد التجهيز، وصلت عروض، سعر مقفول، موثوق، أفضل عرض |
| `warning` | `bg-warning-subtle text-warning` | `bg-warning text-warning-foreground` | `clock` | بانتظار، يحتاج إجراء، مهلة قربت، مخزون منخفض |
| `success` | `bg-success-subtle text-success` | `bg-success text-success-foreground` | `check-circle-2` | مدفوع، تم التسليم، مقبول، متاح |
| `danger` | `bg-danger-subtle text-danger` | `bg-danger text-danger-foreground` | `x-circle` / `alert-triangle` | فشل، مرفوض، معلّق، خطأ |

نغمة خاصة: **`live`** = نقطة `bg-live` نابضة + نص (شارة "مباشر" وعرض LIVE).

### 2.5 خريطة حالات الدومين ← النغمة
مرجع لـ `StatusBadge`. يُخزَّن كـ map في `src/components/status/status-map.ts`، والنصوص في `messages/*.json` تحت `status.<entity>.<STATE>`. النصوص العربية هنا مقترحة، والصياغة النهائية لـ arabic-content-seo.

**الطلب الفرعي `SubOrder.status`** (العميل يرى تسمية مبسطة، والتاجر والإدارة يرون الكاملة):

| الحالة | النغمة | التسمية |
|---|---|---|
| NEW | info | جديد |
| PREPARING | accent | قيد التجهيز |
| READY_TO_SHIP | accent | جاهز للشحن |
| SHIPPED | info | تم الشحن |
| DELIVERED | success | تم التسليم |
| COMPLETED | success (صلبة) | مكتمل |
| CANCELLED | neutral | ملغي |
| RETURN_REQUESTED | warning | طلب استرجاع |
| RETURNED | neutral | مسترجع |

- **الطلب `Order.status`:** PENDING_PAYMENT warning "بانتظار الدفع" · PAID info "مدفوع" · PARTIALLY_SHIPPED info "شُحن جزئياً" · COMPLETED success "مكتمل" · CANCELLED neutral "ملغي".
- **الدفع `paymentStatus`:** PENDING warning · PAID success · FAILED danger · REFUNDED neutral "مسترد" · PARTIALLY_REFUNDED neutral "مسترد جزئياً".
- **الاسترجاع `Return.status`:** REQUESTED warning · APPROVED info · REJECTED danger · RECEIVED info · REFUNDED success.

**طلب السعر `PriceRequest.status`:**

| الحالة | النغمة | للعميل |
|---|---|---|
| OPEN | info | بانتظار العروض |
| HAS_OFFERS | accent | وصلتك {count} عروض |
| ACCEPTED | success | مقبول، ادفع خلال {time} |
| CONVERTED | success (صلبة) | تم الشراء |
| EXPIRED | neutral | انتهت المدة |
| CANCELLED | neutral | ملغي |

- **العرض `PriceOffer.status`:** PENDING warning ("بانتظار ردك" للعميل و"بانتظار العميل" للتاجر) · COUNTERED info "سعر مضاد" · ACCEPTED success · REJECTED neutral "مرفوض" (ليس danger، لأن الرفض في الفصال طبيعي) · EXPIRED neutral · WITHDRAWN neutral "مسحوب". وسم إضافي عند `isAuto`: accent "قبول تلقائي".
- **صندوق التاجر `PriceRequestRecipient`:** SENT/SEEN info "جديد" · بانتظار ردي warning · RESPONDED neutral "بانتظار العميل" · DECLINED neutral "اعتذرت" · IGNORED neutral. وسم **"أقل من حدك الأدنى"** = warning، **للتاجر فقط**، ولا يُرسل في أي DTO للعميل.
- **قفل السعر `PriceLock`:** ACTIVE accent "سعر مقفول" + `Countdown` · USED success · EXPIRED neutral · CANCELLED neutral.
- **العرض `Deal.status`:** DRAFT neutral · PENDING warning "بانتظار الموافقة" · APPROVED info "مجدول" · LIVE **live** "مباشر" · ENDED neutral "انتهى" · REJECTED danger.
- **المنتج `Product.status`:** DRAFT neutral · PENDING warning "قيد المراجعة" · PUBLISHED success "منشور" · REJECTED danger · ARCHIVED neutral.
- **التاجر `Vendor.status`:** PENDING warning · APPROVED success "معتمد" · REJECTED danger · SUSPENDED danger "معلّق". و `isTrusted` = accent "موثوق".
- **المحفظة `WalletTransaction.status`:** PENDING warning "معلّق" · AVAILABLE success "متاح" · PAID neutral "محوّل".
- **التسوية `Payout.status`:** DRAFT neutral · APPROVED info "معتمد" · PAID success "محوّل" · CANCELLED neutral.
- **التقييم `Review.status`:** PENDING warning · APPROVED success · HIDDEN neutral "مخفي".

### 2.6 نسب التباين المحسوبة
محسوبة بسكربت (الملحق أ) وفق صيغة WCAG 2.x للإضاءة النسبية. الحدود: نص 4.5:1، نص كبير 3:1، عناصر واجهة غير نصية 3:1 (حدود الحقول، حلقة التركيز، مؤشرات الحالة، الأيقونات التي تحمل معنى). **النتيجة (1.1): 99 زوجاً مستخدماً، 0 فشل.** رمز الريال يرث `currentColor`، فتباينه هو تباين النص الذي حوله (لا أزواج جديدة له). (تدقيق المسودة الحالية في ملف المراجعة.)

#### 2.6.1 الوضع الفاتح (الافتراضي)

| الاستخدام | الأمامي | الخلفية | النوع | النسبة | النتيجة |
|---|---|---|---|---:|---|
| text | `ink` #16120E | `background` #FBF7F0 | text | 17.45 | AAA |
| text | `ink` #16120E | `surface` #FFFFFF | text | 18.63 | AAA |
| text | `ink` #16120E | `surface-subtle` #F3EADB | text | 15.62 | AAA |
| text-secondary | `brown-700` #4A3426 | `background` #FBF7F0 | text | 10.86 | AAA |
| text-secondary | `brown-700` #4A3426 | `surface-subtle` #F3EADB | text | 9.72 | AAA |
| text-muted | `muted` #6B5E52 | `surface` #FFFFFF | text | 6.27 | AA |
| text-muted | `muted` #6B5E52 | `background` #FBF7F0 | text | 5.87 | AA |
| text-muted | `muted` #6B5E52 | `surface-subtle` #F3EADB | text | 5.26 | AA |
| text-muted (disabled field) | `muted` #6B5E52 | `surface-subtle` #F3EADB | text | 5.26 | AA |
| text-link / text-accent | `gold-700` #7E5F22 | `surface` #FFFFFF | text | 5.92 | AA |
| text-link / text-accent | `gold-700` #7E5F22 | `background` #FBF7F0 | text | 5.54 | AA |
| text-link / text-accent | `gold-700` #7E5F22 | `surface-subtle` #F3EADB | text | 4.96 | AA |
| text-accent | `gold-700` #7E5F22 | `accent-subtle` #FAF3E3 | text | 5.35 | AA |
| primary-fg on primary (btn) | `sand-50` #FBF7F0 | `primary` #16120E | text | 17.45 | AAA |
| primary-fg on primary-hover | `sand-50` #FBF7F0 | `primary-hover` #2E2018 | text | 14.72 | AAA |
| accent-fg on accent (gold btn) | `ink` #16120E | `accent` #C29A4B | text | 7.11 | AAA |
| accent-fg on accent-hover | `ink` #16120E | `accent-hover` #A67F35 | text | 5.07 | AA |
| destructive-fg | `white` #FFFFFF | `destructive` #A23B2A | text | 6.57 | AA |
| discount badge text | `white` #FFFFFF | `discount` #A23B2A | text | 6.57 | AA |
| price-discount text | `danger-700` #A23B2A | `surface` #FFFFFF | text | 6.57 | AA |
| success text (KPI up) | `success-700` #2F6B3F | `surface` #FFFFFF | text | 6.37 | AA |
| warning text (timer) | `warning-700` #8A5A0F | `surface` #FFFFFF | text | 5.92 | AA |
| warning text | `warning-700` #8A5A0F | `background` #FBF7F0 | text | 5.54 | AA |
| info text | `info-700` #2D5B7A | `surface` #FFFFFF | text | 7.27 | AAA |
| badge success | `success-700` #2F6B3F | `success-subtle` #E8F1EA | text | 5.52 | AA |
| badge warning | `warning-700` #8A5A0F | `warning-subtle` #F8EEDC | text | 5.14 | AA |
| badge danger | `danger-700` #A23B2A | `danger-subtle` #F8E7E3 | text | 5.49 | AA |
| badge info | `info-700` #2D5B7A | `info-subtle` #E6EEF4 | text | 6.20 | AA |
| badge neutral | `brown-700` #4A3426 | `neutral-subtle` #F3EADB | text | 9.72 | AAA |
| badge accent | `gold-700` #7E5F22 | `accent-subtle` #FAF3E3 | text | 5.35 | AA |
| badge solid success | `white` #FFFFFF | `success-solid` #2F6B3F | text | 6.37 | AA |
| badge solid info | `white` #FFFFFF | `info-solid` #2D5B7A | text | 7.27 | AAA |
| badge solid warning | `white` #FFFFFF | `warning-solid` #8A5A0F | text | 5.92 | AA |
| badge solid neutral | `sand-50` #FBF7F0 | `neutral-solid` #4A3426 | text | 10.86 | AAA |
| border-input (field boundary) | `sand-500` #8F7B66 | `surface` #FFFFFF | ui | 4.04 | AA (ui) |
| border-input (field boundary) | `sand-500` #8F7B66 | `background` #FBF7F0 | ui | 3.79 | AA (ui) |
| border-input (field boundary) | `sand-500` #8F7B66 | `surface-subtle` #F3EADB | ui | 3.39 | AA (ui) |
| ring (focus, light) | `gold-700` #7E5F22 | `background` #FBF7F0 | ui | 5.54 | AA (ui) |
| ring (focus, light) | `gold-700` #7E5F22 | `surface-subtle` #F3EADB | ui | 4.96 | AA (ui) |
| ring (focus, light) | `gold-700` #7E5F22 | `surface` #FFFFFF | ui | 5.92 | AA (ui) |
| ring vs primary btn (offset 2px) | `gold-700` #7E5F22 | `primary` #16120E | ui | 3.15 | AA (ui) |
| border-strong (selected option) | `ink` #16120E | `surface` #FFFFFF | ui | 18.63 | AA (ui) |
| tab indicator (selected) | `ink` #16120E | `surface` #FFFFFF | ui | 18.63 | AA (ui) |
| checkbox/radio border | `brown-500` #6E5240 | `surface` #FFFFFF | ui | 7.13 | AA (ui) |
| progress-fill (stock left) | `brown-700` #4A3426 | `progress-track` #E6D7BE | ui | 8.19 | AA (ui) |
| progress-fill-urgent (stock left) | `danger-700` #A23B2A | `progress-track` #E6D7BE | ui | 4.64 | AA (ui) |
| star icon | `gold-600` #A67F35 | `surface` #FFFFFF | ui | 3.68 | AA (ui) |
| chart-1 line | `gold-600` #A67F35 | `surface` #FFFFFF | ui | 3.68 | AA (ui) |
| chart-2 line | `brown-700` #4A3426 | `surface` #FFFFFF | ui | 11.60 | AA (ui) |
| chart-3 line | `info-700` #2D5B7A | `surface` #FFFFFF | ui | 7.27 | AA (ui) |
| chart-4 line | `success-700` #2F6B3F | `surface` #FFFFFF | ui | 6.37 | AA (ui) |
| whatsapp fab icon/label | `white` #FFFFFF | `whatsapp` #16803E | text | 5.01 | AA |
| whatsapp fab icon/label (hover) | `white` #FFFFFF | `whatsapp-hover` #15783A | text | 5.56 | AA |
| whatsapp fab boundary | `whatsapp-600` #16803E | `background` #FBF7F0 | ui | 4.69 | AA (ui) |
| whatsapp fab boundary | `whatsapp-600` #16803E | `surface` #FFFFFF | ui | 5.01 | AA (ui) |
| whatsapp fab boundary | `whatsapp-600` #16803E | `surface-subtle` #F3EADB | ui | 4.20 | AA (ui) |
| border-accent (best offer) + label | `gold-500` #C29A4B | `surface` #FFFFFF | deco | 2.62 | decorative |
| border (divider) | `sand-200` #E6D7BE | `surface` #FFFFFF | deco | 1.42 | decorative |

_58 زوج — فشل: 0_

#### 2.6.2 النطاق المعكوس (inverse: الهيدر، شريط عروض الساعة، رأس السوق، Sidebar)

| الاستخدام | الأمامي | الخلفية | النوع | النسبة | النتيجة |
|---|---|---|---|---:|---|
| text | `sand-50` #FBF7F0 | `inverse (brown-900)` #2E2018 | text | 14.72 | AAA |
| text-secondary | `sand-200` #E6D7BE | `inverse (brown-900)` #2E2018 | text | 11.10 | AAA |
| text-muted | `sand-300` #BCAA92 | `inverse (brown-900)` #2E2018 | text | 6.96 | AA |
| text-accent (gold) | `gold-500` #C29A4B | `inverse (brown-900)` #2E2018 | text | 6.00 | AA |
| text-link (gold-300) | `gold-300` #DDBE7C | `inverse (brown-900)` #2E2018 | text | 8.78 | AAA |
| danger text (live) | `danger-300` #F0A08F | `inverse (brown-900)` #2E2018 | text | 7.58 | AAA |
| success text | `success-300` #8FC79C | `inverse (brown-900)` #2E2018 | text | 8.10 | AAA |
| warning text | `warning-300` #E8B866 | `inverse (brown-900)` #2E2018 | text | 8.59 | AAA |
| info text | `info-300` #8DB8D6 | `inverse (brown-900)` #2E2018 | text | 7.46 | AAA |
| ring (focus, inverse) | `gold-500` #C29A4B | `inverse (brown-900)` #2E2018 | ui | 6.00 | AA (ui) |
| border-input (inverse) | `sand-500` #8F7B66 | `inverse (brown-900)` #2E2018 | ui | 3.89 | AA (ui) |
| whatsapp fab boundary (over dark island) | `whatsapp-600` #16803E | `inverse (brown-900)` #2E2018 | ui | 3.14 | AA (ui) |
| text | `sand-50` #FBF7F0 | `inverse-strong (ink)` #16120E | text | 17.45 | AAA |
| text-secondary | `sand-200` #E6D7BE | `inverse-strong (ink)` #16120E | text | 13.16 | AAA |
| text-muted | `sand-300` #BCAA92 | `inverse-strong (ink)` #16120E | text | 8.26 | AAA |
| text-accent (gold) | `gold-500` #C29A4B | `inverse-strong (ink)` #16120E | text | 7.11 | AAA |
| text-link (gold-300) | `gold-300` #DDBE7C | `inverse-strong (ink)` #16120E | text | 10.41 | AAA |
| danger text (live) | `danger-300` #F0A08F | `inverse-strong (ink)` #16120E | text | 8.99 | AAA |
| success text | `success-300` #8FC79C | `inverse-strong (ink)` #16120E | text | 9.60 | AAA |
| warning text | `warning-300` #E8B866 | `inverse-strong (ink)` #16120E | text | 10.19 | AAA |
| info text | `info-300` #8DB8D6 | `inverse-strong (ink)` #16120E | text | 8.84 | AAA |
| ring (focus, inverse) | `gold-500` #C29A4B | `inverse-strong (ink)` #16120E | ui | 7.11 | AA (ui) |
| border-input (inverse) | `sand-500` #8F7B66 | `inverse-strong (ink)` #16120E | ui | 4.61 | AA (ui) |
| whatsapp fab boundary (over dark island) | `whatsapp-600` #16803E | `inverse-strong (ink)` #16120E | ui | 3.72 | AA (ui) |
| badge success (inverse subtle) | `success-300` #8FC79C | `success-300@16%/brown-900` #3E3B2D | text | 5.79 | AA |
| badge success (inverse solid) | `ink` #16120E | `success-300` #8FC79C | text | 9.60 | AAA |
| badge warning (inverse subtle) | `warning-300` #E8B866 | `warning-300@16%/brown-900` #4C3824 | text | 6.05 | AA |
| badge warning (inverse solid) | `ink` #16120E | `warning-300` #E8B866 | text | 10.19 | AAA |
| badge danger (inverse subtle) | `danger-300` #F0A08F | `danger-300@16%/brown-900` #4D342B | text | 5.50 | AA |
| badge danger (inverse solid) | `ink` #16120E | `danger-300` #F0A08F | text | 8.99 | AAA |
| badge info (inverse subtle) | `info-300` #8DB8D6 | `info-300@16%/brown-900` #3D3836 | text | 5.48 | AA |
| badge info (inverse solid) | `ink` #16120E | `info-300` #8DB8D6 | text | 8.84 | AAA |
| badge neutral (inverse) | `sand-200` #E6D7BE | `brown-800` #3B2B21 | text | 9.55 | AAA |
| primary btn on inverse (gold) | `ink` #16120E | `gold-500` #C29A4B | text | 7.11 | AAA |
| text on inverse-surface card | `sand-50` #FBF7F0 | `brown-800` #3B2B21 | text | 12.66 | AAA |
| text-muted on inverse-surface | `sand-300` #BCAA92 | `brown-800` #3B2B21 | text | 5.99 | AA |
| countdown digits | `gold-500` #C29A4B | `ink` #16120E | text | 7.11 | AAA |
| nav item active text | `sand-50` #FBF7F0 | `blend gold .16/brown-900` #463420 | text | 11.09 | AAA |
| sidebar counter | `ink` #16120E | `gold-500` #C29A4B | text | 7.11 | AAA |
| progress-fill (inverse) | `gold-500` #C29A4B | `progress-track (inverse) brown-700` #4A3426 | ui | 4.43 | AA (ui) |
| progress-fill-urgent (inverse) | `danger-300` #F0A08F | `progress-track (inverse) brown-700` #4A3426 | ui | 5.60 | AA (ui) |

_41 زوج — فشل: 0_

**قواعد ملزمة نتجت عن الجدول:**
- `gold-500` و `gold-600` **ممنوعان كنص على الفاتح** (2.45 و 3.44). النص الذهبي على الفاتح هو `gold-text` (gold-700) فقط.
- حلقة التركيز **صلبة**: `outline: 2px solid var(--ring); outline-offset: 2px`. **ممنوع** `ring-ring/50` الافتراضي في shadcn، لأنه بنسبة 2.16:1.
- لا `opacity` على عنصر فيه نص لإظهاره "مطفأ". استخدم `text-muted-foreground` و `bg-muted`. (`opacity: .75` على بطاقة "اعتذر" نزّل النص إلى 3.14:1.)
- حدود الحقل `border-input` دائماً، ولا تُستبدل بـ `border-border`.
- الرسوم البيانية بحد أقصى 4 سلاسل، ومع تسمية مباشرة على الخط أو جدول بديل، لا الألوان وحدها.

---

## 3. الخطوط

### 3.1 الخط والأوزان
- **الخط:** IBM Plex Sans Arabic لكل اللغات (يغطي العربي واللاتيني بنفس الروح).
- **الأوزان المسموحة: 400، 600، 700 فقط.** الوزن 500 أُلغي: الفرق بينه وبين 400 و 600 في العربي بالأحجام الصغيرة شبه غير مرئي، وثمنه ملفان إضافيان (حوالي 65KB). وكل `font-medium` في مكونات shadcn يُستبدل بـ `font-semibold` (ملاحظات الترحيل، القسم 10).
- **Fallback:** `"Plex Fallback", "Segoe UI", Tahoma, "Geeza Pro", "Noto Sans Arabic", system-ui, sans-serif`. الـ `Plex Fallback` وجه محلي بمقاييس IBM Plex (القسم 3.3) لتقليل CLS عند تبديل الخط.
- **ممنوع letter-spacing على العربي** نهائياً، لأنه يكسر الاتصال بين الحروف. utilities الـ `tracking-*` كلها محذوفة من الـ theme، ومعها قاعدة `:lang(ar){letter-spacing:0}`. اللاتيني الكبير (مثل رموز الطلبات `SZ-100001`) يبقى بلا tracking أيضاً.
- **ممنوع** `leading-none` و `leading-tight` تحت 1.35 مع العربي.

### 3.2 أحجام الخط والتحميل (مقاسة)
قستها على حزمة `@fontsource/ibm-plex-sans-arabic@5.3.0` (نفس ملفات Google Fonts) وعلى subset بنيته بـ fontTools:

| الخيار | الملفات | الحجم woff2 |
|---|---|---|
| المسودة: 4 أوزان × (arabic + latin) من Google | 8 | **257.0 KB** |
| 3 أوزان × (arabic + latin) من Google (الخطة ب) | 6 | **188.5 KB** (arabic 400/600/700 = 41.8 + 44.6 + 43.2، latin = 18.7 + 20.0 + 19.0) |
| **3 أوزان، subset مدمج "core" عربي + لاتيني (الخطة أ، المعتمدة)** | **3** | **69.6 KB** (400 = 22.4، 600 = 23.9، 700 = 23.4) |

- الـ core يحتوي: ASCII، والحروف العربية الأساسية U+0621–U+064A، والحركات U+064B–U+0652، والأرقام الهندية U+0660–U+0669 (للعرض لو كتبها المستخدم)، وعلامات الترقيم العربية (، ؛ ؟)، و پ چ ژ ڤ گ ی، و ZWNJ/ZWJ/LRM/RLM، و `× – — ‘ ’ “ ” • … −`، مع features: `ccmp locl init medi fina rlig calt liga kern mark mkmk`.
- **تحققت من التشكيل (shaping) بـ HarfBuzz:** نص تجريبي عربي ولاتيني وأرقام أعطى advances مطابقة 100% للخط الكامل وبدون أي `.notdef`.
- أي حرف خارج الـ core (عربي ممتد نادر) يغطيه وجه ثانٍ `plex-ext` **بدون preload**، والمتصفح لا ينزّله إلا لو ظهر حرف منه في الصفحة.
- `font-display: swap` مع preload لملفات الـ core الثلاثة فقط.
- **رمز الريال الجديد U+20C1 غير موجود في الخط**، ولا في أحدث إصدار رسمي من IBM (`@ibm/plex-sans-arabic@1.1.0`، أكتوبر 2026، Version 1.005: فيه U+FDFC رمز الريال القديم فقط). الحل في القسم 8.4: وجه رابع صغير `Souq Riyal Sign` بحرف واحد (حوالي 1KB) بـ `unicode-range: U+20C1`.

### 3.3 مقياس الخطوط (Type scale) — مقياس واحد للمتجر واللوحات

| Token (Tailwind) | الحجم / السطر | النسبة | الأوزان | الاستخدام |
|---|---|---|---|---|
| `text-xs` | 12 / 20 | 1.67 | 400, 600 | **أقل حجم مسموح**: الشارات، ملاحظات قانونية، "شامل الضريبة"، تسميات المحاور |
| `text-sm` | 14 / 22 | 1.57 | 400, 600 | نص ثانوي، اسم المنتج في البطاقة، خلايا الجداول، التسميات، الأزرار الصغيرة |
| `text-base` | 16 / 26 | 1.63 | 400, 600 | **النص الأساسي والحقول** (16 يمنع تكبير iOS عند التركيز)، الأزرار |
| `text-lg` | 18 / 28 | 1.56 | 400, 600 | وصف المنتج، عنوان البطاقة، عنوان الـ Bottom sheet |
| `text-xl` | 20 / 30 | 1.5 | 600, 700 | عنوان قسم في الجوال (h3)، قيمة KPI صغيرة |
| `text-2xl` | 24 / 36 | 1.5 | 700 | h2، **السعر في صفحة المنتج**، قيمة KPI |
| `text-3xl` | 28 / 40 | 1.43 | 700 | h1 في الجوال |
| `text-4xl` | 36 / 52 | 1.44 | 700 | h1 في الديسكتوب، عناوين الحملات |

**أدوار جاهزة (تطبّق كـ utilities في `@layer components`):**

| الدور | التركيبة |
|---|---|
| `price-lg` (صفحة المنتج) | `text-2xl font-bold` |
| `price` (البطاقة) | `text-base font-bold` |
| `price-old` | `text-sm text-muted-foreground line-through` |
| `countdown` | `text-base font-bold` مع أرقام لاتينية داخل `<bdi dir="ltr">` |
| `input-lg` (1.1) | `text-2xl font-bold` (24/36) لحقول **الـ OTP** و**السعر في "اطلب سعرك" والرد السريع والسعر المضاد**، مع `dir="ltr"`. باقي الحقول 16px |
| `label` | `text-sm font-semibold` |
| `overline` | `text-xs font-semibold text-gold-text` (على الداكن: `text-gold`) |

### 3.4 مقاييس الخط (للـ fallback)
مقاسة من الملف: unitsPerEm 1000، ascent 1085، descent 415، lineGap 0، أرقام لاتينية بعرض 600 ثابت.
```css
@font-face {
  font-family: "Plex Fallback";
  src: local("Segoe UI"), local("Tahoma"), local("Geeza Pro"), local("Noto Sans Arabic");
  ascent-override: 108.5%;
  descent-override: 41.5%;
  line-gap-override: 0%;
  size-adjust: 100%; /* يُعاير في P1-02 بقياس CLS (القسم 11.4)، ويُعدّل إن تجاوز تبديل الخط 0.02 */
}
```

---

## 4. المسافات والتخطيط

- **الوحدة 4px.** الخطوات المسموحة: `0, 0.5(2), 1(4), 1.5(6), 2(8), 3(12), 4(16), 5(20), 6(24), 8(32), 10(40), 12(48), 16(64), 20(80)`. Tailwind v4 يقبل أي مضاعف، لذلك الالتزام بالقائمة بالمراجعة وبـ lint (القسم 10).
- **هامش الصفحة:** 16px جوال، 24px من `md`، 32px من `lg`. أقصى عرض للمتجر 1280px (`max-w-7xl`)، وللوحات 1440px.
- **شبكة المنتجات:** عمودان (جوال)، 3 (`md`)، 4 (`lg`). الفجوة 12px جوال و 16px تابلت و 24px ديسكتوب.
- **اللوحات:** Sidebar بعرض 240px على **اليمين** في العربي (`start`)، وTopbar بارتفاع 64px، ومسافة المحتوى 24px.
- **أهداف اللمس:** 44×44px كحد أدنى على أجهزة اللمس (`pointer: coarse`). في اللوحات على الديسكتوب يُسمح بـ 36px (`size="dense"`، ممنوع في المتجر بالـ lint). لا شيء أقل من 24×24 أبداً (WCAG 2.2، البند 2.5.8). الأيقونات الصغيرة (المفضلة، إغلاق) تكبّر منطقة الضغط بـ padding وليس الأيقونة.

### 4.1 نقاط التجاوب (Breakpoints)

| Token | العرض | الهدف |
|---|---|---|
| (الأساس) | 0–639 | الجوال (التصميم بـ 390px، ويُختبر حتى 360px) |
| `sm` | 640px | جوال أفقي وفابلت |
| `md` | 768px | تابلت. الـ Bottom sheet يصير Dialog |
| `lg` | 1024px | ديسكتوب. ظهور الـ Sidebar في اللوحات، وفلاتر جانبية في المتجر |
| `xl` | 1280px | ديسكتوب واسع |

`2xl` محذوف. داخل المكونات تُستخدم container queries (`@container`) للبطاقات اللي تظهر في أكثر من سياق، مثل DealCard في الشبكة وفي الشريط الأفقي.

### 4.2 طبقات z-index

| Token | القيمة | العنصر |
|---|---|---|
| `--z-sticky` | 10 | شريط "ادفع الآن" الثابت، رؤوس الجداول |
| `--z-header` | 20 | هيدر المتجر |
| `--z-fab` | 30 | زر واتساب العائم |
| `--z-dropdown` | 40 | القوائم المنسدلة، الـ popover |
| `--z-overlay` | 50 | الـ Dialog والـ Sheet والـ scrim |
| `--z-toast` | 60 | الإشعارات المؤقتة |

---

## 5. الزوايا (Radius) — ثلاث قيم فقط

| Token | القيمة | الاستخدام |
|---|---|---|
| `rounded-sm` | 4px | الشارات، الحقول، الصور المصغرة، مربعات العداد |
| `rounded-md` | 8px | الأزرار، البطاقات، صناديق المعلومات |
| `rounded-lg` | 12px | النوافذ، الـ Bottom sheet (الزاويتان العلويتان)، البانر |
| `rounded-full` | 9999px | شكل وليس درجة: الـ pills، الأفاتار، زر واتساب |

`rounded-xl` و `rounded-2xl` غير معرّفين، فلا يولّدان أي CSS. مكونات shadcn الافتراضية تستخدم `rounded-xl` في Card، ولازم تُستبدل بـ `rounded-lg` (القسم 10).

## 6. الظلال والارتفاع — ثلاثة مستويات

| Token | القيمة | الاستخدام |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgb(22 18 14 / .06)` | البطاقات عند الـ hover فقط (البطاقة الافتراضية بالحدود بلا ظل) |
| `shadow-md` | `0 6px 20px rgb(22 18 14 / .10)` | القوائم المنسدلة، الـ popover، الزر العائم |
| `shadow-lg` | `0 12px 32px rgb(22 18 14 / .16)` | الـ Dialog والـ Sheet |
| scrim | `rgb(22 18 14 / .55)` | خلفية النوافذ |

## 7. الحركة

| Token | القيمة | الاستخدام |
|---|---|---|
| `duration-120` (fast) | 120ms | hover، الضغط، تبديل checkbox |
| `duration-200` (base) | 200ms | فتح القوائم، tooltip، accordion |
| `duration-320` (slow) | 320ms | فتح الـ Sheet والـ Dialog |
| `ease-standard` | `cubic-bezier(.2,.8,.2,1)` | الدخول |
| `ease-exit` | `cubic-bezier(.4,0,1,1)` | الخروج (أسرع بـ 20%) |

- تُحرَّك `transform` و `opacity` فقط، ولا تُحرَّك `width/height/top/left` (لتفادي CLS وتأثيرها على INP).
- **نبض "مباشر":** opacity من 1 إلى .55 كل 1.6s. يتوقف مع `prefers-reduced-motion: reduce`.
- **تحديث "باقي X" لحظياً:** وميض خلفية `bg-warning-subtle` مرة واحدة لمدة 600ms، ويُلغى مع reduced-motion. الرقم نفسه لا يتحرك.
- **العداد التنازلي:** الرقم يتغير بلا حركة. مع reduced-motion يبقى التحديث (هو معلومة وليس زخرفة).
- `prefers-reduced-motion: reduce` يلغي كل الانتقالات والحركات الأخرى (القاعدة في `globals.css`).

---

## 8. قواعد RTL

### 8.1 الاتجاه والخصائص المنطقية
- `<html lang="ar" dir="rtl">` للعربي و `lang="en" dir="ltr"` للإنجليزي من next-intl، في `[locale]/layout.tsx`.
- **خصائص منطقية فقط:** `ms/me/ps/pe/start/end/border-s/border-e/rounded-s/rounded-e/text-start/text-end`. **ممنوع:** `ml/mr/pl/pr/left/right/border-l/border-r/rounded-l/rounded-r/text-left/text-right/float-left/float-right`. وفي CSS المخصص: `margin-inline-start` و `inset-inline-end` وأمثالها.
- المؤشر الجانبي للعنصر النشط (Sidebar، الصف المختار) يُرسم بـ `border-s-[3px]` وليس `box-shadow: inset -3px 0`، لأن الـ box-shadow لا ينعكس في الإنجليزي.
- الـ Sidebar على `start` (يمين في العربي). وزر واتساب العائم على **`end`** (يسار في العربي) حتى لا يغطي زر السلة وزر "التالي" اللي على اليمين (تفصيل التعارض في ملف المراجعة).
- الرسوم البيانية الزمنية في العربي: الأقدم يمين والأحدث يسار (`XAxis reversed`)، ومحور القيم على اليمين (`YAxis orientation="right"`).

### 8.2 الأيقونات

| تُعكس في RTL (`rtl:-scale-x-100`) | لا تُعكس |
|---|---|
| `chevron-left/right`، `arrow-left/right`، `chevrons-*`، زر الرجوع، "التالي/السابق"، الترقيم (pagination)، `undo/redo`، `reply`، `send-horizontal`، `log-in/log-out`، `list-indent`، فاصل الـ breadcrumbs، شريط التقدم بالخطوات | البحث، السلة، القلب، الجرس، القفل، الساعة والمؤقت (العقارب دائماً مع الساعة)، علامة الصح، اليد (فاصل)، النجمة، الهاتف، واتساب وكل الشعارات، الأرقام، **رمز الريال U+20C1** (قاعدة ساما 8)، `play` |

- **النجوم الجزئية** (4.5) تمتلئ من `start` (من اليمين في العربي).
- الأيقونة الاتجاهية في مكون مشترك تُعطى `data-directional` حتى يعكسها `Icon` تلقائياً، ولا يتذكر كل مطوّر `rtl:` بنفسه.

### 8.3 الأرقام
- **أرقام لاتينية (0–9)** في كل الواجهة: الأسعار، الكميات، العدادات، أرقام الطلبات، التواريخ. السبب: توحيد الإدخال مع `lib/money.ts`، وعرض ثابت للأرقام في الخط (العدادات لا ترتجف)، والمعتاد في التجارة الإلكترونية السعودية.
- **تحذير Intl:** `ar-SA` يرجع افتراضياً أرقاماً هندية والتقويم الهجري (أم القرى). كل الـ formatters تستخدم:
  - الأرقام: `new Intl.NumberFormat('ar-SA-u-nu-latn', …)`
  - التاريخ: `new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', …)`، أي ميلادي بأسماء الشهور العربية ("17 نوفمبر 2026"). الهجري اختياري كسطر ثانٍ في صفحات المواسم فقط.
- **الإدخال:** كل حقل رقمي (السعر، الكمية، الجوال، الآيبان، OTP) يقبل الأرقام الهندية ٠–٩ والفارسية ۰–۹ ويحوّلها للاتينية قبل التحقق (`toLatinDigits()` في `lib/format/digits.ts`)، ويقبل الفاصلة العربية ٫ كفاصلة عشرية. وفلتر وسائل التواصل في الملاحظات يعتمد على نفس الدالة.
- حقول الأرقام والجوال والآيبان والإيميل: `dir="ltr"` مع `text-end` (النص يلاصق جهة البداية العربية بصرياً)، و `inputMode="decimal"` للسعر و `numeric` للكمية والـ OTP، و `tel` للجوال، و `autoComplete="one-time-code"` للـ OTP.

### 8.4 الأسعار والعملة ورمز الريال (محدّث في 1.1)

> **قرار المالك (2026-11-17):** رمز الريال السعودي الجديد بدل "ر.س" في كل الواجهة. هذا القسم يحدد كيف، وأين يبقى النص بديلاً.

#### 8.4.1 وضع الرمز اليوم (تحقق 2026-11-18)

| البند | الحالة | المصدر |
|---|---|---|
| الاعتماد | أُعلن واعتُمد في 20 فبراير 2025 | [ساما، صفحة الإرشادات](https://www.sama.gov.sa/en-US/Currency/SRS/Pages/Guideline.aspx)، [Wikipedia](https://en.wikipedia.org/wiki/Saudi_riyal_sign) |
| Unicode | `U+20C1 SAUDI RIYAL SIGN` في كتلة Currency Symbols، **Unicode 17.0** (صدر 9 سبتمبر 2025). حرف ذري بلا تفكيك، وخاصية الاتجاه (bidi) ليست Arabic Letter مثل الرمز القديم `U+FDFC`، لأنه يُستخدم في الاتجاهين | [مقترح ساما L2/25-075](https://www.unicode.org/L2/L2025/25075-saudi-central-bank.pdf)، [توصية SEW L2/25-076](https://www.unicode.org/L2/L2025/25076-sew-recommendations-saudi-riyal.pdf)، [مدونة Unicode](https://blog.unicode.org/2025/03/support-for-new-saudi-riyal-currency.html) |
| CLDR / `Intl` | CLDR 48 (أكتوبر 2025) أضافه **رمزاً بديلاً لا افتراضياً** حتى ينتشر في الخطوط. يعني أن `Intl.NumberFormat(…, { style: 'currency' })` لن يعطيه، ونتيجته تختلف بين إصدار ICU في Node والمتصفح | [مدونة Unicode 2025-03](https://blog.unicode.org/2025/03/support-for-new-saudi-riyal-currency.html)، [Wikipedia](https://en.wikipedia.org/wiki/Saudi_riyal_sign)، [مدونة Unicode 2026-02](https://blog.unicode.org/2026/02/from-central-bank-to-code-point-roadmap.html) |
| الملفات الرسمية | ساما تنشر الرمز بصيغ SVG و PNG و EPS، ومعها "دليل استخدام الرمز" و"دليل مصممي الخطوط" (PDF). الملفات تحت عنوان "General use"، والصفحة لا تذكر ترخيصاً غير "© SAMA. All rights reserved" | [صفحة الإرشادات](https://www.sama.gov.sa/en-US/Currency/SRS/Pages/Guideline.aspx) |
| الخطوط (مقاس هنا بـ fontTools) | **لا يوجد في أي خط فحصته:** IBM Plex Sans Arabic الرسمي (`@ibm/plex-sans-arabic@1.1.0`، أكتوبر 2026)، وحزم Google Fonts عبر `@fontsource@5.3.0` لـ: IBM Plex Sans Arabic، IBM Plex Sans، Noto Sans Arabic، Noto Naskh Arabic، Noto Kufi Arabic، Noto Sans، Noto Sans Symbols 1 و 2، Tajawal، Cairo، Almarai، Readex Pro، Rubik، Vazirmatn، Alexandria، Amiri (16 حزمة). تنبيه: حزم Google Fonts مقسمة بـ unicode-range، فغياب الحرف فيها قد يكون من التقسيم؛ لكن ملف IBM الكامل حاسم لخطنا | فحص محلي، 2026-11-18 |
| أنظمة التشغيل والمتصفحات | **لم أجد مصدراً رسمياً** من Apple أو Microsoft أو Google يؤكد وجود الرمز في خطوط النظام. Unicode تحذّر من أن الأجهزة القديمة قد تبقى بدونه سنوات. لذلك لا نعتمد على خطوط النظام إطلاقاً | [مدونة Unicode 2026-02](https://blog.unicode.org/2026/02/from-central-bank-to-code-point-roadmap.html) |
| الوصول من بيئة العمل | `sama.gov.sa` و `unicode.org` محجوبان عن التنزيل المباشر من هذه البيئة (رد الـ proxy 403). **لم أنزّل ملف الرمز الرسمي، ولم أرسم الرمز ولم أنسخه من مصدر غير رسمي.** طريقة الحصول عليه في 8.4.8 | — |

**قواعد ساما الملزمة** (من صفحة الإرشادات): (1) الرمز **يسار القيمة العددية في كل اللغات**؛ (2) **مسافة** بين الرمز والرقم؛ (3) الرمز يسار القيمة اللفظية أيضاً؛ (4) في القيمة السالبة الرمز يسار علامة السالب والرقم؛ (5) الحفاظ على تناسب الشكل؛ (6) الحفاظ على البنية الهندسية؛ (7) **ارتفاع الرمز = ارتفاع النص**؛ (8) اتجاه الرمز يطابق اتجاه النص؛ (9) مساحة خالية = ثلث ارتفاع الرمز؛ (10) تباين كافٍ مع الخلفية.

#### 8.4.2 الحل المعتمد: خط صغير بحرف واحد

| الخيار | النسخ واللصق والبحث | يتبع حجم النص ولونه | المحاذاة مع الأرقام | التكلفة | القرار |
|---|---|---|---|---|---|
| **أ. خط `Souq Riyal Sign` بحرف U+20C1 فقط، من ملف ساما الرسمي، بـ `unicode-range: U+20C1`** | نص حقيقي: يُنسخ U+20C1، ويعمل بحث الصفحة | تلقائياً (`font-size` و `currentColor`) | على خط الأساس تلقائياً، بارتفاع الأرقام بالضبط | ملف واحد حوالي 1KB، مخزّن دائماً، صفر JS | **المعتمد** |
| ب. مكون SVG `<RiyalSign/>` | لا يُنسخ شيء (أو يُنسخ نص مخفي) | اللون نعم، والوزن لا | يدوي (`vertical-align` + `em`)، ويختلف بين المتصفحات | SVG مكرر في كل سعر: صفحة تصنيف فيها 48 منتجاً × سعرين = 96 نسخة في الـ HTML | مرفوض كحل أساسي |
| ج. خط بديل كامل يدعم الرمز | — | — | — | لا يوجد خط عربي مجاني يدعمه اليوم (8.4.1)، ولو وُجد فشكله غير مضمون أنه مطابق لساما | غير متاح |
| د. Private Use Area أو `U+FDFC` | يكسر النسخ والبحث، و `U+FDFC` هو رمز الريال **الإيراني**/القديم | — | — | — | ممنوع |
| هـ. الاعتماد على خطوط النظام | — | — | — | مربع فارغ على أي جهاز لم يتحدث | ممنوع |

**تفاصيل الوجه:**
- `@font-face { font-family: "Souq Riyal Sign"; unicode-range: U+20C1; font-weight: 100 900; font-display: block; }`، أول عنصر في `--font-sans`. الـ `unicode-range` يضمن أنه لا يلمس أي حرف آخر. وكونه **الأول** يضمن أن الشكل الرسمي يظهر حتى لو أضاف نظام التشغيل لاحقاً رمزاً بشكل مختلف.
- **وزن واحد** معلن `100 900` + `font-synthesis: none` على `.riyal`، حتى لا يصنع المتصفح Bold مزيفاً يشوّه البنية الهندسية (قاعدة ساما 6). لو سمح "دليل مصممي الخطوط" من ساما بأوزان متعددة، نضيف 600 و 700 لاحقاً بقرار designer.
- `font-display: block` (لأن الملف 1KB و preload)، فلا يظهر مربع فارغ للحظة. وهو مستضاف على نفس الدومين، فاحتمال فشل تحميله ضعيف جداً.
- **Preload** في كل الصفحات (السعر موجود في أغلبها). الخطوط تصير 4 ملفات (القسم 12.2).

#### 8.4.3 بناء الخط (ملف رسمي → woff2 و ttf)
- السكربت: `docs/design/assets/riyal-sign/build_riyal_font.py` (يُنقل إلى `scripts/fonts/` في P1-02). المدخل الوحيد ملف ساما SVG **بدون أي تعديل**. السكربت يوحّد المسارات بـ picosvg، و**يكبّر ويزيح فقط** (نسبة الأبعاد ثابتة)، ويطبع SHA-256 للملف الرسمي، ويتحقق من النتيجة.
- **المقاييس (مقاسة من IBM Plex Sans Arabic):** ارتفاع الرمز = **698/1000 em** = ارتفاع الأرقام اللاتينية وارتفاع الحروف الكبيرة في Plex (`1` = 0..698، و`0` = −12..710 بالـ overshoot) → قاعدة ساما 7. يقف على خط الأساس (yMin = 0). جانبان 50 وحدة. والمقاييس الرأسية نفس Plex (ascent 1085، descent 415) فلا يتغير ارتفاع السطر.
- اختبرت السكربت على ملف تجريبي (مستطيل ومنحنى، **ليس الرمز**): خرج woff2 بحجم 580 بايت و ttf بحجم 1,184 بايت، والخرج متطابق بايت ببايت في تشغيلين (reproducible).
- المخرجات: `src/app/fonts/souq-riyal-sign.woff2` (الويب) و `souq-riyal-sign.ttf` (الـ PDF، وصور OG عبر `next/og`، وFigma، وتطبيق Flutter عبر `fontFamilyFallback`).

#### 8.4.4 الموضع والمسافة والحجم

| | العربي (RTL) | الإنجليزي (LTR) |
|---|---|---|
| الشكل المرئي | `⃁ 1,250.00` (الرمز يسار الرقم) | `⃁ 1,250.00` (الرمز يسار الرقم) |
| الترتيب المنطقي في الـ DOM والنسخ | `1,250.00` ثم U+00A0 ثم U+20C1 | U+20C1 ثم U+00A0 ثم `1,250.00` |
| القارئ يسمع | "1,250.00 ريال سعودي" | "Saudi riyal 1,250.00" |
| سالب (قاعدة 4) | `⃁ −150.00` | `⃁ −150.00` |
| مختصر في اللوحات (قاعدة 3) | `486.2 ألف` ثم الرمز، فيظهر الرمز يسار الكلمة | `⃁ 486.2K` |
| نطاق | `من 690.00 ⃁` | `From ⃁ 690.00` |

- `⃁` في هذا الملف هو الحرف U+20C1 نفسه، وقد يظهر مربعاً في محررك لنفس السبب الموضح في 8.4.1.
- **المسافة:** `U+00A0` (non-breaking، عرضه 236/1000 em في Plex) + جانب الرمز 50 + جانب الرقم (31–77) ≈ **0.34em مرئية**، وهي أكبر من ثلث ارتفاع الرمز (0.233em، قاعدة 9). لا `gap` ولا `margin`: المسافة حرف حقيقي، فتُنسخ صحيحة.
- **الحجم:** نفس `font-size` الرقم دائماً (لا تصغير): في البطاقة 16px → رمز ارتفاعه 11.2px، وفي صفحة المنتج 24px → 16.8px. اللون `currentColor` (السعر المخفّض danger، والقديم muted، وعلى الداكن sand-50). **لا يُعكس في RTL** (أُضيف لجدول 8.2).
- **لا ينكسر السطر** داخل السعر: `.price { white-space: nowrap }`.
- **الـ markup الملزم** (يولّده `Price` فقط، ولا يُكتب يدوياً):
  ```html
  <!-- ar -->
  <bdi class="price" dir="rtl"><bdi dir="ltr">1,250.00</bdi>&nbsp;<span class="riyal" role="img" aria-label="ريال سعودي">&#x20C1;</span></bdi>
  <!-- en -->
  <bdi class="price" dir="ltr"><span class="riyal" role="img" aria-label="Saudi riyal">&#x20C1;</span>&nbsp;<bdi dir="ltr">1,250.00</bdi></bdi>
  ```
  تحققت منه في Chrome headless بخط تجريبي: الرمز يسار الرقم في 4 سياقات (سعر عربي في جملة عربية، سالب، إنجليزي، **سعر عربي داخل جملة إنجليزية**)، والنسخ يعطي `"1,250.00 ⃁"` و `"−150.00 ⃁"` و `"⃁ 1,250.00"`. العزل بـ `bdi` يمنع الرمز والرقم من التأثر بالنص والأرقام المجاورة (حتى بدون العزل ظهر الرمز يساراً في Chrome، لكن لا نعتمد على ذلك).

#### 8.4.5 قارئ الشاشة والنسخ
- `role="img"` + `aria-label="ريال سعودي"` (`"Saudi riyal"` في الإنجليزي) على `span.riyal`. **لا** نستخدم `aria-hidden` + `sr-only`، لأن النص المخفي بـ `sr-only` يُنسخ مع التحديد فيصير النص المنسوخ `1,250.00 ⃁ريال سعودي`. ولا نعتمد على أن قارئ الشاشة يعرف U+20C1 (حرف جديد، غالباً غير موجود في قواميس النطق).
- السعر قبل الخصم: `<s>` + `<span class="sr-only">السعر قبل الخصم</span>` كما هو (النسخ هنا مقبول لأنه نص وصفي).
- **النسخ:** يُنسخ U+20C1 الحقيقي. الجهاز المستقبل قد يعرضه مربعاً لو خطه قديم، وهذا مقبول لأن البيانات صحيحة. أزرار "نسخ المبلغ" (لو وُجدت) تنسخ الرقم فقط `1250.00`.
- اختبار VoiceOver و TalkBack بالعربي على السعر ضمن قائمة اختبار P6 (12.5).

#### 8.4.6 أين نعرض الرمز وأين نعرض النص

| القناة | العرض | السبب |
|---|---|---|
| الواجهة (Next.js)، والـ Toasts، والجداول، والرسوم البيانية (محور Recharts نص SVG بنفس الخط) | **الرمز** | الخط عندنا |
| تطبيق Flutter | **الرمز** بنفس `souq-riyal-sign.ttf` في `fontFamilyFallback` | flutter-engineer |
| صور OG (`next/og`) | **الرمز** (يُمرَّر الـ TTF ضمن `fonts`) | نتحكم في الخط |
| JSON-LD (`Offer`، `AggregateOffer`) | `"price": "1250.00"`، `"priceCurrency": "SAR"`، **بلا رمز** | schema.org يطلب رمز ISO 4217 |
| `<title>` و `meta description` و `og:description` | **"ر.س"** نصاً | تعرضها Google وواتساب وX بخطوطها |
| `product:price:currency` / خلاصة Google Merchant | `SAR`، والسعر `1250.00 SAR` | مواصفات الخلاصة |
| فاتورة PDF وإيصال الطلب | **الرمز** بخط مضمّن (TTF، مع ToUnicode فيُنسخ صحيحاً)، وسطر في الرأس "جميع المبالغ بالريال السعودي (SAR)". **يعتمده finance-zatca** قبل P3 | الخط مضمّن في الملف |
| الفاتورة الإلكترونية XML (ZATCA) | `currencyID="SAR"` | معيار UBL، لا رموز |
| SMS (Taqnyat)، قوالب واتساب (Meta)، رابط `wa.me` الجاهز، الإشعارات (Push) | **"ر.س"** بالعربي و **"SAR"** بالإنجليزي | تُعرض بخط جهاز المستقبل |
| الإيميل (Resend) | **"ر.س"** / **"SAR"** نصاً | Gmail و Outlook يتجاهلون `@font-face`، والصور محجوبة افتراضياً |
| تصدير CSV / Excel | عمود رقمي `1250.00` + عمود العملة `SAR` | قابل للحساب |
| بوابات الدفع (Moyasar، Apple Pay، تابي، تمارا) | المبلغ بالهللات + `SAR` | تعرضه البوابة بنفسها |

#### 8.4.7 الـ formatter والمكون
```ts
// src/lib/format/money.ts — the ONLY place that knows the sign. Never Intl style:'currency' (CLDR 48 lists U+20C1 as alt; ICU differs Node vs browser → hydration mismatch).
export const RIYAL_SIGN = '\u20C1'; // U+20C1 SAUDI RIYAL SIGN
export const RIYAL_SIGN_READY = false; // flip to true in the PR that adds src/app/fonts/souq-riyal-sign.woff2 (8.4.8); while false <Price> shows 'text'
type Display = 'symbol' | 'text' | 'code';        // ⃁ | ر.س / SAR | SAR
export function formatSARParts(halalas: number, o: { locale: 'ar' | 'en'; compact?: boolean }):
  { amount: string; amountIsNegative: boolean }   // amount uses U+2212 for negatives, latin digits
export function formatSAR(halalas: number, o: { locale: 'ar' | 'en'; display?: Display; compact?: boolean }): string
  // default display = 'text' → safe for SMS/email/meta. UI never uses this string: it renders <Price>.
```
- `formatSAR(125000, { locale: 'ar' })` → `"1,250.00 ر.س"`، و `{ display: 'code' }` → `"1,250.00 SAR"`، و `{ locale: 'en' }` → `"SAR 1,250.00"`.
- `<Price>` يستخدم `formatSARParts` ويبني الـ markup في 8.4.4. لو `RIYAL_SIGN_READY = false` يعرض "ر.س" بنفس الهيكل (aria-label "ريال سعودي") حتى لا يتأخر P1-02.
- **ممنوع** كتابة `ر.س` أو `\u20C1` أو الحرف `⃁` نفسه حرفياً في `src/` خارج `lib/format/money.ts` و `messages/*.json` (قاعدة lint في 10).
- **مفاتيح الضبط:** لا تُحسب الأسعار في الواجهة. المكون يستقبل هللات (Integer) ويمررها للـ formatter (D7).

#### 8.4.8 الحصول على الملف الرسمي (خطوات قبل P1-02)
1. **المالك أو designer** من جهاز عادي: يفتح [صفحة ساما](https://www.sama.gov.sa/en-US/Currency/SRS/Pages/Guideline.aspx) وينزّل: الرمز SVG، و"Saudi Riyal Symbol Guidelines" و"Font Designers' Guidelines" (PDF).
2. يحفظ الـ SVG **بدون فتحه في محرر أو تعديله** في `docs/design/assets/riyal-sign/sama-saudi-riyal-symbol.svg`، والـ PDFين بجانبه، ويسجّل SHA-256 الذي يطبعه السكربت هنا.
3. **legal-contracts:** تأكيد أن استخدام الرمز في متجر تجاري مسموح دون إذن (الملفات معروضة "General use"، والصفحة تقول "All rights reserved"). استخدام الرمز كعملة هو الغرض المعلن من ساما، لكن التأكيد مكتوباً أسلم.
4. **designer:** يقرأ "دليل مصممي الخطوط" ويؤكد أو يعدّل `SIDE_BEARING` والوزن، ويطابق الرمز المعروض مع الملف الرسمي فوق بعض عند 16 و 24 و 36px.
5. **frontend-engineer (P1-02):** يشغّل السكربت، ويضع المخرجات في `src/app/fonts/`، ويجعل `RIYAL_SIGN_READY = true` في نفس الـ PR.

#### 8.4.9 قواعد باقية من 1.0
- **العزل الاتجاهي:** أي قيمة تبدأ بإشارة (`-22%`، `+12%`، `−3%`) تُلف في `<bdi dir="ltr">`، وإلا ظهرت `22%-`.
- **الكسور:** المتجر يعرض دائماً منزلتين. بطاقات KPI في اللوحات يُسمح فيها بالمختصر (`compact`) **مع العملة دائماً**.
- **"شامل الضريبة":** سطر `text-xs text-muted-foreground` تحت السعر في صفحة المنتج والسلة والـ checkout (D8).
- **SPEC 6.1** يقول `formatSAR` يعرض `1,250.00 ر.س`. هذا صحيح للنصوص (`display: 'text'`)، والواجهة تعرض الرمز عبر `Price`. تعديل نص SPEC عند مالكه (P0-14).

### 8.5 التواريخ والمدد والعدادات
- العداد: أقل من ساعة `MM:SS`، وأقل من 24 ساعة `HH:MM:SS`، وأكثر من ذلك "يومان و 4 ساعات". الأرقام في `<bdi dir="ltr">` **والكلمة العربية خارجها**: `ينتهي خلال <bdi dir="ltr">23:41:10</bdi>`.
- الوقت النسبي ("قبل 2 د") من `Intl.RelativeTimeFormat('ar-SA-u-nu-latn', { numeric: 'auto', style: 'short' })`.
- الجوال يُعرض `05X XXX XXXX` داخل `<bdi dir="ltr">`، ويُخزن E.164.

---

## 9. إعداد Tailwind v4 + shadcn/ui (جاهز للنسخ في P1-02)

> shadcn/ui الحالي مبني على Tailwind v4 (إعداد CSS-first بدون `tailwind.config.ts`). الألوان مكتوبة hex لتطابق سكربت التباين حرفياً. **لا يُنسخ قبل موافقة G1.**

### 9.1 `src/app/globals.css`
```css
/* Souq AlZal design tokens v1.1 — source: docs/design/tokens.md. Do not edit values here without updating the doc + contrast script. */
@import "tailwindcss";
@import "tw-animate-css";

/* ---------- 1) Primitives (never referenced by components) ---------- */
:root {
  --c-ink: #16120E;
  --c-brown-900: #2E2018; --c-brown-800: #3B2B21; --c-brown-700: #4A3426; --c-brown-600: #5C4334; --c-brown-500: #6E5240;
  --c-gold-50: #FAF3E3; --c-gold-300: #DDBE7C; --c-gold-500: #C29A4B; --c-gold-600: #A67F35; --c-gold-700: #7E5F22;
  --c-sand-50: #FBF7F0; --c-sand-100: #F3EADB; --c-sand-200: #E6D7BE; --c-sand-300: #BCAA92; --c-sand-500: #8F7B66;
  --c-white: #FFFFFF; --c-muted: #6B5E52;
  --c-success-50: #E8F1EA; --c-success-300: #8FC79C; --c-success-700: #2F6B3F;
  --c-warning-50: #F8EEDC; --c-warning-300: #E8B866; --c-warning-700: #8A5A0F;
  --c-danger-50:  #F8E7E3; --c-danger-300:  #F0A08F; --c-danger-700:  #A23B2A;
  --c-info-50:    #E6EEF4; --c-info-300:    #8DB8D6; --c-info-700:    #2D5B7A;
  --c-whatsapp-600: #16803E; --c-whatsapp-700: #15783A; /* v1.1, WhatsApp FAB only */

  --z-sticky: 10; --z-header: 20; --z-fab: 30; --z-dropdown: 40; --z-overlay: 50; --z-toast: 60;
  --scrim: rgb(22 18 14 / .55);
  --radius: 8px; /* shadcn base = md */
}

/* ---------- 2) Semantic tokens — light (default) ---------- */
:root, [data-surface="default"] {
  --background: var(--c-sand-50);        --foreground: var(--c-ink);
  --foreground-secondary: var(--c-brown-700);
  --card: var(--c-white);                --card-foreground: var(--c-ink);
  --popover: var(--c-white);             --popover-foreground: var(--c-ink);
  --primary: var(--c-ink);               --primary-foreground: var(--c-sand-50);  --primary-hover: var(--c-brown-900);
  --secondary: var(--c-sand-100);        --secondary-foreground: var(--c-ink);
  --muted: var(--c-sand-100);            --muted-foreground: var(--c-muted);
  --accent: var(--c-sand-100);           --accent-foreground: var(--c-ink);       /* shadcn hover surface — NOT brand gold */
  --destructive: var(--c-danger-700);    --destructive-foreground: var(--c-white);
  --border: var(--c-sand-200);           --border-strong: var(--c-ink);
  --input: var(--c-sand-500);            --ring: var(--c-gold-700);
  --link: var(--c-gold-700);

  --gold: var(--c-gold-500);             --gold-foreground: var(--c-ink);         --gold-hover: var(--c-gold-600);
  --gold-subtle: var(--c-gold-50);       --gold-text: var(--c-gold-700);

  --success: var(--c-success-700); --success-foreground: var(--c-white); --success-subtle: var(--c-success-50);
  --warning: var(--c-warning-700); --warning-foreground: var(--c-white); --warning-subtle: var(--c-warning-50);
  --danger:  var(--c-danger-700);  --danger-foreground:  var(--c-white); --danger-subtle:  var(--c-danger-50);
  --info:    var(--c-info-700);    --info-foreground:    var(--c-white); --info-subtle:    var(--c-info-50);
  --neutral: var(--c-brown-700);   --neutral-foreground: var(--c-sand-50); --neutral-subtle: var(--c-sand-100);
  --discount: var(--c-danger-700); --discount-foreground: var(--c-white);
  --live: var(--c-danger-700);
  --progress-track: var(--c-sand-200); --progress-fill: var(--c-brown-700); --progress-fill-urgent: var(--c-danger-700);
  --whatsapp: var(--c-whatsapp-600); --whatsapp-foreground: var(--c-white); --whatsapp-hover: var(--c-whatsapp-700); /* not redefined in inverse */
  --inverse: var(--c-brown-900);   --inverse-foreground: var(--c-sand-50);

  --chart-1: var(--c-gold-600); --chart-2: var(--c-brown-700); --chart-3: var(--c-info-700); --chart-4: var(--c-success-700);

  --sidebar: var(--c-brown-900);            --sidebar-foreground: var(--c-sand-200);
  --sidebar-primary: var(--c-gold-500);     --sidebar-primary-foreground: var(--c-ink);
  --sidebar-accent: #463420; /* gold-500 @16% over brown-900, flattened */
  --sidebar-accent-foreground: var(--c-sand-50);
  --sidebar-border: var(--c-brown-700);     --sidebar-ring: var(--c-gold-500);

  color: var(--foreground);
}

/* ---------- 3) Inverse scope (dark islands). Same variable names → components need no variants ---------- */
[data-surface="inverse"], [data-surface="inverse-strong"] {
  --background: var(--c-brown-900);      --foreground: var(--c-sand-50);
  --foreground-secondary: var(--c-sand-200);
  --card: var(--c-brown-800);            --card-foreground: var(--c-sand-50);
  --muted: var(--c-brown-800);           --muted-foreground: var(--c-sand-300);
  --accent: var(--c-brown-800);          --accent-foreground: var(--c-sand-50);
  --primary: var(--c-gold-500);          --primary-foreground: var(--c-ink);      --primary-hover: var(--c-gold-300);
  --secondary: var(--c-brown-800);       --secondary-foreground: var(--c-sand-50);
  --border: var(--c-brown-600);          --border-strong: var(--c-sand-50);
  --input: var(--c-sand-500);            --ring: var(--c-gold-500);
  --link: var(--c-gold-300);             --gold-text: var(--c-gold-500);          --gold-subtle: var(--c-brown-800);
  --success: var(--c-success-300); --success-foreground: var(--c-ink); --success-subtle: #3E3B2D;
  --warning: var(--c-warning-300); --warning-foreground: var(--c-ink); --warning-subtle: #4C3824;
  --danger:  var(--c-danger-300);  --danger-foreground:  var(--c-ink); --danger-subtle:  #4D342B;
  --info:    var(--c-info-300);    --info-foreground:    var(--c-ink); --info-subtle:    #3D3836;
  --neutral: var(--c-sand-200);    --neutral-foreground: var(--c-ink); --neutral-subtle: var(--c-brown-800);
  --live: var(--c-danger-300);
  --progress-track: var(--c-brown-700); --progress-fill: var(--c-gold-500); --progress-fill-urgent: var(--c-danger-300);
  background-color: var(--background);
  color: var(--foreground);
}
[data-surface="inverse-strong"] { --background: var(--c-ink); --card: var(--c-brown-900); }

/* ---------- 4) Theme (resets remove every value not in the doc) ---------- */
@theme {
  --color-*: initial;
  --text-*: initial;
  --font-weight-*: initial;
  --tracking-*: initial;
  --leading-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --breakpoint-*: initial;
  --ease-*: initial;

  --text-xs: 0.75rem;   --text-xs--line-height: 1.25rem;
  --text-sm: 0.875rem;  --text-sm--line-height: 1.375rem;
  --text-base: 1rem;    --text-base--line-height: 1.625rem;
  --text-lg: 1.125rem;  --text-lg--line-height: 1.75rem;
  --text-xl: 1.25rem;   --text-xl--line-height: 1.875rem;
  --text-2xl: 1.5rem;   --text-2xl--line-height: 2.25rem;
  --text-3xl: 1.75rem;  --text-3xl--line-height: 2.5rem;
  --text-4xl: 2.25rem;  --text-4xl--line-height: 3.25rem;

  --font-weight-normal: 400; --font-weight-semibold: 600; --font-weight-bold: 700;
  --tracking-normal: 0;
  --leading-snug: 1.35; --leading-normal: 1.625; --leading-relaxed: 1.8;

  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;

  --shadow-sm: 0 1px 2px rgb(22 18 14 / .06);
  --shadow-md: 0 6px 20px rgb(22 18 14 / .10);
  --shadow-lg: 0 12px 32px rgb(22 18 14 / .16);

  --breakpoint-sm: 40rem; --breakpoint-md: 48rem; --breakpoint-lg: 64rem; --breakpoint-xl: 80rem;

  --ease-standard: cubic-bezier(.2,.8,.2,1);
  --ease-exit: cubic-bezier(.4,0,1,1);
  --animate-live-pulse: live-pulse 1.6s ease-in-out infinite;
  @keyframes live-pulse { 50% { opacity: .55; } }
}

@theme inline {
  --font-sans: var(--font-riyal), var(--font-plex), var(--font-plex-ext), "Plex Fallback", "Segoe UI", Tahoma, "Geeza Pro", "Noto Sans Arabic", system-ui, sans-serif;

  --color-background: var(--background);   --color-foreground: var(--foreground);
  --color-foreground-secondary: var(--foreground-secondary);
  --color-card: var(--card);               --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);         --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);         --color-primary-foreground: var(--primary-foreground); --color-primary-hover: var(--primary-hover);
  --color-secondary: var(--secondary);     --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);             --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);           --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive); --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);           --color-border-strong: var(--border-strong);
  --color-input: var(--input);             --color-ring: var(--ring);
  --color-link: var(--link);
  --color-gold: var(--gold);               --color-gold-foreground: var(--gold-foreground);  --color-gold-hover: var(--gold-hover);
  --color-gold-subtle: var(--gold-subtle); --color-gold-text: var(--gold-text);
  --color-success: var(--success); --color-success-foreground: var(--success-foreground); --color-success-subtle: var(--success-subtle);
  --color-warning: var(--warning); --color-warning-foreground: var(--warning-foreground); --color-warning-subtle: var(--warning-subtle);
  --color-danger:  var(--danger);  --color-danger-foreground:  var(--danger-foreground);  --color-danger-subtle:  var(--danger-subtle);
  --color-info:    var(--info);    --color-info-foreground:    var(--info-foreground);    --color-info-subtle:    var(--info-subtle);
  --color-neutral: var(--neutral); --color-neutral-foreground: var(--neutral-foreground); --color-neutral-subtle: var(--neutral-subtle);
  --color-discount: var(--discount); --color-discount-foreground: var(--discount-foreground);
  --color-live: var(--live);
  --color-progress-track: var(--progress-track);
  --color-progress-fill: var(--progress-fill); --color-progress-fill-urgent: var(--progress-fill-urgent);
  --color-whatsapp: var(--whatsapp); --color-whatsapp-foreground: var(--whatsapp-foreground); --color-whatsapp-hover: var(--whatsapp-hover);
  --color-inverse: var(--inverse); --color-inverse-foreground: var(--inverse-foreground);
  --color-chart-1: var(--chart-1); --color-chart-2: var(--chart-2); --color-chart-3: var(--chart-3); --color-chart-4: var(--chart-4);
  --color-sidebar: var(--sidebar); --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary); --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);   --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);   --color-sidebar-ring: var(--sidebar-ring);
}

/* ---------- 5) Base ---------- */
@font-face {
  font-family: "Plex Fallback";
  src: local("Segoe UI"), local("Tahoma"), local("Geeza Pro"), local("Noto Sans Arabic");
  ascent-override: 108.5%; descent-override: 41.5%; line-gap-override: 0%; size-adjust: 100%;
}

@layer base {
  * { border-color: var(--border); }
  html { font-family: var(--font-sans); -webkit-text-size-adjust: 100%; text-rendering: optimizeLegibility; }
  body { background: var(--background); color: var(--foreground); font-size: var(--text-base); line-height: var(--text-base--line-height); }
  :lang(ar) { letter-spacing: 0; }
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  bdi { unicode-bidi: isolate; }
  input, select, textarea { font-size: max(16px, 1em); } /* iOS zoom guard */
  .num { font-variant-numeric: tabular-nums; } /* no-op for Plex (digits already 600u), kept for fallbacks */
  [data-directional]:dir(rtl) { transform: scaleX(-1); }
  .riyal { font-synthesis: none; } /* single-weight official glyph: never fake-bold it (SAMA rule 6) */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important; animation-iteration-count: 1 !important;
      transition-duration: .01ms !important; scroll-behavior: auto !important;
    }
  }
}

@layer components {
  .price-lg  { font-size: var(--text-2xl); line-height: var(--text-2xl--line-height); font-weight: 700; }
  .price     { font-size: var(--text-base); line-height: var(--text-base--line-height); font-weight: 700; }
  .price, .price-lg, .price-old { white-space: nowrap; }
  .input-lg  { font-size: var(--text-2xl); line-height: var(--text-2xl--line-height); font-weight: 700; } /* OTP + bargain price inputs */
  .price-old { font-size: var(--text-sm); line-height: var(--text-sm--line-height); color: var(--muted-foreground); text-decoration: line-through; }
  .label     { font-size: var(--text-sm); line-height: var(--text-sm--line-height); font-weight: 600; }
  .overline  { font-size: var(--text-xs); line-height: var(--text-xs--line-height); font-weight: 600; color: var(--gold-text); }
}
```

### 9.2 `src/app/fonts.ts` (الخطة أ: subset محلي)
```ts
import localFont from 'next/font/local';

// Core subset (Arabic + Latin, ~23 KB/weight). Preloaded.
export const plex = localFont({
  src: [
    { path: './fonts/plex-arabic-core-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/plex-arabic-core-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/plex-arabic-core-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex',
  display: 'swap',
  preload: true,
  adjustFontFallback: false, // "Plex Fallback" in globals.css carries the metric overrides
});

// Rare Arabic code points only. Never preloaded; fetched only if such a glyph renders.
export const plexExt = localFont({
  src: [
    { path: './fonts/plex-arabic-ext-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/plex-arabic-ext-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-ext',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0600-0620,U+0653-065F,U+066E-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC' }],
});
// v1.1 — Saudi riyal sign U+20C1 only (~1 KB), built from SAMA's official SVG (tokens.md 8.4.3).
// First in --font-sans; unicode-range keeps it off every other character. One weight declared 100–900 → no synthetic bold.
export const riyal = localFont({
  src: [{ path: './fonts/souq-riyal-sign.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-riyal',
  display: 'block',
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+20C1' }],
});
// layout: <html lang={locale} dir={dir} className={`${riyal.variable} ${plex.variable} ${plexExt.variable}`}>
```

سكربت توليد الـ subset (يُحفظ في `scripts/fonts/subset.sh` في P1-02، والمصدر ملفات IBM Plex الرسمية بترخيص OFL):
```bash
#!/usr/bin/env bash
# Requires: pip install fonttools brotli
set -euo pipefail
SRC=${1:?path to IBM Plex Sans Arabic TTFs}; OUT=src/app/fonts
CORE='U+0020-007E,U+00A0,U+00D7,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2212,U+060C,U+061B,U+061F,U+0621-063A,U+0640-0652,U+0660-066D,U+0670,U+0679,U+067E,U+0686,U+0698,U+06A4,U+06AF,U+06CC,U+06D4,U+200C-200F'
FEAT='ccmp,locl,init,medi,fina,rlig,calt,liga,kern,mark,mkmk'
for W in 400:Regular 600:SemiBold 700:Bold; do
  N=${W%%:*}; S=${W##*:}
  pyftsubset "$SRC/IBMPlexSansArabic-$S.ttf" --unicodes="$CORE" --layout-features="$FEAT" --flavor=woff2 --output-file="$OUT/plex-arabic-core-$N.woff2"
done
for W in 400:Regular 700:Bold; do
  N=${W%%:*}; S=${W##*:}
  pyftsubset "$SRC/IBMPlexSansArabic-$S.ttf" --unicodes='U+0600-0620,U+0653-065F,U+066E-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC' --layout-features='*' --flavor=woff2 --output-file="$OUT/plex-arabic-ext-$N.woff2"
done
ls -l "$OUT"/*.woff2
```

**الخطة ب (لو تأخر الـ subset):** `next/font/google` بـ `IBM_Plex_Sans_Arabic({ weight: ['400','600','700'], subsets: ['arabic','latin'], display: 'swap', variable: '--font-plex' })`، بحجم 188.5KB. تنبيه: `next/font/google` ينزّل الخطوط **وقت البناء** من `fonts.googleapis.com`، فلازم بيئة الـ CI تسمح بالوصول له (هذه الجلسة مثلاً حُجب فيها هذا الدومين).

### 9.3 `components.json` (shadcn)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "ui": "@/components/ui", "lib": "@/lib", "utils": "@/lib/utils", "hooks": "@/hooks" }
}
```
بعد `shadcn add` لأي مكون، طبّق ملاحظات الترحيل (القسم 10). الـ `baseColor` لا يهم، لأن `globals.css` أعلاه يستبدل كل القيم.

### 9.4 بديل Tailwind v3 (فقط لو فُرض v3)
```ts
// tailwind.config.ts — v3 equivalent; same CSS variables from globals.css sections 1–3 & 5
import type { Config } from 'tailwindcss';
const v = (n: string) => `var(--${n})`;
const tone = (t: string) => ({ DEFAULT: v(t), foreground: v(`${t}-foreground`), subtle: v(`${t}-subtle`) });
export default {
  darkMode: ['selector', '[data-surface="inverse-strong"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    colors: {
      transparent: 'transparent', current: 'currentColor',
      background: v('background'), foreground: { DEFAULT: v('foreground'), secondary: v('foreground-secondary') },
      card: { DEFAULT: v('card'), foreground: v('card-foreground') },
      popover: { DEFAULT: v('popover'), foreground: v('popover-foreground') },
      primary: { DEFAULT: v('primary'), foreground: v('primary-foreground'), hover: v('primary-hover') },
      secondary: { DEFAULT: v('secondary'), foreground: v('secondary-foreground') },
      muted: { DEFAULT: v('muted'), foreground: v('muted-foreground') },
      accent: { DEFAULT: v('accent'), foreground: v('accent-foreground') },
      destructive: { DEFAULT: v('destructive'), foreground: v('destructive-foreground') },
      border: { DEFAULT: v('border'), strong: v('border-strong') }, input: v('input'), ring: v('ring'), link: v('link'),
      gold: { DEFAULT: v('gold'), foreground: v('gold-foreground'), hover: v('gold-hover'), subtle: v('gold-subtle'), text: v('gold-text') },
      success: tone('success'), warning: tone('warning'), danger: tone('danger'), info: tone('info'), neutral: tone('neutral'),
      discount: { DEFAULT: v('discount'), foreground: v('discount-foreground') }, live: v('live'),
      'progress-track': v('progress-track'), 'progress-fill': { DEFAULT: v('progress-fill'), urgent: v('progress-fill-urgent') },
      whatsapp: { DEFAULT: v('whatsapp'), foreground: v('whatsapp-foreground'), hover: v('whatsapp-hover') },
      inverse: { DEFAULT: v('inverse'), foreground: v('inverse-foreground') },
      chart: { 1: v('chart-1'), 2: v('chart-2'), 3: v('chart-3'), 4: v('chart-4') },
      sidebar: { DEFAULT: v('sidebar'), foreground: v('sidebar-foreground'), primary: v('sidebar-primary'),
        'primary-foreground': v('sidebar-primary-foreground'), accent: v('sidebar-accent'),
        'accent-foreground': v('sidebar-accent-foreground'), border: v('sidebar-border'), ring: v('sidebar-ring') },
    },
    fontFamily: { sans: ['var(--font-riyal)', 'var(--font-plex)', 'var(--font-plex-ext)', '"Plex Fallback"', '"Segoe UI"', 'Tahoma', '"Geeza Pro"', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'] },
    fontSize: {
      xs: ['0.75rem', '1.25rem'], sm: ['0.875rem', '1.375rem'], base: ['1rem', '1.625rem'], lg: ['1.125rem', '1.75rem'],
      xl: ['1.25rem', '1.875rem'], '2xl': ['1.5rem', '2.25rem'], '3xl': ['1.75rem', '2.5rem'], '4xl': ['2.25rem', '3.25rem'],
    },
    fontWeight: { normal: '400', semibold: '600', bold: '700' },
    letterSpacing: { normal: '0' },
    lineHeight: { snug: '1.35', normal: '1.625', relaxed: '1.8' },
    borderRadius: { none: '0', sm: '4px', md: '8px', lg: '12px', full: '9999px' },
    boxShadow: { none: 'none', sm: '0 1px 2px rgb(22 18 14 / .06)', md: '0 6px 20px rgb(22 18 14 / .10)', lg: '0 12px 32px rgb(22 18 14 / .16)' },
    extend: { transitionTimingFunction: { standard: 'cubic-bezier(.2,.8,.2,1)', exit: 'cubic-bezier(.4,0,1,1)' },
      transitionDuration: { 120: '120ms', 200: '200ms', 320: '320ms' } },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
```

---

## 10. ملاحظات الترحيل وقواعد الـ lint للمهندسين (P1-02)

1. **بعد كل `npx shadcn add`:** استبدل `font-medium` بـ `font-semibold`، و `rounded-xl` بـ `rounded-lg`، و `leading-none` بـ `leading-snug`، و `focus-visible:ring-ring/50 focus-visible:ring-[3px]` بـ `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` (أو احذفها واعتمد على القاعدة العامة)، و `outline-ring/50` بـ `outline-ring`. أي `ml-/mr-/left-/right-` فيها يصير منطقياً.
2. **فحص CI (grep)، يفشل الـ build لو وجد شيئاً في `src/`:**
   ```bash
   rg -n --glob 'src/**/*.{ts,tsx,css}' \
     -e '\b(-?m[lr]|p[lr]|left|right|border-[lr]|rounded-[lr]|rounded-[tb][lr]|text-(left|right)|float-(left|right))-' \
     -e '\b(font-(thin|extralight|light|medium|extrabold|black)|tracking-(tight|tighter|wide|wider|widest)|rounded-(xl|2xl|3xl)|leading-none)\b' \
     -e '#[0-9A-Fa-f]{3,8}\b' --glob '!src/app/globals.css' \
     -e 'ring-ring/[0-9]+' -e 'text-\[(1[01]|[0-9])px\]' && exit 1 || exit 0
   # v1.1 — currency only via src/lib/format/money.ts (8.4.7); no Intl currency style anywhere
   rg -n --glob 'src/**/*.{ts,tsx}' --glob '!src/lib/format/money.ts' \
     -e 'ر\.س' -e '\\u20C1' -e '\x{20C1}' -e "style:\s*['\"]currency['\"]" && exit 1
   # v1.1 — 36px buttons are dashboard-only (11.1); route-group/folder names fixed in P1-02
   rg -n --glob 'src/app/**/(store)/**' --glob 'src/components/{store,souq}/**' \
     -e 'size=["\x27](dense|icon-dense)["\x27]' && exit 1 || exit 0
   ```
3. **الألوان:** أي `bg-[#...]` أو `text-[#...]` مرفوض في المراجعة. لو احتجت لوناً جديداً: اقتراح على هذا الملف، ثم إضافة الزوج لسكربت التباين، ثم تشغيله.
4. **الأسطح الداكنة:** الـ theme لا يحتوي `white` ولا `black`، فـ `bg-black/50` في overlay الـ Dialog يصير `bg-[var(--scrim)]`، و `text-white` يصير توكن دلالياً. لا تكتب `text-white` داخل شريط داكن. ضع `data-surface="inverse"` على الحاوية، والبطاقة البيضاء داخلها تأخذ `data-surface="default"`.
5. **الأرقام والأسعار:** لا `toLocaleString()` مباشرة في المكونات. استخدم `lib/format/*` (القسم 11).
6. **العملة (1.1):** لا "ر.س" ولا U+20C1 في المكونات. السعر في الواجهة = `<Price halalas={…} />`، والنص خارج الواجهة (SMS، إيميل، meta) = `formatSAR(h, { locale, display: 'text' })`، والبيانات المنظمة = `SAR` (8.4.6). اللوحات في P1-02 تُرسم بالرمز.
7. **إضافة توكن:** PR يعدّل `tokens.md` (هذا الملف) والسكربت والنتائج معاً، بمراجعة من design-system-performance و designer.

---

## 11. المكونات المشتركة

**المبدأ:** كل مكون **Server Component** إلا المذكور بأنه Client (🟢 = server، 🔵 = client island). الـ formatters منفصلة عن المكونات في `src/lib/format/`: `money.ts` (يلف `lib/money.ts::formatSAR`، ويضيف `formatSARParts` و `display: symbol | text | code` و `compact` و `percent`، وهو المكان الوحيد الذي يعرف رمز الريال، 8.4.7)، و `number.ts`، و `date.ts`، و `duration.ts` (العدادات)، و `phone.ts`، و `digits.ts` (`toLatinDigits`). المكونات تستقبل قيماً خاماً (هللات، ISO dates) وتنسقها عبر هذه الدوال فقط.

### 11.1 الأساسيات (`src/components/ui/`, shadcn معدّل)

| المكون | النوع | Variants | الأحجام | الحالات | ملاحظات وصولية |
|---|---|---|---|---|---|
| `Button` | 🟢 | `primary` (ink)، `gold` (CTA في السوق وعلى الداكن)، `outline`، `ghost`، `bargain` (حد gold-500 بسماكة 1.5px ونص gold-text وأيقونة يد)، `destructive`، `link` | `md` 44 (افتراضي)، `lg` 52، `icon` 44×44؛ و `dense` 36 و `icon-dense` 36×36 **للوحات على الديسكتوب فقط** (ممنوع في المتجر بالـ lint). لا يوجد `sm` | default، hover، active، focus-visible، disabled، **loading** (spinner + `aria-busy`، والعرض ثابت لمنع القفز) | `disabled` يعطّل الضغط ويبقي التباين ≥ 4.5 (نص muted على muted). الأيقونة وحدها تحتاج `aria-label` |
| `Input` / `Textarea` / `Select` | 🟢 (الحالة 🔵 داخل form) | `default`، `numeric` (dir=ltr + toLatinDigits)، `price` (لاحقة رمز الريال من `Price` كزخرفة `aria-hidden`، والعملة مذكورة في الـ label: "السعر بالريال")، `phone` (بادئة +966)، `otp` و `price-lg` بدور `input-lg` 24px (3.3) | 44 (جوال)، 40 (لوحات)، 56 لـ `input-lg` | default، hover، focus، **error** (حد danger + أيقونة + رسالة)، disabled، read-only | `aria-invalid` و `aria-describedby` للرسالة. النص 16px |
| `FormField` | 🔵 (react-hook-form) | `stacked` (افتراضي)، `inline` (لوحات) | — | normal، error (inline تحت الحقل)، hint، required (`*` + `aria-required`) | الرسالة تُعلن بـ `role="alert"` مرة واحدة عند الإرسال، وليس عند كل ضغطة |
| `Checkbox` / `Radio` / `Switch` | 🔵 | — | منطقة ضغط 44 | checked، unchecked، indeterminate (checkbox)، disabled، error | حدود `input`. مجموعة الراديو بـ `fieldset`/`legend` |
| `Tabs` | 🔵 | `underline` (السوق)، `pill` (فلاتر الصندوق) | — | selected (مؤشر `border-strong` بسماكة 2px + نص foreground)، hover، focus، disabled، مع `count` | أسهم لوحة المفاتيح تنعكس في RTL (Radix يدعم `dir`) |
| `SegmentedControl` | 🔵 | — | 36/44 | selected، focus | `role="radiogroup"` (فلتر الفترة في اللوحات) |
| `Dialog` / `Sheet` | 🔵 | `dialog` (من `md`)، `bottom-sheet` (جوال)، `side-sheet` (لوحات، من `end`) | — | open، closing، مع form submitting | focus trap، و `aria-modal`، والإغلاق بـ Esc، وإرجاع التركيز للزر اللي فتحه |
| `Badge` / `StatusBadge` | 🟢 | `subtle` (افتراضي)، `solid`، `outline`. النغمات: neutral، info، accent، warning، success، danger، live | `sm` 20، `md` 24 | — | `StatusBadge entity="subOrder" status="SHIPPED"` يأخذ النغمة والأيقونة والنص من الـ map (2.5). النص دائماً موجود، وأقل حجم 12px |
| `Alert` / `Callout` | 🟢 | info، success، warning، danger، `secure` (قفل، "اسمك ورقمك ما يظهرون للتاجر") | — | dismissible اختياري | `role="status"` أو `alert` حسب الخطورة |
| `Toast` | 🔵 | success، error، info | — | مع action (تراجع) | `aria-live="polite"`، والأخطاء `assertive` |
| `Skeleton` | 🟢 | `text`، `card`، `row`، `kpi`، `image` (4:5 للمنتجات، و 1:1 للشعارات والأفاتار فقط) | — | — | بلون `muted` ثابت بدون shimmer مع reduced-motion، و `aria-hidden`، والحاوية `aria-busy` |
| `EmptyState` | 🟢 | `default`، `search` (بدون نتائج)، `filtered` (مع "مسح الفلاتر")، `first-use` (onboarding) | — | **دائماً مع action** (زر أساسي واحد) | عنوان + سطر + زر. ممنوع حالة فارغة بدون خطوة تالية |
| `ErrorState` | 🟢 | `inline`، `page` (لـ `error.tsx`)، `offline`، `expired` (مهلة) | — | مع retry | النص يقول ما حدث وما الخطوة، ولا يكشف تفاصيل تقنية |
| `Icon` | 🟢 | — | 16، 20، 24 | `data-directional` للانعكاس | زخرفية `aria-hidden` افتراضياً |

### 11.2 المتجر

| المكون | النوع | Variants | الحالات | ملاحظات |
|---|---|---|---|---|
| `ProductCard` | 🟢 + `FavoriteButton` 🔵 | `grid` (4:5)، `compact` (أفقي، للسلة والاقتراحات)، `rail` (عرض 160 في الشريط الأفقي) | default، hover (shadow-sm)، **out-of-stock** (شارة neutral وزر معطل)، **has-variants** ("متوفر بعدة خيارات" بدل زر السلة)، **on-deal** (شارة خصم + `StockMeter`)، loading (Skeleton) | الكارت كله رابط واحد (`<a>` يغطي البطاقة) وزر المفضلة فوقه منفصل، فلا تتداخل الروابط. اسم المنتج سطران بـ `line-clamp-2`، والاسم الكامل في `title` |
| `Price` (1.1) | 🟢 | `sm` (14، السلة والصفوف)، `md` (16، البطاقة)، `lg` (24، صفحة المنتج)؛ `with-compare` (قبل/بعد + نسبة الخصم)، `range` ("من" + السعر)، `locked` (أيقونة قفل + نغمة accent)، `free` ("مجاني"، بلا رمز)، `compact` (اللوحات فقط: "486.2 ألف" + الرمز) | `currencyDisplay`: `symbol` (افتراضي) أو `text` ("ر.س"، تلقائي لو `RIYAL_SIGN_READY = false`) | Props: `halalas` (Integer)، `compareAt?`، `size`، `variant`، `locale` من next-intl. **الرمز U+20C1 نص حقيقي بخط `Souq Riyal Sign`، يسار الرقم في العربي والإنجليزي، بمسافة U+00A0، وبنفس حجم ولون الرقم** (8.4.4). الـ markup: `<bdi class="price" dir>` ← الرقم `<bdi dir="ltr">` + `span.riyal[role=img][aria-label="ريال سعودي"]`. السالب `−` داخل الرقم والرمز يساره. `white-space: nowrap`. السعر القديم `<s>` + sr-only "السعر قبل الخصم". لا يعرض `compareAt` لو ≤ السعر. Server Component بلا JS |
| `DiscountBadge` | 🟢 | `solid` (افتراضي)، `subtle` | — | `<bdi dir="ltr">-22%</bdi>`، والقارئ يسمع "خصم 22 بالمئة" |
| `RatingStars` | 🟢 | `display`، `input` 🔵 | — | `role="img"` + `aria-label="4.8 من 5، 312 تقييماً"`. التعبئة من `start` |
| `VendorChip` | 🟢 | `inline` (اسم + تقييم)، `row` (شعار + تقييم + "زيارة المتجر")، `platform` (سوق الزل بدون تقييم) | — | لا يعرض اسم التاجر في سياق الفصال إلا حسب O8 |
| `VariantPicker` | 🔵 | `swatch` (لون)، `chip` (مقاس، خامة) | selected (`border-strong`)، **unavailable** (شطب + نص "غير متوفر" مخفي للقارئ، ويبقى قابلاً للتركيز ليُعلن)، disabled | `radiogroup`، و 44×44 حد أدنى |
| `QuantityStepper` | 🔵 | `sm`، `md` | min، max (حسب المخزون أو `perCustomerLimit`)، disabled | زرّان 44 + input رقمي. `aria-live` على التغيير |
| `ImageGallery` | 🔵 (سحب) | `pdp` (**4:5 في الجوال والديسكتوب**، قرار designer)، `thumbs` | loading، single-image (بدون نقاط) | الصورة الأولى server-rendered بـ `priority` (هي الـ LCP)، والسحب يتحمّل بعد الـ hydration |
| `Breadcrumbs` | 🟢 | — | — | `nav[aria-label]` + `ol`، والفاصل أيقونة `data-directional`، ويولّد BreadcrumbList JSON-LD |
| `FilterChips` / `SortMenu` | 🔵 | `scroll` (جوال)، `wrap` | selected، with-count، clear-all | الحالة في الـ URL (`searchParams`)، و `aria-pressed` |
| `SearchBox` | 🔵 | `header`، `page` | idle، typing (اقتراحات)، empty-results | `role="combobox"`، والتطبيع العربي على السيرفر |
| `BnplSlot` | 🔵 lazy | tabby، tamara | loading (ارتفاع محجوز لمنع CLS) | يُحمّل عند ظهوره (IntersectionObserver)، ولا يدخل في الـ LCP |
| `WhatsAppFab` (1.1) | 🟢 | — | default، hover (`whatsapp-hover`)، focus-visible (حلقة `ring` العادية)، hidden في `/cart` و `/checkout` وأثناء فتح أي Sheet، ويرتفع فوق `StickyActionBar` (`bottom: 96px`) | `bg-whatsapp text-whatsapp-foreground` (5.01)، دائرة 56×56 (`rounded-full`)، أيقونة 28، `shadow-md`، `--z-fab`، على `end`. **بلا نبض ولا حركة دخول.** رابط `wa.me` عادي بدون SDK، و `aria-label="تواصل معنا عبر واتساب"`، والنص الجاهز في الرابط بـ "ر.س" لا بالرمز (8.4.6) |
| `CartLine` | 🔵 | `default`، `deal-locked` (عداد 15 دقيقة)، `price-locked` (عداد PriceLock)، `unavailable` | updating، removed (تراجع) | السعر المقفول يُعرض بـ `Price variant="locked"` |
| `ShipmentGroup` | 🟢 | — | — | "الشحنة N · اسم التاجر"، والمدة والرسوم لكل تاجر (D3) |
| `CheckoutStepper` | 🟢 | — | done، current (`aria-current="step"` + أيقونة)، upcoming | النص 12px كحد أدنى (المسودة 11px) |
| `PaymentMethodOption` | 🔵 | mada، applepay، card، stcpay، tabby، tamara | selected، disabled (غير متاح لهذا المبلغ) | شعارات SVG بالأبعاد الرسمية. `radiogroup` |
| `OrderSummary` | 🟢 | `cart`، `checkout`، `order` | — | سطر "يشمل ضريبة القيمة المضافة" |
| `StickyActionBar` | 🟢 | — | — | `pb-[env(safe-area-inset-bottom)]`، وطبقة `--z-sticky`، ومساحة محجوزة في الصفحة |

### 11.3 سوق الزل والفصال

| المكون | النوع | Variants | الحالات | ملاحظات |
|---|---|---|---|---|
| `DealCard` | 🟢 + `Countdown` و `StockMeter` 🔵 | `horizontal` (قائمة السوق)، `rail` (الرئيسية)، `pinned` (`border-accent`) | scheduled (APPROVED: "يبدأ خلال")، **live**، ending-soon (أقل من 10 دقائق: نغمة warning)، **sold-out** (شارة neutral وزر معطل)، **ended** (يختفي في التحديث التالي مع إعلان polite)، مع/بدون "فاصل" (`allowBargain`) | الأزرار 44. "اشترِ الآن" = **`Button variant="primary"`** (يصير gold-500 بنص ink داخل `data-surface="inverse"`، و ink على الفاتح، فلا variant خاص)، و"فاصل" `bargain`. السعر `Price`، وعلى الداكن يرث `foreground` |
| `Countdown` | 🔵 (جزيرة صغيرة) | `boxed` (على الداكن)، `inline` (نص)، `compact` (MM:SS) | running، warning (≤ 10 د)، **expired** (يستدعي `onExpire` مرة واحدة) | **ساعة واحدة مشتركة** للصفحة كلها (`useSyncExternalStore` بـ tick كل ثانية، يتوقف مع `document.hidden`). والوقت المتبقي محسوب من `endsAt` القادم من السيرفر مع تصحيح فرق الساعة. `role="timer"` + `aria-label` نصي ("ينتهي خلال 42 دقيقة")، **بدون** `aria-live` (لا يُعلن كل ثانية). يُعلن مرة واحدة عند 5 دقائق وعند الانتهاء |
| `StockMeter` | 🔵 | `bar`، `text` | normal، low (≤ 3: نغمة danger)، sold-out | النص هو المعلومة ("باقي 3 قطع")، والشريط زخرفي `aria-hidden` (ليس `progressbar`). المسار `bg-progress-track`، والتعبئة `bg-progress-fill` (و `bg-progress-fill-urgent` عند ≤ 3)، وتتبدل تلقائياً داخل الداكن (2.3). الصيغة العربية للعدد (قطعة/قطعتان/قطع) عبر ICU plural في messages |
| `LiveBadge` | 🟢 | `pill`، `dot`، `on-dark` | — | النقطة زخرفية، والنص "مباشر" دائماً |
| `BargainButton` | 🟢 | `block`، `inline` | hidden لو `!allowBargain`، disabled (وصل الحد O9، مع السبب) | يفتح `PriceRequestSheet` عبر `?bargain=1` (رابط قابل للمشاركة) |
| `PriceRequestSheet` | 🔵 | `product`، `open` (`/souq/request/new`، مع رفع صور) | idle، validating (أقل من الحد العام O9)، submitting، **limit-reached**، success (رقم الطلب + رابط المتابعة)، error | **لا يعرض `floorPrice` أبداً**، والحد المعروض هو `minTargetPricePercent` العام. `Callout secure`، وموافقة PriceLock، وعدّاد الحدود |
| `RequestTicker` | 🔵 (Realtime) | — | live، paused (التبويب مخفي)، empty | `aria-live="polite"` مع تجميع (إعلان واحد كل 30 ثانية على الأكثر)، وبدون أي بيانات عميل |
| `OfferCard` | 🔵 | `best` (`border-accent` + شارة accent "الأفضل إجمالاً")، `default`، `countered`، `declined` (`bg-muted` + `text-muted-foreground` **بدون opacity**)، `expired`، `accepted` | pending، countering (form مفتوح داخل البطاقة)، accepting، accepted ← CTA "ادفع الآن"، rounds-exhausted ("آخر جولة") | تفصيل: السعر × الكمية + الشحن = الإجمالي. الأزرار: "اقبل" `primary`، و"سعر مضاد" `outline`، و"رفض" `ghost` |
| `OfferCompare` | 🔵 (Realtime) | `list` (جوال)، `table` (من `lg`) | waiting (لا عروض بعد: EmptyState مع عداد المهلة)، has-offers، accepted، **expired** (مع "أعد الطلب")، converted | الترتيب بالإجمالي. وصول عرض جديد = Toast + إعلان polite، بدون قفز في الترتيب أثناء تركيز المستخدم على بطاقة |
| `RoundTimeline` | 🟢 | `compact`، `full` | — | `ol`، وكل خطوة: الطرف + السعر + الوقت، و"الجولة X من N" |
| `CounterOfferForm` | 🔵 | `customer`، `vendor` | validating، submitting، error | فلتر وسائل التواصل يظهر كتحذير inline قبل الإرسال |
| `PriceLockBadge` | 🔵 | `cart`، `request` | active (accent + Countdown)، expiring (≤ 2 ساعة: warning)، expired | — |
| `RequestRow` (صندوق التاجر) | 🟢 + Countdown 🔵 | `new`، `awaiting-me`، `awaiting-customer`، `accepted` | selected (`border-s` بـ 3px)، unread (نقطة + `font-semibold`)، below-floor (شارة warning **للتاجر فقط**) | الصف كله زر يفتح `ResponsePanel`، والتنقل بالأسهم |
| `ResponsePanel` | 🔵 | `product-owner`، `competitor` (اختيار منتج مطابق) | idle، submitting، sent، expired | اختيار المنتج من منتجات التاجر المنشورة في نفس التصنيف فقط |

### 11.4 اللوحات (admin / vendor)

| المكون | النوع | Variants | الحالات | ملاحظات |
|---|---|---|---|---|
| `DataTable` (TanStack) | 🔵 (الصفحة 🟢 تمرر البيانات) | `default`، `compact` (صف 40)، `selectable` | loading (Skeleton rows)، **empty** (EmptyState مع action)، **filtered-empty** ("مسح الفلاتر")، error (retry)، sorting، paginated (server-side)، row-selected، bulk-actions bar | الأعمدة الرقمية والمبالغ `text-end` و `whitespace-nowrap` (الحالي في المسودة `text-start`). رأس ثابت `--z-sticky`. الفرز بـ `aria-sort`. الترقيم والفلاتر في الـ URL. التصدير CSV من السيرفر وليس من المتصفح |
| `StatCard` (KPI) | 🟢 | `default`، `split` (معلّق/متاح)، `with-trend` (سهم + `<bdi dir="ltr">+12%</bdi>` + "عن الفترة السابقة")، `link` | loading، no-data ("—" مع tooltip) | القيمة `text-2xl font-bold` عبر `Price compact`، والعملة (الرمز) دائماً. الاتجاه بالأيقونة والنص، لا باللون وحده |
| `ChartCard` | 🔵 lazy (`next/dynamic`, `ssr: false` + Skeleton بارتفاع ثابت) | `line`، `bar`، `area` | loading، empty، error | Recharts يُحمّل فقط في الصفحات اللي فيها رسم. حد 4 سلاسل، ومحور RTL، وجدول بيانات بديل (`<details>`) للقارئ |
| `SidebarNav` | 🟢 + toggle 🔵 | `admin`، `vendor` | active (`bg-sidebar-accent` + `border-s` ذهبي)، with-count، collapsed (أقل من `lg`: Sheet) | داخل `data-surface="inverse"`، و `aria-current="page"` |
| `Topbar` | 🟢 | — | — | العنوان + فلتر الفترة + الإشعارات |
| `ReviewQueueItem` | 🟢 | product، vendor، deal، iban، contact-attempt (danger) | — | العدد `text-base font-bold`، والنغمة بحد `border-s` |
| `Timeline` (تاريخ الطلب) | 🟢 | `order`، `audit` | — | `ol` + الوقت بـ `<time dateTime>` |
| `ImageUploader` | 🔵 | `single` (شعار)، `multi-sortable` (صور المنتج)، `document` (وثائق، private) | idle، dragging، uploading (تقدم)، error (نوع أو حجم)، reorder | السحب له بديل بأزرار "تحريك للأمام/للخلف" للوحة المفاتيح. والضغط وتحويل الصيغة على السيرفر |
| `MoneyInput` | 🔵 | `price`، `percent` (basis points) | — | يعرض رمز الريال لاحقة زخرفية (`aria-hidden`، والعملة في الـ label)، ويخزن هللات، ويقبل ٠–٩ |
| `Pagination` | 🟢 | — | — | روابط حقيقية، والأسهم `data-directional` |

---

## 12. ميزانية الأداء (Performance budget)

### 12.1 Core Web Vitals (p75 حقيقي، جوال)

| المقياس | الميزانية | الهدف في المختبر (Lighthouse، Moto G Power، Slow 4G) |
|---|---|---|
| **LCP** | ≤ 2.5s (SPEC) | ≤ 2.0s للرئيسية والمنتج والتصنيف و `/souq` |
| **INP** | ≤ 200ms | Total Blocking Time ≤ 200ms في المختبر |
| **CLS** | ≤ 0.1 | ≤ 0.05، وتبديل الخط وحده ≤ 0.02 |
| TTFB | ≤ 0.8s | ≤ 0.4s للصفحات المخزنة (ISR/CDN) |
| FCP | ≤ 1.8s | ≤ 1.5s |
| Lighthouse Performance | ≥ 90 جوال (SPEC) | ≥ 90 للصفحات الأربع، و Accessibility ≥ 95 |

### 12.2 الخطوط
- **4 ملفات preload بإجمالي ≤ 77KB** (1.1): الـ core الثلاثة (69.6KB مقاسة) + `souq-riyal-sign.woff2` (حوالي 1KB، يُقاس عند بنائه من الملف الرسمي؛ الملف التجريبي 580 بايت). `font-display: swap`. صفر طلبات لخطوط من دومين خارجي في وقت التشغيل.
- لا أوزان غير 400/600/700. الوجه `ext` لا يُحمّل في الصفحات العادية (يُتحقق منه في Lighthouse: "Network requests").

### 12.3 الصور
- `next/image` لكل الصور، و `formats: ['image/avif', 'image/webp']`.
- `deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536]` و `imageSizes: [48, 64, 96, 128, 160, 256, 320]`، و `qualities: [60, 75]` (الافتراضي 75، والبانرات 60).
- **`sizes` لكل سياق (إلزامي، بدونه ينزل المتصفح أكبر نسخة):**
  | السياق | النسبة | `sizes` |
  |---|---|---|
  | بطاقة شبكة المنتجات | 4:5 | `(min-width:1280px) 296px, (min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw` |
  | بطاقة في شريط أفقي | 4:5 | `160px` |
  | صورة DealCard الأفقية | 4:5 | `120px` |
  | معرض صفحة المنتج | **4:5 جوال وديسكتوب** (1.1، كان 1:1 في الجوال) | `(min-width:1280px) 640px, (min-width:1024px) 50vw, 100vw` |
  | بانر الرئيسية | 16:9 جوال، 3:1 ديسكتوب (`<picture>` بمصدرين، `Banner.imageMobile`/`imageDesktop`) | `100vw` |
  | الصور المصغرة (السلة، الصندوق، مصغرات المعرض) | 4:5 (56×70) | `56px` |
- **الـ LCP:** صورة واحدة فقط لكل صفحة بـ `priority` (`fetchPriority="high"`): أول بانر في الرئيسية، وأول صورة في معرض المنتج، وأول صورة في شبكة التصنيف. كل الباقي `loading="lazy"`.
- **نسبة واحدة لكل صور المنتج: 4:5** (1.1). الحاوية `aspect-ratio: 4 / 5` محجوزة دائماً (CLS)، والصورة `object-fit: cover`، والرفع يُقص على 4:5 عند المعالجة على السيرفر.
- **أوزان مستهدفة (AVIF):** صورة LCP للمنتج بعرض 828px (828×1035، 4:5) ≤ 110KB (كانت 90KB لـ 828×828؛ المساحة زادت 25%، والرقم تقدير يُقاس على صور الـ seed الحقيقية في P1-02)، وبطاقة الشبكة بعرض 384px (384×480) ≤ 25KB، والبانر بعرض 828px ≤ 70KB.
- **المصدر:** الرفع ≤ 5MB، وأقل أبعاد 1280×1600 (4:5)، ويُخزن نسخة أصلية في Supabase Storage. والتحويل عبر `next/image` (أو Supabase Image Transformations حسب O6، بـ loader مخصص).
- **Placeholder:** لون `muted` ثابت (`bg-muted`) مع `aspect-ratio` محجوزة. بدون `blurDataURL` (يضيف bytes لكل صورة في الـ HTML).
- الأيقونات من `lucide-react` بـ import فردي (`import { Search } from 'lucide-react'`)، وممنوع icon fonts. أيقونات التصنيفات SVG inline صغيرة (≤ 1KB لكل واحدة).

### 12.4 JavaScript (المنقول مضغوطاً، First Load JS حسب مخرجات `next build`)

| المسار | الميزانية | ملاحظات |
|---|---|---|
| الحزمة المشتركة (framework + layout) | ≤ 110KB | next-intl: الرسائل تُمرر للـ client islands فقط حسب الـ namespace |
| `/` ، `/c/[slug]` ، `/products` ، `/search` | ≤ 150KB إجمالاً | Server Components. Client فقط: المفضلة، الفلاتر، السلة المصغرة، العداد |
| `/p/[slug]` | ≤ 170KB | + VariantPicker والمعرض والـ Sheet (الـ Sheet بـ `next/dynamic` عند `?bargain=1` أو الضغط) |
| `/souq` | ≤ 180KB قبل Realtime | `@supabase/realtime-js` يُحمّل **بعد** الـ hydration وعند ظهور التبويب (`requestIdleCallback`)، ولا يدخل في الـ First Load |
| `/cart` ، `/checkout` | ≤ 220KB | Moyasar form و Tabby/Tamara تُحمّل في خطوة الدفع فقط |
| `/admin/*` ، `/vendor/*` | ≤ 300KB | TanStack Table في صفحات الجداول فقط، و Recharts بـ dynamic import |
| سكربتات الطرف الثالث | 0 قبل موافقة الكوكيز | GA4 والـ Pixels بـ `next/script strategy="lazyOnload"` بعد الموافقة. وواتساب رابط فقط |

**قواعد:**
- `'use client'` على مستوى الورقة (المكون الصغير)، وليس على مستوى الصفحة أو الـ layout.
- كل route عام له `loading.tsx` (Skeleton بأبعاد الصفحة الحقيقية لمنع CLS) و `error.tsx` (`ErrorState page`)، و `not-found.tsx` عربي.
- الصفحات العامة ISR مع `revalidateTag` عند تحديث المنتج أو العرض. `/souq` = shell ثابت + Suspense streaming للأقسام + اشتراك Realtime بعد التحميل.
- تحديث Realtime لا يعيد render القائمة كلها: تحديث العنصر المتأثر فقط (مفتاح ثابت + حالة لكل بطاقة).

### 12.5 خطة القياس

| الطبقة | الأداة | متى | يفشل الـ PR لو |
|---|---|---|---|
| حجم الحزم | مخرجات `next build` + سكربت يقارن First Load JS لكل route بالميزانية (12.4)، و `@next/bundle-analyzer` عند الحاجة | كل PR | تجاوز ميزانية أي route، أو زيادة > 10KB بدون تبرير في وصف الـ PR |
| المختبر | Lighthouse CI (`lhci autorun`)، preset جوال، 3 تشغيلات وأخذ الوسيط، على 4 مسارات: `/`، `/c/<seed>`، `/p/<seed>`، `/souq`. بيانات seed بصور حقيقية بنسبة 4:5 | كل PR على بيئة preview | Performance < 90، أو LCP > 2.5s، أو CLS > 0.1، أو TBT > 200ms، أو Accessibility < 95 |
| الخطوط | فحص في Lighthouse CI: عدد طلبات الخطوط ≤ 4 وحجمها ≤ 77KB، ولا طلب لـ `plex-ext` في الصفحات الأربع | كل PR | تجاوز |
| الوصولية | axe-core في Playwright (E2E 6) عربي وإنجليزي، و `contrast.py` عند تغيير التوكنات | كل PR | أي مخالفة serious أو critical |
| الميدان (RUM) | `useReportWebVitals` في `app/[locale]/layout` يرسل LCP و INP و CLS و TTFB مع route و device و connection إلى GA4 (بعد الموافقة) و Sentry. ومع Vercel Speed Insights لو قرار O6 = Vercel | مستمر من أول staging | تنبيه أسبوعي لو p75 تجاوز الميزانية لأي route |
| CrUX | PageSpeed Insights / CrUX API لـ `suqalzl.com` | شهرياً بعد الإطلاق (يحتاج حجم زيارات كافٍ) | — |
| يدوي | iPhone SE و Android متوسط حقيقي على 4G، مع VoiceOver و TalkBack بالعربي | قبل G2 و G3 و P6 | — |

**خط الأساس:** أول قياس في نهاية P1-02 (صفحة الدخول + layout المتجر) يُسجّل هنا، ثم يقارن كل PR معه.

---

## الملحق أ: سكربت التباين

يُحفظ في `scripts/design/contrast.py` في P1-02، ويُشغّل في CI عند تغيير `globals.css`. التشغيل: `python3 scripts/design/contrast.py`، والخروج برمز 1 لو فشل أي زوج في الوضع الفاتح أو المعكوس.

```python
#!/usr/bin/env python3
"""WCAG 2.x contrast checker for Souq AlZal design tokens.

Usage: python3 contrast.py [--md]
Every pair below is a pair that is actually used by a component.
kind: text (>=4.5), large (>=3.0, text >=24px or >=18.66px bold),
      ui (>=3.0, WCAG 1.4.11 non-text: borders that identify a control, focus rings, state indicators, icons that carry meaning)
"""
import sys

# ---------- primitives (single source of truth) ----------
P = {
    "ink": "#16120E",
    "brown-900": "#2E2018", "brown-800": "#3B2B21", "brown-700": "#4A3426", "brown-600": "#5C4334", "brown-500": "#6E5240",
    "gold-50": "#FAF3E3", "gold-300": "#DDBE7C", "gold-500": "#C29A4B", "gold-600": "#A67F35", "gold-700": "#7E5F22",
    "sand-50": "#FBF7F0", "sand-100": "#F3EADB", "sand-200": "#E6D7BE", "sand-300": "#BCAA92", "sand-500": "#8F7B66",
    "white": "#FFFFFF",
    "muted": "#6B5E52",
    "success-700": "#2F6B3F", "success-50": "#E8F1EA", "success-300": "#8FC79C",
    "warning-700": "#8A5A0F", "warning-50": "#F8EEDC", "warning-300": "#E8B866",
    "danger-700": "#A23B2A", "danger-50": "#F8E7E3", "danger-300": "#F0A08F",
    "info-700": "#2D5B7A", "info-50": "#E6EEF4", "info-300": "#8DB8D6",
    "whatsapp-600": "#16803E", "whatsapp-700": "#15783A",  # v1.1: WhatsApp hue (#25D366) darkened in HLS until white >= 5:1
}

def hex2rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def rgb2hex(c):
    return "#" + "".join(f"{round(max(0, min(1, x)) * 255):02X}" for x in c)

def blend(fg, bg, a):
    """alpha-composite fg over bg (both hex) -> hex"""
    f, b = hex2rgb(fg), hex2rgb(bg)
    return rgb2hex(tuple(a * x + (1 - a) * y for x, y in zip(f, b)))

def lum(h):
    def ch(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in hex2rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def c(x):
    return P.get(x, x)

TH = {"text": 4.5, "large": 3.0, "ui": 3.0, "deco": 0}

def verdict(r, kind):
    if r >= 7 and kind == "text":
        return "AAA"
    if kind == "deco":
        return "decorative"
    if r >= TH[kind]:
        return "AA" if kind == "text" else f"AA ({kind})"
    return "FAIL"

# ---------- token pairs used by components (light / default scope) ----------
LIGHT = [
    ("text", "background", "ink", "sand-50", "text"),
    ("text", "surface", "ink", "white", "text"),
    ("text", "surface-subtle", "ink", "sand-100", "text"),
    ("text-secondary", "background", "brown-700", "sand-50", "text"),
    ("text-secondary", "surface-subtle", "brown-700", "sand-100", "text"),
    ("text-muted", "surface", "muted", "white", "text"),
    ("text-muted", "background", "muted", "sand-50", "text"),
    ("text-muted", "surface-subtle", "muted", "sand-100", "text"),
    ("text-muted (disabled field)", "surface-subtle", "muted", "sand-100", "text"),
    ("text-link / text-accent", "surface", "gold-700", "white", "text"),
    ("text-link / text-accent", "background", "gold-700", "sand-50", "text"),
    ("text-link / text-accent", "surface-subtle", "gold-700", "sand-100", "text"),
    ("text-accent", "accent-subtle", "gold-700", "gold-50", "text"),
    ("primary-fg on primary (btn)", "primary", "sand-50", "ink", "text"),
    ("primary-fg on primary-hover", "primary-hover", "sand-50", "brown-900", "text"),
    ("accent-fg on accent (gold btn)", "accent", "ink", "gold-500", "text"),
    ("accent-fg on accent-hover", "accent-hover", "ink", "gold-600", "text"),
    ("destructive-fg", "destructive", "white", "danger-700", "text"),
    ("discount badge text", "discount", "white", "danger-700", "text"),
    ("price-discount text", "surface", "danger-700", "white", "text"),
    ("success text (KPI up)", "surface", "success-700", "white", "text"),
    ("warning text (timer)", "surface", "warning-700", "white", "text"),
    ("warning text", "background", "warning-700", "sand-50", "text"),
    ("info text", "surface", "info-700", "white", "text"),
    # status badges (tone fg on tone bg)
    ("badge success", "success-subtle", "success-700", "success-50", "text"),
    ("badge warning", "warning-subtle", "warning-700", "warning-50", "text"),
    ("badge danger", "danger-subtle", "danger-700", "danger-50", "text"),
    ("badge info", "info-subtle", "info-700", "info-50", "text"),
    ("badge neutral", "neutral-subtle", "brown-700", "sand-100", "text"),
    ("badge accent", "accent-subtle", "gold-700", "gold-50", "text"),
    ("badge solid success", "success-solid", "white", "success-700", "text"),
    ("badge solid info", "info-solid", "white", "info-700", "text"),
    ("badge solid warning", "warning-solid", "white", "warning-700", "text"),
    ("badge solid neutral", "neutral-solid", "sand-50", "brown-700", "text"),
    # non-text
    ("border-input (field boundary)", "surface", "sand-500", "white", "ui"),
    ("border-input (field boundary)", "background", "sand-500", "sand-50", "ui"),
    ("border-input (field boundary)", "surface-subtle", "sand-500", "sand-100", "ui"),
    ("ring (focus, light)", "background", "gold-700", "sand-50", "ui"),
    ("ring (focus, light)", "surface-subtle", "gold-700", "sand-100", "ui"),
    ("ring (focus, light)", "surface", "gold-700", "white", "ui"),
    ("ring vs primary btn (offset 2px)", "primary", "gold-700", "ink", "ui"),
    ("border-strong (selected option)", "surface", "ink", "white", "ui"),
    ("tab indicator (selected)", "surface", "ink", "white", "ui"),
    ("checkbox/radio border", "surface", "brown-500", "white", "ui"),
    ("progress-fill (stock left)", "progress-track", "brown-700", "sand-200", "ui"),
    ("progress-fill-urgent (stock left)", "progress-track", "danger-700", "sand-200", "ui"),
    ("star icon", "surface", "gold-600", "white", "ui"),
    ("chart-1 line", "surface", "gold-600", "white", "ui"),
    ("chart-2 line", "surface", "brown-700", "white", "ui"),
    ("chart-3 line", "surface", "info-700", "white", "ui"),
    ("chart-4 line", "surface", "success-700", "white", "ui"),
    # WhatsApp FAB (v1.1): icon + optional label checked as text (4.5), boundary vs page as ui (3.0)
    ("whatsapp fab icon/label", "whatsapp", "white", "whatsapp-600", "text"),
    ("whatsapp fab icon/label (hover)", "whatsapp-hover", "white", "whatsapp-700", "text"),
    ("whatsapp fab boundary", "background", "whatsapp-600", "sand-50", "ui"),
    ("whatsapp fab boundary", "surface", "whatsapp-600", "white", "ui"),
    ("whatsapp fab boundary", "surface-subtle", "whatsapp-600", "sand-100", "ui"),
    ("border-accent (best offer) + label", "surface", "gold-500", "white", "deco"),
    ("border (divider)", "surface", "sand-200", "white", "deco"),
]

# ---------- inverse scope (dark islands: header ink, souq hero/flash strip/sidebar brown-900) ----------
INV = []
for bgname, bg in (("inverse (brown-900)", "brown-900"), ("inverse-strong (ink)", "ink")):
    INV += [
        ("text", bgname, "sand-50", bg, "text"),
        ("text-secondary", bgname, "sand-200", bg, "text"),
        ("text-muted", bgname, "sand-300", bg, "text"),
        ("text-accent (gold)", bgname, "gold-500", bg, "text"),
        ("text-link (gold-300)", bgname, "gold-300", bg, "text"),
        ("danger text (live)", bgname, "danger-300", bg, "text"),
        ("success text", bgname, "success-300", bg, "text"),
        ("warning text", bgname, "warning-300", bg, "text"),
        ("info text", bgname, "info-300", bg, "text"),
        ("ring (focus, inverse)", bgname, "gold-500", bg, "ui"),
        ("border-input (inverse)", bgname, "sand-500", bg, "ui"),
        ("whatsapp fab boundary (over dark island)", bgname, "whatsapp-600", bg, "ui"),
    ]
for t in ("success", "warning", "danger", "info"):
    sub = blend(P[f"{t}-300"], P["brown-900"], .16)
    INV += [
        (f"badge {t} (inverse subtle)", f"{t}-300@16%/brown-900", f"{t}-300", sub, "text"),
        (f"badge {t} (inverse solid)", f"{t}-300", "ink", f"{t}-300", "text"),
    ]
INV += [
    ("badge neutral (inverse)", "brown-800", "sand-200", "brown-800", "text"),
    ("primary btn on inverse (gold)", "gold-500", "ink", "gold-500", "text"),
    ("text on inverse-surface card", "brown-800", "sand-50", "brown-800", "text"),
    ("text-muted on inverse-surface", "brown-800", "sand-300", "brown-800", "text"),
    ("countdown digits", "ink", "gold-500", "ink", "text"),
    ("nav item active text", "blend gold .16/brown-900", "sand-50", blend(P["gold-500"], P["brown-900"], .16), "text"),
    ("sidebar counter", "gold-500", "ink", "gold-500", "text"),
    ("progress-fill (inverse)", "progress-track (inverse) brown-700", "gold-500", "brown-700", "ui"),
    ("progress-fill-urgent (inverse)", "progress-track (inverse) brown-700", "danger-300", "brown-700", "ui"),
]

# ---------- what the current mockups actually render (audit) ----------
B = P["brown-900"]
MOCK = [
    (".side .grp (group label 11px)", "brown-900", "brown-500", B, "text"),
    (".side a (nav text)", "brown-900", "sand-200", B, "text"),
    (".livepill on souq hero", "danger .18 over brown-900", "#F2C7BE", blend(P["danger-700"], B, .18), "text"),
    (".livepill vendor topbar", "#F4E6E3", "danger-700", "#F4E6E3", "text"),
    (".p-success", "#E7EFE9", "success-700", "#E7EFE9", "text"),
    (".p-warning", "#F3ECE1", "warning-700", "#F3ECE1", "text"),
    (".p-info", "#E5ECF1", "info-700", "#E5ECF1", "text"),
    (".offer.declined (opacity .75) muted text", "sand-100@.75/sand-50",
     blend(P["muted"], P["sand-50"], .75), blend(P["sand-100"], P["sand-50"], .75), "text"),
    (".offer.declined (opacity .75) ink name", "sand-100@.75/sand-50",
     blend(P["ink"], P["sand-50"], .75), blend(P["sand-100"], P["sand-50"], .75), "text"),
    (".reqrow.new muted meta", "#FFFDF8", "muted", "#FFFDF8", "text"),
    (".opts gold-700 12px", "white", "gold-700", "white", "text"),
    (".lock warning 11px", "white", "warning-700", "white", "text"),
    (".banner p / .souq-hero p", "brown-900", "sand-200", B, "text"),
    (":focus-visible gold-500 on page", "sand-50", "gold-500", "sand-50", "ui"),
    (":focus-visible gold-500 on card", "white", "gold-500", "white", "ui"),
    (".input border sand-200", "white", "sand-200", "white", "ui"),
    (".input.focus border gold-500", "white", "gold-500", "white", "ui"),
    (".tabs span.on underline gold-500", "white", "gold-500", "white", "ui"),
    (".btn-bargain border gold-500 (النص يعرّف الزر)", "white", "gold-500", "white", "deco"),
    (".bar fill danger vs track", "sand-200", "danger-700", "sand-200", "ui"),
    ("gold-500 as text on light (forbidden)", "sand-50", "gold-500", "sand-50", "text"),
    ("gold-600 as text on light", "sand-50", "gold-600", "sand-50", "text"),
    ("shadcn default focus ring-ring/50", "white", blend(P["gold-700"], P["white"], .5), "white", "ui"),
]

def rows(pairs):
    out = []
    for name, bgname, fg, bg, kind in pairs:
        f, b = c(fg), c(bg)
        r = ratio(f, b)
        out.append((name, fg, f, bgname, b, kind, r, verdict(r, kind)))
    return out

def table(title, pairs):
    print(f"\n#### {title}\n")
    print("| الاستخدام | الأمامي | الخلفية | النوع | النسبة | النتيجة |")
    print("|---|---|---|---|---:|---|")
    fails = 0
    for name, fg, f, bgname, b, kind, r, v in rows(pairs):
        fails += v == "FAIL"
        fgl = f"`{fg}` {f}" if fg != f else f"`{f}`"
        print(f"| {name} | {fgl} | `{bgname}` {b} | {kind} | {r:.2f} | {'**FAIL**' if v == 'FAIL' else v} |")
    print(f"\n_{len(pairs)} زوج — فشل: {fails}_")
    return fails

if __name__ == "__main__":
    tf = table("الوضع الفاتح (الافتراضي)", LIGHT)
    ti = table("النطاق المعكوس (inverse: الهيدر، شريط عروض الساعة، رأس السوق، Sidebar)", INV)
    table("تدقيق المسودة الحالية (docs/design/mockups) — للمراجعة فقط", MOCK)
    sys.exit(1 if (tf or ti) else 0)
```

## الملحق ب: مصادر القياس
- ملفات الخط: `@fontsource/ibm-plex-sans-arabic@5.3.0` (نفس ملفات Google Fonts). الأحجام بـ `ls -l`، والـ features والـ cmap والمقاييس بـ fontTools، والتحقق من التشكيل بـ uharfbuzz.
- الـ subset المقترح بُني بـ `pyftsubset` وقيس مباشرة (القسم 3.2).
- **رمز الريال (1.1):** فحص cmap لـ U+20C1 بـ fontTools على `@ibm/plex-sans-arabic@1.1.0` و 16 حزمة `@fontsource@5.3.0` (8.4.1). مقاييس Plex (ارتفاع الأرقام 698، المسافة 236) من `IBMPlexSansArabic-Regular/Bold.woff2`. اختبار الـ bidi والنسخ في Chrome headless بخط تجريبي. نسب واتساب بنفس سكربت الملحق أ، واللون مشتق من `#25D366` بتغميق HLS مع ثبات الدرجة.
- **المصادر الخارجية للرمز:** [ساما: إرشادات رمز الريال](https://www.sama.gov.sa/en-US/Currency/SRS/Pages/Guideline.aspx)، [Unicode L2/25-075](https://www.unicode.org/L2/L2025/25075-saudi-central-bank.pdf)، [Unicode L2/25-076](https://www.unicode.org/L2/L2025/25076-sew-recommendations-saudi-riyal.pdf)، [مدونة Unicode مارس 2025](https://blog.unicode.org/2025/03/support-for-new-saudi-riyal-currency.html)، [مدونة Unicode فبراير 2026](https://blog.unicode.org/2026/02/from-central-bank-to-code-point-roadmap.html)، [Wikipedia: Saudi riyal sign](https://en.wikipedia.org/wiki/Saudi_riyal_sign)، [نقاش TypeDrawers للمصممين](https://typedrawers.com/discussion/comment/68850).
