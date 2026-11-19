# -*- coding: utf-8 -*-
from lib import *

OUT = {}

# =============================================================== COVER
def cover():
    groups = [
        ('الأساسيات', [('Foundations.dc.html', 'الهوية والـ tokens'), ('Components.dc.html', 'المكونات وحالاتها')]),
        ('المتجر', [('Home-mobile.dc.html', 'الرئيسية'), ('Category-mobile.dc.html', 'التصنيف والفلاتر'), ('Product-mobile.dc.html', 'صفحة المنتج'),
                    ('Cart-mobile.dc.html', 'السلة'), ('Checkout-mobile.dc.html', 'الدفع')]),
        ('سوق الزل والفصال', [('Souq-mobile.dc.html', 'السوق الحي /souq'), ('Bargain-mobile.dc.html', 'نافذة اطلب سعرك'), ('Offers-mobile.dc.html', 'مقارنة العروض والجولات')]),
        ('لوحة الإدارة (أولوية)', [('AdminKit.dc.html', 'مكونات الإدارة'), ('AdminProducts-desktop.dc.html', 'المنتجات'), ('AdminOrder-desktop.dc.html', 'الطلبات'), ('AdminSettings-desktop.dc.html', 'الإعدادات')]),
        ('حساب العميل واللوحات', [('AccountOrders-mobile.dc.html', 'حسابي وطلباتي'), ('Search-mobile.dc.html', 'البحث'), ('Vendor-desktop.dc.html', 'لوحة التاجر (مؤجلة)')]),
    ]
    g = ''
    for t, items in groups:
        g += col('<h2 style="margin: 0; font-size: 14px; font-weight: 700; color: %s">%s</h2>' % (C['g5'], t) + ''.join(
            '<a href="%s" style="display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 14px; border: 1px solid %s; border-radius: 8px; color: %s; text-decoration: none; font-size: 15px">%s%s</a>' % (h, C['b7'], C['s50'], n, ic('chev-l', 16, C['g5'])) for h, n in items), 8)
    princ = [('هدوء الفخامة', 'أرضية بيج، نص أسود دافئ، والذهبي للتمييز فقط: حدود رفيعة، شارات، عدادات. لا تدرجات لامعة.'),
             ('السعر أولاً، والثقة دائماً', 'السعر شامل الضريبة واضح في كل بطاقة، واسم التاجر وتقييمه بجانب كل عرض (O8).'),
             ('السوق حي بلا ضجيج', 'العدادات والكميات تتحدث لحظياً، لكن العروض الجديدة تظهر بزر "اعرضها" ولا تقفز الصفحة.'),
             ('الفصال عادل وسري', 'التاجر لا يرى عروض غيره، والعميل لا يرى أي حد أدنى. كل خطوة لها عداد ومهلة واضحة.'),
             ('عربي أولاً', 'RTL كامل، خصائص منطقية، الأرقام معزولة الاتجاه، وأهداف لمس 44px، وتباين AA لكل نص.')]
    p = ''.join(col('<h3 style="margin: 0; font-size: 16px; font-weight: 700; color: %s">%s</h3><p style="margin: 0; font-size: 14px; line-height: 22px; color: %s">%s</p>' % (C['s50'], a, C['ondark'], b), 4) for a, b in princ)
    body = ('<div data-surface="dark" style="flex: 1; background: %s; padding: 64px 72px; display: flex; gap: 64px">'
            '<div style="flex: 1.1; display: flex; flex-direction: column; gap: 28px">%s'
            '<div style="display: flex; flex-direction: column; gap: 12px"><span style="font-size: 14px; font-weight: 600; color: %s">المرحلة P0 · تصميم الواجهات · النسخة 1.0</span>'
            '<h1 style="margin: 0; font-size: 52px; line-height: 68px; font-weight: 700; color: %s">تصاميم سوق الزل</h1>'
            '<p style="margin: 0; font-size: 18px; line-height: 30px; color: %s; max-width: 560px">متجر خليجي فاخر وسوق حي للعروض والفصال. جوال أولاً، عربي من اليمين لليسار، مع نسخة ديسكتوب وحالات كاملة لكل شاشة.</p></div>%s'
            '<div style="display: flex; flex-direction: column; gap: 18px">%s</div>'
            '<div style="padding: 14px 16px; border: 1px solid %s; border-radius: 8px; font-size: 13px; line-height: 22px; color: %s">'
            '<strong style="color: %s">تنبيه:</strong> كل الأسماء والأسعار والأرقام في هذه اللوحات <strong style="color: %s">توضيحية</strong> لشرح التصميم، والصور رسومات خطية بديلة. أسماء المتاجر (دار المثال، مباخر النموذج، عطارة العيّنة…) ليست تجاراً حقيقيين. الشعار مؤقت لحين استلام الشعار الأصلي.</div></div>'
            '<div style="flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; align-content: start">%s</div></div>') % (
        C['ink'], logo(True, 24), C['g5'], C['s50'], C['ondark'], ornament(C['g5'], 72), p, C['b7'], C['ondark'], C['g5'], C['s50'], g)
    OUT['Main.dc.html'] = doc('سوق الزل — فهرس التصاميم', body, 1600, 1000, bg=C['ink'])

# =========================================================== FOUNDATIONS
def foundations():
    sw = [('ink', C['ink'], 'foreground، primary، هيدر المتجر', '17.45 على sand-50'), ('brown-900', C['b9'], 'inverse: الفوتر، شريط السوق، Sidebar', '14.72 مع sand-50'),
          ('brown-800', C['b8'], 'card داخل النطاق المعكوس', '12.66 مع sand-50'), ('brown-700', C['b7'], 'foreground-secondary، neutral', '10.86 على sand-50'),
          ('brown-500', C['b5'], 'حدود checkbox و radio', '7.13 على الأبيض'), ('gold-500', C['g5'], '--gold: CTA السوق، ring على الداكن', '7.11 مع ink · ممنوع نصاً على الفاتح'),
          ('gold-700', C['g7'], 'gold-text، link، ring على الفاتح', '5.54 على sand-50'), ('gold-50', C['g50'], 'gold-subtle: الأفضل، سعر مقفول', '5.35 مع gold-700'),
          ('sand-50', C['s50'], 'background', ''), ('sand-100', C['s100'], 'muted، accent (hover)، secondary', ''),
          ('sand-200', C['s200'], 'border: فواصل زخرفية فقط', '1.42 · ليس لحدود الحقول'), ('sand-300', C['s300'], 'muted-foreground داخل الداكن', '6.96 على brown-900'),
          ('sand-500', C['line'], '--input: حدود الحقول', '4.04 على الأبيض'), ('muted', C['mu'], 'muted-foreground', '5.87 على sand-50')]
    sem = [('success', C['su'], C['subg'], 'مقبول، مدفوع، متاح'), ('warning', C['wa'], C['wabg'], 'بانتظار، مهلة قربت'), ('danger', C['da'], C['dabg'], 'خطأ، مرفوض، عاجل، مباشر'), ('info', C['inf'], C['infbg'], 'معلومة، بانتظار العميل')]
    s = ''
    for n, hx, use, cr in sw:
        dark = hx in (C['ink'], C['b9'], C['b8'], C['b7'], C['b5'], C['g7'], C['mu'], C['line'], C['g6'])
        s += ('<div style="display: flex; flex-direction: column; border: 1px solid %s; border-radius: 8px; overflow: hidden; background: %s">'
              '<div style="height: 76px; background: %s; display: flex; align-items: flex-end; padding: 8px 10px; color: %s; font-size: 12px; font-weight: 600; direction: ltr; justify-content: flex-end">%s</div>'
              '<div style="padding: 10px; display: flex; flex-direction: column; gap: 2px"><strong style="font-size: 13px">%s</strong><span style="font-size: 12px; color: %s; line-height: 18px">%s</span>%s</div></div>') % (
            C['s200'], C['w'], hx, C['s50'] if dark else C['ink'], hx, n, C['mu'], use, ('<span style="font-size: 12px; color: %s; line-height: 18px">%s</span>' % (C['b7'], cr)) if cr else '')
    se = ''.join(('<div style="display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid %s; border-radius: 8px; background: %s">%s<span style="font-size: 12px; color: %s">%s · %s</span></div>') % (
        C['s200'], C['w'], pill(n, n), C['mu'], hx, u) for n, hx, bg, u in sem)
    ty = [('text-4xl · 36/52 · 700', 36, 700, 'بشوت تليق بالمناسبة'), ('text-3xl · 28/40 · 700', 28, 700, 'سوق الزل المباشر'), ('text-2xl · 24/36 · 700', 24, 700, 'عروض الساعة · 1,850.00 ر.س'),
          ('text-xl · 20/30 · 600', 20, 600, 'عنوان قسم في الجوال'), ('text-lg · 18/28', 18, 400, 'خياطة يدوية بزري ذهبي على صوف إنجليزي خفيف.'), ('text-base · 16/26 (النص والحقول)', 16, 400, 'يوصل طلبك لصاحب المنتج وكل التجار في التصنيف.'),
          ('text-sm · 14/22 · 600', 14, 600, 'باقي 4 قطع · ينتهي خلال 42 دقيقة'), ('text-xs · 12/20 (أقل حجم)', 12, 400, 'الأسعار شاملة ضريبة القيمة المضافة')]
    t = ''.join('<div style="display: flex; align-items: baseline; gap: 24px; padding: 10px 0; border-bottom: 1px solid %s"><span style="width: 200px; flex: none; font-size: 12px; color: %s; direction: ltr; text-align: end">%s</span><span style="font-size: %dpx; font-weight: %d; line-height: 1.5">%s</span></div>' % (
        C['s200'], C['mu'], a, sz, wt, ex) for a, sz, wt, ex in ty)
    t += '<div style="display: flex; align-items: center; gap: 24px; padding: 12px 0"><span style="width: 200px; flex: none; font-size: 12px; color: %s; direction: ltr; text-align: end">price 20/28 · counter 18/24 tabular</span>%s%s</div>' % (C['mu'], sar(1850, 20), countdown(0, 42, 18, True, 'md'))
    sp = ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><div style="width: %dpx; height: %dpx; background: %s; border-radius: 2px"></div><span style="font-size: 12px; color: %s">%s</span></div>' % (
        v, v, C['g5'], C['mu'], num(v)) for v in (4, 8, 12, 16, 20, 24, 32, 40, 48, 64))
    rd = ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><div style="width: 72px; height: 56px; background: %s; border: 1px solid %s; border-radius: %s"></div><span style="font-size: 12px; color: %s">%s</span></div>' % (
        C['w'], C['line'], r, C['mu'], n) for n, r in (('sm 4', '4px'), ('md 8', '8px'), ('lg 12', '12px'), ('full', '999px')))
    sh = ''.join('<div style="display: flex; flex-direction: column; align-items: center; gap: 6px"><div style="width: 96px; height: 56px; background: %s; border-radius: 8px; box-shadow: %s"></div><span style="font-size: 12px; color: %s">%s</span></div>' % (
        C['w'], v, C['mu'], n) for n, v in (('shadow-sm', '0 1px 2px rgba(22,18,14,.06)'), ('shadow-md', '0 6px 20px rgba(22,18,14,.10)')))
    body = ('<div style="padding: 48px 56px; display: flex; flex-direction: column; gap: 40px">'
            '<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 13px; font-weight: 600; color: %s">الأساسيات</span><h1 style="margin: 0; font-size: 32px; font-weight: 700">الهوية و Design tokens</h1>'
            '<p style="margin: 0; color: %s; max-width: 760px">المصدر الوحيد: docs/design/tokens.md النسخة 1.0 (design-system-performance). هذه اللوحة عرض بصري لها فقط؛ عند أي اختلاف، tokens.md هو المرجع.</p></div>'
            '<section style="display: flex; flex-direction: column; gap: 14px"><h2 style="margin: 0; font-size: 20px">الألوان</h2><div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px">%s</div>'
            '<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px">%s</div></section>'
            '<div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 48px">'
            '<section style="display: flex; flex-direction: column; gap: 8px"><h2 style="margin: 0; font-size: 20px">الخط: IBM Plex Sans Arabic</h2>%s</section>'
            '<section style="display: flex; flex-direction: column; gap: 24px"><div style="display: flex; flex-direction: column; gap: 12px"><h2 style="margin: 0; font-size: 20px">المسافات (وحدة 4px)</h2><div style="display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap">%s</div></div>'
            '<div style="display: flex; flex-direction: column; gap: 12px"><h2 style="margin: 0; font-size: 20px">الزوايا والظلال</h2><div style="display: flex; gap: 16px; flex-wrap: wrap">%s%s</div></div>'
            '<div style="display: flex; flex-direction: column; gap: 8px"><h2 style="margin: 0; font-size: 20px">الزخرفة</h2>%s<p style="margin: 0; font-size: 13px; color: %s">خط ذهبي رفيع بمعيّن في الوسط، بـ CSS فقط. يُستخدم فاصلاً للأقسام الفاخرة (الهيرو، الفوتر) ولا يُكرر في كل قسم.</p></div>'
            '<div style="display: flex; flex-direction: column; gap: 8px"><h2 style="margin: 0; font-size: 20px">الحركة</h2><p style="margin: 0; font-size: 13px; line-height: 22px; color: %s">120ms للضغط، 200ms للقوائم، 320ms لفتح النوافذ والـ Sheet. الدخول ease-standard والخروج ease-exit. نبض "مباشر" كل 1.6s، ووميض "باقي X" مرة واحدة 600ms. مع reduced-motion يبقى تحديث أرقام العداد فقط.</p></div>'
            '</section></div>%s</div>') % (C['g7'], C['mu'], s, se, t, sp, rd, sh, ornament(C['g6'], 80), C['mu'], C['mu'], riyal_section())
    OUT['Foundations.dc.html'] = doc('الهوية و Design tokens', body, 1440, 1720)

def riyal_section():
    ex = lambda cap, html: '<div style="display: flex; flex-direction: column; gap: 6px; padding: 14px; background: %s; border: 1px solid %s; border-radius: 8px"><span style="font-size: 12px; color: %s">%s</span>%s</div>' % (C['w'], C['s200'], C['mu'], cap, html)
    en = '<div dir="ltr" lang="en">%s</div>'
    cells = ''.join((
        ex('بطاقة 16px', sar(1850, 16)), ex('صفحة المنتج 24px', sar(1850, 24)), ex('حملة 36px', sar(1850, 36)),
        ex('قبل الخصم (muted، مشطوب)', sar(2200, 16, 400, C['mu'], strike=True)), ex('سالب في كشف الحساب', '<span style="font-size: 16px; font-weight: 700">%s</span>' % price_markup('\u2212150.00')),
        ex('مختصر في اللوحات', '<span style="font-size: 20px; font-weight: 700">486.2 ألف\u00a0%s</span>' % riyal()), ex('English LTR', en % sar(1850, 16, lang='en')),
        ex('على الداكن (currentColor)', '<div data-surface="inverse" style="background: %s; padding: 8px 10px; border-radius: 6px">%s</div>' % (C['b9'], sar(1387.5, 20, 700, C['s50'])))))
    return ('<section style="display: flex; flex-direction: column; gap: 14px; padding: 24px; border: 1.5px dashed %s; border-radius: 12px; background: %s">'
            '<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap"><h2 style="margin: 0; font-size: 20px">رمز الريال السعودي U+20C1</h2>%s</div>'
            '<p style="margin: 0; font-size: 14px; color: %s; max-width: 980px">المربع المتقطع في كل اللوحات <strong>ليس شكل الرمز</strong>: هو مكانه وحجمه فقط (ارتفاع 0.698em = ارتفاع الأرقام، على خط الأساس، يسار الرقم في العربي والإنجليزي، وبينهما مسافة U+00A0، بلون النص نفسه، ولا يُعكس). ملف ساما الرسمي لم يُنزّل لأن الموقع محجوب عن بيئة العمل، ولم نرسم الرمز أو ننسخه من مصدر غير رسمي. عند وصول الملف إلى docs/design/assets/riyal-sign/ يُبنى خط Souq Riyal Sign (tokens 8.4.3) ويحل محل المربع تلقائياً في المكون Price.</p>'
            '<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px">%s</div></section>') % (C['g6'], C['g50'], pill('مؤقت حتى ملف ساما الرسمي', 'warning', 'alert'), C['b7'], cells)

def components():
    def blk(t, inner, note=None):
        return ('<section style="display: flex; flex-direction: column; gap: 14px; padding: 20px; background: %s; border: 1px solid %s; border-radius: 12px">'
                '<h2 style="margin: 0; font-size: 17px; font-weight: 700">%s</h2>%s%s</section>') % (C['w'], C['s200'], t, inner,
                                                                                                     ('<p style="margin: 0; font-size: 13px; line-height: 20px; color: %s">%s</p>' % (C['mu'], note)) if note else '')
    b1 = row(btn('أضف إلى السلة', 'primary', 'md', 'bag') + btn('متابعة', 'secondary') + btn('اطلب سعرك', 'bargain', 'md', 'hand') + btn('رجوع', 'ghost') + btn('غير متاح', disabled=True) + btn('رفض', 'danger'), 10, wrap=True)
    b1 += ('<div data-surface="dark" style="display: flex; gap: 10px; flex-wrap: wrap; padding: 14px; background: %s; border-radius: 8px">%s%s%s</div>' % (C['b9'], btn('اشترِ الآن', 'gold'), btn('فاصل', 'bargain-dark', 'md', 'hand'), btn('ادخل السوق', 'ghost-dark', icon_end='chev-l')))
    b1 += row(btn('xs 36 (لوحات ديسكتوب)', 'primary', 'xs') + btn('sm 44', 'primary', 'sm') + btn('متوسط 44 (الافتراضي)', 'primary', 'md') + btn('كبير 52 (الشريط الثابت)', 'primary', 'lg'), 10, wrap=True)
    chips = row(chip('الكل', True) + chip('بشوت') + chip('المقاس: 56', rm=True) + chip('ينتهي قريباً', icon='clock') + chip('عروض الساعة', count=12), 8, wrap=True)
    chips += row(pill('مقبول', 'success', 'check') + pill('بانتظار ردك', 'warning', 'clock') + pill('مرفوض', 'danger') + pill('بانتظار العميل', 'info') + pill('مسودة') + disc(25) + live_badge(False) +
                 '<span style="padding: 6px; background: %s; border-radius: 6px">%s</span>' % (C['b9'], live_badge(True)), 8, wrap=True)
    cnt = col(row(countdown(0, 42, 18, True, 'lg') + countdown(0, 42, 18, True, 'md') + countdown(0, 42, 18, False, 'sm'), 16, wrap=True) +
              row(timer_inline('00:42:18', 'warning', label='ينتهي خلال ') + timer_inline('00:03:51', 'danger', label='ينتهي خلال ') + timer_inline('23:12:09', 'info', 'lock', 'السعر محجوز ')) +
              '<div style="max-width: 320px">%s</div><div style="max-width: 320px">%s</div>' % (stockbar(4, 20), stockbar(2, 15, urgent=True)), 14)
    forms = ('<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px">%s%s%s</div>' % (
        field('سعرك للقطعة', '1,650', suffix='ر.س', helper='السعر الحالي 1,850.00 ر.س', fid='fa', big=True),
        field('سعرك للقطعة', '400', suffix='ر.س', error='السعر أقل من الحد المسموح لطلبات هذا المنتج. جرّب 925 ر.س أو أكثر.', fid='fb', big=True),
        field('رقم الجوال', '05x xxx xxxx', prefix_icon='phone', success='تم التحقق من رقمك', fid='fc')))
    forms += row(stepper(2) + stepper(1, locked=True) + '<div style="width: 260px">%s</div>' % toggle('يقبل الفصال', True) + '<div style="width: 200px">%s</div>' % check('أسود', True, 'cx1', 24), 24, wrap=True)
    forms += row(option_chip('54') + option_chip('56', True) + option_chip('58') + option_chip('60', disabled=True) + swatch('أسود', '#1B1714', True) + swatch('بني', '#5A3D2B') + swatch('بيج', '#D8C3A0'), 8, wrap=True)
    cards = ('<div style="display: grid; grid-template-columns: 200px 200px minmax(0, 1fr) 340px; gap: 20px; align-items: start">%s%s<div style="display: flex; flex-direction: column; gap: 12px">%s%s</div><div data-surface="dark">%s</div></div>' % (
        product_card(P[0]), product_card(P[4]), deal_card_row(D[1]), deal_card_row(D[3]), deal_card_feature(D[0])))
    states = row(''.join('<div style="width: 220px; display: flex; flex-direction: column; gap: 8px">%s</div>' % x for x in [
        skel('100%', 260, 8) + skel('60%', 12) + skel('90%', 14) + skel('40%', 16),
        banner('انقطع التحديث المباشر', 'الأرقام قد لا تكون محدّثة. نحاول إعادة الاتصال…', 'warning', 'wifi-off'),
        banner('تعذّر الإرسال', 'تحقق من اتصالك وحاول مرة ثانية.', 'danger', 'alert', btn('إعادة المحاولة', 'secondary', 'sm', 'refresh')),
        banner('تم إرسال طلبك', 'وصل إلى 13 تاجراً في تصنيف البشوت.', 'success', 'check')]), 16, 'flex-start', wrap=True)
    body = ('<div style="padding: 48px 56px; display: flex; flex-direction: column; gap: 24px">'
            '<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 13px; font-weight: 600; color: %s">الأساسيات</span><h1 style="margin: 0; font-size: 32px; font-weight: 700">المكونات وحالاتها</h1></div>'
            '%s%s%s%s%s%s%s</div>') % (C['g7'],
        blk('الأزرار', col(b1, 14), 'كل الأزرار ≥ 44px على اللمس (36px مسموح في اللوحات على الديسكتوب فقط). الأساسي ink في المتجر، وداخل النطاق المعكوس يصير gold بنص ink. "اطلب سعرك / فاصل" إطار gold-500 زخرفي ونص gold-700 وأيقونة يد، ويظهر فقط عند allowBargain.'),
        blk('الشرائح والشارات', col(chips, 12), 'شارة الخصم discount (danger-700 + أبيض) والقيمة الموقّعة داخل bdi dir=ltr فتظهر −25% وليس 25%−. "الأفضل" و"سعر مقفول" بنغمة accent (gold-subtle + gold-text). الحالات دائماً نص + أيقونة + لون.'),
        blk('العدادات والكمية', cnt, 'العداد role=timer وأرقامه aria-hidden، ويُعلن نصاً مرة واحدة ("ينتهي خلال أقل من ساعة")، ويتحول للأحمر تحت 5 دقائق. شريط الكمية progressbar بقيم حقيقية.'),
        blk('الحقول والخيارات', col(forms, 16), 'حدود الحقول --input (sand-500، 4.04:1). الحقول 16px لمنع تكبير iOS. الخيار غير المتوفر بحدود متقطعة وخط على النص ونص مقروء للقارئ الشاشي.'),
        blk('حالات التركيز (focus-visible)', row(
            '<div style="display: flex; gap: 16px; align-items: center; padding: 16px; background: %s; border-radius: 8px">%s%s%s</div>' % (C['s50'],
                btn('أضف إلى السلة', 'primary', extra=' outline: 2px solid %s; outline-offset: 2px;' % C['g7']),
                '<div style="width: 200px; display: flex; align-items: center; min-height: 48px; padding: 0 14px; border: 1px solid %s; border-radius: 8px; background: %s; outline: 2px solid %s; outline-offset: 2px; font-size: 16px">1,650</div>' % (C['line'], C['w'], C['g7']),
                '<div style="width: 140px; outline: 2px solid %s; outline-offset: 2px; border-radius: 8px">%s</div>' % (C['g7'], art('oud', radius=8))) +
            '<div data-surface="inverse" style="display: flex; gap: 16px; align-items: center; padding: 16px; background: %s; border-radius: 8px">%s%s</div>' % (C['b9'],
                btn('اشترِ الآن', 'gold', extra=' outline: 2px solid %s; outline-offset: 2px;' % C['g5']), btn('فاصل', 'bargain-dark', 'md', 'hand', extra=' outline: 2px solid %s; outline-offset: 2px;' % C['g5'])), 16, wrap=True),
            'حلقة صلبة 2px بإزاحة 2px: gold-700 على الفاتح (5.54) و gold-500 داخل النطاق المعكوس (6.00). ممنوع ring-ring/50 الافتراضي في shadcn.'),
        blk('البطاقات', cards, 'بطاقة المنتج: صورة 4:5، المفضلة 44px، التاجر وتقييمه (أو ختم سوق الزل)، الاسم سطرين، السعر وقبل الخصم، ثم "أضف إلى السلة" أو "متوفر بعدة خيارات".'),
        blk('الحالات المشتركة', states, 'Skeleton بلون sand-200 ونبض خفيف يتوقف مع reduced-motion. الأخطاء تحفظ مدخلات المستخدم دائماً.'))
    OUT['Components.dc.html'] = doc('المكونات وحالاتها', body, 1440, 2300)

# ================================================================ HOME
def home_m():
    hero = ('<section aria-label="مجموعة الشتاء" data-surface="dark" style="background: %s; padding: 24px 16px 20px; display: flex; flex-direction: column; gap: 16px; flex: none">'
            '%s<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 13px; font-weight: 600; color: %s">مجموعة الشتاء</span>'
            '<h1 style="margin: 0; font-size: 28px; line-height: 40px; font-weight: 700; color: %s">بشوت مخيطة يدوياً بزري ذهبي</h1>'
            '<p style="margin: 0; font-size: 15px; line-height: 24px; color: %s">من الحساء إلى مناسبتك، بخيارات مقاس ولون وخامة.</p></div>'
            '<div style="display: flex; gap: 8px">%s%s</div>'
            '<div role="group" aria-label="الشرائح" style="display: flex; justify-content: center; gap: 0">%s</div></section>') % (
        C['b9'], art('bisht', tone='dark', ratio='16 / 11', radius=8), C['g5'], C['s50'], C['ondark'], btn('تسوّق البشوت', 'gold', 'md', href='Category-mobile.dc.html', extra=' flex: 1;'), btn('سوق الزل', 'ghost-dark', 'md', 'zap', href='Souq-mobile.dc.html'),
        ''.join('<button type="button" aria-label="الشريحة %d"%s style="width: 32px; height: 32px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center; cursor: pointer"><span style="width: %dpx; height: 6px; border-radius: 999px; background: %s"></span></button>' % (
            i + 1, ' aria-current="true"' if i == 0 else '', 20 if i == 0 else 6, C['g5'] if i == 0 else C['b5']) for i in range(4)))
    cats = ''.join('<a href="Category-mobile.dc.html" style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-decoration: none; color: %s; min-width: 0">'
                   '<span style="width: 100%%; aspect-ratio: 1 / 1; background: %s; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden">%s</span>'
                   '<span style="font-size: 12px; font-weight: 600; text-align: center; line-height: 18px">%s</span></a>' % (
        C['ink'], C['s100'], art(k, tone='sand', ratio='1 / 1', radius=8, label=n, pad=8), n) for k, n in CATS[1:9])
    strip = ('<section aria-label="سوق الزل، عروض الساعة" data-surface="dark" style="background: %s; padding: 24px 0; display: flex; flex-direction: column; gap: 14px; flex: none">'
             '<div style="padding: 0 16px; display: flex; flex-direction: column; gap: 10px">'
             '<div style="display: flex; align-items: center; justify-content: space-between">%s%s</div>'
             '<h2 style="margin: 0; font-size: 22px; line-height: 32px; font-weight: 700; color: %s">عروض الساعة</h2>'
             '<div style="display: flex; align-items: center; gap: 10px"><span style="font-size: 13px; color: %s">أقرب عرض ينتهي خلال</span>%s</div></div>'
             '<div style="display: flex; gap: 10px; overflow-x: auto; padding: 0 16px">%s</div>'
             '<div style="padding: 0 16px">%s</div></section>') % (
        C['b9'], '<span style="font-size: 13px; font-weight: 600; color: %s">سوق الزل</span>' % C['g5'], live_badge(True), C['s50'], C['ondark'], countdown(0, 18, 5, True, 'sm', holes=('{{c1.h}}', '{{c1.m}}', '{{c1.s}}')),
        deal_card_mini(D[1]) + deal_card_mini(D[0]) + deal_card_mini(D[2]), btn('ادخل السوق: 128 عرض مباشر', 'gold', 'md', icon_end='chev-l', full=True, href='Souq-mobile.dc.html'))
    grid = '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 12px">%s</div>' % ''.join(product_card(p) for p in (P[0], P[1], P[3], P[4]))
    trust = ''.join('<div style="display: flex; gap: 10px; align-items: flex-start"><span style="color: %s">%s</span><span style="display: flex; flex-direction: column"><strong style="font-size: 14px">%s</strong><span style="font-size: 13px; color: %s; line-height: 20px">%s</span></span></div>' % (
        C['g6'], ic(i, 22), a, C['mu'], b) for i, a, b in (('shield', 'دفع آمن', 'مدى، Apple Pay، البطاقات، تابي وتمارا'), ('truck', 'توصيل لكل المدن', 'رسوم ومدة واضحة لكل شحنة'),
                                                            ('seal', 'تجار موثّقون', 'كل تاجر يمر بمراجعة قبل البيع'), ('return', 'استرجاع واضح', 'حسب سياسة الاسترجاع المنشورة')))
    body = (header_m() + cat_rail() + hero +
            '<section style="padding: 28px 16px 8px; display: flex; flex-direction: column; gap: 14px">%s<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 10px">%s</div></section>' % (sec_title('تسوّق حسب التصنيف'), cats) +
            '<div style="height: 20px"></div>' + strip +
            '<section style="padding: 28px 16px; display: flex; flex-direction: column; gap: 16px">%s%s</section>' % (sec_title('الأكثر طلباً', 'عرض الكل', 'مختارات الموسم', href='Category-mobile.dc.html'), grid) +
            '<section style="margin: 0 16px; padding: 20px; background: %s; border-radius: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 12px">%s</section>' % (C['s100'], trust) +
            '<section style="margin: 24px 16px 32px; padding: 20px; border: 1px solid %s; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; background: %s">%s<h2 style="margin: 0; font-size: 18px; font-weight: 700">عندك متجر لمنتجات خليجية؟</h2><p style="margin: 0; font-size: 14px; color: %s; line-height: 22px">انضم لتجار سوق الزل، واعرض منتجاتك وعروضك، واستقبل طلبات الفصال من العملاء مباشرة.</p>%s</section>' % (
                C['g5'], C['w'], ornament(C['g5'], 32), C['mu'], btn('ابدأ البيع معنا', 'secondary', 'md', href='#')) +
            footer_m() + wa_float())
    OUT['Home-mobile.dc.html'] = doc('الرئيسية — جوال', body, 390, 4000, js=timer_js("c1: f(1085)"))

def home_d():
    hero = ('<section data-surface="dark" style="background: %s; padding: 0 32px"><div style="max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; min-height: 520px; padding: 48px 0">'
            '<div style="display: flex; flex-direction: column; gap: 20px">%s<span style="font-size: 14px; font-weight: 600; color: %s">مجموعة الشتاء</span>'
            '<h1 style="margin: 0; font-size: 44px; line-height: 60px; font-weight: 700; color: %s">بشوت مخيطة يدوياً<br>بزري ذهبي</h1>'
            '<p style="margin: 0; font-size: 17px; line-height: 28px; color: %s; max-width: 460px">من الحساء إلى مناسبتك، بخيارات مقاس ولون وخامة، وتوصيل لجميع مدن المملكة.</p>'
            '<div style="display: flex; gap: 12px">%s%s</div></div><div style="max-width: 520px; width: 100%%; justify-self: center">%s</div></div></section>') % (
        C['b9'], ornament(C['g5'], 48), C['g5'], C['s50'], C['ondark'], btn('تسوّق البشوت', 'gold', 'lg', href='Category-desktop.dc.html'), btn('ادخل سوق الزل', 'ghost-dark', 'lg', 'zap', href='Souq-desktop.dc.html'),
        art('bisht', tone='dark', ratio='5 / 4', radius=12))
    cats = ''.join('<a href="Category-desktop.dc.html" style="display: flex; flex-direction: column; align-items: center; gap: 10px; text-decoration: none; color: %s">%s<span style="font-size: 14px; font-weight: 600">%s</span></a>' % (
        C['ink'], art(k, ratio='1 / 1', radius=8, label=n), n) for k, n in CATS[1:9])
    strip = ('<section data-surface="dark" style="background: %s; padding: 40px 32px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">'
             '<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px"><div style="display: flex; flex-direction: column; gap: 6px"><div style="display: flex; gap: 10px; align-items: center"><span style="font-size: 14px; font-weight: 600; color: %s">سوق الزل</span>%s</div>'
             '<h2 style="margin: 0; font-size: 28px; font-weight: 700; color: %s">عروض الساعة</h2></div><div style="display: flex; align-items: center; gap: 12px"><span style="font-size: 14px; color: %s">أقرب عرض ينتهي خلال</span>%s%s</div></div>'
             '<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px">%s</div></div></section>') % (
        C['b9'], C['g5'], live_badge(True), C['s50'], C['ondark'], countdown(0, 18, 5, True, 'md', holes=('{{c1.h}}', '{{c1.m}}', '{{c1.s}}')), btn('ادخل السوق', 'gold', 'md', icon_end='chev-l', href='Souq-desktop.dc.html'),
        ''.join(deal_card_mini(d, w=300).replace('width: 300px; flex: none;', 'min-width: 0;') for d in (D[1], D[0], D[2], D[4])))
    grid = '<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px 24px">%s</div>' % ''.join(product_card(p, href='Product-desktop.dc.html') for p in P)
    body = (header_d() + hero +
            '<section style="padding: 56px 32px 24px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">%s<div style="display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 16px">%s</div></div></section>' % (sec_title('تسوّق حسب التصنيف', size=24), cats) +
            '<div style="height: 32px"></div>' + strip +
            '<section style="padding: 56px 32px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px">%s%s</div></section>' % (sec_title('الأكثر طلباً', 'عرض كل المنتجات', 'مختارات الموسم', size=24), grid) +
            '<section style="padding: 0 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr; gap: 24px">'
            '<div style="padding: 32px; background: %s; border-radius: 12px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px">%s</div>'
            '<div style="padding: 28px; border: 1px solid %s; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; background: %s"><h2 style="margin: 0; font-size: 20px">عندك متجر لمنتجات خليجية؟</h2><p style="margin: 0; font-size: 14px; color: %s">انضم لتجار سوق الزل واستقبل طلبات الفصال مباشرة.</p>%s</div></div></section>' % (
                C['s100'], ''.join('<div style="display: flex; flex-direction: column; gap: 6px"><span style="color: %s">%s</span><strong style="font-size: 15px">%s</strong><span style="font-size: 13px; color: %s">%s</span></div>' % (C['g6'], ic(i, 24), a, C['mu'], b) for i, a, b in (
                    ('shield', 'دفع آمن', 'مدى، Apple Pay، البطاقات، تابي وتمارا'), ('truck', 'توصيل لكل المدن', 'رسوم ومدة واضحة لكل شحنة'), ('seal', 'تجار موثّقون', 'مراجعة قبل البيع'), ('return', 'استرجاع واضح', 'حسب السياسة المنشورة'))),
                C['g5'], C['w'], C['mu'], btn('ابدأ البيع معنا', 'secondary', href='#')) +
            footer_d() + wa_float(32))
    OUT['Home-desktop.dc.html'] = doc('الرئيسية — ديسكتوب', body, 1440, 2900, fluid=True, js=timer_js("c1: f(1085)"))

def home_states():
    load = header_m(search=False) + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px">%s%s%s<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div></div>' % (
        skel('100%', 44, 8), skel('100%', 260, 8), row(''.join(skel('72px', 72, 8) for _ in range(4)), 10), ''.join(col(skel('100%', 210, 8) + skel('80%', 12) + skel('50%', 16), 8) for _ in range(4)))
    empty = header_m(search=False) + cat_rail() + '<section data-surface="dark" style="background: %s; padding: 8px 0">%s</section>' % (C['b9'], state_panel('لا توجد عروض ساعة الآن', 'أقرب عرض يبدأ الساعة 9:00 م. فعّل التنبيه ونرسل لك أول ما يبدأ.', 'clock', btn('نبّهني عند البدء', 'gold', 'md', 'bell', True), dark=True)) + \
        '<p style="margin: 16px; font-size: 13px; color: %s">إذا كان قسم من HomeSection فارغاً (تصنيف بلا منتجات منشورة) يُخفى بالكامل من الرئيسية. قسم سوق الزل وحده يبقى ظاهراً بحالة "لا عروض الآن" لأنه بوابة السوق.</p>' % C['mu']
    err = header_m(search=False) + state_panel('تعذّر تحميل الصفحة', 'صار خلل مؤقت عندنا. جرّب تحدّث الصفحة، وإذا استمر تواصل معنا.', 'alert', btn('إعادة المحاولة', 'primary', 'md', 'refresh', True) + btn('تواصل عبر واتساب', 'secondary', 'md', 'msg', True), 'danger',
                                                   '<p style="margin: 8px 0 0; font-size: 12px; color: %s">رمز الخطأ: <bdi>500-HOME</bdi></p>' % C['mu'])
    off = header_m(search=False) + '<div style="padding: 16px">%s</div>' % banner('أنت غير متصل بالإنترنت', 'نعرض لك آخر نسخة محفوظة. الأسعار والعروض قد تكون تغيّرت.', 'warning', 'wifi-off', btn('إعادة الاتصال', 'secondary', 'sm', 'refresh')) + \
        '<div style="padding: 0 16px 8px">%s</div><div style="padding: 0 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div>' % (pill('نسخة محفوظة · آخر تحديث قبل 12 د', 'neutral', 'clock'), ''.join(product_card(p, cta=False) for p in (P[0], P[1])))
    panels = phone_panel('تحميل (Skeleton)', load, kind='تحميل') + phone_panel('فارغ: لا عروض ساعة', empty, kind='فارغ') + phone_panel('خطأ في الخادم', err, kind='خطأ') + phone_panel('انقطاع الاتصال / مهلة الطلب', off, kind='مهلة')
    body = '<div style="padding: 40px; display: flex; gap: 40px">%s</div>' % panels
    OUT['Home-states.dc.html'] = doc('الرئيسية — الحالات', body, 1760, 880)

# ============================================================ CATEGORY
def filters_block(dense=False):
    sec = lambda t, inner, open_=True: ('<section style="display: flex; flex-direction: column; gap: 8px; padding: 14px 0; border-bottom: 1px solid %s">'
                                         '<button type="button" aria-expanded="%s" style="display: flex; align-items: center; justify-content: space-between; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 15px; font-weight: 700; color: %s; cursor: pointer">%s%s</button>%s</section>') % (
        C['s200'], 'true' if open_ else 'false', C['ink'], t, ic('chev-u' if open_ else 'chev-d', 18, C['mu']), inner if open_ else '')
    price = ('<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">%s%s</div>' % (field('من', '1,000', suffix='ر.س', fid='pmin'), field('إلى', '3,000', suffix='ر.س', fid='pmax')))
    price += ('<div aria-hidden="true" style="position: relative; height: 24px; margin: 4px 10px"><div style="position: absolute; top: 10px; inset-inline: 0; height: 4px; background: %s; border-radius: 999px"></div>'
              '<div style="position: absolute; top: 10px; inset-inline-start: 18%%; inset-inline-end: 40%%; height: 4px; background: %s; border-radius: 999px"></div>'
              '<span style="position: absolute; top: 2px; inset-inline-start: calc(18%% - 10px); width: 20px; height: 20px; border-radius: 50%%; background: %s; border: 2px solid %s"></span>'
              '<span style="position: absolute; top: 2px; inset-inline-end: calc(40%% - 10px); width: 20px; height: 20px; border-radius: 50%%; background: %s; border: 2px solid %s"></span></div>') % (C['s200'], C['ink'], C['w'], C['ink'], C['w'], C['ink'])
    sizes = row(''.join(option_chip(s, s in ('56', '58')) for s in ('50', '52', '54', '56', '58', '60', '62')), 8, wrap=True)
    colors = row(swatch('أسود', '#1B1714', True) + swatch('بني', '#5A3D2B') + swatch('كحلي', '#1F2A44') + swatch('بيج', '#D8C3A0') + swatch('رمادي', '#7A7570'), 6, wrap=True)
    vend = col(check('سوق الزل', True, 'v1', 18) + check('دار المثال', False, 'v2', 11) + check('فراء التجربة', False, 'v3', 6) + '<a href="#" style="min-height: 44px; display: inline-flex; align-items: center; font-size: 14px; font-weight: 600; color: %s">عرض 9 تجار آخرين</a>' % C['g7'], 0)
    mat = col(check('صوف إنجليزي', True, 'm1', 14) + check('صوف ياباني', False, 'm2', 9) + check('مرعز', False, 'm3', 4), 0)
    other = col(toggle('يقبل الفصال', True, 'منتجات تقدر تطلب عليها سعرك') + toggle('عليه خصم') + toggle('متوفر فقط', True), 0)
    return sec('السعر', price) + sec('المقاس', sizes) + sec('اللون', colors) + sec('الخامة', mat) + sec('التاجر', vend) + sec('خيارات أخرى', other) + sec('نسبة الخصم', '', False)

def cat_m():
    sub = row(''.join(chip(n, i == 0) for i, n in enumerate(['الكل', 'حساوي', 'ملكي', 'شتوي', 'صيفي', 'أطفال'])), 8, extra=' overflow-x: auto; padding: 0 16px')
    tools = ('<div style="position: sticky; top: 0; z-index: 3; background: %s; border-bottom: 1px solid %s; padding: 8px 16px; display: flex; gap: 8px">'
             '<a href="Category-filters-mobile.dc.html" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: 1px solid %s; border-radius: 8px; color: %s; font-size: 14px; font-weight: 600; text-decoration: none">%sتصفية <span style="min-width: 22px; height: 22px; border-radius: 999px; background: %s; color: %s; font-size: 12px; display: inline-flex; align-items: center; justify-content: center">%s</span></a>'
             '<button type="button" aria-haspopup="listbox" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: 1px solid %s; border-radius: 8px; background: %s; color: %s; font-family: inherit; font-size: 14px; font-weight: 600">%sالأكثر مبيعاً</button>'
             '<button type="button" aria-label="تبديل العرض: شبكة" style="width: 44px; height: 44px; border: 1px solid %s; border-radius: 8px; background: %s; display: inline-flex; align-items: center; justify-content: center; color: %s">%s</button></div>') % (
        C['s50'], C['s200'], C['line'], C['ink'], ic('sliders', 18), C['ink'], C['s50'], num(4), C['line'], C['w'], C['ink'], ic('sort', 18), C['line'], C['w'], C['ink'], ic('grid', 18))
    active = row(chip('1,000–3,000 ر.س', rm=True, h=36) + chip('المقاس: 56، 58', rm=True, h=36) + chip('أسود', rm=True, h=36) + chip('يقبل الفصال', rm=True, h=36) +
                 '<button type="button" style="min-height: 36px; padding: 0 8px; border: 0; background: transparent; color: %s; font-family: inherit; font-size: 13px; font-weight: 600; text-decoration: underline; flex: none">مسح الكل</button>' % C['g7'], 8, extra=' overflow-x: auto; padding: 0 16px')
    items = [P[0], P[1], dict(P[0], name='بشت حساوي — شغل مكينة فاخر', price=1150, was=None, vendor='دار المثال', platform=False, r=4.5, n=64),
             dict(P[1], name='بشت ملكي — زري فضي', price=2900, vendor='سوق الزل', platform=True, bargain=False), dict(P[0], name='بشت صيفي خفيف — كتان', price=980, was=1150, vendor='فراء التجربة', platform=False, r=4.6), P[1]]
    grid = '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 12px; padding: 0 16px">%s</div>' % ''.join(product_card(p) for p in items)
    more = ('<div style="padding: 24px 16px 40px; display: flex; flex-direction: column; align-items: center; gap: 10px"><p style="margin: 0; font-size: 13px; color: %s">عرضنا %s من %s منتج</p>'
            '<div aria-hidden="true" style="width: 160px; height: 4px; background: %s; border-radius: 999px"><div style="width: 25%%; height: 100%%; background: %s; border-radius: 999px"></div></div>%s</div>') % (
        C['mu'], num(12), num(48), C['s200'], C['ink'], btn('عرض المزيد', 'secondary', 'md', full=True))
    body = (header_m() + '<div style="padding: 12px 16px 0">%s</div>' % breadcrumbs(['الرئيسية', 'البشوت']) +
            '<div style="padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 26px; line-height: 38px; font-weight: 700">البشوت</h1><p style="margin: 0; font-size: 14px; color: %s">%s منتج من سوق الزل و%s تجار موثّقين</p></div>' % (C['mu'], num(48), num(12)) +
            sub + '<div style="height: 12px"></div>' + tools + '<div style="height: 12px"></div>' + active + '<div style="height: 16px"></div>' + grid + more + footer_m() + wa_float())
    OUT['Category-mobile.dc.html'] = doc('التصنيف — جوال', body, 390, 3000)

def cat_filters_m():
    dim = header_m(search=False) + '<div style="flex: 1; background: %s"></div>' % C['s100']
    sheet = ('<div role="dialog" aria-modal="true" aria-labelledby="ft" style="position: absolute; inset-inline: 0; bottom: 0; top: 40px; background: %s; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; box-shadow: 0 -6px 20px rgba(22,18,14,.18)">'
             '<div style="display: flex; justify-content: center; padding: 8px 0 0"><span aria-hidden="true" style="width: 40px; height: 4px; border-radius: 999px; background: %s"></span></div>'
             '<div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 4px 16px; border-bottom: 1px solid %s"><h2 id="ft" style="margin: 0; font-size: 18px; font-weight: 700">تصفية النتائج</h2>%s</div>'
             '<div style="flex: 1; overflow-y: auto; padding: 0 16px">%s</div>'
             '<div style="display: flex; gap: 10px; padding: 12px 16px 20px; border-top: 1px solid %s; background: %s">%s%s</div></div>') % (
        C['s50'], C['line'], C['s200'], icbtn('x', 'إغلاق التصفية'), filters_block(), C['s200'], C['w'], btn('مسح', 'secondary', 'lg', extra=' flex: 1;'), btn('اعرض 23 منتج', 'primary', 'lg', extra=' flex: 2;'))
    body = dim + '<div aria-hidden="true" style="position: absolute; inset: 0; background: %s"></div>' % C['scrim'] + sheet
    OUT['Category-filters-mobile.dc.html'] = doc('فلاتر التصنيف — جوال', body, 390, 1640)

def cat_d():
    items = [P[0], P[1], dict(P[0], name='بشت حساوي — شغل مكينة فاخر', price=1150, was=None, vendor='دار المثال', platform=False, r=4.5, n=64),
             dict(P[1], name='بشت ملكي — زري فضي', price=2900, vendor='سوق الزل', platform=True, bargain=False), dict(P[0], name='بشت صيفي خفيف — كتان', price=980, was=1150, vendor='فراء التجربة', platform=False, r=4.6),
             P[1], P[0], dict(P[1], name='بشت أطفال — مقاس 36', price=690, vendor='دار المثال', platform=False, r=4.9)]
    grid = '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px 24px">%s</div>' % ''.join(product_card(p, href='Product-desktop.dc.html') for p in items[:6])
    pages = row(''.join('<a href="#"%s style="min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid %s; background: %s; color: %s; font-weight: 600; text-decoration: none">%s</a>' % (
        ' aria-current="page"' if i == 1 else '', C['ink'] if i == 1 else C['line'], C['ink'] if i == 1 else C['w'], C['s50'] if i == 1 else C['ink'], num(i)) for i in (1, 2, 3, 4)) + btn('التالي', 'secondary', icon_end='chev-l'), 8, justify='center')
    body = header_d('bisht') + (
            '<main style="padding: 24px 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">%s'
            '<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px"><div style="display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 32px; font-weight: 700">البشوت</h1><p style="margin: 0; color: %s">%s منتج من سوق الزل و%s تجار موثّقين</p></div>'
            '<div style="display: flex; align-items: center; gap: 10px"><span style="font-size: 14px; color: %s">ترتيب حسب</span><div style="width: 220px">%s</div></div></div>'
            '<div style="display: flex; gap: 8px; flex-wrap: wrap">%s</div>'
            '<div style="display: flex; gap: 32px; align-items: flex-start"><aside aria-label="التصفية" style="width: 280px; flex: none; position: sticky; top: 16px"><div style="display: flex; align-items: center; justify-content: space-between"><h2 style="margin: 0; font-size: 18px">التصفية</h2><button type="button" style="min-height: 44px; border: 0; background: transparent; color: %s; font-family: inherit; font-size: 14px; font-weight: 600; text-decoration: underline">مسح الكل</button></div>%s</aside>'
            '<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px"><div style="display: flex; gap: 8px; flex-wrap: wrap">%s</div>%s%s</div></div></div></main>') % (
        breadcrumbs(['الرئيسية', 'البشوت']), C['mu'], num(48), num(12), C['mu'], select(None, 'الأكثر مبيعاً', 'sortd'),
        ''.join(chip(n, i == 0) for i, n in enumerate(['الكل', 'حساوي', 'ملكي', 'شتوي', 'صيفي', 'أطفال'])), C['g7'], filters_block(),
        chip('1,000–3,000 ر.س', rm=True, h=36) + chip('المقاس: 56، 58', rm=True, h=36) + chip('أسود', rm=True, h=36) + chip('يقبل الفصال', rm=True, h=36), grid, pages) + footer_d()
    OUT['Category-desktop.dc.html'] = doc('التصنيف — ديسكتوب', body, 1440, 2200, fluid=True)

def cat_states():
    base = header_m(search=False) + '<div style="padding: 12px 16px; display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 24px">البشوت</h1></div>'
    load = base + '<div style="padding: 0 16px; display: flex; flex-direction: column; gap: 16px">%s<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div></div>' % (
        row(skel('50%', 44, 8) + skel('50%', 44, 8), 8), ''.join(col(skel('100%', 210, 8) + skel('80%', 12) + skel('50%', 16) + skel('100%', 44, 8), 8) for _ in range(4)))
    empty = base + '<div style="padding: 0 16px">%s</div>' % row(chip('1,000–1,200 ر.س', rm=True, h=36) + chip('المقاس: 62', rm=True, h=36) + chip('كحلي', rm=True, h=36), 8, wrap=True) + state_panel(
        'ما فيه منتجات تطابق اختيارك', 'جرّب تشيل فلتر أو أكثر، أو اطلب المنتج بسعرك من التجار مباشرة.', 'search',
        btn('إزالة كل الفلاتر', 'primary', 'md', full=True) + btn('اطلب منتج بسعرك', 'bargain', 'md', 'hand', True, href='Souq-mobile.dc.html'))
    err = base + state_panel('تعذّر تحميل المنتجات', 'فلاترك محفوظة. حدّث الصفحة لإعادة المحاولة.', 'alert', btn('إعادة المحاولة', 'primary', 'md', 'refresh', True), 'danger')
    tmo = base + '<div style="padding: 0 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div>' % ''.join(product_card(p, cta=False) for p in (P[0], P[1])) + \
        '<div style="padding: 20px 16px">%s</div>' % banner('تأخر تحميل المزيد', 'الاتصال بطيء. المنتجات الظاهرة محدّثة، ونقدر نحاول تحميل الباقي.', 'warning', 'clock', btn('حاول مرة ثانية', 'secondary', 'sm', 'refresh'))
    body = '<div style="padding: 40px; display: flex; gap: 40px">%s</div>' % (phone_panel('تحميل', load, kind='تحميل') + phone_panel('فارغ: لا نتائج للفلاتر', empty, kind='فارغ') + phone_panel('خطأ', err, kind='خطأ') + phone_panel('مهلة تحميل المزيد', tmo, kind='مهلة'))
    OUT['Category-states.dc.html'] = doc('التصنيف — الحالات', body, 1760, 880)

# ============================================================== PRODUCT
def product_info(desktop=False):
    p = P[0]
    vend = ('<a href="#" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid %s; border-radius: 8px; text-decoration: none; color: %s">'
            '<span aria-hidden="true" style="width: 36px; height: 36px; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center">%s</span>'
            '<span style="display: flex; flex-direction: column; flex: 1"><span style="font-size: 14px; font-weight: 600">يُباع من سوق الزل</span><span style="font-size: 12px; color: %s">المتجر الرسمي · شحن من الرياض</span></span>%s</a>') % (
        C['s200'], C['ink'], C['ink'], C['g5'], ic('seal', 20), C['mu'], ic('chev-l', 18, C['mu']))
    head = ('<div style="display: flex; flex-direction: column; gap: 8px"><h1 style="margin: 0; font-size: %dpx; line-height: 1.45; font-weight: 700">%s</h1>'
            '<a href="#reviews" style="display: inline-flex; align-items: center; gap: 6px; min-height: 32px; text-decoration: none">%s<span style="font-size: 13px; color: %s; text-decoration: underline">38 تقييم</span></a></div>') % (
        28 if desktop else 22, p['name'], stars(4.8, None, 14), C['g7'])
    price = ('<div style="display: flex; flex-direction: column; gap: 6px"><div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap">%s%s%s</div>'
             '<span style="font-size: 12px; color: %s">السعر شامل ضريبة القيمة المضافة</span>'
             '<div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: %s; border-radius: 8px; font-size: 13px; color: %s">%s<span>أو قسّطها على 4 دفعات بقيمة <strong>%s</strong> بدون فوائد عبر تابي أو تمارا</span></div></div>') % (
        sar(1850, 26 if desktop else 24, 700), sar(2200, 15, 400, C['mu'], strike=True), disc(16), C['mu'], C['s100'], C['ink'], ic('cal', 18, C['b7']), num('462.50 ر.س'))
    opts = ('<fieldset style="border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px"><legend style="display: flex; justify-content: space-between; width: 100%%; padding: 0 0 10px; font-size: 14px; font-weight: 700">المقاس: 56 '
            '<a href="#" style="font-weight: 600; color: %s; font-size: 13px">دليل المقاسات</a></legend>%s</fieldset>') % (C['g7'], row(''.join(option_chip(s, s == '56', s == '62') for s in ('50', '52', '54', '56', '58', '60', '62')), 8, wrap=True))
    opts += ('<fieldset style="border: 0; margin: 0; padding: 0"><legend style="padding: 0 0 10px; font-size: 14px; font-weight: 700">اللون: أسود</legend>%s</fieldset>' % row(swatch('أسود', '#1B1714', True) + swatch('بني', '#5A3D2B') + swatch('كحلي', '#1F2A44') + swatch('بيج', '#D8C3A0'), 6, wrap=True))
    opts += select('الخامة', 'صوف إنجليزي خفيف', 'mat')
    stock = '<p role="status" style="margin: 0; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: %s">%sباقي 3 قطع فقط بهذا المقاس واللون</p>' % (C['wa'], ic('alert', 16))
    acts = ('<div style="display: flex; gap: 10px; align-items: stretch">%s%s</div>' % (stepper(1), btn('أضف إلى السلة', 'primary', 'lg', 'bag', extra=' flex: 1;')))
    barg = ('<div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid %s; border-radius: 8px; background: %s">'
            '<div style="display: flex; align-items: center; gap: 10px"><span style="width: 40px; height: 40px; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center; flex: none">%s</span>'
            '<div style="display: flex; flex-direction: column"><strong style="font-size: 15px">عندك سعر في بالك؟</strong><span style="font-size: 13px; color: %s; line-height: 20px">اقترح سعرك، ويتنافس صاحب المنتج و12 تاجراً في البشوت على طلبك.</span></div></div>%s</div>') % (
        C['g5'], C['w'], C['s100'], C['g7'], ic('hand', 22), C['mu'], btn('اطلب سعرك', 'bargain', 'md', 'hand', True, href='Bargain-mobile.dc.html' if not desktop else 'Bargain-desktop.dc.html'))
    ship = col(''.join('<div style="display: flex; gap: 10px; align-items: flex-start; font-size: 14px"><span style="color: %s">%s</span><span>%s</span></div>' % (C['b7'], ic(i, 20), t) for i, t in (
        ('truck', 'التوصيل إلى <strong>الرياض</strong> خلال 2–4 أيام عمل. <a href="#">غيّر المدينة</a>'), ('return', 'استرجاع خلال المدة المذكورة في <a href="#">سياسة الاسترجاع</a>'), ('shield', 'دفع آمن عبر مدى، Apple Pay، البطاقات، STC Pay'))), 10)
    return head, vend, price, opts, stock, acts, barg, ship

def accordions():
    out = ''
    for t, o, body in (('الوصف', True, 'بشت حساوي مخيط يدوياً على يد حرفيين، بزري ذهبي على الأطراف والكتف. قماش صوف إنجليزي خفيف مناسب للمناسبات المسائية. يأتي في علبة هدية مع غطاء قماشي.'),
                       ('المواصفات', False, ''), ('الشحن والاسترجاع', False, ''), ('التقييمات (38)', False, '')):
        out += ('<section style="border-bottom: 1px solid %s"><h2 style="margin: 0"><button type="button" aria-expanded="%s" style="width: 100%%; display: flex; align-items: center; justify-content: space-between; min-height: 56px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 16px; font-weight: 700; color: %s">%s%s</button></h2>%s</section>') % (
            C['s200'], 'true' if o else 'false', C['ink'], t, ic('chev-u' if o else 'chev-d', 18, C['mu']), ('<p style="margin: 0 0 16px; font-size: 15px; line-height: 26px; color: %s">%s</p>' % (C['b7'], body)) if o else '')
    return out

def product_m():
    head, vend, price, opts, stock, acts, barg, ship = product_info()
    gal = ('<div style="position: relative">%s'
           '<span style="position: absolute; bottom: 12px; inset-inline-start: 12px; padding: 2px 10px; border-radius: 999px; background: rgba(22,18,14,.72); color: %s; font-size: 12px; font-weight: 600"><bdi>1 / 5</bdi></span>'
           '<div style="position: absolute; top: 8px; inset-inline-end: 8px; display: flex; flex-direction: column; gap: 4px">%s%s</div></div>'
           '<div role="group" aria-label="صور المنتج" style="display: flex; gap: 8px; padding: 10px 16px; overflow-x: auto">%s</div>') % (
        art('bisht', radius=0), C['s50'], icbtn('heart', 'أضف إلى المفضلة', bg='rgba(251,247,240,.92)'), icbtn('share', 'مشاركة', bg='rgba(251,247,240,.92)'),
        ''.join('<button type="button" aria-label="الصورة %d"%s style="width: 60px; flex: none; padding: 0; border: %s; border-radius: 6px; background: transparent; overflow: hidden">%s</button>' % (
            i + 1, ' aria-current="true"' if i == 0 else '', ('2px solid %s' % C['ink']) if i == 0 else ('1px solid %s' % C['s200']), art(k, radius=4)) for i, k in enumerate(('bisht', 'bisht', 'bisht', 'shal', 'bisht'))))
    sticky = ('<div style="position: absolute; bottom: 0; inset-inline: 0; z-index: 6; background: %s; border-top: 1px solid %s; padding: 10px 16px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 -4px 16px rgba(22,18,14,.08)">'
              '<div style="display: flex; flex-direction: column">%s<span style="font-size: 12px; color: %s">مقاس 56 · أسود</span></div>%s</div>') % (
        C['w'], C['s200'], sar(1850, 17, 700), C['mu'], btn('أضف إلى السلة', 'primary', 'lg', 'bag', extra=' flex: 1;'))
    body = (header_m(search=False) + '<div style="padding: 8px 16px">%s</div>' % breadcrumbs(['الرئيسية', 'البشوت', 'بشت حساوي']) + gal +
            '<div style="padding: 8px 16px 24px; display: flex; flex-direction: column; gap: 20px">%s%s%s%s%s%s%s%s%s</div>' % (head, price, hr(), opts, stock, acts, barg, ship, '<div>%s</div>' % accordions()) +
            '<section style="padding: 8px 16px 32px; display: flex; flex-direction: column; gap: 16px">%s<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div></section>' % (sec_title('قد يعجبك أيضاً'), product_card(P[1]) + product_card(P[2])) +
            footer_m() + sticky + wa_float(96))
    OUT['Product-mobile.dc.html'] = doc('صفحة المنتج — جوال', body, 390, 3700)

def product_d():
    head, vend, price, opts, stock, acts, barg, ship = product_info(True)
    gal = ('<div style="display: flex; gap: 16px"><div role="group" aria-label="صور المنتج" style="display: flex; flex-direction: column; gap: 10px; width: 84px; flex: none">%s</div><div style="flex: 1; position: relative">%s<div style="position: absolute; top: 12px; inset-inline-end: 12px; display: flex; gap: 6px">%s%s</div></div></div>') % (
        ''.join('<button type="button" aria-label="الصورة %d"%s style="padding: 0; border: %s; border-radius: 6px; background: transparent; overflow: hidden">%s</button>' % (
            i + 1, ' aria-current="true"' if i == 0 else '', ('2px solid %s' % C['ink']) if i == 0 else ('1px solid %s' % C['s200']), art(k, radius=4)) for i, k in enumerate(('bisht', 'bisht', 'bisht', 'shal', 'bisht'))),
        art('bisht', radius=12), icbtn('heart', 'أضف إلى المفضلة', bg='rgba(251,247,240,.92)'), icbtn('share', 'مشاركة', bg='rgba(251,247,240,.92)'))
    info = '<div style="display: flex; flex-direction: column; gap: 22px; position: sticky; top: 16px">%s%s%s%s%s%s%s%s</div>' % (head, vend, price, opts, stock, acts, barg, ship)
    body = (header_d('bisht') + '<main style="padding: 20px 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px">%s'
            '<div style="display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 56px; align-items: start">%s%s</div>'
            '<div style="max-width: 760px">%s</div><section style="display: flex; flex-direction: column; gap: 20px">%s<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px">%s</div></section></div></main>' % (
                breadcrumbs(['الرئيسية', 'البشوت', 'بشت حساوي مخيط يدوياً']), gal, info, accordions(), sec_title('قد يعجبك أيضاً', size=22), ''.join(product_card(p, href='Product-desktop.dc.html') for p in (P[1], P[2], P[3], P[4])))) + footer_d()
    OUT['Product-desktop.dc.html'] = doc('صفحة المنتج — ديسكتوب', body, 1440, 2500, fluid=True)

def product_states():
    load = header_m(search=False) + '<div style="display: flex; flex-direction: column; gap: 14px">%s<div style="padding: 0 16px; display: flex; flex-direction: column; gap: 12px">%s%s%s%s%s</div></div>' % (
        skel('100%', 400, 0), skel('90%', 22), skel('40%', 14), skel('50%', 28), row(''.join(skel('52px', 44, 8) for _ in range(5)), 8), skel('100%', 52, 8))
    oos = header_m(search=False) + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s<h1 style="margin: 0; font-size: 20px">بشت حساوي مخيط يدوياً — زري ذهبي</h1>%s%s%s%s</div>' % (
        '<div style="height: 220px; overflow: hidden; border-radius: 8px; opacity: .7">%s</div>' % art('bisht', radius=8), sar(1850, 22), row(''.join(option_chip(s, s == '56', s in ('56', '58', '60')) for s in ('52', '54', '56', '58', '60')), 8, wrap=True),
        banner('نفد هذا المقاس', 'مقاس 56 باللون الأسود غير متوفر الحين. اختر مقاساً آخر أو نبلغك أول ما يتوفر.', 'warning', 'alert'),
        btn('نبّهني عند التوفر', 'primary', 'lg', 'bell', True) + btn('اطلب سعرك من تجار آخرين', 'bargain', 'md', 'hand', True))
    nf = header_m(search=False) + state_panel('المنتج غير متاح', 'ممكن يكون انحذف أو انتهى عرضه. هذي منتجات قريبة منه.', 'box', btn('تصفّح البشوت', 'primary', 'md', full=True), 'neutral') + \
        '<div style="padding: 0 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div>' % ''.join(product_card(p, cta=False) for p in (P[1], P[2]))
    err = header_m(search=False) + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s<h1 style="margin: 0; font-size: 20px">بشت حساوي مخيط يدوياً — زري ذهبي</h1>%s%s</div>' % (
        '<div style="height: 220px; overflow: hidden; border-radius: 8px">%s</div>' % art('bisht', radius=8), banner('ما قدرنا نضيف المنتج للسلة', 'تغيّر المخزون أثناء الإضافة. باقي قطعة واحدة بهذا المقاس، تبي تضيفها؟', 'danger', 'alert', row(btn('أضف قطعة واحدة', 'primary', 'sm') + btn('إلغاء', 'ghost', 'sm'), 8)),
        '<p style="margin: 0; font-size: 13px; color: %s">رسالة الخطأ تظهر بجانب الزر وتُعلن عبر role=alert، والكمية في الحقل لا تُمسح.</p>' % C['mu'])
    body = '<div style="padding: 40px; display: flex; gap: 40px">%s</div>' % (phone_panel('تحميل', load, kind='تحميل') + phone_panel('غير متوفر (نفد الخيار)', oos, kind='فارغ') + phone_panel('خطأ: تغيّر المخزون', err, kind='خطأ') + phone_panel('404: منتج محذوف/منتهي', nf, kind='غير موجود'))
    OUT['Product-states.dc.html'] = doc('صفحة المنتج — الحالات', body, 1760, 880)

# ======================================================= BARGAIN SHEET
def bargain_form(interactive=True, desktop=False):
    p = P[0]
    summ = ('<div style="display: flex; gap: 12px; align-items: center; padding: 12px; background: %s; border-radius: 8px"><div style="width: 56px; flex: none">%s</div>'
            '<div style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><strong style="font-size: 14px; line-height: 22px">%s</strong><span style="font-size: 13px; color: %s">مقاس 56 · أسود · صوف إنجليزي</span>'
            '<span style="font-size: 13px; color: %s">السعر الحالي %s</span></div></div>') % (C['s100'], art('bisht', radius=4), p['name'], C['mu'], C['mu'], sar(1850, 13, 600))
    price_val = '{{priceText}}' if interactive else '1,650'
    pf = ('<div style="display: flex; flex-direction: column; gap: 8px"><label for="bp" style="font-size: 14px; font-weight: 700">سعرك للقطعة</label>'
          '<div style="display: flex; align-items: center; gap: 8px; min-height: 60px; padding: 0 16px; border-radius: 8px; border: 1.5px solid %s; background: %s">'
          '<input id="bp" inputmode="numeric" dir="ltr" value="%s"%s aria-describedby="bp-d" style="flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-family: inherit; font-size: 24px; text-align: end; font-weight: 700; color: %s; font-variant-numeric: tabular-nums">'
          '<span style="font-size: 15px; color: %s; font-weight: 600">ر.س</span></div>'
          '<p id="bp-d" style="margin: 0; font-size: 13px; color: %s; line-height: 20px">أقل سعر يُقبل في طلبات هذا المنتج %s (حد عام لكل العملاء). التجار يردون عليك بالقبول أو بسعر مضاد.</p></div>') % (
        C['ink'], C['w'], price_val, ' onChange="{{onPrice}}"' if interactive else '', C['ink'], C['mu'], C['mu'], sar(925, 13, 600, C['b7']))
    quick = '<div role="group" aria-label="اقتراحات سريعة" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">'
    for i, (lab, v) in enumerate((('−5%', 1757), ('−10%', 1665), ('−15%', 1572), ('−20%', 1480))):
        handler = ' onClick="{{q%d}}"' % i if interactive else ''
        quick += ('<button type="button"%s style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; min-height: 48px; min-width: 76px; padding: 4px 12px; border-radius: 8px; border: 1px solid %s; background: %s; font-family: inherit; color: %s; cursor: pointer">'
                  '<span style="font-size: 12px; color: %s; direction: ltr">%s</span><span style="font-size: 14px; font-weight: 700"><bdi>%s</bdi></span></button>') % (handler, C['line'], C['w'], C['ink'], C['mu'], lab, fmt(v))
    quick += '</div>'
    qty = '{{qty}}' if interactive else '2'
    stp = ('<div role="group" aria-label="الكمية" style="display: inline-flex; align-items: center; border: 1px solid %s; border-radius: 8px; background: %s">'
           '<button type="button" aria-label="إنقاص الكمية"%s style="width: 44px; height: 44px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center; color: %s; cursor: pointer">%s</button>'
           '<output aria-live="polite" style="min-width: 32px; text-align: center; font-weight: 700">%s</output>'
           '<button type="button" aria-label="زيادة الكمية"%s style="width: 44px; height: 44px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center; color: %s; cursor: pointer">%s</button></div>') % (
        C['line'], C['w'], ' onClick="{{dec}}"' if interactive else '', C['ink'], ic('minus', 18), qty, ' onClick="{{inc}}"' if interactive else '', C['ink'], ic('plus', 18))
    qc = ('<div style="display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: end"><div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 13px; font-weight: 600">الكمية</span>%s</div>%s</div>') % (stp, select('مدينة التوصيل', 'الرياض', 'bc'))
    total = ('<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px dashed %s; border-radius: 8px"><span style="font-size: 14px; color: %s">إجمالي طلبك قبل الشحن</span>'
             '<span style="font-size: 18px; font-weight: 700"><bdi style="font-variant-numeric: tabular-nums">%s</bdi> ر.س</span></div>') % (C['line'], C['mu'], '{{totalText}}' if interactive else '3,300.00')
    how = ('<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px">%s</ul>' % ''.join(
        '<li style="display: flex; gap: 10px; font-size: 13px; line-height: 20px; color: %s"><span style="color: %s; flex: none">%s</span><span>%s</span></li>' % (C['b7'], C['g6'], ic(i, 18), t) for i, t in (
            ('users', 'يوصل طلبك لـ <strong>صاحب المنتج و12 تاجراً</strong> في تصنيف البشوت.'), ('eye-off', 'كل تاجر يرد بسرية؛ ما يشوف عروض غيره، وأنت تشوفها كلها جنب بعض.'),
            ('clock', 'الطلب مفتوح <strong>48 ساعة</strong>، وكل عرض له مهلة رد خاصة فيه.'), ('lock', 'إذا قبلت عرضاً نحجز لك السعر والكمية <strong>24 ساعة</strong> لتدفع.'))))
    quota = '<p style="margin: 0; font-size: 12px; color: %s; text-align: center">باقي لك <bdi>3</bdi> من <bdi>5</bdi> طلبات مفتوحة · <bdi>8</bdi> من <bdi>10</bdi> طلبات اليوم</p>' % C['mu']
    return summ, pf, quick, qc, total, how, quota

BARGAIN_JS = """class Component extends DCLogic {
renderVals() {
const s = this.state || {};
const price = s.price == null ? 1650 : s.price;
const qty = s.qty == null ? 2 : s.qty;
const fmt = (n, d) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const set = (v) => () => this.setState({ price: v });
return {
priceText: fmt(price, 0), qty: qty, totalText: fmt(price * qty, 2),
onPrice: (e) => { const v = parseInt(String(e.target.value).replace(/[^0-9]/g, ''), 10); this.setState({ price: isNaN(v) ? 0 : v }); },
inc: () => this.setState({ qty: Math.min(qty + 1, 10) }), dec: () => this.setState({ qty: Math.max(qty - 1, 1) }),
q0: set(1757), q1: set(1665), q2: set(1572), q3: set(1480)
};
}
}"""

def bargain_m():
    summ, pf, quick, qc, total, how, quota = bargain_form()
    under = header_m(search=False) + '<div style="height: 260px; overflow: hidden">%s</div>' % art('bisht', radius=0)
    sheet = ('<div role="dialog" aria-modal="true" aria-labelledby="bt" style="position: absolute; inset-inline: 0; bottom: 0; top: 64px; background: %s; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; box-shadow: 0 -6px 20px rgba(22,18,14,.18)">'
             '<div style="display: flex; justify-content: center; padding: 8px 0 0"><span aria-hidden="true" style="width: 40px; height: 4px; border-radius: 999px; background: %s"></span></div>'
             '<div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 8px 16px"><div style="display: flex; align-items: center; gap: 8px"><span style="color: %s">%s</span><h2 id="bt" style="margin: 0; font-size: 19px; font-weight: 700">اطلب سعرك</h2></div>%s</div>'
             '<div style="flex: 1; overflow-y: auto; padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 18px">%s%s%s%s%s<div style="padding: 14px; background: %s; border-radius: 8px">%s</div></div>'
             '<div style="padding: 12px 16px 20px; border-top: 1px solid %s; background: %s; display: flex; flex-direction: column; gap: 8px">%s%s</div></div>') % (
        C['s50'], C['line'], C['g7'], ic('hand', 22), icbtn('x', 'إغلاق'), summ, pf, quick, qc, total, C['s100'], how, C['s200'], C['w'], btn('أرسل الطلب للتجار', 'primary', 'lg', 'send', True), quota)
    body = under + '<div aria-hidden="true" style="position: absolute; inset: 0; background: %s"></div>' % C['scrim'] + sheet
    OUT['Bargain-mobile.dc.html'] = doc('نافذة اطلب سعرك — جوال', body, 390, 1260, js=BARGAIN_JS)

def bargain_d():
    summ, pf, quick, qc, total, how, quota = bargain_form()
    page = header_d('bisht') + '<div style="padding: 32px; max-width: 1280px; margin: 0 auto; width: 100%%; display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px">%s<div style="display: flex; flex-direction: column; gap: 16px">%s%s%s</div></div>' % (
        art('bisht', radius=12), skel('80%', 28), skel('40%', 20), skel('100%', 200, 8))
    dlg = ('<div role="dialog" aria-modal="true" aria-labelledby="btd" style="position: absolute; top: 72px; inset-inline-start: 50%%; transform: translateX(50%%); width: 720px; max-width: calc(100%% - 48px); background: %s; border-radius: 12px; box-shadow: 0 6px 20px rgba(22,18,14,.25); display: flex; flex-direction: column">'
           '<div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 12px 24px; border-bottom: 1px solid %s"><div style="display: flex; align-items: center; gap: 10px"><span style="color: %s">%s</span><h2 id="btd" style="margin: 0; font-size: 22px; font-weight: 700">اطلب سعرك</h2></div>%s</div>'
           '<div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; padding: 24px">'
           '<div style="display: flex; flex-direction: column; gap: 18px">%s%s%s%s%s</div>'
           '<div style="display: flex; flex-direction: column; gap: 14px; padding: 18px; background: %s; border-radius: 8px"><h3 style="margin: 0; font-size: 15px">كيف يمشي طلبك</h3>%s</div></div>'
           '<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px; border-top: 1px solid %s">%s<div style="display: flex; gap: 10px">%s%s</div></div></div>') % (
        C['s50'], C['s200'], C['g7'], ic('hand', 24), icbtn('x', 'إغلاق'), summ, pf, quick, qc, total, C['s100'], how, C['s200'], quota, btn('إلغاء', 'ghost', 'lg'), btn('أرسل الطلب للتجار', 'primary', 'lg', 'send'))
    body = page + '<div aria-hidden="true" style="position: absolute; inset: 0; background: %s"></div>' % C['scrim'] + dlg
    OUT['Bargain-desktop.dc.html'] = doc('نافذة اطلب سعرك — ديسكتوب', body, 1440, 1040, fluid=True, js=BARGAIN_JS)

def bargain_states():
    def sheet(inner, title='اطلب سعرك', foot=''):
        return (header_m(search=False) + '<div style="flex: 1; background: %s"></div><div aria-hidden="true" style="position: absolute; inset: 0; background: %s"></div>' % (C['s100'], C['scrim']) +
                '<div role="dialog" aria-modal="true" style="position: absolute; inset-inline: 0; bottom: 0; background: %s; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; max-height: 92%%">'
                '<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 8px 4px 16px"><h2 style="margin: 0; font-size: 18px; font-weight: 700">%s</h2>%s</div>'
                '<div style="padding: 8px 16px 20px; display: flex; flex-direction: column; gap: 16px">%s</div>%s</div>') % (C['s50'], title, icbtn('x', 'إغلاق'), inner, foot)
    otp = sheet(txt('نحتاج نتحقق من جوالك قبل ما نرسل طلبك للتجار. هذا يحمي التجار من الطلبات الوهمية.', 14, c=C['b7']) + field('رقم الجوال', '05x xxx xxxx', prefix_icon='phone', fid='o1', success='أرسلنا رمزاً من 6 أرقام') +
                '<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">رمز التحقق</span>%s<span style="font-size: 14px; color: %s; text-align: center">إعادة الإرسال بعد <bdi dir="ltr">00:42</bdi></span></div>' % (otp6('47', fid='bo'), C['mu']) +
                btn('تحقق وأرسل الطلب', 'primary', 'lg', full=True), 'تحقق من جوالك')
    low = sheet(field('سعرك للقطعة', '400', suffix='ر.س', fid='l1', big=True, error='السعر أقل من الحد المسموح لطلبات هذا المنتج. جرّب 925 ر.س أو أكثر.') +
                txt('الحد يحمي التجار من الطلبات غير الواقعية، وهو نفسه لكل العملاء. ما له علاقة بأقل سعر يقبله أي تاجر.', 13, c=C['mu']) + btn('أرسل الطلب للتجار', 'primary', 'lg', 'send', True, disabled=True))
    quota = sheet(state_panel('وصلت الحد للطلبات المفتوحة', 'عندك 5 طلبات أسعار مفتوحة. اقبل عرضاً أو ألغِ طلباً، أو انتظر لين ينتهي واحد منها.', 'clock', btn('طلباتي المفتوحة', 'primary', 'md', full=True) + btn('رجوع للمنتج', 'ghost', 'md', full=True), 'warning'), 'اطلب سعرك')
    sending = sheet('<div style="display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px 0"><span aria-hidden="true" class="pulse" style="width: 56px; height: 56px; border-radius: 50%%; border: 3px solid %s; border-top-color: %s"></span><p role="status" style="margin: 0; font-size: 15px; font-weight: 600">نرسل طلبك للتجار…</p><p style="margin: 0; font-size: 13px; color: %s">لا تقفل الصفحة. الزر معطل لمنع الإرسال المكرر.</p></div>' % (C['s200'], C['ink'], C['mu']) + btn('جارٍ الإرسال…', 'primary', 'lg', full=True, disabled=True))
    ok = sheet(state_panel('وصل طلبك لـ 13 تاجراً', 'طلب رقم <bdi>PR-10023</bdi>. نبلغك برسالة أول ما يوصلك عرض، وعادةً أول رد يوصل خلال ساعة.', 'check',
                           btn('تابع العروض', 'primary', 'md', href='Offers-mobile.dc.html', full=True) + btn('رجوع للمنتج', 'ghost', 'md', full=True), 'success', '<div style="margin-top: 6px">%s</div>' % timer_inline('47:59:12', 'info', 'clock', 'ينتهي الطلب خلال ')), 'تم الإرسال')
    # D22: auto-accept is delayed randomly 2-10 min server-side, so there is NO instant "accepted" state.
    # The submit response is identical whatever the price; an accepted offer arrives later like any other offer.
    dup = sheet(state_panel('عندك طلب مفتوح على هذا المنتج', 'طلب <bdi dir="ltr">PR-10023</bdi> ما زال مفتوحاً (طلب واحد لكل منتج). تابع عروضه من هناك.', 'hand',
                            btn('افتح الطلب', 'primary', 'md', full=True, href='Offers-mobile.dc.html') + btn('رجوع للمنتج', 'ghost', 'md', full=True), 'info'), 'اطلب سعرك')
    neterr = sheet(field('سعرك للقطعة', '1,650', suffix='ر.س', fid='n1', big=True) + banner('ما وصل طلبك', 'انقطع الاتصال قبل الإرسال. بياناتك محفوظة، جرّب مرة ثانية.', 'danger', 'wifi-off') + btn('إعادة الإرسال', 'primary', 'lg', 'refresh', True))
    panels = (phone_panel('تحقق الجوال قبل الإرسال (O9)', otp, kind='قبل الإرسال') + phone_panel('خطأ تحقق: السعر خارج النطاق', low, kind='خطأ') + phone_panel('حد الطلبات المفتوحة', quota, kind='فارغ/حد') +
              phone_panel('جارٍ الإرسال', sending, kind='تحميل') + phone_panel('خطأ شبكة / مهلة', neterr, kind='مهلة') + phone_panel('نجاح: وصل للتجار', ok, kind='نجاح') + phone_panel('طلب مفتوح موجود (O9)', dup, kind='حد'))
    body = '<div style="padding: 40px; display: grid; grid-template-columns: repeat(4, 390px); gap: 40px">%s</div>' % panels
    OUT['Bargain-states.dc.html'] = doc('نافذة اطلب سعرك — الحالات', body, 1760, 1720)

def build():
    cover(); foundations(); components()
    home_m(); home_d(); home_states()
    cat_m(); cat_filters_m(); cat_d(); cat_states()
    product_m(); product_d(); product_states()
    bargain_m(); bargain_d(); bargain_states()
    return OUT
