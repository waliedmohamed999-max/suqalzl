# -*- coding: utf-8 -*-
from lib import *

OUT = {}
TJ = "c1: f(2538), c2: f(1085), c3: f(231), c4: f(33012), c5: f(112230), c6: f(67200), c7: f(83529), c8: f(43800)"

def tabs(items, sel=0, dark=False, sticky=True):
    out = '<div role="tablist" aria-label="أقسام السوق" style="display: flex; gap: 4px; overflow-x: auto; padding: 0 16px; background: %s; border-bottom: 1px solid %s;%s">' % (
        C['s50'] if not dark else C['b9'], C['s200'] if not dark else C['b7'], ' position: sticky; top: 0; z-index: 4;' if sticky else '')
    for i, (lab, n) in enumerate(items):
        on = i == sel
        out += ('<button type="button" role="tab" aria-selected="%s" style="display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 12px; border: 0; border-bottom: 2px solid %s; background: transparent; '
                'font-family: inherit; font-size: 14px; font-weight: %d; color: %s; white-space: nowrap; flex: none; cursor: pointer">%s%s</button>') % (
            'true' if on else 'false', C['ink'] if on else 'transparent', 700 if on else 500, C['ink'] if on else C['mu'], lab,
            ('<span style="min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; background: %s; color: %s; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center">%s</span>' % (
                C['ink'] if on else C['s100'], C['s50'] if on else C['b7'], num(n))) if n is not None else '')
    return out + '</div>'

SOUQ_TABS = [('عروض الساعة', 12), ('عروض اليوم', 34), ('عروض الأسبوع', 51), ('تصفية', 19), ('باقات', 6), ('طلبات مفتوحة', 34)]

REQS = [('bisht', 'بشت حساوي مقاس 56', 'الرياض', 1500, 'قبل 3 د', 3), ('oud', 'دهن عود كمبودي 12 مل', 'جدة', 820, 'قبل 8 د', 1),
        ('sword', 'طلب مفتوح: سيف عربي بغمد فضي', 'الدمام', 4500, 'قبل 14 د', 0), ('saffron', 'زعفران سوبر 50 جرام', 'مكة', 600, 'قبل 21 د', 4)]

def req_ticker(dark=False, n=4):
    fg, sub, bd, bg = (C['s50'], C['ondark'], C['b7'], C['b9']) if dark else (C['ink'], C['mu'], C['s200'], C['w'])
    rows = ''
    for k, t, city, price, ago, offers in REQS[:n]:
        rows += ('<li style="display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid %s"><div style="width: 44px; flex: none">%s</div>'
                 '<div style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0"><span style="font-size: 14px; font-weight: 600; color: %s">%s</span>'
                 '<span style="font-size: 12px; color: %s; display: flex; gap: 6px; flex-wrap: wrap"><span>%s</span><span aria-hidden="true">·</span><span>%s</span><span aria-hidden="true">·</span><span>%s</span></span></div>'
                 '<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: none"><span style="font-size: 12px; color: %s">يطلب</span>%s</div></li>') % (
            bd, art(k, tone='dark' if dark else 'sand', ratio='1 / 1', radius=6, label=t), fg, t, sub, city, ago, ('%s عروض' % num(offers)) if offers else 'بانتظار أول عرض', sub, sar(price, 14, 700, fg, True))
    return ('<section aria-labelledby="rt" data-surface="%s" style="display: flex; flex-direction: column; gap: 6px; padding: 16px; background: %s; border: 1px solid %s; border-radius: 12px">'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><h2 id="rt" style="margin: 0; font-size: 17px; font-weight: 700; color: %s">طلبات فصال مفتوحة الآن</h2>%s</div>'
            '<p style="margin: 0; font-size: 12px; color: %s">تُعرض بدون أي بيانات للعميل. تتحدث لحظياً.</p>'
            '<ul aria-live="polite" style="list-style: none; margin: 0; padding: 0">%s</ul>'
            '<a href="#" style="display: inline-flex; align-items: center; gap: 4px; min-height: 44px; font-size: 14px; font-weight: 600; color: %s; text-decoration: none">كل الطلبات المفتوحة (34)%s</a></section>') % (
        'dark' if dark else 'light', bg, bd, fg, live_badge(dark), sub, rows, C['g5'] if dark else C['g7'], ic('chev-l', 16))

def ask_card(dark=False):
    return ('<section style="display: flex; flex-direction: column; gap: 10px; padding: 18px; border: 1px solid %s; border-radius: 12px; background: %s">'
            '<span style="width: 44px; height: 44px; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center">%s</span>'
            '<h2 style="margin: 0; font-size: 18px; font-weight: 700">ما لقيت اللي تبيه؟</h2>'
            '<p style="margin: 0; font-size: 14px; line-height: 22px; color: %s">صف المنتج، ارفع صورة لو حاب، وحدد سعرك. يوصل طلبك لكل التجار المعتمدين في التصنيف.</p>%s</section>') % (
        C['g5'], C['w'], C['s100'], C['g7'], ic('hand', 22), C['mu'], btn('اطلب منتج بسعرك', 'bargain', 'md', 'hand', True))

def deal_light_mini(d, w=180, holes=None):
    return ('<article style="width: %dpx; flex: none; display: flex; flex-direction: column; gap: 8px">'
            '<div style="position: relative">%s<span style="position: absolute; top: 6px; inset-inline-start: 6px">%s</span></div>%s'
            '<h3 style="margin: 0; font-size: 13px; line-height: 20px; font-weight: 600; min-height: 40px"><a href="#" style="color: %s; text-decoration: none">%s</a></h3>'
            '<div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap">%s%s</div>%s</article>') % (
        w, art(d['k'], radius=8), disc(pct_of(d)), vendor_line(d), C['ink'], d['name'], sar(d['price'], 15, 700), sar(d['was'], 12, 400, C['mu'], False, True),
        timer_inline(holes or ('%02d:%02d:%02d' % d['t']), 'neutral', 'clock', 'ينتهي خلال '))

def souq_hero(desktop=False):
    stats = [('128', 'عرض مباشر'), ('34', 'طلب فصال مفتوح'), ('41', 'تاجر نشط الآن')]
    st = ''.join('<div style="display: flex; flex-direction: column; gap: 0; padding-inline-end: 16px; border-inline-end: 1px solid %s"><span style="font-size: %dpx; font-weight: 700; color: %s">%s</span><span style="font-size: 12px; color: %s">%s</span></div>' % (
        C['b7'] if i < 2 else 'transparent', 24 if desktop else 20, C['s50'], num(a), C['ondark'], b) for i, (a, b) in enumerate(stats))
    return ('<section data-surface="dark" style="background: %s; padding: %s"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px">'
            '<div style="display: flex; align-items: center; gap: 10px">%s<span style="font-size: 13px; color: %s">يتحدث لحظياً</span></div>'
            '<h1 style="margin: 0; font-size: %dpx; line-height: 1.35; font-weight: 700; color: %s">سوق الزل</h1>'
            '<p style="margin: 0; font-size: %dpx; line-height: 1.7; color: %s; max-width: 560px">عروض حية من المنصة وتجار موثّقين، وفصال على سعرك: اطلب، والتجار يتنافسون على طلبك.</p>'
            '<div style="display: flex; gap: 16px">%s</div><div style="display: flex; gap: 10px; flex-wrap: wrap">%s%s</div></div></section>') % (
        C['b9'], '40px 32px' if desktop else '24px 16px', live_badge(True), C['ondark'], 44 if desktop else 30, C['s50'], 17 if desktop else 15, C['ondark'], st,
        btn('اطلب منتج بسعرك', 'gold', 'lg' if desktop else 'md', 'hand', extra='' if desktop else ' flex: 1;'), btn('كيف يعمل الفصال؟', 'ghost-dark', 'lg' if desktop else 'md', 'info'))

def souq_filters(desktop=False):
    return row(chip('تصفية', icon='sliders', count=None) + chip('التصنيف') + chip('التاجر') + chip('الخصم 20%+', True) + chip('السعر') + chip('المدينة') + chip('ينتهي قريباً', icon='clock') +
               ('<span style="margin-inline-start: auto; flex: none; width: 200px">%s</span>' % select(None, 'الترتيب: الأعلى خصماً', 'ss') if desktop else chip('الترتيب: الأعلى خصماً', icon='sort')), 8,
               extra=' overflow-x: auto; padding: 12px %s' % ('0' if desktop else '16px'))

def new_pill():
    return ('<div aria-live="polite" style="display: flex; justify-content: center; padding: 8px 0 0"><button type="button" style="display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px; border-radius: 999px; border: 0; background: %s; color: %s; '
            'font-family: inherit; font-size: 13px; font-weight: 600; box-shadow: 0 6px 20px rgba(22,18,14,.18); cursor: pointer">%s3 عروض جديدة · اعرضها</button></div>') % (C['ink'], C['s50'], ic('chev-u', 16, C['g5']))

def bundle_card():
    return ('<article style="display: flex; gap: 12px; padding: 12px; background: %s; border: 1px solid %s; border-radius: 8px"><div style="width: 116px; flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px">%s%s%s%s</div>'
            '<div style="display: flex; flex-direction: column; gap: 6px; flex: 1"><span style="display: inline-flex; gap: 4px; align-items: center; font-size: 12px; font-weight: 600; color: %s">%sباقة</span><h3 style="margin: 0; font-size: 14px; line-height: 22px">باقة المناسبة: بشت + عقال + دهن عود</h3>'
            '<div style="display: flex; align-items: baseline; gap: 8px">%s%s</div><span style="font-size: 12px; color: %s">توفّر %s مقارنة بشرائها منفصلة</span>%s</div></article>') % (
        C['w'], C['s200'], art('bisht', ratio='1 / 1', radius=4), art('agal', ratio='1 / 1', radius=4), art('oud', ratio='1 / 1', radius=4), art('shal', ratio='1 / 1', radius=4), C['g7'], ic('gift', 14),
        sar(2690, 16, 700), sar(2985, 13, 400, C['mu'], False, True), C['su'], sar(295, 12, 600, C['su'], True), btn('أضف الباقة للسلة', 'primary', 'sm', 'bag'))

def souq_m():
    body = (header_m(search=False) + souq_hero() + tabs(SOUQ_TABS) + souq_filters() + new_pill() +
            '<section style="padding: 12px 16px 8px; display: flex; flex-direction: column; gap: 14px">%s%s%s%s%s</section>' % (
                sec_title('عروض الساعة', sub='كميات محدودة، والسعر محجوز لك 15 دقيقة في السلة'), deal_card_feature(D[0], ('{{c1.h}}', '{{c1.m}}', '{{c1.s}}')),
                deal_card_row(D[1], '{{c2.all}}'), deal_card_row(D[2], '{{c3.all}}'), deal_card_row(D[3])) +
            '<section style="padding: 20px 0 8px; display: flex; flex-direction: column; gap: 14px"><div style="padding: 0 16px">%s</div><div style="display: flex; gap: 12px; overflow-x: auto; padding: 0 16px">%s</div></section>' % (
                sec_title('عروض اليوم', 'الكل (34)'), deal_light_mini(D[4], holes='{{c4.all}}') + deal_light_mini(dict(D[1], t=(14, 2, 0)), holes='{{c8.all}}') + deal_light_mini(D[5], holes='{{c5.all}}')) +
            '<section style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s</section>' % (req_ticker(True), ask_card()) +
            '<section style="padding: 8px 16px 32px; display: flex; flex-direction: column; gap: 14px">%s%s</section>' % (sec_title('باقات', 'الكل (6)'), bundle_card()) +
            footer_m() + wa_float())
    OUT['Souq-mobile.dc.html'] = doc('سوق الزل /souq — جوال', body, 390, 4200, js=timer_js(TJ))

def deal_card_v(d, holes=None):
    sold = d.get('sold')
    urgent = d.get('urgent')
    acts = (btn('اشترِ الآن', 'primary', 'md', extra=' flex: 1;') + (btn('فاصل', 'bargain', 'md', 'hand', href='Bargain-desktop.dc.html') if d.get('bargain') else '')) if not sold else btn('نبّهني بعروض مشابهة', 'secondary', 'md', 'bell', True)
    timer = pill('انتهى العرض', 'neutral', 'clock') if sold else timer_inline(holes or ('%02d:%02d:%02d' % d['t']), 'warning' if (d['t'][0] == 0 and d['t'][1] < 10) else 'neutral', 'clock', 'ينتهي خلال ')
    over = ('<span style="position: absolute; inset: 0; background: rgba(251,247,240,.78); display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 15px; font-weight: 700">نفدت الكمية</span>') if sold else ''
    return ('<article style="display: flex; flex-direction: column; gap: 10px; padding: 14px; background: %s; border: 1px solid %s; border-radius: 12px; min-width: 0">'
            '<div style="position: relative">%s<span style="position: absolute; top: 8px; inset-inline-start: 8px">%s</span>%s</div>%s%s'
            '<h3 style="margin: 0; font-size: 15px; line-height: 24px; font-weight: 600; min-height: 48px"><a href="#" style="color: %s; text-decoration: none">%s</a></h3>'
            '<div style="display: flex; align-items: baseline; gap: 8px">%s%s</div>%s<div style="display: flex; gap: 8px">%s</div></article>') % (
        C['w'], C['s200'], art(d['k'], ratio='4 / 3', radius=8), disc(pct_of(d)), over, timer, vendor_line(d), C['ink'], d['name'],
        sar(d['price'], 18, 700), sar(d['was'], 13, 400, C['mu'], False, True), stockbar(d['left'], d['total'], False, urgent) if not sold else '<p style="margin: 0; font-size: 13px; color: %s">بيعت كل القطع</p>' % C['mu'], acts)

def souq_d():
    feat = ('<div data-surface="dark" style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; padding: 20px; background: %s; border-radius: 12px">%s'
            '<div style="display: flex; flex-direction: column; gap: 14px; justify-content: center">%s</div></div>') % (
        C['b9'], art('bisht', tone='dark', ratio='4 / 3', radius=8),
        '<div style="display: flex; gap: 8px">%s<span style="display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 2px 8px; border-radius: 4px; background: %s; color: %s; font-size: 12px; font-weight: 700">%sعرض الساعة المثبّت</span></div>' % (disc(25, True), C['g5'], C['ink'], ic('zap', 14)) +
        '<div style="display: flex; align-items: center; gap: 12px"><span style="font-size: 14px; color: %s">ينتهي خلال</span>%s</div>' % (C['ondark'], countdown(0, 42, 18, True, 'lg', holes=('{{c1.h}}', '{{c1.m}}', '{{c1.s}}'))) +
        vendor_line(D[0], True) + '<h3 style="margin: 0; font-size: 24px; line-height: 36px; color: %s">%s</h3>' % (C['s50'], D[0]['name']) +
        '<div style="display: flex; align-items: baseline; gap: 12px">%s%s</div>' % (sar(1387.5, 30, 700, C['s50'], True), sar(1850, 16, 400, C['ondark'], False, True)) + stockbar(4, 20, True) +
        '<div style="display: flex; gap: 10px">%s%s</div>' % (btn('اشترِ الآن', 'primary-inverse', 'lg', extra=' flex: 1;'), btn('فاصل', 'bargain-dark', 'lg', 'hand', href='Bargain-desktop.dc.html')))
    grid = '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px">%s</div>' % (
        deal_card_v(D[1], '{{c2.all}}') + deal_card_v(D[2], '{{c3.all}}') + deal_card_v(D[3]) + deal_card_v(D[4], '{{c4.all}}') + deal_card_v(D[5], '{{c5.all}}') + deal_card_v(dict(D[0], k='sword', name='سيف عربي مطلي — غمد مزخرف', vendor='سيوف الأنموذج', platform=False, r=4.8, price=5780, was=6800, left=1, total=3), '{{c6.all}}'))
    steps = ''.join('<li style="display: flex; gap: 12px"><span style="width: 28px; height: 28px; flex: none; border-radius: 50%%; border: 1px solid %s; color: %s; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700">%s</span><span style="font-size: 14px; line-height: 22px">%s</span></li>' % (
        C['g5'], C['g7'], num(i + 1), t) for i, t in enumerate(('حدد سعرك والكمية والمدينة.', 'التجار يردون بقبول أو سعر مضاد، كل واحد بسرية.', 'قارن العروض جنب بعض بالإجمالي، وفاصل حتى 3 جولات.', 'اقبل الأفضل، نحجز لك السعر 24 ساعة، وادفع من السلة.')))
    side = ('<aside style="width: 360px; flex: none; display: flex; flex-direction: column; gap: 20px; position: sticky; top: 16px">%s%s'
            '<section style="padding: 18px; border: 1px solid %s; border-radius: 12px; background: %s; display: flex; flex-direction: column; gap: 12px"><h2 style="margin: 0; font-size: 17px">كيف يعمل الفصال</h2><ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px">%s</ol></section></aside>') % (
        req_ticker(True), ask_card(), C['s200'], C['w'], steps)
    body = (header_d() + souq_hero(True) +
            '<div style="background: %s; border-bottom: 1px solid %s; position: sticky; top: 0; z-index: 4"><div style="max-width: 1280px; margin: 0 auto; padding: 0 32px">%s</div></div>' % (C['s50'], C['s200'], tabs(SOUQ_TABS, sticky=False).replace('padding: 0 16px', 'padding: 0').replace('border-bottom: 1px solid %s;' % C['s200'], '')) +
            '<main style="padding: 0 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px">%s%s'
            '<div style="display: flex; gap: 32px; align-items: flex-start; padding-top: 8px"><div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px">%s%s%s%s</div>%s</div></div></main>' % (
                souq_filters(True), new_pill(), sec_title('عروض الساعة', sub='كميات محدودة، والسعر محجوز لك 15 دقيقة في السلة', size=24), feat, grid,
                '<section style="display: flex; flex-direction: column; gap: 14px">%s<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">%s%s</div></section>' % (sec_title('باقات', 'الكل (6)'), bundle_card(), bundle_card()), side) +
            footer_d())
    OUT['Souq-desktop.dc.html'] = doc('سوق الزل /souq — ديسكتوب', body, 1440, 2600, fluid=True, js=timer_js(TJ))

def souq_states():
    base = header_m(search=False) + '<div data-surface="dark" style="background: %s; padding: 16px; display: flex; align-items: center; gap: 10px"><h1 style="margin: 0; font-size: 22px; color: %s">سوق الزل</h1>%s</div>' % (C['b9'], C['s50'], live_badge(True))
    load = base + tabs(SOUQ_TABS, sticky=False) + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s%s%s</div>' % (
        skel('100%', 300, 12), ''.join(row(skel('116px', 145, 6) + col(skel('60%', 12) + skel('90%', 14) + skel('40%', 18) + skel('100%', 6) + skel('70%', 36, 8), 10, ' flex: 1'), 12, 'flex-start') for _ in range(2)), '')
    empty = base + tabs(SOUQ_TABS, sticky=False) + state_panel('ما فيه عروض ساعة الحين', 'أقرب عرض ساعة يبدأ الساعة 9:00 م. وفي عروض اليوم 34 عرضاً مباشراً الآن.', 'zap',
                                                              btn('شوف عروض اليوم', 'primary', 'md', full=True) + btn('نبّهني عند بدء العروض', 'secondary', 'md', 'bell', True))
    rt = base + '<div style="padding: 12px 16px 0">%s</div>' % banner('انقطع التحديث المباشر', 'العدادات والكميات قد لا تكون محدّثة. نعيد الاتصال تلقائياً، والسعر النهائي يتأكد في السلة دائماً.', 'warning', 'wifi-off', btn('أعد الاتصال الآن', 'secondary', 'sm', 'refresh')) + \
        '<div style="padding: 12px 16px; display: flex; flex-direction: column; gap: 12px">%s%s</div>' % (pill('آخر تحديث قبل 40 ثانية', 'neutral', 'clock'), deal_card_row(D[1]))
    ended_card = deal_card_row(dict(D[2], urgent=False)).replace(timer_inline('%02d:%02d:%02d' % D[2]['t'], 'warning', 'clock', 'ينتهي خلال '), pill('انتهى العرض الآن', 'neutral', 'clock'))
    ended = base + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s%s</div>' % (ended_card,
        banner('انتهى العرض قبل ما تضيفه', 'رجع سعر المبخرة إلى 640.00 ر.س. تقدر تشتريها بالسعر الحالي أو تطلب سعرك.', 'info', 'clock', row(btn('اشترِ بـ 640 ر.س', 'primary', 'sm') + btn('اطلب سعرك', 'bargain', 'sm', 'hand'), 8)))
    err = base + state_panel('تعذّر تحميل السوق', 'صار خلل مؤقت. العروض ما راحت، حدّث الصفحة وترجع لك.', 'alert', btn('إعادة المحاولة', 'primary', 'md', 'refresh', True), 'danger')
    panels = phone_panel('تحميل', load, kind='تحميل') + phone_panel('فارغ: لا عروض ساعة', empty, kind='فارغ') + phone_panel('خطأ: انقطاع Realtime', rt, kind='خطأ') + phone_panel('انتهاء مهلة العرض', ended, kind='مهلة') + phone_panel('خطأ في التحميل', err, kind='خطأ')
    body = '<div style="padding: 40px; display: grid; grid-template-columns: repeat(4, 390px); gap: 40px">%s</div>' % panels
    OUT['Souq-states.dc.html'] = doc('سوق الزل — الحالات', body, 1760, 1720)

# ============================================================== OFFERS
OFFERS = [
    dict(v='دار المثال', av='د', r=4.8, n=212, badges=[('أسرع رد', 'gold'), ('قبول 92%', 'neutral')], status=('قبل سعرك', 'success'), prod='منتج مشابه: بشت حساوي يدوي — زري ذهبي',
         unit=1500, qty=2, ship=35, eta='2–3 أيام', total=3035, exp='{{c7.all}}', round_='باقي لك 3 ردود مع هذا التاجر', best=True,
         tl=[('أنت', 'طلبت', 1500, 'أمس 9:14 م'), ('التاجر', 'قبل سعرك', 1500, 'أمس 9:31 م')], kind='accept'),
    dict(v='سوق الزل', av='ز', platform=True, badges=[('صاحب المنتج', 'gold')], status=('سعر مضاد', 'warning'), prod='المنتج نفسه',
         unit=1650, qty=2, ship=30, eta='1–2 يوم', total=3330, exp='{{c4.all}}', round_='باقي لك 3 ردود مع هذا التاجر',
         tl=[('أنت', 'طلبت', 1500, 'أمس 9:14 م'), ('التاجر', 'رد بسعر', 1650, 'اليوم 8:02 ص')], kind='counter', open_counter=True),
    dict(v='مشغل العيّنة', av='م', r=4.5, n=58, badges=[('قبول 71%', 'neutral')], status=('بانتظار رد التاجر', 'info'), prod='منتج مشابه: بشت حساوي — صوف ياباني',
         unit=1700, qty=2, ship=0, eta='4–6 أيام', total=3400, exp='{{c8.all}}', round_='باقي لك ردّان مع هذا التاجر',
         tl=[('أنت', 'طلبت', 1500, 'أمس 9:14 م'), ('التاجر', 'رد بسعر', 1700, 'أمس 11:40 م'), ('أنت', 'رديت بسعر', 1560, 'اليوم 10:05 ص')], kind='waiting'),
]

def timeline(tl):
    out = '<ol aria-label="جولات الفصال" style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0">'
    for i, (who, verb, price, when) in enumerate(tl):
        me = who == 'أنت'
        last = i == len(tl) - 1
        out += ('<li style="display: flex; gap: 10px; position: relative; padding-bottom: %dpx">'
                '<span aria-hidden="true" style="display: flex; flex-direction: column; align-items: center; flex: none; width: 14px"><span style="width: 12px; height: 12px; border-radius: 50%%; background: %s; border: 2px solid %s; margin-top: 5px"></span>%s</span>'
                '<span style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; font-size: 13px; flex: 1"><strong style="color: %s">%s</strong><span style="color: %s">%s</span>%s<span style="color: %s; margin-inline-start: auto">%s</span></span></li>') % (
            0 if last else 10, C['w'] if me else C['ink'], C['ink'], '' if last else '<span style="flex: 1; width: 1px; background: %s; margin-top: 2px"></span>' % C['line'],
            C['ink'], who, C['mu'], verb, sar(price, 13, 700), C['mu'], when)
    return out + '</ol>'

def offer_card(o, compact=False):
    strip = ('<div style="background: %s; color: %s; font-size: 12px; font-weight: 700; padding: 6px 16px; display: flex; align-items: center; gap: 6px">%sالأفضل إجمالاً</div>' % (C['g5'], C['ink'], ic('star', 14, C['ink']))) if o.get('best') else ''
    who = ('<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 15px; font-weight: 700">%s سوق الزل</span>' % ic('seal', 16, C['g7'])) if o.get('platform') else '<span style="font-size: 15px; font-weight: 700">%s</span>' % o['v']
    rating = '' if o.get('platform') else stars(o['r'], o['n'], 12)
    badges = ''.join(pill(b, t) for b, t in o['badges'])
    head = ('<div style="display: flex; gap: 10px; align-items: flex-start">%s<div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0"><div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">%s%s</div>'
            '<div style="display: flex; gap: 6px; flex-wrap: wrap">%s</div></div>%s</div>') % (avatar(o['av'], s=40), who, rating, badges, pill(*o['status']))
    prod = ('<div style="display: flex; gap: 10px; align-items: center; padding: 8px; background: %s; border-radius: 8px"><div style="width: 44px; flex: none">%s</div><span style="font-size: 13px; flex: 1; line-height: 20px">%s</span>'
            '<a href="#" style="font-size: 13px; font-weight: 600; color: %s; min-height: 44px; display: inline-flex; align-items: center">عرض المنتج</a></div>') % (C['s100'], art('bisht', radius=4), o['prod'], C['g7'])
    cell = lambda a, b: '<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; color: %s">%s</span><span style="font-size: 14px; font-weight: 600">%s</span></div>' % (C['mu'], a, b)
    brk = ('<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px">%s%s%s%s</div>') % (
        cell('سعر القطعة', sar(o['unit'], 14, 700)), cell('الكمية', num(o['qty'])), cell('الشحن', 'مجاني' if not o['ship'] else sar(o['ship'], 14, 600)), cell('التوصيل', o['eta']))
    tot = ('<div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid %s"><span style="font-size: 14px; color: %s">الإجمالي شامل الضريبة والشحن</span>%s</div>') % (C['s200'], C['mu'], sar(o['total'], 20, 700))
    meta = row('<span style="font-size: 12px; font-weight: 600; color: %s">%s</span>' % (C['b7'], o['round_']) + '<span style="margin-inline-start: auto">%s</span>' % timer_inline(o['exp'], 'warning', 'clock', 'العرض صالح '), 8)
    if o['kind'] == 'accept':
        acts = btn('اقبل العرض', 'primary', 'lg', 'check', True) + row(btn('سعر مضاد', 'secondary', 'md', 'hand', extra=' flex: 1;') + btn('رفض', 'ghost', 'md', extra=' flex: 1;'), 8)
    elif o['kind'] == 'counter':
        acts = btn('اقبل 1,650 ر.س', 'primary', 'md', 'check', True)
        if o.get('open_counter'):
            acts += ('<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1.5px solid %s; border-radius: 8px; background: %s">%s'
                     '<p style="margin: 0; font-size: 12px; color: %s; line-height: 18px">التاجر ما يشوف عروض غيره، ولا يشوف ردودك على التجار الآخرين.</p><div style="display: flex; gap: 8px">%s%s</div></div>') % (
                C['ink'], C['w'], field('سعرك المضاد للقطعة', '1,575', suffix='ر.س', helper='بعد ردك يبقى لك ردّان · الإجمالي 3,180.00 ر.س مع الشحن', fid='cf', big=True), C['mu'],
                btn('أرسل السعر', 'primary', 'md', 'send', extra=' flex: 1;'), btn('إلغاء', 'ghost', 'md'))
        else:
            acts += row(btn('سعر مضاد', 'secondary', 'md', 'hand', extra=' flex: 1;') + btn('رفض', 'ghost', 'md', extra=' flex: 1;'), 8)
    else:
        acts = ('<div style="display: flex; gap: 8px; align-items: center; padding: 10px 12px; background: %s; border-radius: 8px; font-size: 13px; color: %s">%s<span>أرسلت <strong>1,560 ر.س</strong>. ننتظر رد التاجر، ونبلغك فوراً.</span></div>' % (C['infbg'], C['inf'], ic('clock', 18))) + \
            btn('اسحب ردي', 'secondary', 'md', 'return', True) + '<p style="margin: 0; font-size: 12px; color: %s">لقبول سعر التاجر السابق (1,700.00 ر.س) اسحب ردك أولاً.</p>' % C['mu']
    return ('<article aria-label="عرض %s" style="display: flex; flex-direction: column; background: %s; border: %s solid %s; border-radius: 12px; overflow: hidden; min-width: 0">%s'
            '<div style="display: flex; flex-direction: column; gap: 14px; padding: 16px">%s%s%s%s%s%s%s</div></article>') % (
        o['v'], C['w'], '1.5px' if o.get('best') else '1px', C['g5'] if o.get('best') else C['s200'], strip, head, prod, brk, tot, meta, '<details open="open" style="font-size: 13px"><summary style="min-height: 32px; cursor: pointer; font-weight: 600; color: %s">سجل الجولات</summary><div style="padding-top: 8px">%s</div></details>' % (C['b7'], timeline(o['tl'])), acts)

def req_summary(desktop=False):
    stats = ('<div style="display: flex; gap: 6px; flex-wrap: wrap">%s%s%s%s</div>' % (pill('وصل لـ 13 تاجراً', 'neutral', 'users'), pill('3 عروض', 'success'), pill('اعتذر 1', 'neutral'), pill('بانتظار 9', 'info')))
    return ('<section style="display: flex; flex-direction: column; gap: 12px; padding: 16px; background: %s; border: 1px solid %s; border-radius: 12px">'
            '<div style="display: flex; gap: 12px; align-items: center"><div style="width: 64px; flex: none">%s</div><div style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0">'
            '<span style="font-size: 12px; color: %s">طلب على منتج · <bdi>PR-10023</bdi></span><strong style="font-size: 15px; line-height: 22px">%s</strong><span style="font-size: 13px; color: %s">مقاس 56 · أسود · الرياض</span></div>%s</div>'
            '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 12px; background: %s; border-radius: 8px">'
            '<div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">سعرك للقطعة</span>%s</div><div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">الكمية</span><strong>%s</strong></div>'
            '<div style="display: flex; flex-direction: column"><span style="font-size: 12px; color: %s">السعر الأصلي</span>%s</div></div>'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap"><span style="font-size: 13px; color: %s">ينتهي الطلب خلال</span>%s</div>%s</section>') % (
        C['w'], C['s200'], art('bisht', radius=6), C['mu'], P[0]['name'], C['mu'], pill('وصلتك عروض', 'success'), C['s100'], C['mu'], sar(1500, 16, 700), C['mu'], num(2), C['mu'], sar(1850, 14, 400, C['mu'], strike=True),
        C['mu'], countdown(31, 12, 5, False, 'sm', 'ينتهي الطلب خلال', ('{{c5.h}}', '{{c5.m}}', '{{c5.s}}')), stats)

def rest_block():
    return ('<section style="display: flex; flex-direction: column; gap: 8px">'
            '<button type="button" aria-expanded="false" style="display: flex; align-items: center; justify-content: space-between; min-height: 52px; padding: 0 14px; border: 1px solid %s; border-radius: 8px; background: %s; font-family: inherit; font-size: 14px; color: %s">'
            '<span>اعتذر تاجر واحد</span>%s</button>'
            '<div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1px dashed %s; border-radius: 8px; font-size: 13px; color: %s">%s<span>9 تجار لم يردوا بعد. العروض الجديدة تظهر هنا تلقائياً.</span></div></section>') % (
        C['s200'], C['s100'], C['mu'], ic('chev-d', 18), C['line'], C['b7'], live_badge(False, 'تحديث مباشر'))

def offers_m():
    sortrow = ('<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><h2 style="margin: 0; font-size: 18px">العروض (3)</h2>'
               '<div style="width: 190px">%s</div></div>') % select(None, 'الأقل إجمالاً', 'os')
    body = (header_m(back='#', title='طلب السعر PR-10023') +
            '<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px">%s%s%s%s%s%s%s</div>' % (
                req_summary(), sortrow, offer_card(OFFERS[0]), offer_card(OFFERS[1]), offer_card(OFFERS[2]), rest_block(),
                '<div style="display: flex; gap: 10px; padding: 14px; background: %s; border-radius: 8px; font-size: 13px; line-height: 20px; color: %s">%s<span>عند قبول عرض نحجز لك السعر والكمية <strong>24 ساعة</strong> للدفع من السلة، وتُغلق باقي العروض تلقائياً ونبلغ التجار.</span></div>' % (C['s100'], C['b7'], ic('lock', 20, C['g6']))) +
            '<div style="padding: 0 16px 40px">%s</div>' % btn('إلغاء الطلب', 'danger', 'md', 'x', True))
    OUT['Offers-mobile.dc.html'] = doc('مقارنة عروض الفصال — جوال', body, 390, 3700, js=timer_js(TJ))

def offers_d():
    body = (header_d() + '<main style="padding: 24px 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">%s'
            '<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px"><h1 style="margin: 0; font-size: 28px">طلب السعر <bdi>PR-10023</bdi></h1>%s</div>'
            '<div style="display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 24px; align-items: start"><div style="display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px">%s%s%s</div>'
            '<div style="display: flex; flex-direction: column; gap: 16px"><div style="display: flex; align-items: center; justify-content: space-between"><h2 style="margin: 0; font-size: 20px">العروض جنب بعض (3)</h2><div style="width: 220px">%s</div></div>'
            '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start">%s%s%s</div></div></div></div></main>' % (
                breadcrumbs(['حسابي', 'طلبات الأسعار', 'PR-10023']), btn('إلغاء الطلب', 'danger', 'md', 'x'), req_summary(True), rest_block(),
                '<div style="display: flex; gap: 10px; padding: 14px; background: %s; border-radius: 8px; font-size: 13px; line-height: 20px; color: %s">%s<span>عند القبول نحجز لك السعر والكمية <strong>24 ساعة</strong>، وتُغلق باقي العروض تلقائياً.</span></div>' % (C['s100'], C['b7'], ic('lock', 20, C['g6'])),
                select(None, 'الأقل إجمالاً', 'osd'), offer_card(OFFERS[0]), offer_card(OFFERS[1]), offer_card(OFFERS[2])) + footer_d())
    OUT['Offers-desktop.dc.html'] = doc('مقارنة عروض الفصال — ديسكتوب', body, 1440, 1900, fluid=True, js=timer_js(TJ))

def offers_states():
    hd = header_m(back='#', title='طلب السعر PR-10023')
    load = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s%s</div>' % (skel('100%', 210, 12), skel('100%', 300, 12), skel('100%', 300, 12))
    wait = hd + '<div style="padding: 16px">%s</div>' % req_summary().replace(pill('وصلتك عروض', 'success'), pill('مفتوح', 'info')).replace(pill('3 عروض', 'success'), '').replace(pill('اعتذر 1', 'neutral'), '').replace(pill('بانتظار 9', 'info'), pill('بانتظار 13', 'info')) + \
        state_panel('طلبك عند التجار الحين', 'وصل لـ 13 تاجراً. أول عرض عادةً يوصل خلال ساعة، ونبلغك برسالة فوراً.', 'clock', '<div style="display: flex; justify-content: center">%s</div>' % live_badge(False, 'ننتظر العروض لحظياً'))
    sheet = ('<div aria-hidden="true" style="position: absolute; inset: 0; background: %s"></div><div role="dialog" aria-modal="true" aria-labelledby="ac" style="position: absolute; inset-inline: 0; bottom: 0; background: %s; border-radius: 12px 12px 0 0; padding: 20px 16px; display: flex; flex-direction: column; gap: 14px">'
             '<h2 id="ac" style="margin: 0; font-size: 18px">تأكيد قبول العرض</h2>%s<ul style="margin: 0; padding-inline-start: 18px; font-size: 13px; line-height: 22px; color: %s"><li>نحجز لك السعر والكمية 24 ساعة للدفع.</li><li>تُغلق باقي العروض (2) ونبلغ التجار.</li><li>العنصر يضاف للسلة بسعر مقفول لا يتغير.</li></ul>%s%s</div>') % (
        C['scrim'], C['s50'], card(row('<span style="font-size: 14px">دار المثال · 2 × 1,500 ر.س + شحن 35</span>', 8) + row('<span style="font-size: 14px; color: %s">الإجمالي</span>' % C['mu'] + '<span style="margin-inline-start: auto">%s</span>' % sar(3035, 18), 8), 14, 8),
        C['b7'], btn('أقبل وأحجز السعر', 'primary', 'lg', 'lock', True), btn('رجوع', 'ghost', 'md', full=True))
    confirm = hd + '<div style="padding: 16px; opacity: .5">%s</div>' % skel('100%', 300, 12) + sheet
    accepted = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s%s</div>' % (
        banner('قبلت عرض دار المثال', 'السعر محجوز لك. ادفع قبل انتهاء المهلة وإلا يُلغى الحجز.', 'success', 'check'),
        card('<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 14px; font-weight: 600">مهلة الدفع</span>%s</div>%s' % (countdown(23, 59, 41, False, 'md', 'مهلة الدفع'), row('<span style="font-size: 14px; color: %s">الإجمالي</span>' % C['mu'] + '<span style="margin-inline-start: auto">%s</span>' % sar(3035, 18), 8)), 16),
        btn('ادفع الآن', 'primary', 'lg', 'lock', True, href='Cart-mobile.dc.html'))
    expired = hd + state_panel('انتهت مدة الطلب', 'مرّت 48 ساعة بدون قبول أي عرض. تقدر تعيد الطلب بنفس السعر أو تعدّله.', 'clock', btn('أعد الطلب', 'primary', 'md', 'refresh', True) + btn('عدّل السعر', 'secondary', 'md', full=True), 'warning')
    rounds = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s%s</div>' % (
        banner('استخدمت كل ردودك مع هذا التاجر', 'رديت 3 مرات من 3. تقدر تقبل آخر سعر منه (1,600.00 ر.س) أو ترفضه.', 'info', 'info'), row(btn('اقبل 1,600 ر.س', 'primary', 'md', extra=' flex: 1;') + btn('رفض', 'ghost', 'md'), 8) +
        '<p style="margin: 0; font-size: 13px; color: %s">زر "سعر مضاد" يختفي ولا يظهر معطلاً، والسبب مكتوب.</p>' % C['mu'])
    lockx = hd + state_panel('انتهت مهلة الدفع', 'ما اكتمل الدفع خلال 24 ساعة، فأُلغي الحجز ورجع المخزون للتاجر. العروض الأخرى أُغلقت.', 'lock', btn('اطلب سعرك من جديد', 'primary', 'md', 'hand', True) + btn('اشترِ بالسعر الحالي', 'secondary', 'md', full=True), 'warning')
    err = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s</div>' % banner('ما تم القبول', 'التاجر سحب العرض أو انتهت صلاحيته قبل لحظات. باقي العروض ما زالت متاحة.', 'danger', 'alert', btn('حدّث العروض', 'secondary', 'sm', 'refresh'))
    panels = (phone_panel('تحميل', load, kind='تحميل') + phone_panel('فارغ: بانتظار أول عرض', wait, kind='فارغ') + phone_panel('تأكيد القبول', confirm, kind='تأكيد') + phone_panel('بعد القبول: PriceLock', accepted, kind='نجاح') +
              phone_panel('انتهاء مدة الطلب (48 س)', expired, kind='مهلة') + phone_panel('انتهاء مهلة الدفع (PriceLock)', lockx, kind='مهلة') + phone_panel('حد الردود (maxRounds لكل طرف)', rounds, kind='حد') + phone_panel('خطأ: العرض لم يعد متاحاً', err, kind='خطأ'))
    body = '<div style="padding: 40px; display: grid; grid-template-columns: repeat(4, 390px); gap: 40px">%s</div>' % panels
    OUT['Offers-states.dc.html'] = doc('مقارنة العروض — الحالات', body, 1760, 1720, js=timer_js(TJ))

# ======================================================== CART / CHECKOUT
def cart_item(k, name, opts, price, qty, special=None, locked=False, limit=None, holes=None):
    sp = ''
    if special == 'lock':
        sp = ('<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; background: %s; border-radius: 6px">%s%s</div>' % (
            C['infbg'], pill('سعر فصال مقفول', 'info', 'lock'), timer_inline(holes or '23:12:09', 'info', 'clock', 'ينتهي الحجز ')))
    elif special == 'flash':
        sp = ('<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; background: %s; border-radius: 6px">%s%s</div>' % (
            C['wabg'], pill('سعر عرض الساعة', 'warning', 'zap'), timer_inline(holes or '00:12:48', 'warning', 'clock', 'السعر ثابت ')))
    lim = '<span style="font-size: 12px; color: %s">%s</span>' % (C['mu'], limit) if limit else ''
    return ('<article style="display: flex; flex-direction: column; gap: 10px; padding: 14px 0; border-bottom: 1px solid %s"><div style="display: flex; gap: 12px"><div style="width: 80px; flex: none">%s</div>'
            '<div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0"><h3 style="margin: 0; font-size: 14px; line-height: 22px; font-weight: 600">%s</h3><span style="font-size: 12px; color: %s">%s</span>%s%s</div>'
            '<button type="button" aria-label="حذف %s من السلة" style="width: 44px; height: 44px; flex: none; border: 0; background: transparent; color: %s; display: inline-flex; align-items: center; justify-content: center">%s</button></div>'
            '%s<div style="display: flex; align-items: center; justify-content: space-between">%s%s</div></article>') % (
        C['s200'], art(k, radius=6), name, C['mu'], opts, sar(price, 14, 600, compact=False), lim, name, C['mu'], ic('trash', 18), sp, stepper(qty, locked=locked), sar(price * qty, 16, 700))

def shipment(n, vendor, platform, eta, fee, items):
    who = ('%s سوق الزل' % ic('seal', 16, C['g7'])) if platform else vendor
    return ('<section style="display: flex; flex-direction: column; padding: 14px 16px; background: %s; border: 1px solid %s; border-radius: 12px">'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 4px"><h2 style="margin: 0; font-size: 15px; display: inline-flex; align-items: center; gap: 6px">شحنة %s · %s</h2>'
            '<span style="font-size: 12px; color: %s; display: inline-flex; align-items: center; gap: 4px">%s%s</span></div>%s'
            '<div style="display: flex; justify-content: space-between; padding-top: 10px; font-size: 13px; color: %s"><span>شحن هذه الشحنة (تقديري للرياض)</span>%s</div></section>') % (
        C['w'], C['s200'], num(n), who, C['mu'], ic('truck', 16), eta, items, C['mu'], sar(fee, 13, 600))

def cart_items():
    return (shipment(1, 'سوق الزل', True, '1–2 يوم', 25, cart_item('agal', 'عقال مرعز أسود — شغل يدوي', 'مقاس 58', 185, 1) + cart_item('saffron', 'زعفران سوبر نقي — 10 جرام', 'علبة زجاج', 145, 2)) +
            shipment(2, 'دار المثال', False, '2–3 أيام', 35, cart_item('bisht', 'بشت حساوي يدوي — زري ذهبي', 'مقاس 56 · أسود · من طلب PR-10023', 1500, 2, 'lock', True, 'الكمية والسعر مقفولان حسب العرض المقبول', '{{c7.all}}')) +
            shipment(3, 'مباخر النموذج', False, '2–4 أيام', 30, cart_item('mabkhara', 'مبخرة نحاس مطعّمة', 'مقاس متوسط', 512, 1, 'flash', True, 'السعر ثابت لك والكمية تتأكد عند الدفع · قطعة واحدة لكل عميل', '{{c3.all}}')))

def summary(compact=False, coupon=True):
    r = lambda a, b, strong=False: '<div style="display: flex; justify-content: space-between; font-size: %dpx; %s"><span style="color: %s">%s</span>%s</div>' % (16 if strong else 14, 'font-weight: 700;' if strong else '', C['ink'] if strong else C['mu'], a, b)
    cp = ('<div style="display: flex; gap: 8px; align-items: flex-end"><div style="flex: 1">%s</div>%s</div>' % (field('كود الخصم', '', 'أدخل الكود', fid='cp'), btn('تطبيق', 'secondary', 'md'))) if coupon else ''
    return ('<section aria-label="ملخص الطلب" style="display: flex; flex-direction: column; gap: 12px; padding: 16px; background: %s; border: 1px solid %s; border-radius: 12px"><h2 style="margin: 0; font-size: 16px">ملخص الطلب</h2>%s%s%s%s%s%s'
            '<p style="margin: 0; font-size: 12px; color: %s">يشمل ضريبة القيمة المضافة 15%%: %s</p><div style="display: flex; gap: 8px; align-items: center; padding: 10px 12px; background: %s; border-radius: 8px; font-size: 13px">%s<span>أو 4 دفعات بقيمة <strong>%s</strong> عبر تابي أو تمارا</span></div></section>') % (
        C['w'], C['s200'], cp, r('المنتجات (6)', sar(3987, 14, 600)), r('الخصم', '<span style="font-size: 14px; color: %s">—</span>' % C['mu']), r('الشحن (3 شحنات)', sar(90, 14, 600)), hr(), r('الإجمالي', sar(4077, 20, 700), True),
        C['mu'], sar(531.78, 12, 600, C['mu']), C['s100'], ic('cal', 18, C['b7']), num('1,019.25 ر.س'))

def cart_m():
    sticky = ('<div style="position: absolute; bottom: 0; inset-inline: 0; z-index: 6; background: %s; border-top: 1px solid %s; padding: 10px 16px 16px; box-shadow: 0 -4px 16px rgba(22,18,14,.08)">%s</div>' % (
        C['w'], C['s200'], btn('إتمام الطلب · 4,077.00 ر.س', 'primary', 'lg', 'lock', True, href='Checkout-mobile.dc.html')))
    body = (header_m(back='#', title='السلة (6)') +
            '<div style="padding: 16px 16px 120px; display: flex; flex-direction: column; gap: 14px">%s%s%s</div>' % (
                banner('السعر المقفول وسعر العرض لهما مهلة', 'أكمل الدفع قبل انتهاء العداد. بعدها يرجع العنصر بالسعر الحالي (لو متوفر) ونوضح لك الفرق.', 'info', 'clock'), cart_items(), summary()) + sticky)
    OUT['Cart-mobile.dc.html'] = doc('السلة — جوال', body, 390, 2400, js=timer_js(TJ))

def steps_bar(cur=2):
    labels = ['العنوان والشحن', 'الدفع والمراجعة', 'تم الطلب']   # 3 steps (frontend review #16)
    cur = min(cur, 2)
    out = '<ol aria-label="خطوات الدفع" style="list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px">'
    for i, l in enumerate(labels):
        done, on = i < cur, i == cur
        out += ('<li%s style="display: flex; flex-direction: column; gap: 6px"><span aria-hidden="true" style="height: 3px; border-radius: 999px; background: %s"></span>'
                '<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: %d; color: %s">%s%s<span style="position: absolute; width: 1px; height: 1px; overflow: hidden">%s</span></span></li>') % (
            ' aria-current="step"' if on else '', C['ink'] if done or on else C['s200'], 700 if on else 500, C['ink'] if done or on else C['mu'], ic('check', 14) if done else '', l, '، مكتملة' if done else '')
    return out + '</ol>'

def done_step(title, body):
    return ('<section style="display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; background: %s; border: 1px solid %s; border-radius: 12px">'
            '<span style="width: 24px; height: 24px; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center; flex: none">%s</span>'
            '<div style="display: flex; flex-direction: column; gap: 2px; flex: 1"><h2 style="margin: 0; font-size: 14px">%s</h2><p style="margin: 0; font-size: 13px; color: %s; line-height: 20px">%s</p></div>'
            '<button type="button" style="min-height: 44px; padding: 0 8px; border: 0; background: transparent; color: %s; font-family: inherit; font-size: 13px; font-weight: 600; text-decoration: underline">تغيير</button></section>') % (
        C['w'], C['s200'], C['su'], C['w'], ic('check', 14, C['w'], 2.5), title, C['mu'], body, C['g7'])

def pay_methods():
    card_fields = ('<div style="display: flex; flex-direction: column; gap: 12px; padding: 0 14px 14px">'
                   '<p style="margin: 0; font-size: 12px; color: %s; display: flex; gap: 6px; align-items: center">%sحقول البطاقة تُعرض داخل نموذج Moyasar الآمن ولا تمر على خوادمنا</p>%s'
                   '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">%s%s</div>%s</div>') % (
        C['mu'], ic('lock', 14), field('رقم البطاقة', '', '0000 0000 0000 0000', fid='cn', prefix_icon='card'), field('تاريخ الانتهاء', '', 'MM / YY', fid='ce'), field('رمز CVV', '', '•••', fid='cv'), field('اسم حامل البطاقة', '', 'كما هو على البطاقة', fid='ch'))
    m = (radio_row('مدى', 'بطاقة مدى البنكية', True, 'pm1', 'pm', '<span style="font-size: 12px; padding: 2px 8px; border: 1px solid %s; border-radius: 4px">mada</span>' % C['line'], card_fields) +
         radio_row('Apple Pay', 'ادفع بلمسة من جهازك', False, 'pm2', 'pm') + radio_row('بطاقة ائتمانية', 'Visa · Mastercard', False, 'pm3', 'pm') + radio_row('STC Pay', None, False, 'pm4', 'pm') +
         radio_row('تابي', 'قسّمها على 4 دفعات بدون فوائد · 1,019.25 ر.س شهرياً', False, 'pm5', 'pm') + radio_row('تمارا', 'ادفع لاحقاً أو قسّمها · 1,019.25 ر.س شهرياً', False, 'pm6', 'pm'))
    return ('<fieldset style="border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px"><legend style="padding: 0 0 10px; font-size: 18px; font-weight: 700">طريقة الدفع</legend>%s</fieldset>' % m)

def shipments_preview():
    rows = ''.join('<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 0; border-bottom: 1px solid %s; font-size: 14px"><span>%s</span><span style="color: %s">%s</span>%s</div>' % (
        C['s100'], v, C['mu'], e, sar(f, 14, 600)) for v, e, f in (('شحنة 1 · سوق الزل', '1–2 يوم', 25), ('شحنة 2 · دار المثال', '2–3 أيام', 35), ('شحنة 3 · مباخر النموذج', '2–4 أيام', 30)))
    return ('<section style="display: flex; flex-direction: column; gap: 6px; padding: 24px; background: %s; border: 1px solid %s; border-radius: 12px"><h2 style="margin: 0; font-size: 18px">الشحنات إلى الرياض</h2>'
            '<p style="margin: 0; font-size: 14px; color: %s">الرسوم والمدة لكل تاجر تُحسب من العنوان. لا يوجد اختيار شركة شحن للعميل.</p>%s</section>') % (C['w'], C['s200'], C['mu'], rows)

def checkout_header():
    return ('<header style="background: %s; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; min-height: 60px">%s<span style="display: inline-flex; align-items: center; gap: 6px; color: %s; font-size: 13px">%sدفع آمن</span></header>' % (
        C['ink'], logo(True, 17), C['ondark'], ic('lock', 16, C['g5'])))

def checkout_m():
    sticky = ('<div style="position: absolute; bottom: 0; inset-inline: 0; z-index: 6; background: %s; border-top: 1px solid %s; padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 -4px 16px rgba(22,18,14,.08)">%s'
              '<p style="margin: 0; font-size: 12px; color: %s; text-align: center">بالضغط توافق على <a href="#">الشروط والأحكام</a> و<a href="#">سياسة الاسترجاع</a></p></div>') % (C['w'], C['s200'], btn('ادفع 4,077.00 ر.س', 'primary', 'lg', 'lock', True), C['mu'])
    body = (checkout_header() + '<div style="padding: 16px 16px 150px; display: flex; flex-direction: column; gap: 14px">%s%s%s%s%s%s</div>' % (
        steps_bar(1), done_step('العنوان والشحن', 'المنزل · محمد ع. · الرياض، حي الملقا · <bdi dir="ltr">05X XXX XX12</bdi><br>3 شحنات: سوق الزل (1–2 يوم، 25.00 ر.س) · دار المثال (2–3 أيام، 35.00 ر.س) · مباخر النموذج (2–4 أيام، 30.00 ر.س)'),
        '',
        banner('الأسعار المتفق عليها سارية', 'سعر الفصال محجوز لك 23:12:09، وسعر عرض الساعة ثابت 00:12:48 (الكمية تتأكد عند الدفع).', 'info', 'lock'), pay_methods(), summary(coupon=False)) + sticky)
    OUT['Checkout-mobile.dc.html'] = doc('الدفع (Checkout) — جوال', body, 390, 2500)

def checkout_d():
    addr = ('<section style="display: flex; flex-direction: column; gap: 14px; padding: 24px; background: %s; border: 1px solid %s; border-radius: 12px"><h2 style="margin: 0; font-size: 20px">عنوان التوصيل</h2>'
            '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s%s</div>'
            '<button type="button" aria-expanded="true" style="display: flex; align-items: center; gap: 8px; min-height: 44px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 15px; font-weight: 600; color: %s">%sعنوان جديد</button>'
            '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px">%s%s%s%s%s%s%s%s</div>%s</section>') % (
        C['w'], C['s200'], radio_row('المنزل', 'الرياض، حي الملقا · 05x xxx xx12', True, 'a1', 'ad'), radio_row('العمل', 'الرياض، حي العليا · 05x xxx xx12', False, 'a2', 'ad'), C['g7'], ic('plus', 18),
        field('اسم المستلم', '', 'الاسم الكامل', fid='an'), field('جوال المستلم', '', '05x xxx xxxx', fid='ap', prefix_icon='phone'), select('المدينة', 'الرياض', 'ac'), field('الحي', '', 'مثال: الملقا', fid='ad1'),
        field('الشارع', '', 'اسم الشارع', fid='as'), field('رقم المبنى', '', '0000', fid='ab'), field('الرمز البريدي', '', '00000', fid='az'), field('العنوان الوطني المختصر (اختياري)', '', 'ABCD1234', fid='aw', helper='يسرّع التوصيل ويقلل الأخطاء'),
        row(check('اجعله العنوان الافتراضي', True, 'adf') + '<span style="margin-inline-start: auto">%s</span>' % btn('متابعة إلى الشحن', 'primary', 'lg', icon_end='chev-l'), 12))
    side = ('<aside style="width: 400px; flex: none; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px">'
            '<section style="display: flex; flex-direction: column; gap: 10px; padding: 16px; background: %s; border: 1px solid %s; border-radius: 12px"><h2 style="margin: 0; font-size: 16px">طلبك (3 شحنات)</h2>%s</section>%s</aside>') % (
        C['w'], C['s200'], ''.join('<div style="display: flex; gap: 10px; align-items: center; padding: 6px 0"><div style="width: 48px; flex: none">%s</div><div style="display: flex; flex-direction: column; flex: 1; min-width: 0"><span style="font-size: 13px; font-weight: 600">%s</span><span style="font-size: 12px; color: %s">%s</span>%s</div>%s</div>' % (
            art(k, radius=4), n, C['mu'], v, s, sar(pr, 13, 700)) for k, n, v, s, pr in (
            ('agal', 'عقال مرعز أسود × 1', 'سوق الزل', '', 185), ('saffron', 'زعفران سوبر × 2', 'سوق الزل', '', 290),
            ('bisht', 'بشت حساوي يدوي × 2', 'دار المثال', pill('سعر فصال مقفول', 'info', 'lock'), 3000), ('mabkhara', 'مبخرة نحاس مطعّمة × 1', 'مباخر النموذج', pill('عرض الساعة', 'warning', 'zap'), 512))), summary())
    body = checkout_header().replace('padding: 8px 16px', 'padding: 8px 32px') + ('<main style="padding: 24px 32px 64px"><div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">'
            '<div style="max-width: 640px">%s</div><div style="display: flex; gap: 32px; align-items: flex-start"><div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px">%s'
            '<section style="padding: 18px 24px; border: 1px solid %s; border-radius: 12px; color: %s; font-size: 15px; font-weight: 600">2. الدفع والمراجعة</section></div>%s</div></div></main>') % (
        steps_bar(0), addr + shipments_preview(), C['s200'], C['mu'], side)
    OUT['Checkout-desktop.dc.html'] = doc('الدفع (Checkout) — ديسكتوب', body, 1440, 1240, fluid=True)

def cart_states():
    hd = header_m(back='#', title='السلة')
    load = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s%s</div>' % (skel('100%', 200, 12), skel('100%', 170, 12), skel('100%', 240, 12))
    empty = hd + state_panel('سلتك فاضية', 'ابدأ من مختاراتنا، أو ادخل سوق الزل وشوف عروض الساعة.', 'bag', btn('تسوّق الآن', 'primary', 'md', full=True, href='Home-mobile.dc.html') + btn('ادخل سوق الزل', 'secondary', 'md', 'zap', True, href='Souq-mobile.dc.html'))
    payerr = checkout_header() + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s%s</div>' % (
        banner('ما اكتمل الدفع', 'ما انخصم منك شيء، وحجزنا منتجاتك 30 دقيقة. جرّب مرة ثانية أو اختر طريقة دفع أخرى.', 'danger', 'alert'),
        radio_row('مدى', 'تم رفض العملية من البنك', True, 'e1', 'e'), radio_row('Apple Pay', None, False, 'e2', 'e')) + '<div style="padding: 0 16px">%s</div>' % btn('حاول الدفع مرة ثانية', 'primary', 'lg', 'refresh', True)
    lockx = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s</div>' % (
        banner('انتهى حجز سعر الفصال', 'انتهت مهلة 24 ساعة لعرض دار المثال، فرجع البشت بسعره الحالي 1,790.00 ر.س بدل 1,500.00 ر.س. تقدر تكمل أو تحذفه أو تطلب سعرك من جديد.', 'warning', 'lock', row(btn('اطلب سعرك من جديد', 'secondary', 'md', 'hand'), 8)),
        shipment(2, 'دار المثال', False, '2–3 أيام', 35, cart_item('bisht', 'بشت حساوي يدوي — زري ذهبي', 'مقاس 56 · أسود', 1790, 2)))
    flash = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s</div>' % (
        banner('انتهى حجز عرض الساعة', 'سعر المبخرة رجع من 512.00 إلى 640.00 ر.س. حدّثنا الإجمالي، وتقدر تكمل أو تحذفها.', 'warning', 'clock'),
        shipment(3, 'مباخر النموذج', False, '2–4 أيام', 30, cart_item('mabkhara', 'مبخرة نحاس مطعّمة', 'مقاس متوسط', 640, 1)))
    stock = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">%s%s</div>' % (
        banner('تغيّرت الكمية المتاحة', 'زعفران سوبر: باقي قطعة واحدة فقط، فعدّلنا الكمية من 2 إلى 1.', 'warning', 'alert'),
        shipment(1, 'سوق الزل', True, '1–2 يوم', 25, cart_item('saffron', 'زعفران سوبر نقي — 10 جرام', 'علبة زجاج', 145, 1)))
    panels = (phone_panel('تحميل', load, kind='تحميل') + phone_panel('فارغ: السلة فاضية', empty, kind='فارغ') + phone_panel('خطأ: فشل الدفع', payerr, kind='خطأ') + phone_panel('مهلة: انتهاء PriceLock', lockx, kind='مهلة') +
              phone_panel('مهلة: انتهاء قفل عرض الساعة (15 د)', flash, kind='مهلة') + phone_panel('تغيّر المخزون', stock, kind='تنبيه'))
    body = '<div style="padding: 40px; display: grid; grid-template-columns: repeat(4, 390px); gap: 40px">%s</div>' % panels
    OUT['Cart-states.dc.html'] = doc('السلة والدفع — الحالات', body, 1760, 1720)

def build():
    souq_m(); souq_d(); souq_states()
    offers_m(); offers_d(); offers_states()
    cart_m(); checkout_m(); checkout_d(); cart_states()
    return OUT
