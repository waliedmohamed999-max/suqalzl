# -*- coding: utf-8 -*-
from lib import *

OUT = {}
TJ = "c1: f(19270), c2: f(2538), c3: f(8100), c4: f(51000), c5: f(600)"

def money_c(v, size=24, c=None):
    """Dashboard compact money: value + unit word + currency, currency always shown (tokens 8.4)."""
    return '<span style="font-size: %dpx; font-weight: 700; color: %s; white-space: nowrap">%s</span>' % (size, c or C['ink'], v)

def kpi2(label, value, delta=None, up=True, note=None, icon=None, emphasis=False):
    d = ''
    if delta:
        tone = C['su'] if up else C['da']
        d = ('<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; color: %s">%s<bdi dir="ltr">%s</bdi><span style="font-weight: 400; color: %s">%s عن الفترة السابقة</span></span>') % (
            tone, ic('trend-up' if up else 'trend-down', 16), delta, C['mu'], 'ارتفاع' if up else 'انخفاض')
    return ('<div style="display: flex; flex-direction: column; gap: 6px; padding: 16px; background: %s; border: 1px solid %s; border-radius: 8px; min-width: 0">'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 14px; color: %s">%s</span>%s</div>%s%s%s</div>') % (
        C['w'], C['g5'] if emphasis else C['s200'], C['mu'], label, ('<span style="color: %s">%s</span>' % (C['g7'], ic(icon, 20))) if icon else '', value, d,
        ('<span style="font-size: 12px; color: %s">%s</span>' % (C['mu'], note)) if note else '')

def panel(title, inner, action=None, pad=20, extra=''):
    act = ('<a href="#" style="display: inline-flex; align-items: center; gap: 4px; min-height: 44px; font-size: 14px; font-weight: 600; color: %s; text-decoration: none">%s%s</a>' % (C['g7'], action, ic('chev-l', 16))) if action else ''
    return ('<section style="display: flex; flex-direction: column; gap: 14px; padding: %dpx; background: %s; border: 1px solid %s; border-radius: 12px; min-width: 0;%s">'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><h2 style="margin: 0; font-size: 18px; font-weight: 700">%s</h2>%s</div>%s</section>') % (
        pad, C['w'], C['s200'], extra, title, act, inner)

def shell(kind, active, main, title, crumbs, period=True, extra_top=''):
    return ('<div style="display: flex; flex-wrap: wrap; flex: 1; min-height: 100%%">%s<main style="flex: 999 1 560px; min-width: 0; padding: 0 24px 40px; display: flex; flex-direction: column; gap: 20px">%s%s%s</main></div>' % (
        sidebar(kind, active), topbar(title, crumbs, period, kind), extra_top, main))

def m_top(title, kind='admin', badge='4'):
    return ('<header data-surface="inverse" style="background: %s; padding: 6px 8px; display: flex; align-items: center; gap: 4px">%s<div style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 16px; font-weight: 700; color: %s">%s</span><span style="font-size: 12px; color: %s">%s</span></div>%s</header>') % (
        C['b9'], icbtn('menu', 'القائمة', True), C['s50'], title, C['ondark'], 'لوحة الإدارة' if kind == 'admin' else 'دار المثال · لوحة التاجر', icbtn('bell', 'الإشعارات', True, badge))

# --------------------------------------------------------------- chart
def sales_chart(h=220):
    # RTL time axis: oldest at the right, newest at the left (tokens 8.1). Two series max 4.
    plat = [52, 58, 55, 63, 60, 72, 70, 78, 74, 82, 88, 86]
    vend = [30, 34, 33, 40, 44, 47, 52, 55, 61, 64, 70, 76]
    W, H, pad = 640, h, 24
    def pts(a):
        n = len(a)
        return ' '.join('%.1f,%.1f' % (W - pad - i * (W - 2 * pad - 70) / (n - 1), H - pad - v * (H - 2 * pad) / 100.0) for i, v in enumerate(a))
    grid = ''.join('<path d="M%d %.1fH%d" style="stroke: %s; stroke-width: 1"></path>' % (pad, H - pad - g * (H - 2 * pad) / 100.0, W - pad, C['s200']) for g in (0, 25, 50, 75, 100))
    lx = pad + 70 - 6
    py = H - pad - plat[-1] * (H - 2 * pad) / 100.0
    vy = H - pad - vend[-1] * (H - 2 * pad) / 100.0
    svg = ('<svg role="img" aria-label="رسم المبيعات لآخر 30 يوماً: مبيعات المنصة ومبيعات التجار، والتفاصيل في الجدول تحته" viewBox="0 0 %d %d" style="width: 100%%; height: auto; display: block">%s'
           '<polyline points="%s" style="fill: none; stroke: %s; stroke-width: 2.5; stroke-linejoin: round"></polyline>'
           '<polyline points="%s" style="fill: none; stroke: %s; stroke-width: 2.5; stroke-dasharray: 6 4; stroke-linejoin: round"></polyline>'
           '<text x="%d" y="%.1f" text-anchor="end" style="font-size: 12px; font-weight: 600; fill: %s; font-family: inherit">المنصة</text>'
           '<text x="%d" y="%.1f" text-anchor="end" style="font-size: 12px; font-weight: 600; fill: %s; font-family: inherit">التجار</text></svg>') % (
        W, H, grid, pts(plat), C['g6'], pts(vend), C['b7'], lx, py + 4, C['g7'], lx, vy + 4, C['b7'])
    axis = ('<div aria-hidden="true" style="display: flex; justify-content: space-between; font-size: 12px; color: %s; padding: 0 24px 0 94px"><span>18 أكتوبر</span><span>1 نوفمبر</span><span>اليوم</span></div>' % C['mu'])
    alt = ('<details style="font-size: 14px"><summary style="min-height: 44px; display: flex; align-items: center; cursor: pointer; font-weight: 600; color: %s">عرض البيانات كجدول</summary>%s</details>' % (
        C['b7'], table(['الأسبوع', 'المنصة (ر.س)', 'التجار (ر.س)'], [['الأسبوع 1', num('98,400'), num('61,200')], ['الأسبوع 2', num('112,900'), num('79,500')], ['الأسبوع 3', num('121,300'), num('96,800')], ['الأسبوع 4', num('132,600'), num('118,900')]], 'مبيعات آخر 4 أسابيع', 360)))
    return svg + axis + alt

def queue_row(icon, title, sub, tone_pill, btn_label):
    return ('<li style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid %s"><span style="width: 40px; height: 40px; border-radius: 8px; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center; flex: none">%s</span>'
            '<div style="display: flex; flex-direction: column; flex: 1; min-width: 0"><span style="font-size: 14px; font-weight: 600">%s</span><span style="font-size: 12px; color: %s">%s</span></div>%s%s</li>') % (
        C['s100'], C['s100'], C['b7'], ic(icon, 20), title, C['mu'], sub, tone_pill, btn(btn_label, 'secondary', 'xs'))

# ============================================================== ADMIN
def admin_main(mobile=False):
    k = [kpi2('المبيعات', money_c('486.2 ألف ر.س'), '+12%', True, None, 'chart'), kpi2('الطلبات', money_c(num('1,284')), '+8%', True, None, 'bag'),
         kpi2('متوسط السلة', money_c('378.65 ر.س'), '−3%', False, None, 'tag'), kpi2('عملاء جدد', money_c(num('312')), '+21%', True, None, 'users'),
         kpi2('عمولات المنصة', money_c('31.4 ألف ر.س'), '+10%', True, 'على قيمة المنتجات بعد الخصم', 'wallet'),
         kpi2('مستحقات التجار', '<div style="display: flex; gap: 16px"><div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">معلّق</span>%s</div><div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">متاح للتحويل</span>%s</div></div>' % (
             C['mu'], money_c('64.3 ألف ر.س', 20), C['mu'], money_c('18.9 ألف ر.س', 20, C['su'])), None, True, 'الدفعة القادمة: الأحد · 18 تاجراً', 'wallet', True)]
    kg = '<div style="display: grid; grid-template-columns: repeat(%s, minmax(0, 1fr)); gap: 12px">%s</div>' % ('2' if mobile else '3', ''.join(k))
    queue = panel('بانتظار المراجعة', '<div role="tablist" aria-label="نوع المراجعة" style="display: flex; gap: 6px; flex-wrap: wrap">%s</div><ul style="list-style: none; margin: 0; padding: 0">%s</ul>' % (
        chip('منتجات', True, count=12) + chip('تجار', count=3) + chip('عروض', count=5) + chip('تغيير آيبان', count=1) + chip('تنبيهات تواصل', count=2),
        queue_row('box', 'بشت ملكي شتوي — صوف ناعم', 'دار المثال · تعديل على الصور والوصف', pill('قيد المراجعة', 'warning', 'clock'), 'مراجعة') +
        queue_row('box', 'دهن عود هندي — 6 مل', 'عطارة العيّنة · منتج جديد', pill('قيد المراجعة', 'warning', 'clock'), 'مراجعة') +
        queue_row('zap', 'عرض ساعة: مبخرة نحاس −20%', 'مباخر النموذج · يبدأ اليوم 9:00 م', pill('بانتظار الموافقة', 'warning', 'clock'), 'مراجعة') +
        queue_row('alert', 'محاولة مشاركة رقم جوال في ملاحظة عرض', 'مشغل العيّنة · طلب PR-10019 · المحاولة الثانية', pill('تنبيه', 'danger', 'alert'), 'فتح')), 'كل الطوابير (23)')
    chart = panel('المبيعات: المنصة مقابل التجار', '<div style="display: flex; gap: 24px; flex-wrap: wrap"><div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">المنصة</span>%s</div><div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">التجار</span>%s</div></div>%s' % (
        C['mu'], money_c('265.0 ألف ر.س', 20), C['mu'], money_c('221.2 ألف ر.س', 20), sales_chart()))
    souq = panel('سوق الزل', '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div>%s' % (
        ''.join('<div style="display: flex; flex-direction: column; gap: 2px; padding: 12px; background: %s; border-radius: 8px"><span style="font-size: 12px; color: %s">%s</span><span style="font-size: 20px; font-weight: 700">%s</span></div>' % (C['s100'], C['mu'], a, b) for a, b in (
            ('طلبات فصال مفتوحة', num('34')), ('تحوّلت لمبيعات', '<bdi dir="ltr">38%</bdi>'), ('متوسط الفرق عن السعر المطلوب', '<bdi dir="ltr">+9.4%</bdi>'), ('عروض مباشرة', num('128')))),
        '<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">أسرع التجار رداً</span>%s</div>' % ''.join(
            '<div style="display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid %s"><span>%s</span><span style="color: %s">متوسط %s</span></div>' % (C['s100'], n, C['mu'], t) for n, t in (('دار المثال', '18 د'), ('مباخر النموذج', '26 د'), ('عطارة العيّنة', '41 د')))), 'مراقبة السوق')
    top = panel('أفضل التجار هذا الشهر', table(['التاجر', 'المبيعات (ر.س)', 'الطلبات', 'التقييم', 'الحالة'], [
        ['دار المثال', '<span style="display: block; text-align: end">%s</span>' % num('84,300.00'), num('212'), stars(4.8), pill('موثوق', 'accent', 'seal')],
        ['عطارة العيّنة', '<span style="display: block; text-align: end">%s</span>' % num('61,750.00'), num('305'), stars(4.7), pill('معتمد', 'success', 'check')],
        ['مباخر النموذج', '<span style="display: block; text-align: end">%s</span>' % num('39,120.00'), num('88'), stars(4.9), pill('معتمد', 'success', 'check')]], 'أفضل التجار', 520), 'كل التجار')
    stock = panel('تنبيهات المخزون', '<ul style="list-style: none; margin: 0; padding: 0">%s</ul>' % ''.join(
        '<li style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 0; border-bottom: 1px solid %s; font-size: 14px"><span>%s</span>%s</li>' % (C['s100'], n, pill(t, tone, 'alert')) for n, t, tone in (
            ('زعفران سوبر نقي — 10 جرام', 'باقي 1', 'danger'), ('عقال مرعز أسود — مقاس 58', 'باقي 3', 'warning'), ('بشت حساوي — مقاس 62 أسود', 'نفد', 'danger'))), 'كل التنبيهات')
    pay = panel('دفعة التسوية القادمة', '<p style="margin: 0; font-size: 14px; color: %s">18 تاجراً رصيدهم المتاح ≥ الحد الأدنى (100.00 ر.س). التحويل يدوي من حساب المنصة.</p>%s<div style="display: flex; gap: 8px; flex-wrap: wrap">%s%s</div>' % (
        C['mu'], money_c('18,940.00 ر.س', 24, C['su']), btn('إنشاء دفعة تسوية', 'primary', 'md', 'plus'), btn('تصدير ملف التحويل', 'secondary', 'md', 'upload')))
    if mobile:
        return '<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px">%s%s%s%s%s%s%s</div>' % (
            '<div role="group" aria-label="فترة البيانات" style="display: flex; gap: 8px; overflow-x: auto">%s</div>' % ''.join(chip(o, i == 2) for i, o in enumerate(['اليوم', '7 أيام', '30 يوم', 'هذا الشهر', 'مخصص'])),
            kg, queue, pay, chart, souq, stock)
    return ('%s<div style="display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 20px; align-items: start">%s%s</div>'
            '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; align-items: start">%s%s%s</div>%s') % (kg, chart, queue, souq, pay, stock, top)

def admin_d():
    body = shell('admin', 'home', admin_main(), 'نظرة عامة', ['الإدارة', 'الرئيسية'])
    OUT['Admin-desktop.dc.html'] = doc('لوحة الإدارة — ديسكتوب', body, 1440, 1700, fluid=True)

def admin_m():
    body = m_top('نظرة عامة') + admin_main(True)
    OUT['Admin-mobile.dc.html'] = doc('لوحة الإدارة — جوال', body, 390, 3800)

def dash_states(kind):
    top = m_top('نظرة عامة' if kind == 'admin' else 'الرئيسية', kind)
    load = top + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px"><div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div>%s%s</div>' % (
        ''.join(col(skel('60%', 12) + skel('80%', 24) + skel('50%', 12), 8, ' padding: 16px; background: %s; border: 1px solid %s; border-radius: 8px' % (C['w'], C['s200'])) for _ in range(4)), skel('100%', 240, 12), skel('100%', 200, 12))
    if kind == 'admin':
        empty = top + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s</div>' % (state_panel('لا توجد مبيعات في هذه الفترة', 'جرّب فترة أطول، أو ابدأ من قائمة الإعداد حتى يستقبل المتجر أول طلب.', 'chart', btn('عرض آخر 30 يوم', 'secondary', 'md', full=True)),
            panel('قائمة الإعداد', ''.join(check(t, d, 'ob%d' % i) for i, (t, d) in enumerate((('بيانات المتجر والسجل والرقم الضريبي', True), ('ربط Moyasar', True), ('مناطق الشحن', False), ('أول منتج منشور', False))))))
    else:
        empty = top + '<div style="padding: 16px">%s</div>' % state_panel('حسابك قيد المراجعة', 'استلمنا طلب انضمامك ووثائقك. المراجعة تأخذ عادةً يومي عمل، ونبلغك بالإيميل والجوال.', 'clock',
                                                                          btn('راجع بيانات الطلب', 'secondary', 'md', full=True), 'warning', '<div style="margin-top: 8px">%s</div>' % pill('بانتظار المراجعة', 'warning', 'clock'))
    err = top + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px"><div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div>%s</div>' % (
        kpi2('المبيعات', money_c('486.2 ألف ر.س', 20)) + kpi2('الطلبات', money_c(num('1,284'), 20)),
        panel('المبيعات', banner('تعذّر تحميل الرسم', 'باقي اللوحة تعمل. نعيد المحاولة تلقائياً بعد 30 ثانية.', 'danger', 'alert', btn('إعادة المحاولة الآن', 'secondary', 'sm', 'refresh'))))
    tmo = top + '<div style="padding: 16px">%s</div>' % state_panel('انتهت جلستك', 'سجّلنا خروجك بعد فترة بدون نشاط لحماية الحساب. أي تعديل غير محفوظ بقي في المتصفح.', 'lock', btn('سجّل الدخول مرة ثانية', 'primary', 'md', full=True, href='Login-staff-desktop.dc.html'), 'warning')
    panels = phone_panel('تحميل', load, kind='تحميل') + phone_panel('فارغ' if kind == 'admin' else 'فارغ: التاجر قيد المراجعة', empty, kind='فارغ') + phone_panel('خطأ في قسم واحد', err, kind='خطأ') + phone_panel('انتهاء الجلسة', tmo, kind='مهلة')
    if kind == 'vendor':
        susp = top + '<div style="padding: 16px">%s</div>' % banner('متجرك معلّق مؤقتاً', 'منتجاتك مخفية ولا تستقبل طلبات جديدة. الطلبات الحالية ورصيدك محفوظان. السبب: [سبب التعليق من الإدارة].', 'danger', 'alert', btn('تواصل مع الإدارة', 'secondary', 'sm', 'msg'))
        panels += phone_panel('حالة: معلّق (SUSPENDED)', susp, kind='تنبيه')
    body = '<div style="padding: 40px; display: grid; grid-template-columns: repeat(%d, 390px); gap: 40px">%s</div>' % (4 if kind == 'admin' else 5, panels)
    OUT['%s-states.dc.html' % ('Admin' if kind == 'admin' else 'Vendor')] = doc('لوحة %s — الحالات' % ('الإدارة' if kind == 'admin' else 'التاجر'), body, 1760 if kind == 'admin' else 2190, 880)

# ============================================================== VENDOR
INBOX = [
    dict(k='bisht', t='بشت حساوي مقاس 56 · أسود', typ=('من تصنيفك', 'neutral'), city='الرياض', qty=2, price=1500, timer='{{c1.all}}', flags=[('أقل من حدك الأدنى', 'warning', 'alert')], new=True, sel=True),
    dict(k='bisht', t='بشت ملكي شتوي — صوف ناعم', typ=('على منتجك', 'accent'), city='جدة', qty=1, price=2100, timer='{{c3.all}}', flags=[('سعر مضاد من العميل · جولة 2/3', 'info', 'hand')], new=True),
    dict(k='shal', t='طلب مفتوح: بشت أطفال بزري فضي', typ=('طلب مفتوح', 'info'), city='الدمام', qty=3, price=600, timer='{{c4.all}}', flags=[], new=True),
    dict(k='bisht', t='بشت صيفي خفيف — كتان', typ=('على منتجك', 'accent'), city='مكة', qty=1, price=900, timer='{{c5.all}}', flags=[('المهلة تنتهي قريباً', 'danger', 'clock')], new=False),
]

def inbox_row(r):
    bd = ('border-inline-start: 3px solid %s; background: %s;' % (C['ink'], C['w'])) if r.get('sel') else ('border-inline-start: 3px solid transparent; background: %s;' % C['w'])
    flags = ''.join(pill(a, b, c) for a, b, c in r['flags'])
    dot = ('<span aria-hidden="true" style="width: 8px; height: 8px; border-radius: 50%%; background: %s; flex: none"></span>' % C['inf']) if r['new'] else ''
    return ('<a href="#"%s style="display: flex; gap: 12px; padding: 14px 16px; text-decoration: none; color: %s; border-bottom: 1px solid %s; %s">'
            '<div style="width: 56px; flex: none">%s</div><div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0">'
            '<div style="display: flex; align-items: center; gap: 6px">%s<span style="font-size: 14px; font-weight: %d; flex: 1; min-width: 0">%s%s</span></div>'
            '<div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center">%s<span style="font-size: 12px; color: %s">%s · الكمية %s</span></div>'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 14px">يطلب %s</span>%s</div>%s</div></a>') % (
        ' aria-current="true"' if r.get('sel') else '', C['ink'], C['s200'], bd, art(r['k'], radius=4), dot, 700 if r['new'] else 400, r['t'], '<span class="sr">، جديد</span>' if r['new'] else '',
        pill(*r['typ']), C['mu'], r['city'], num(r['qty']), sar(r['price'], 14, 700), timer_inline(r['timer'], 'warning', 'clock', 'باقي '), ('<div style="display: flex; gap: 6px; flex-wrap: wrap">%s</div>' % flags) if flags else '')

INBOX_TABS = [('جديد', 3), ('بانتظار ردي', 5), ('بانتظار العميل', 4), ('مقبول', 2), ('منتهي', None)]

def inbox_tabs():
    out = '<div role="tablist" aria-label="تصفية الطلبات" style="display: flex; gap: 4px; overflow-x: auto; border-bottom: 1px solid %s; padding: 0 8px">' % C['s200']
    for i, (l, n) in enumerate(INBOX_TABS):
        on = i == 1
        out += ('<button type="button" role="tab" aria-selected="%s" style="display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 12px; border: 0; border-bottom: 2px solid %s; background: transparent; font-family: inherit; font-size: 14px; font-weight: %d; color: %s; white-space: nowrap; flex: none">%s%s</button>') % (
            'true' if on else 'false', C['ink'] if on else 'transparent', 700 if on else 400, C['ink'] if on else C['mu'], l,
            ('<span style="min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; background: %s; color: %s; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center">%s</span>' % (C['ink'] if on else C['s100'], C['s50'] if on else C['b7'], num(n))) if n else '')
    return out + '</div>'

def reply_form(compact=False):
    seg = '<div role="radiogroup" aria-label="نوع الرد" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">'
    for i, (l, icn) in enumerate((('قبول السعر', 'check'), ('سعر مضاد', 'hand'), ('اعتذار', 'x'))):
        on = i == 1
        seg += ('<button type="button" role="radio" aria-checked="%s" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px; border-radius: 8px; border: %s solid %s; background: %s; font-family: inherit; font-size: 14px; font-weight: 600; color: %s">%s%s</button>') % (
            'true' if on else 'false', '2px' if on else '1px', C['ink'] if on else C['line'], C['w'], C['ink'], ic(icn, 18), l)
    seg += '</div>'
    prod = select('منتجك المطابق', 'بشت حساوي يدوي — زري ذهبي · 1,790.00 ر.س · المخزون 4', 'mp', 'من منتجاتك المنشورة في تصنيف البشوت فقط')
    price = field('سعرك للقطعة', '1,650', suffix='ر.س', fid='vp', big=True, helper='سعر العميل 1,500.00 ر.س · حدك الأدنى 1,600.00 ر.س')
    quick = row(''.join('<button type="button" style="min-height: 44px; padding: 0 12px; border-radius: 999px; border: 1px solid %s; background: %s; font-family: inherit; font-size: 14px; color: %s">%s</button>' % (C['line'], C['w'], C['ink'], t) for t in (
        'سعر العميل', '<bdi dir="ltr">+5%</bdi> · 1,575', '<bdi dir="ltr">+10%</bdi> · 1,650', 'حدك الأدنى · 1,600')), 8, wrap=True)
    meta = '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px">%s%s%s</div>' % (
        field('الكمية', '2', fid='vq', helper='حسب الطلب · ≤ مخزونك'), field('الشحن', '35', suffix='ر.س', fid='vs'), select('مدة التوصيل', '2–3 أيام', 've'))
    note = ('<div style="display: flex; flex-direction: column; gap: 6px"><label for="vn" style="font-size: 14px; font-weight: 600">ملاحظة للعميل (اختياري)</label>'
            '<textarea id="vn" rows="3" aria-describedby="vn-d" placeholder="مثال: الخياطة يدوية والتسليم بعلبة هدية" style="border: 1px solid %s; border-radius: 8px; padding: 10px 14px; font-family: inherit; font-size: 16px; background: %s; resize: vertical"></textarea>'
            '<p id="vn-d" style="margin: 0; font-size: 12px; color: %s">ممنوع أرقام الجوال والإيميل والروابط وحسابات التواصل. الاتفاق والدفع داخل المنصة فقط.</p></div>') % (C['line'], C['w'], C['mu'])
    r = lambda a, b, s='': '<div style="display: flex; justify-content: space-between; font-size: 14px; %s"><span style="color: %s">%s</span>%s</div>' % (s, C['mu'], a, b)
    summ = ('<div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; background: %s; border-radius: 8px">%s%s%s%s</div>') % (
        C['s100'], r('إجمالي العرض للعميل', sar(3335, 16, 700)), r('العمولة التقديرية (10%)', '<span style="font-size: 14px; color: %s"><bdi dir="ltr">−330.00</bdi> ر.س</span>' % C['ink']),
        r('صافيك التقديري', sar(3005, 16, 700, C['su'])), '<p style="margin: 0; font-size: 12px; color: %s">العمولة على سعر الصفقة النهائي، ونسبتها النهائية حسب قرار O7.</p>' % C['mu'])
    commit = ('<div style="display: flex; gap: 10px; padding: 12px 14px; border: 1px solid %s; border-radius: 8px; font-size: 14px; line-height: 22px">%s<span>إذا قبل العميل، العرض ملزم لك بالسعر والكمية لمدة 24 ساعة. الإلغاء بعد الدفع يُسجل في تقييمك الداخلي.</span></div>') % (C['g5'], ic('lock', 20, C['g7']))
    return seg, prod, price, quick, meta, note, summ, commit

def reply_detail():
    seg, prod, price, quick, meta, note, summ, commit = reply_form()
    head = ('<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap"><div style="display: flex; flex-direction: column; gap: 4px">'
            '<span style="font-size: 12px; color: %s">طلب على منتج من تصنيفك · <bdi dir="ltr">PR-10023</bdi> · قبل 3 د</span><h2 style="margin: 0; font-size: 20px">بشت حساوي مقاس 56 · أسود</h2></div>'
            '<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px"><span style="font-size: 12px; color: %s">باقي على مهلة ردك</span>%s</div></div>') % (C['mu'], C['mu'], countdown(5, 21, 10, False, 'sm', 'باقي على مهلة ردك', ('{{c1.h}}', '{{c1.m}}', '{{c1.s}}')))
    req = ('<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 14px; background: %s; border: 1px solid %s; border-radius: 8px">%s</div>') % (
        C['w'], C['s200'], ''.join('<div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">%s</span><span style="font-size: 16px; font-weight: 700">%s</span></div>' % (C['mu'], a, b) for a, b in (
            ('سعر العميل للقطعة', sar(1500, 16, 700)), ('الكمية', num(2)), ('المدينة', 'الرياض'), ('سعر المنتج الأصلي', sar(1850, 16, 400, C['mu'], strike=True)))))
    floor = banner('سعر العميل أقل من حدك الأدنى', 'حدك الأدنى السري لهذا المنتج 1,600.00 ر.س. يظهر لك فقط، ولا يصل للعميل أبداً.', 'warning', 'eye-off')
    secret = '<p style="margin: 0; display: flex; gap: 8px; align-items: center; font-size: 12px; color: %s">%sعروض التجار الآخرين لا تظهر لك، وعرضك لا يظهر لهم.</p>' % (C['mu'], ic('eye-off', 16))
    acts = row(btn('أرسل العرض للعميل', 'primary', 'lg', 'send', extra=' flex: 1;') + btn('إلغاء', 'ghost', 'lg'), 10)
    return '<div style="display: flex; flex-direction: column; gap: 16px">%s%s%s%s%s%s%s%s%s%s%s%s%s</div>' % (head, req, floor, seg, prod, price, quick, meta, note, summ, commit, acts, secret)

def inbox_d():
    lst = ('<section aria-label="قائمة الطلبات" style="flex: 0 1 400px; min-width: 320px; background: %s; border: 1px solid %s; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column">%s'
           '<div style="display: flex; gap: 8px; padding: 10px 16px; border-bottom: 1px solid %s">%s%s</div>%s</section>') % (
        C['w'], C['s200'], inbox_tabs(), C['s200'], chip('على منتجاتي', icon='box'), chip('ينتهي قريباً', icon='clock'), ''.join(inbox_row(r) for r in INBOX))
    det = '<section aria-label="تفاصيل الطلب والرد" style="flex: 1 1 520px; min-width: 0; padding: 24px; background: %s; border: 1px solid %s; border-radius: 12px">%s</section>' % (C['s50'], C['s200'], reply_detail())
    extra = ('<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">%s<span style="font-size: 14px; color: %s">صندوق وارد لحظي · الطلبات من تصنيفاتك المسموحة فقط</span>'
             '<span style="margin-inline-start: auto">%s</span></div>') % (live_badge(False), C['mu'], btn('إعدادات الفصال', 'secondary', 'xs', 'gear', href='VendorBargainSettings-desktop.dc.html'))
    body = shell('vendor', 'requests', '<div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap">%s%s</div>' % (lst, det), 'طلبات الأسعار', ['لوحة التاجر', 'طلبات الأسعار'], False, extra)
    OUT['VendorInbox-desktop.dc.html'] = doc('صندوق طلبات الأسعار — ديسكتوب', body, 1440, 1560, fluid=True, js=timer_js(TJ))

def inbox_m():
    body = m_top('طلبات الأسعار', 'vendor', '5') + '<div style="padding: 10px 16px; display: flex; align-items: center; gap: 8px">%s<span style="font-size: 12px; color: %s">يتحدث لحظياً</span></div>' % (live_badge(False), C['mu']) + \
        inbox_tabs() + ''.join(inbox_row(dict(r, sel=False)) for r in INBOX).replace('href="#"', 'href="VendorReply-mobile.dc.html"', 4)
    OUT['VendorInbox-mobile.dc.html'] = doc('صندوق طلبات الأسعار — جوال', body, 390, 1200, js=timer_js(TJ))

def reply_m():
    seg, prod, price, quick, meta, note, summ, commit = reply_form(True)
    meta = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">%s%s</div>%s' % (field('الكمية', '2', fid='vqm', helper='≤ مخزونك'), field('الشحن', '35', suffix='ر.س', fid='vsm'), select('مدة التوصيل', '2–3 أيام', 'vem'))
    sheet = ('<div role="dialog" aria-modal="true" aria-labelledby="vr" style="position: absolute; inset-inline: 0; bottom: 0; top: 48px; background: %s; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; box-shadow: 0 12px 32px rgba(22,18,14,.16)">'
             '<div style="display: flex; justify-content: center; padding: 8px 0 0"><span aria-hidden="true" style="width: 40px; height: 4px; border-radius: 999px; background: %s"></span></div>'
             '<div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 4px 16px"><div style="display: flex; flex-direction: column"><h2 id="vr" style="margin: 0; font-size: 18px">رد سريع</h2><span style="font-size: 12px; color: %s">بشت حساوي مقاس 56 · يطلب 1,500.00 ر.س × 2</span></div>%s</div>'
             '<div style="padding: 0 16px 8px; display: flex; align-items: center; justify-content: space-between"><span style="font-size: 14px; color: %s">باقي على مهلة ردك</span>%s</div>'
             '<div style="flex: 1; overflow-y: auto; padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 16px">%s%s%s%s%s%s%s%s</div>'
             '<div style="padding: 12px 16px 20px; border-top: 1px solid %s; background: %s">%s</div></div>') % (
        C['s50'], C['line'], C['mu'], icbtn('x', 'إغلاق'), C['mu'], timer_inline('{{c1.all}}', 'warning', 'clock'),
        banner('أقل من حدك الأدنى', 'حدك السري 1,600.00 ر.س. يظهر لك فقط.', 'warning', 'eye-off'), seg, prod, price, quick, meta, summ, commit, C['s200'], C['w'], btn('أرسل العرض · 3,335.00 ر.س', 'primary', 'lg', 'send', True))
    body = m_top('طلبات الأسعار', 'vendor', '5') + '<div style="flex: 1; background: %s"></div>' % C['s100'] + '<div aria-hidden="true" style="position: absolute; inset: 0; background: %s"></div>' % C['scrim'] + sheet
    OUT['VendorReply-mobile.dc.html'] = doc('الرد السريع على طلب سعر — جوال', body, 390, 1640, js=timer_js(TJ))

def inbox_states():
    top = m_top('طلبات الأسعار', 'vendor', '5')
    load = top + inbox_tabs() + ''.join(row(skel('56px', 70, 4) + col(skel('80%', 14) + skel('50%', 12) + skel('60%', 14), 8, ' flex: 1'), 12, 'flex-start', extra=' padding: 14px 16px; border-bottom: 1px solid %s' % C['s200']) for _ in range(4))
    empty = top + inbox_tabs() + state_panel('ما فيه طلبات تنتظر ردك', 'نبلغك لحظياً أول ما يوصل طلب سعر في تصنيفاتك (البشوت، الفراوي). تقدر تتحكم بالتنبيهات من الإعدادات.', 'inbox', btn('إعدادات التنبيهات', 'secondary', 'md', 'bell', True))
    closed = top + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s%s</div>' % (
        banner('أُغلق الطلب لصالح تاجر آخر', 'العميل قبل عرضاً آخر، فانتهى عرضك تلقائياً. ما يُحسب عليك أي شيء.', 'neutral' if False else 'info', 'info'), inbox_row(dict(INBOX[0], new=False, sel=False, flags=[('مغلق', 'neutral', 'minus')], timer='00:00:00')))
    expired = top + '<div style="padding: 16px">%s</div>' % state_panel('انتهت مهلة الرد', 'مرّت 24 ساعة بدون رد على هذا الطلب، فسجلناه "تجاهل". الرد السريع يرفع ترتيبك وشارة "أسرع رد".', 'clock', btn('رجوع للصندوق', 'primary', 'md', full=True), 'warning')
    blocked = top + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s%s</div>' % (
        '<div style="display: flex; flex-direction: column; gap: 6px"><label for="bn" style="font-size: 14px; font-weight: 600">ملاحظة للعميل</label><textarea id="bn" rows="3" aria-invalid="true" aria-describedby="bn-d" style="border: 1px solid %s; box-shadow: 0 0 0 1px %s; border-radius: 8px; padding: 10px 14px; font-family: inherit; font-size: 16px; background: %s">كلمني على ٠٥٥١٢٣٤٥٦٧ ونتفق</textarea>'
        '<p id="bn-d" style="margin: 0; display: flex; gap: 6px; font-size: 14px; color: %s">%s<span>الملاحظة فيها رقم جوال. احذفه للمتابعة؛ كل التواصل والدفع داخل المنصة.</span></p></div>' % (C['da'], C['da'], C['w'], C['da'], ic('alert', 16)),
        '<p style="margin: 0; font-size: 12px; color: %s">المحاولات المتكررة تُبلّغ للإدارة. الزر معطل حتى تُصحح الملاحظة.</p>%s' % (C['mu'], btn('أرسل العرض', 'primary', 'lg', 'send', True, disabled=True)))
    fail = top + '<div style="padding: 16px">%s</div>' % banner('ما وصل عرضك', 'انقطع الاتصال أثناء الإرسال. بيانات العرض محفوظة، أعد الإرسال قبل انتهاء المهلة.', 'danger', 'wifi-off', btn('إعادة الإرسال', 'secondary', 'sm', 'refresh'))
    panels = (phone_panel('تحميل', load, kind='تحميل') + phone_panel('فارغ', empty, kind='فارغ') + phone_panel('مغلق لصالح تاجر آخر', closed, kind='تنبيه') + phone_panel('انتهاء مهلة الرد', expired, kind='مهلة') +
              phone_panel('خطأ: فلتر وسائل التواصل', blocked, kind='خطأ') + phone_panel('خطأ: فشل الإرسال', fail, kind='خطأ'))
    body = '<div style="padding: 40px; display: grid; grid-template-columns: repeat(3, 390px); gap: 40px">%s</div>' % panels
    OUT['VendorInbox-states.dc.html'] = doc('صندوق طلبات الأسعار — الحالات', body, 1330, 1720)

def vendor_main(mobile=False):
    chk = ('<section style="display: flex; flex-direction: column; gap: 12px; padding: 18px; background: %s; border: 1px solid %s; border-radius: 12px"><div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><h2 style="margin: 0; font-size: 18px">أكمل إعداد متجرك</h2>'
           '<span style="font-size: 14px; color: %s"><bdi dir="ltr">4/6</bdi> خطوات</span></div><div role="progressbar" aria-label="تقدم الإعداد" aria-valuemin="0" aria-valuemax="6" aria-valuenow="4" style="height: 6px; background: %s; border-radius: 999px"><div style="width: 66%%; height: 100%%; background: %s; border-radius: 999px"></div></div>'
           '<div style="display: grid; grid-template-columns: repeat(%s, minmax(0, 1fr)); gap: 0 16px">%s</div></section>') % (
        C['w'], C['g5'], C['mu'], C['s200'], C['b7'], '1' if mobile else '3', ''.join(check(t, d, 'vo%d' % i) for i, (t, d) in enumerate((
            ('الشعار والغلاف', True), ('الحساب البنكي (آيبان)', True), ('أول منتج منشور', True), ('إعدادات الشحن', True), ('إعدادات الفصال لمنتجاتك', False), ('أول عرض في سوق الزل', False)))))
    bal = ('<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">%s</div><p style="margin: 0; font-size: 12px; color: %s">المعلّق يصير متاحاً بعد 7 أيام من التسليم بدون استرجاع. التحويل يدوي من الإدارة كل أسبوع.</p>') % (
        ''.join('<div style="display: flex; flex-direction: column; gap: 2px"><span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: %s">%s</span>%s</div>' % (C['mu'], a, money_c(b, 20, c)) for a, b, c in (
            ('معلّق', '12,480.00 ر.س', None), ('متاح', '3,920.00 ر.س', C['su']), ('محوّل', '41,300.00 ر.س', None))), C['mu'])
    k = [kpi2('مبيعات الشهر', money_c('28.7 ألف ر.س'), '+15%', True, None, 'chart'), kpi2('طلبات تحتاج تجهيز', money_c(num('6')), None, True, 'أقدمها منذ 9 ساعات', 'bag'),
         kpi2('التقييم وسرعة الرد', '<div style="display: flex; gap: 16px; align-items: baseline">%s<span style="font-size: 14px; color: %s">متوسط الرد 18 د</span></div>' % (stars(4.8, 212, 18), C['mu']), None, True, None, 'star')]
    kg = '<div style="display: grid; grid-template-columns: repeat(%s, minmax(0, 1fr)); gap: 12px">%s%s</div>' % ('1' if mobile else '4', ''.join(k), '<div style="%s">%s</div>' % ('' if mobile else '', kpi2('رصيدك', bal, None, True, None, 'wallet', True)))
    reqs = panel('طلبات أسعار تنتظر ردك (5)', ''.join(inbox_row(dict(r, sel=False)) for r in INBOX[:3]), 'افتح الصندوق', 0, ' padding-top: 16px;').replace('padding: 0px;', 'padding: 16px 0 0;').replace('<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><h2', '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 16px"><h2', 1)
    orders = panel('طلبات تحتاج تجهيز', table(['رقم الطلب', 'المنتجات', 'المدينة', 'الحالة', 'منذ', ''], [
        [num('SZ-100231-2'), 'بشت ملكي × 1', 'جدة', pill('جديد', 'info'), '9 س', btn('ابدأ التجهيز', 'secondary', 'xs')],
        [num('SZ-100228-3'), 'بشت حساوي × 2', 'الرياض', pill('قيد التجهيز', 'accent', 'sparkle' if False else 'box'), '1 يوم', btn('جاهز للشحن', 'secondary', 'xs')],
        [num('SZ-100219-1'), 'بشت صيفي × 1', 'الدمام', pill('جاهز للشحن', 'accent', 'box'), '1 يوم', btn('أدخل رقم التتبع', 'secondary', 'xs')]], 'طلبات تحتاج تجهيز', 560), 'كل الطلبات')
    deals = panel('عروضك في سوق الزل', ''.join('<div style="display: flex; flex-direction: column; gap: 8px; padding: 12px 0; border-bottom: 1px solid %s"><div style="display: flex; justify-content: space-between; gap: 8px"><span style="font-size: 14px; font-weight: 600">%s</span>%s</div>%s</div>' % (
        C['s100'], n, p, sb) for n, p, sb in (('عرض ساعة: بشت ملكي −15%', pill('مباشر', 'danger', 'zap'), stockbar(3, 10)), ('عرض الأسبوع: بشت صيفي −10%', pill('بانتظار الموافقة', 'warning', 'clock'), '<span style="font-size: 12px; color: %s">يبدأ السبت 9:00 ص</span>' % C['mu']))) +
        btn('أنشئ عرضاً', 'secondary', 'md', 'plus', True), 'كل العروض')
    payout = panel('آخر تحويل', '%s<p style="margin: 0; font-size: 14px; color: %s">تم التحويل 12 نوفمبر · المرجع <bdi dir="ltr">TRX-[المرجع]</bdi></p><div style="display: flex; gap: 8px; flex-wrap: wrap">%s%s</div>' % (
        money_c('12,400.00 ر.س', 24), C['mu'], btn('عرض الإيصال', 'secondary', 'xs', 'file'), btn('كشف الحساب', 'ghost', 'xs', 'file')))
    stock = panel('مخزون منخفض', '<ul style="list-style: none; margin: 0; padding: 0">%s</ul>' % ''.join('<li style="display: flex; justify-content: space-between; gap: 8px; padding: 10px 0; border-bottom: 1px solid %s; font-size: 14px"><span>%s</span>%s</li>' % (C['s100'], n, pill(t, tone, 'alert')) for n, t, tone in (('بشت حساوي — مقاس 62 أسود', 'نفد', 'danger'), ('بشت ملكي — مقاس 54 بني', 'باقي 2', 'warning'))))
    if mobile:
        return '<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px">%s%s%s%s%s%s</div>' % (chk, kg, reqs, orders, deals, payout)
    return ('%s%s<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start">%s%s</div>'
            '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; align-items: start">%s%s%s</div>') % (chk, kg, reqs, orders, deals, payout, stock)

def vendor_d():
    body = shell('vendor', 'home', vendor_main(), 'أهلاً، دار المثال', ['لوحة التاجر', 'الرئيسية'])
    OUT['Vendor-desktop.dc.html'] = doc('لوحة التاجر — ديسكتوب', body, 1440, 1700, fluid=True, js=timer_js(TJ))

def vendor_m():
    body = m_top('الرئيسية', 'vendor', '5') + vendor_main(True)
    OUT['Vendor-mobile.dc.html'] = doc('لوحة التاجر — جوال', body, 390, 3600, js=timer_js(TJ))

def bargain_settings():
    form = ('<section style="display: flex; flex-direction: column; gap: 18px; padding: 24px; background: %s; border: 1px solid %s; border-radius: 12px">'
            '<div style="display: flex; align-items: center; gap: 10px"><span style="color: %s">%s</span><h2 style="margin: 0; font-size: 20px">إعدادات الفصال لهذا المنتج</h2></div>%s'
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">%s%s</div>'
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">%s%s</div>%s%s</section>') % (
        C['w'], C['s200'], C['g7'], ic('hand', 22), toggle('اسمح للعملاء بطلب سعرهم على هذا المنتج', True, 'يظهر زر "اطلب سعرك" في صفحة المنتج وزر "فاصل" في عروضه'),
        '<div style="display: flex; flex-direction: column; gap: 6px">%s<span style="display: inline-flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 600; color: %s">%sسري: لا يظهر للعميل في أي مكان</span></div>' % (
            field('حدك الأدنى للقطعة', '1,600', suffix='ر.س', fid='fl', helper='الطلبات الأقل منه توصلك مع تنبيه، وتقرر أنت.'), C['b7'], ic('eye-off', 14)),
        field('سعر القبول التلقائي', '1,500', suffix='ر.س', fid='aa', error='لازم يكون أعلى من حدك الأدنى (1,600.00 ر.س) وأقل من سعر البيع (1,790.00 ر.س).'),
        select('أقصى عدد جولات', '3 جولات (افتراضي)', 'mr', 'لكل طرف مع كل عميل'), select('مهلة الرد على العرض', '24 ساعة (افتراضي)', 'rw', 'بعدها يُغلق العرض تلقائياً'),
        banner('كيف يُستخدم القبول التلقائي', 'أي طلب سعره ≥ سعر القبول التلقائي يُقبل فوراً باسمك، ويُحجز المخزون للعميل 24 ساعة. اتركه فارغاً لو تبي تراجع كل طلب بنفسك.', 'info', 'zap'),
        row(btn('حفظ الإعدادات', 'primary', 'md', 'check') + btn('إلغاء', 'ghost', 'md'), 10))
    preview = ('<aside style="flex: 0 1 360px; min-width: 300px; display: flex; flex-direction: column; gap: 14px"><section style="display: flex; flex-direction: column; gap: 12px; padding: 18px; background: %s; border: 1px solid %s; border-radius: 12px">'
               '<h2 style="margin: 0; font-size: 16px">كيف يشوفها العميل</h2><div style="max-width: 200px">%s</div><p style="margin: 0; font-size: 12px; color: %s">العميل يشوف شارة "يقبل الفصال" فقط. الحد الأدنى وسعر القبول التلقائي لا يظهران له.</p></section>'
               '<section style="display: flex; flex-direction: column; gap: 8px; padding: 18px; background: %s; border-radius: 12px"><h2 style="margin: 0; font-size: 16px">أداء الفصال لهذا المنتج</h2>%s</section></aside>') % (
        C['w'], C['s200'], product_card(dict(P[1], vendor='دار المثال'), cta=False), C['mu'], C['s100'], ''.join(
            '<div style="display: flex; justify-content: space-between; font-size: 14px"><span style="color: %s">%s</span><strong>%s</strong></div>' % (C['mu'], a, b) for a, b in (('طلبات هذا الشهر', num('23')), ('تحوّلت لمبيعات', '<bdi dir="ltr">35%</bdi>'), ('متوسط سعر الصفقة', '1,640.00 ر.س'))))
    tabs_ = '<div role="tablist" aria-label="أقسام المنتج" style="display: flex; gap: 4px; border-bottom: 1px solid %s; overflow-x: auto">%s</div>' % (C['s200'], ''.join(
        '<button type="button" role="tab" aria-selected="%s" style="min-height: 48px; padding: 0 14px; border: 0; border-bottom: 2px solid %s; background: transparent; font-family: inherit; font-size: 14px; font-weight: %d; color: %s">%s</button>' % (
            'true' if t == 'الفصال' else 'false', C['ink'] if t == 'الفصال' else 'transparent', 700 if t == 'الفصال' else 400, C['ink'] if t == 'الفصال' else C['mu'], t) for t in ('البيانات', 'الصور', 'الخيارات والمخزون', 'الفصال', 'SEO')))
    main = '%s<div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap"><div style="flex: 1 1 560px; min-width: 0">%s</div>%s</div>' % (tabs_, form, preview)
    body = shell('vendor', 'products', main, 'بشت حساوي يدوي — زري ذهبي', ['لوحة التاجر', 'المنتجات', 'تعديل منتج'], False, '<div>%s</div>' % pill('منشور', 'success', 'check'))
    OUT['VendorBargainSettings-desktop.dc.html'] = doc('إعدادات الفصال في نموذج المنتج — ديسكتوب', body, 1440, 1120, fluid=True)

def build():
    admin_d(); admin_m(); dash_states('admin')
    vendor_d(); vendor_m(); dash_states('vendor')
    inbox_d(); inbox_m(); reply_m(); inbox_states(); bargain_settings()
    return OUT
