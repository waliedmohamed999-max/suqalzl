# -*- coding: utf-8 -*-
"""P0-18: missing store screens: account, bundle, order success, policy pages, search / all products."""
from lib import *
from screens_admin import status_timeline, kv, card2, textarea

OUT = {}
W = C['w']

ACC_NAV = [('bag', 'طلباتي', 'AccountOrders-mobile.dc.html'), ('hand', 'طلبات الأسعار والفصال', 'Offers-mobile.dc.html'), ('heart', 'المفضلة', 'AccountWishlist-mobile.dc.html'),
           ('pin', 'العناوين', 'AccountAddresses-mobile.dc.html'), ('return', 'الاسترجاع', 'AccountReturn-mobile.dc.html'), ('user', 'بياناتي', 'AccountProfile-mobile.dc.html')]

def acc_tabs(sel):
    out = '<nav aria-label="حسابي" style="display: flex; gap: 8px; overflow-x: auto; padding: 12px 16px; border-bottom: 1px solid %s">' % C['s200']
    for i, (icn, t, h) in enumerate(ACC_NAV):
        on = i == sel
        out += (f'<a href="{h}"{" aria-current=\"page\"" if on else ""} style="display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1px solid {C["ink"] if on else C["line"]}; '
                f'background: {C["ink"] if on else W}; color: {C["s50"] if on else C["ink"]}; font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap; flex: none">{ic(icn, 16)}{t}</a>')
    return out + '</nav>'

def order_card(n, date, st, total, items, eta=None):
    thumbs = ''.join(f'<span style="width: 48px; flex: none">{art(k, radius=4)}</span>' for k in items)
    return (f'<a href="AccountOrder-mobile.dc.html" style="display: flex; flex-direction: column; gap: 10px; padding: 14px; background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px; text-decoration: none; color: {C["ink"]}">'
            f'<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px"><strong style="font-size: 16px"><bdi dir="ltr">{n}</bdi></strong>{pill(*st)}</div>'
            f'<span style="font-size: 14px; color: {C["mu"]}">{date} · {len(items)} منتجات</span><div style="display: flex; gap: 6px">{thumbs}</div>'
            f'<div style="display: flex; justify-content: space-between; align-items: center"><span style="font-size: 14px; color: {C["b7"]}">{eta or ""}</span>{sar(total, 16, 700)}</div></a>')

def acc_orders():
    body = (header_m(back='#', title='حسابي', search=False) + acc_tabs(0) +
            '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">'
            + row(chip('الكل', True) + chip('قيد التنفيذ') + chip('مكتملة') + chip('ملغاة'), 8, extra=' overflow-x: auto')
            + order_card('SZ-100231', '17 نوفمبر 2026', ('قيد التنفيذ', 'info', 'truck'), 4077, ['agal', 'saffron', 'bisht', 'mabkhara'], 'وصلت شحنة من 3 · الباقي خلال 2–3 أيام')
            + order_card('SZ-100140', '2 نوفمبر 2026', ('تم التسليم', 'success', 'check'), 950, ['oud'], 'سُلّم 5 نوفمبر')
            + order_card('SZ-100088', '20 أكتوبر 2026', ('مكتمل', 'success', 'check'), 3210, ['bisht', 'agal'])
            + order_card('SZ-100054', '2 أكتوبر 2026', ('ملغي', 'neutral'), 640, ['mabkhara']) + '</div>' + footer_m())
    OUT['AccountOrders-mobile.dc.html'] = doc('حسابي — طلباتي — جوال', body, 390, 1900)

def shipment_block(n, vendor, platform, st, tl, items, carrier=None, actions=''):
    who = (f'{ic("seal", 16, C["g7"])} سوق الزل') if platform else vendor
    it = ''.join(f'<div style="display: flex; gap: 10px; align-items: center"><span style="width: 52px; flex: none">{art(k, radius=4)}</span><span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 14px; font-weight: 600">{nm}</span>'
                 f'<span style="font-size: 12px; color: {C["mu"]}">{op} · × {num(q)}</span></span>{sar(p * q, 14, 600)}</div>' for k, nm, op, q, p in items)
    tr = ''
    if carrier:
        tr = (f'<div style="display: flex; flex-direction: column; gap: 6px; padding: 12px; background: {C["s100"]}; border-radius: 8px"><span style="font-size: 12px; color: {C["mu"]}">التتبع</span>'
              f'<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px"><span style="font-size: 14px; font-weight: 600">{carrier}</span><bdi dir="ltr" style="font-size: 14px">[رقم التتبع]</bdi></div>'
              f'<div style="display: flex; gap: 8px">{btn("تتبع الشحنة", "secondary", "md", "truck", extra=" flex: 1;")}{btn("نسخ الرقم", "ghost", "md")}</div></div>')
    return (f'<section style="display: flex; flex-direction: column; gap: 12px; padding: 16px; background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px">'
            f'<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px"><h2 style="margin: 0; font-size: 16px; display: inline-flex; align-items: center; gap: 6px">شحنة {num(n)} · {who}</h2>{pill(*st)}</div>'
            f'{it}{tr}<details{" open=\"open\"" if carrier else ""}><summary style="min-height: 44px; display: flex; align-items: center; cursor: pointer; font-size: 14px; font-weight: 600; color: {C["b7"]}">مراحل الشحنة</summary>{status_timeline(tl)}</details>{actions}</section>')

def acc_order():
    s1 = shipment_block(1, 'سوق الزل', True, ('تم التسليم', 'success', 'check'), [(pill('تم التسليم', 'success', 'check'), 'استلمه: محمد ع.', '19 نوفمبر 4:10 م', None), (pill('تم الشحن', 'info', 'truck'), 'سوق الزل', '18 نوفمبر', None), (pill('قيد التجهيز', 'accent', 'box'), 'سوق الزل', '17 نوفمبر', None)],
                        [('agal', 'عقال مرعز أسود', 'مقاس 58', 1, 185), ('saffron', 'زعفران سوبر 10 جرام', 'علبة زجاج', 2, 145)], '[شركة الشحن]',
                        row(btn('طلب استرجاع', 'secondary', 'md', 'return', href='AccountReturn-mobile.dc.html', extra=' flex: 1;') + btn('قيّم المنتجات', 'ghost', 'md', 'star', extra=' flex: 1;'), 8)
                        + f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}">الاسترجاع متاح حتى 26 نوفمبر حسب <a href="Policy-mobile.dc.html">سياسة الاسترجاع</a>.</p>')
    s2 = shipment_block(2, 'دار المثال', False, ('تم الشحن', 'info', 'truck'), [(pill('تم الشحن', 'info', 'truck'), 'دار المثال', 'اليوم 10:42 ص', 'الوصول المتوقع 21 نوفمبر'), (pill('قيد التجهيز', 'accent', 'box'), 'دار المثال', 'أمس', None)],
                        [('bisht', 'بشت حساوي يدوي — زري ذهبي', '56 · أسود · سعر فصال', 2, 1500)], '[شركة الشحن]')
    s3 = shipment_block(3, 'مباخر النموذج', False, ('قيد التجهيز', 'accent', 'box'), [(pill('قيد التجهيز', 'accent', 'box'), 'مباخر النموذج', 'اليوم', 'متوقع الشحن خلال يوم')], [('mabkhara', 'مبخرة نحاس مطعّمة', 'متوسط', 1, 512)])
    r = lambda a, b, s=False: f'<div style="display: flex; justify-content: space-between; font-size: {16 if s else 14}px; {"font-weight: 700;" if s else ""}"><span style="color: {C["ink"] if s else C["mu"]}">{a}</span>{b}</div>'
    summ = card2('ملخص الدفع', r('المنتجات', sar(3987, 14, 600)) + r('الشحن', sar(90, 14, 600)) + hr() + r('الإجمالي', sar(4077, 16, 700), True) + f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}">يشمل ضريبة القيمة المضافة {sar(531.78, 12, 600, C["mu"])} · مدى •••• 4421</p>'
                 + btn('تحميل الفاتورة (PDF)', 'secondary', 'md', 'file', True), '', 16)
    addr = card2('عنوان التوصيل', f'<p style="margin: 0; font-size: 14px; color: {C["b7"]}">محمد ع. · الرياض، حي الملقا، شارع [اسم الشارع] · <bdi dir="ltr">05X XXX XX12</bdi></p>', '', 16)
    body = (header_m(back='AccountOrders-mobile.dc.html', title='الطلب SZ-100231', search=False) +
            f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px"><div style="display: flex; flex-direction: column; gap: 4px"><span style="font-size: 14px; color: {C["mu"]}">17 نوفمبر 2026 · 3 شحنات</span>'
            f'<div style="display: flex; gap: 6px; flex-wrap: wrap">{pill("مدفوع", "success", "check")}{pill("شُحن جزئياً", "info", "truck")}</div></div>{s1}{s2}{s3}{summ}{addr}'
            f'{btn("تحتاج مساعدة؟ تواصل معنا", "ghost", "md", "msg", True)}</div>' + footer_m())
    OUT['AccountOrder-mobile.dc.html'] = doc('حسابي — تفاصيل الطلب والتتبع — جوال', body, 390, 3100)

def acc_addresses():
    a = lambda t, l, d: (f'<article style="display: flex; flex-direction: column; gap: 8px; padding: 14px; background: {W}; border: {"1.5px" if d else "1px"} solid {C["ink"] if d else C["s200"]}; border-radius: 12px">'
                         f'<div style="display: flex; justify-content: space-between; align-items: center"><strong style="font-size: 16px">{t}</strong>{pill("الافتراضي", "accent", "check") if d else ""}</div>'
                         f'<p style="margin: 0; font-size: 14px; color: {C["b7"]}">{l}</p><div style="display: flex; gap: 8px">{btn("تعديل", "secondary", "md", "edit", extra=" flex: 1;")}'
                         + ('' if d else btn('اجعله الافتراضي', 'ghost', 'md', extra=' flex: 1;')) + f'{icbtn("trash", "حذف العنوان " + t, border=C["line"], bg=W)}</div></article>')
    form = (f'<section style="display: flex; flex-direction: column; gap: 12px; padding: 16px; background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px"><h2 style="margin: 0; font-size: 16px">عنوان جديد</h2>'
            + field('اسم العنوان', '', 'المنزل، العمل…', fid='al') + field('اسم المستلم', '', 'الاسم الكامل', fid='an') + field('جوال المستلم', '', '05X XXX XXXX', fid='ap', prefix_icon='phone')
            + select('المدينة', 'اختر المدينة', 'ac') + f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">{field("الحي", "", fid="ad")}{field("رقم المبنى", "", fid="ab")}</div>'
            + field('الشارع', '', fid='as') + field('العنوان الوطني المختصر (اختياري)', '', 'ABCD1234', fid='aw', helper='يسرّع التوصيل') + btn('حفظ العنوان', 'primary', 'lg', full=True) + '</section>')
    body = (header_m(back='#', title='حسابي', search=False) + acc_tabs(3) + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">'
            + a('المنزل', 'محمد ع. · الرياض، حي الملقا، شارع [اسم الشارع]، مبنى 0000 · <bdi dir="ltr">05X XXX XX12</bdi>', True) + a('العمل', 'محمد ع. · الرياض، حي العليا · <bdi dir="ltr">05X XXX XX12</bdi>', False)
            + form + '</div>' + footer_m())
    OUT['AccountAddresses-mobile.dc.html'] = doc('حسابي — العناوين — جوال', body, 390, 2200)

def acc_wishlist():
    items = [P[1], P[2], dict(P[3], name='عقال مرعز أسود — نفد', price=185), P[5]]
    grid = '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 12px">%s</div>' % ''.join(product_card(p) for p in items)
    body = (header_m(back='#', title='حسابي', search=False) + acc_tabs(2) + f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px"><div style="display: flex; justify-content: space-between; align-items: center"><h1 style="margin: 0; font-size: 20px">المفضلة (4)</h1>'
            f'{btn("أضف الكل للسلة", "ghost", "md", "bag")}</div>{banner("نزل سعر منتج في مفضلتك", "دهن عود كمبودي صار 950.00 ر.س بدل 1,100.00 ر.س.", "info", "tag")}{grid}</div>' + footer_m())
    OUT['AccountWishlist-mobile.dc.html'] = doc('حسابي — المفضلة — جوال', body, 390, 1900)

def acc_return():
    items = ''.join(f'<label style="display: flex; gap: 12px; align-items: center; padding: 12px; border: {"1.5px" if on else "1px"} solid {C["ink"] if on else C["s200"]}; border-radius: 8px; background: {W}">'
                    f'<input type="checkbox" class="sr"{" checked=\"checked\"" if on else ""}><span aria-hidden="true" style="width: 22px; height: 22px; border-radius: 4px; border: 1.5px solid {C["ink"] if on else C["ctl"]}; background: {C["ink"] if on else W}; display: inline-flex; align-items: center; justify-content: center">{ic("check", 14, C["s50"], 2.5) if on else ""}</span>'
                    f'<span style="width: 52px; flex: none">{art(k, radius=4)}</span><span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 14px; font-weight: 600">{n}</span><span style="font-size: 12px; color: {C["mu"]}">{o}</span></span>'
                    + (stepper(1, 'كمية الاسترجاع') if on and k == 'saffron' else sar(p, 14, 600)) + '</label>' for k, n, o, p, on in (('agal', 'عقال مرعز أسود', 'مقاس 58 · × 1', 185, True), ('saffron', 'زعفران سوبر 10 جرام', '× 2', 145, True)))
    reasons = ''.join(radio_row(r, None, i == 0, f'rr{i}', 'rr') for i, r in enumerate(('المقاس غير مناسب', 'المنتج تالف أو به عيب', 'غير مطابق للوصف أو الصور', 'وصلني منتج خطأ', 'سبب آخر')))
    photos = (f'<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">صور المنتج (مطلوبة للتالف)</span><div style="display: flex; gap: 8px"><span style="width: 88px">{art("agal", ratio="1 / 1", radius=8)}</span>'
              f'<button type="button" style="width: 88px; aspect-ratio: 1 / 1; border: 1px dashed {C["line"]}; border-radius: 8px; background: {W}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-family: inherit; font-size: 12px; color: {C["b7"]}">{ic("upload", 20)}أضف صورة</button></div></div>')
    body = (header_m(back='AccountOrder-mobile.dc.html', title='طلب استرجاع', search=False) +
            f'<div style="padding: 16px 16px 120px; display: flex; flex-direction: column; gap: 18px">{banner("الشحنة 1 · سوق الزل · الطلب SZ-100231", "الاسترجاع متاح حتى 26 نوفمبر. المبلغ يرجع لنفس وسيلة الدفع بعد استلام المنتج وفحصه.", "info", "return")}'
            f'<fieldset style="border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px"><legend style="padding: 0 0 8px; font-size: 16px; font-weight: 700">وش تبي ترجّع؟</legend>{items}</fieldset>'
            f'<fieldset style="border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px"><legend style="padding: 0 0 8px; font-size: 16px; font-weight: 700">السبب</legend>{reasons}</fieldset>'
            f'{textarea("تفاصيل إضافية (اختياري)", "", "rd", 3)}{photos}'
            f'<div style="display: flex; justify-content: space-between; padding: 12px 14px; border: 1px dashed {C["line"]}; border-radius: 8px"><span style="font-size: 14px; color: {C["mu"]}">المبلغ المتوقع استرجاعه</span>{sar(330, 16, 700)}</div>'
            f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}">المبلغ النهائي تحدده الإدارة بعد الفحص. رسوم الشحن حسب <a href="Policy-mobile.dc.html">سياسة الاسترجاع</a>.</p></div>'
            f'<div style="position: absolute; bottom: 0; inset-inline: 0; background: {W}; border-top: 1px solid {C["s200"]}; padding: 10px 16px 16px">{btn("أرسل طلب الاسترجاع", "primary", "lg", "send", True)}</div>')
    OUT['AccountReturn-mobile.dc.html'] = doc('حسابي — طلب استرجاع — جوال', body, 390, 1700)

def acc_profile():
    body = (header_m(back='#', title='حسابي', search=False) + acc_tabs(5) + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px">'
            + card2('بياناتي', field('الاسم', 'محمد ع.', fid='pn') + field('رقم الجوال', '+966 55 XXX XX12', fid='pp', prefix_icon='phone', helper='تغيير الرقم يحتاج رمز تحقق على الرقم الجديد')
                    + field('البريد الإلكتروني (اختياري)', '', 'name@example.com', fid='pe') + select('اللغة', 'العربية', 'pl') + btn('حفظ', 'primary', 'md', full=True), '', 16)
            + card2('الإشعارات والتسويق', toggle('رسائل حالة الطلبات (SMS)', True, 'أساسية لتتبع طلباتك') + toggle('عروض وتخفيضات بالواتساب والرسائل', False, 'موافقتك اختيارية ويمكن سحبها بأي وقت (D19)')
                    + toggle('إشعارات عروض الفصال', True), '', 16)
            + card2('الخصوصية', f'<p style="margin: 0; font-size: 14px; color: {C["mu"]}">حسب نظام حماية البيانات الشخصية تقدر تطلب نسخة من بياناتك أو حذف حسابك.</p>'
                    + btn('طلب نسخة من بياناتي', 'secondary', 'md', 'file', True) + btn('حذف الحساب', 'danger', 'md', 'trash', True) + btn('تسجيل الخروج', 'ghost', 'md', 'logout', True), '', 16)
            + '</div>' + footer_m())
    OUT['AccountProfile-mobile.dc.html'] = doc('حسابي — بياناتي — جوال', body, 390, 2000)

def acc_desktop():
    nav = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if i == 0 else ""} style="display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px; border-radius: 8px; text-decoration: none; font-size: 14px; color: {C["ink"]}; '
                  f'background: {C["s100"] if i == 0 else "transparent"}; font-weight: {700 if i == 0 else 400}; border-inline-start: 3px solid {C["ink"] if i == 0 else "transparent"}">{ic(icn, 18, C["b7"])}{t}</a>' for i, (icn, t, h) in enumerate(ACC_NAV))
    orders = ''.join(order_card(*a) for a in (('SZ-100231', '17 نوفمبر 2026', ('قيد التنفيذ', 'info', 'truck'), 4077, ['agal', 'saffron', 'bisht', 'mabkhara'], 'وصلت شحنة من 3'),
                                             ('SZ-100140', '2 نوفمبر 2026', ('تم التسليم', 'success', 'check'), 950, ['oud'], 'سُلّم 5 نوفمبر'), ('SZ-100088', '20 أكتوبر 2026', ('مكتمل', 'success', 'check'), 3210, ['bisht', 'agal'], None)))
    body = (header_d() + f'<main style="padding: 24px 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">{breadcrumbs(["الرئيسية", "حسابي", "طلباتي"])}'
            f'<div style="display: flex; gap: 32px; align-items: flex-start"><aside style="width: 260px; flex: none; display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: center; gap: 10px; padding: 14px; background: {C["s100"]}; border-radius: 12px">{avatar("م", s=44)}'
            f'<div style="display: flex; flex-direction: column"><strong>محمد ع.</strong><span style="font-size: 12px; color: {C["mu"]}"><bdi dir="ltr">+966 55 XXX XX12</bdi></span></div></div><nav aria-label="حسابي" style="display: flex; flex-direction: column; gap: 2px">{nav}</nav></aside>'
            f'<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px"><div style="display: flex; justify-content: space-between; align-items: center"><h1 style="margin: 0; font-size: 28px">طلباتي</h1>'
            f'{row(chip("الكل", True) + chip("قيد التنفيذ") + chip("مكتملة") + chip("ملغاة"), 8)}</div><div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">{orders}</div></div></div></div></main>' + footer_d())
    OUT['Account-desktop.dc.html'] = doc('حسابي — ديسكتوب', body, 1440, 1400, fluid=True)

def acc_states():
    hd = header_m(back='#', title='حسابي', search=False)
    p = (phone_panel('فارغ: لا طلبات', hd + acc_tabs(0) + state_panel('ما عندك طلبات للحين', 'أول طلب يظهر هنا مع تتبع كل شحنة.', 'bag', btn('ابدأ التسوق', 'primary', 'md', full=True, href='Home-mobile.dc.html')), kind='فارغ')
         + phone_panel('فارغ: المفضلة', hd + acc_tabs(2) + state_panel('مفضلتك فاضية', 'اضغط القلب على أي منتج لحفظه هنا، ونبلغك لو نزل سعره.', 'heart', btn('تصفّح المنتجات', 'primary', 'md', full=True)), kind='فارغ')
         + phone_panel('فارغ: العناوين', hd + acc_tabs(3) + state_panel('ما فيه عناوين محفوظة', 'أضف عنوانك مرة وحدة ويُستخدم في كل طلب.', 'pin', btn('أضف عنواناً', 'primary', 'md', 'plus', True)), kind='فارغ')
         + phone_panel('تحميل', hd + acc_tabs(0) + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s</div>' % ''.join(skel('100%', 150, 12) for _ in range(3)), kind='تحميل')
         + phone_panel('خطأ', hd + acc_tabs(0) + state_panel('تعذّر تحميل طلباتك', 'طلباتك محفوظة. حدّث الصفحة بعد لحظات.', 'alert', btn('إعادة المحاولة', 'primary', 'md', 'refresh', True), 'danger'), kind='خطأ')
         + phone_panel('خارج مدة الاسترجاع', header_m(back='#', title='طلب استرجاع', search=False) + state_panel('انتهت مدة الاسترجاع لهذه الشحنة', 'سُلّمت قبل أكثر من المدة المحددة في السياسة. لو المنتج فيه عيب تواصل معنا.', 'clock', btn('تواصل معنا', 'secondary', 'md', 'msg', True), 'warning'), kind='مهلة')
         + phone_panel('تأكيد حذف الحساب', hd + f'<div style="flex: 1; background: {C["s100"]}"></div><div aria-hidden="true" style="position: absolute; inset: 0; background: {C["scrim"]}"></div>'
                       f'<div role="alertdialog" aria-modal="true" aria-labelledby="dz" style="position: absolute; inset-inline: 0; bottom: 0; background: {C["s50"]}; border-radius: 12px 12px 0 0; padding: 20px 16px; display: flex; flex-direction: column; gap: 12px">'
                       f'<h2 id="dz" style="margin: 0; font-size: 18px">حذف حسابك نهائياً؟</h2><p style="margin: 0; font-size: 14px; color: {C["b7"]}">نحذف بياناتك الشخصية خلال 30 يوماً، ونحتفظ بالفواتير المطلوبة نظاماً. طلبات الأسعار المفتوحة تُلغى.</p>'
                       + field('للتأكيد، أدخل رمز التحقق المرسل لجوالك', '', '6 أرقام', fid='dzc') + btn('حذف الحساب', 'primary', 'lg', 'trash', True, disabled=True) + btn('رجوع', 'ghost', 'md', full=True) + '</div>', kind='تأكيد')
         + phone_panel('نجاح: أُرسل طلب الاسترجاع', header_m(back='#', title='طلب استرجاع', search=False) + state_panel('وصلنا طلب الاسترجاع', 'رقم الطلب <bdi dir="ltr">RT-2042</bdi>. نرد عليك خلال يومي عمل بتعليمات الإرجاع.', 'check', btn('تابع الطلب', 'primary', 'md', full=True), 'success'), kind='نجاح'))
    OUT['Account-states.dc.html'] = doc('حسابي — الحالات', f'<div style="padding: 40px; display: grid; grid-template-columns: repeat(4, 390px); gap: 40px">{p}</div>', 1760, 1720)

# --------------------------------------------------------------- bundle
def bundle_items(desktop=False):
    out = ''
    for k, n, opt, p, pick in (('bisht', 'بشت حساوي مخيط يدوياً', None, 1850, True), ('agal', 'عقال مرعز أسود', 'مقاس 58', 185, False), ('oud', 'دهن عود كمبودي — 12 مل', 'الحجم الوحيد', 950, False)):
        ch = ''
        if pick:
            ch = (f'<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px"><span style="font-size: 14px; font-weight: 600">المقاس</span>{row("".join(option_chip(s, s == "56", s == "62") for s in ("54", "56", "58", "60", "62")), 8, wrap=True)}'
                  f'<span style="font-size: 14px; font-weight: 600">اللون</span>{row(swatch("أسود", "#1B1714", True) + swatch("بني", "#5A3D2B"), 6)}</div>')
        out += (f'<li style="display: flex; gap: 12px; padding: 14px; background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px"><span style="width: {88 if desktop else 72}px; flex: none">{art(k, radius=6)}</span>'
                f'<div style="flex: 1; display: flex; flex-direction: column; gap: 4px"><a href="Product-mobile.dc.html" style="font-size: 14px; font-weight: 600; color: {C["ink"]}; text-decoration: none">{n}</a>'
                f'<span style="font-size: 12px; color: {C["mu"]}">{opt or "اختر الخيار"} · منفصلاً {sar(p, 12, 600, C["mu"])}</span>{ch}</div></li>')
    return f'<ol aria-label="محتويات الباقة" style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px">{out}</ol>'

def bundle_price():
    return (f'<div style="display: flex; flex-direction: column; gap: 4px"><div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap">{sar(2690, 24, 700)}{sar(2985, 16, 400, C["mu"], strike=True)}'
            f'{pill("توفّر 295.00 ر.س", "success", "tag")}</div><span style="font-size: 12px; color: {C["mu"]}">السعر شامل ضريبة القيمة المضافة · كل المنتجات من سوق الزل وتُشحن معاً</span></div>')

def bundle_m():
    gal = f'<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 6px; padding: 0 16px"><span style="grid-row: span 2">{art("bisht", radius=8)}</span>{art("agal", ratio="1 / 1", radius=8)}{art("oud", ratio="1 / 1", radius=8)}</div>'
    sticky = (f'<div style="position: absolute; bottom: 0; inset-inline: 0; background: {W}; border-top: 1px solid {C["s200"]}; padding: 10px 16px 16px; display: flex; align-items: center; gap: 12px">'
              f'<div style="display: flex; flex-direction: column">{sar(2690, 18, 700)}<span style="font-size: 12px; color: {C["su"]}">توفير 295.00 ر.س</span></div>{btn("أضف الباقة للسلة", "primary", "lg", "bag", extra=" flex: 1;")}</div>')
    body = (header_m(search=False) + f'<div style="padding: 8px 16px">{breadcrumbs(["الرئيسية", "الباقات", "باقة المناسبة"])}</div>' + gal +
            f'<div style="padding: 16px 16px 120px; display: flex; flex-direction: column; gap: 16px"><div style="display: flex; flex-direction: column; gap: 6px"><span style="display: inline-flex; gap: 4px; align-items: center; font-size: 14px; font-weight: 600; color: {C["g7"]}">{ic("gift", 16)}باقة</span>'
            f'<h1 style="margin: 0; font-size: 24px">باقة المناسبة: بشت + عقال + دهن عود</h1></div>{bundle_price()}<h2 style="margin: 0; font-size: 18px">محتويات الباقة (3)</h2>{bundle_items()}'
            f'{banner("الكمية المتاحة", "متوفرة 3 باقات بهذه الخيارات. الباقة تُرجع كاملة أو حسب سياسة الاسترجاع.", "info", "box")}</div>' + sticky)
    OUT['Bundle-mobile.dc.html'] = doc('صفحة الباقة — جوال', body, 390, 2000)

def bundle_d():
    gal = f'<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px"><span style="grid-row: span 2">{art("bisht", radius=12)}</span>{art("agal", ratio="1 / 1", radius=12)}{art("oud", ratio="1 / 1", radius=12)}</div>'
    info = (f'<div style="display: flex; flex-direction: column; gap: 18px; position: sticky; top: 16px"><span style="display: inline-flex; gap: 4px; align-items: center; font-size: 14px; font-weight: 600; color: {C["g7"]}">{ic("gift", 16)}باقة</span>'
            f'<h1 style="margin: 0; font-size: 28px">باقة المناسبة: بشت + عقال + دهن عود</h1>{bundle_price()}{bundle_items(True)}<div style="display: flex; gap: 10px">{stepper(1)}{btn("أضف الباقة للسلة", "primary", "lg", "bag", extra=" flex: 1;")}</div></div>')
    body = (header_d() + f'<main style="padding: 20px 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px">{breadcrumbs(["الرئيسية", "الباقات", "باقة المناسبة"])}'
            f'<div style="display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 56px; align-items: start">{gal}{info}</div></div></main>' + footer_d())
    OUT['Bundle-desktop.dc.html'] = doc('صفحة الباقة — ديسكتوب', body, 1440, 1700, fluid=True)

# ------------------------------------------------------------- success
def success_content(desktop=False):
    steps = status_timeline([(pill('الآن', 'info'), 'وصلتك رسالة تأكيد على جوالك وإيميلك', '', None), (pill('خلال 24 ساعة', 'accent', 'box'), 'كل تاجر يجهز شحنته', '', None),
                             (pill('عند الشحن', 'info', 'truck'), 'نرسل لك شركة الشحن ورقم التتبع لكل شحنة', '', None), (pill('بعد التسليم', 'success', 'check'), 'قيّم منتجاتك، والاسترجاع متاح حسب السياسة', '', None)])
    ship = ''.join(f'<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid {C["s100"]}; font-size: 14px"><span>شحنة {num(i + 1)} · {v}</span><span style="color: {C["mu"]}">{e}</span></div>' for i, (v, e) in enumerate(
        (('سوق الزل', '1–2 يوم'), ('دار المثال', '2–3 أيام'), ('مباخر النموذج', '2–4 أيام'))))
    return (f'<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: {40 if desktop else 28}px 0 8px">'
            f'<span aria-hidden="true" style="width: 72px; height: 72px; border-radius: 50%; background: {C["subg"]}; color: {C["su"]}; display: inline-flex; align-items: center; justify-content: center">{ic("check", 36, C["su"], 2.5)}</span>'
            f'<h1 style="margin: 0; font-size: {36 if desktop else 28}px">تم الطلب، شكراً لك</h1><p style="margin: 0; font-size: 16px; color: {C["b7"]}">رقم طلبك <bdi dir="ltr"><strong>SZ-100231</strong></bdi> · مدفوع {sar(4077, 16, 700)} بمدى</p>{ornament(C["g6"], 40)}</div>'
            f'{card2("الشحنات (3)", ship, "", 16)}{card2("وش اللي بعده؟", steps, "", 16)}'
            f'<div style="display: flex; flex-direction: {"row" if desktop else "column"}; gap: 10px">{btn("تتبع طلبك", "primary", "lg", "truck", not desktop, href="AccountOrder-mobile.dc.html")}{btn("كمّل التسوق", "secondary", "lg", full=not desktop, href="Home-mobile.dc.html")}</div>'
            f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}; text-align: center">الصفحة تُعرض بعد تأكيد الدفع من الـ webhook. لو الدفع ما تأكد بعد، تظهر حالة "نتحقق من الدفع" (Success-states).</p>')

def success_m():
    body = f'<header data-surface="inverse-strong" style="background: {C["ink"]}; padding: 8px 16px; display: flex; justify-content: center; min-height: 60px; align-items: center">{logo(True, 17)}</header>' + \
        f'<div style="padding: 0 16px 32px; display: flex; flex-direction: column; gap: 16px">{success_content()}</div>' + footer_m()
    OUT['OrderSuccess-mobile.dc.html'] = doc('نجاح الطلب — جوال', body, 390, 2050)

def success_d():
    body = header_d() + f'<main style="padding: 24px 32px 64px"><div style="max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">{success_content(True)}</div></main>' + footer_d()
    OUT['OrderSuccess-desktop.dc.html'] = doc('نجاح الطلب — ديسكتوب', body, 1440, 1500, fluid=True)

def success_states():
    hd = f'<header data-surface="inverse-strong" style="background: {C["ink"]}; padding: 8px 16px; display: flex; justify-content: center; min-height: 60px; align-items: center">{logo(True, 17)}</header>'
    p = (phone_panel('نتحقق من الدفع', hd + f'<div style="display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 48px 24px; text-align: center"><span aria-hidden="true" class="pulse" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid {C["s200"]}; border-top-color: {C["ink"]}"></span>'
                     f'<h2 role="status" style="margin: 0; font-size: 20px">نتحقق من الدفع مع البنك…</h2><p style="margin: 0; font-size: 14px; color: {C["mu"]}">عادةً ثوانٍ. لا تقفل الصفحة ولا تدفع مرة ثانية.</p></div>', kind='تحميل')
         + phone_panel('تأخر التأكيد (مهلة)', hd + state_panel('الدفع قيد التأكيد', 'ما وصلنا تأكيد البنك للحين. لو انخصم المبلغ، طلبك محفوظ ونرسل لك رسالة أول ما يتأكد. حجزنا المنتجات 30 دقيقة.', 'clock',
                                                                 btn('افتح طلباتي', 'primary', 'md', full=True) + btn('تواصل معنا', 'secondary', 'md', 'msg', True), 'warning'), kind='مهلة')
         + phone_panel('فشل الدفع', hd + state_panel('ما اكتمل الدفع', 'ما انخصم منك شيء. منتجاتك ما زالت في السلة ومحجوزة 30 دقيقة.', 'alert', btn('ارجع للدفع', 'primary', 'md', full=True, href='Checkout-mobile.dc.html'), 'danger'), kind='خطأ'))
    OUT['OrderSuccess-states.dc.html'] = doc('نجاح الطلب — الحالات', f'<div style="padding: 40px; display: flex; gap: 40px">{p}</div>', 1330, 880)

# -------------------------------------------------------------- policy
POL_TOC = ['مدة الاسترجاع', 'الشروط', 'المنتجات غير القابلة للاسترجاع', 'طريقة الطلب', 'استرداد المبلغ', 'تواصل معنا']

def policy_content():
    secs = ''
    for i, t in enumerate(POL_TOC):
        secs += (f'<section id="p{i}" style="display: flex; flex-direction: column; gap: 8px"><h2 style="margin: 0; font-size: 20px">{num(i + 1)}. {t}</h2>'
                 f'<p style="margin: 0; font-size: 16px; line-height: 28px; color: {C["b7"]}">[نص توضيحي لقسم «{t}». المحتوى النهائي من legal-contracts و arabic-content-seo ويُدار من الإدارة ← المحتوى ← الصفحات.]</p></section>')
    return secs

def policy_m():
    toc = ''.join(f'<li><a href="#p{i}" style="display: flex; min-height: 44px; align-items: center; font-size: 14px">{num(i + 1)}. {t}</a></li>' for i, t in enumerate(POL_TOC))
    body = (header_m(search=False) + f'<div style="padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 18px">{breadcrumbs(["الرئيسية", "الاسترجاع والاستبدال"])}'
            f'<div style="display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 28px">الاسترجاع والاستبدال</h1><span style="font-size: 12px; color: {C["mu"]}">آخر تحديث: 15 نوفمبر 2026</span></div>'
            f'<details style="padding: 0 14px; border: 1px solid {C["s200"]}; border-radius: 8px; background: {W}"><summary style="min-height: 48px; display: flex; align-items: center; cursor: pointer; font-weight: 600">محتويات الصفحة</summary><ol style="list-style: none; margin: 0; padding: 0 0 8px">{toc}</ol></details>'
            f'{policy_content()}{card2("عندك سؤال؟", btn("تواصل معنا عبر واتساب", "secondary", "md", "msg", True), "", 16)}</div>' + footer_m() + wa_float())
    OUT['Policy-mobile.dc.html'] = doc('صفحة سياسة /pages/[slug] — جوال', body, 390, 2300)

def policy_d():
    toc = ''.join(f'<li><a href="#p{i}"{" aria-current=\"true\"" if i == 0 else ""} style="display: flex; min-height: 40px; align-items: center; padding-inline-start: 12px; border-inline-start: 2px solid {C["ink"] if i == 0 else C["s200"]}; font-size: 14px; color: {C["ink"] if i == 0 else C["b7"]}; text-decoration: none; font-weight: {700 if i == 0 else 400}">{t}</a></li>' for i, t in enumerate(POL_TOC))
    others = ''.join(f'<li><a href="#" style="display: flex; min-height: 40px; align-items: center; font-size: 14px">{t}</a></li>' for t in ('الشحن والتوصيل', 'الخصوصية', 'الشروط والأحكام', 'الأسئلة الشائعة'))
    body = (header_d() + f'<main style="padding: 24px 32px 64px"><div style="max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">{breadcrumbs(["الرئيسية", "الاسترجاع والاستبدال"])}'
            f'<div style="display: flex; gap: 48px; align-items: flex-start"><aside style="width: 260px; flex: none; position: sticky; top: 16px; display: flex; flex-direction: column; gap: 20px"><nav aria-label="محتويات الصفحة"><h2 style="margin: 0 0 8px; font-size: 14px; color: {C["mu"]}">في هذه الصفحة</h2><ol style="list-style: none; margin: 0; padding: 0">{toc}</ol></nav>'
            f'<nav aria-label="سياسات أخرى"><h2 style="margin: 0 0 8px; font-size: 14px; color: {C["mu"]}">سياسات أخرى</h2><ul style="list-style: none; margin: 0; padding: 0">{others}</ul></nav></aside>'
            f'<article style="flex: 1; max-width: 720px; display: flex; flex-direction: column; gap: 24px"><div style="display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 36px">الاسترجاع والاستبدال</h1><span style="font-size: 14px; color: {C["mu"]}">آخر تحديث: 15 نوفمبر 2026</span></div>{policy_content()}</article></div></div></main>' + footer_d())
    OUT['Policy-desktop.dc.html'] = doc('صفحة سياسة /pages/[slug] — ديسكتوب', body, 1440, 1700, fluid=True)

# --------------------------------------------------------------- search
def search_box(q='بشت'):
    return (f'<div style="background: {C["ink"]}; padding: 0 16px 12px" data-surface="inverse-strong"><label for="sq" style="display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 8px 0 14px; border-radius: 8px; background: {C["b9"]}; color: {C["ondark"]}">'
            f'{ic("search", 18)}<span class="sr">بحث</span><input id="sq" type="search" value="{q}" style="flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-family: inherit; font-size: 16px; color: {C["s50"]}">'
            f'{icbtn("x", "مسح البحث", True, size=36)}</label></div>')

def search_m():
    items = [P[0], P[1], dict(P[0], name='بشت صيفي خفيف — كتان', price=980, was=1150, vendor='فراء التجربة', platform=False, r=4.6, n=20), dict(P[1], name='بشت ملكي — زري فضي', price=2900, vendor='سوق الزل', platform=True, bargain=False)]
    grid = '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 12px">%s</div>' % ''.join(product_card(p) for p in items)
    body = (header_m(search=False) + search_box() +
            f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px"><div style="display: flex; flex-direction: column; gap: 2px"><h1 style="margin: 0; font-size: 20px">نتائج «بشت»</h1><span style="font-size: 14px; color: {C["mu"]}">{num(52)} منتج في 3 تصنيفات</span></div>'
            + row(chip('الكل', True, count=52) + chip('البشوت', count=48) + chip('الشالات', count=3) + chip('الباقات', count=1), 8, extra=' overflow-x: auto')
            + f'<div style="display: flex; gap: 8px">{btn("تصفية", "secondary", "md", "sliders", extra=" flex: 1;", href="Category-filters-mobile.dc.html")}{btn("الأكثر صلة", "secondary", "md", "sort", extra=" flex: 1;")}</div>{grid}'
            f'{btn("عرض المزيد", "secondary", "md", full=True)}</div>' + footer_m())
    OUT['Search-mobile.dc.html'] = doc('البحث وكل المنتجات /search — جوال', body, 390, 2300)

def search_d():
    items = [P[0], P[1], P[2], P[4], P[5], P[7]]
    grid = '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px 24px">%s</div>' % ''.join(product_card(p, href='Product-desktop.dc.html') for p in items)
    facets = ''.join(f'<section style="padding: 14px 0; border-bottom: 1px solid {C["s200"]}"><h2 style="margin: 0 0 8px; font-size: 16px">{t}</h2>{inner}</section>' for t, inner in (
        ('التصنيف', ''.join(check(a, a == 'الكل', 'sf%d' % i, c) for i, (a, c) in enumerate((('الكل', 248), ('البشوت', 48), ('المباخر', 31), ('العود ودهن العود', 26), ('العقل', 22))))),
        ('السعر', f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">{field("من", "", "0", suffix="ر.س", fid="sp1")}{field("إلى", "", "25,000", suffix="ر.س", fid="sp2")}</div>'),
        ('خيارات', toggle('يقبل الفصال') + toggle('عليه خصم') + toggle('متوفر فقط', True))))
    body = (header_d() + f'<main style="padding: 24px 32px 64px"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">{breadcrumbs(["الرئيسية", "كل المنتجات"])}'
            f'<div style="display: flex; align-items: flex-end; justify-content: space-between"><div style="display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 36px">كل المنتجات</h1><span style="color: {C["mu"]}">{num(248)} منتج · /products · نفس الصفحة تعرض نتائج /search?q=</span></div>'
            f'<div style="width: 220px">{select(None, "الأحدث", "ss", compact=True)}</div></div>'
            f'<div style="display: flex; gap: 32px; align-items: flex-start"><aside aria-label="التصفية" style="width: 280px; flex: none">{facets}</aside><div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px">{grid}'
            f'{row(btn("التالي", "secondary", icon_end="chev-l"), 8, justify="center")}</div></div></div></main>' + footer_d())
    OUT['Search-desktop.dc.html'] = doc('كل المنتجات والبحث — ديسكتوب', body, 1440, 2100, fluid=True)

def search_states():
    hd = header_m(search=False)
    sugg = row(''.join(chip(s) for s in ('بشت حساوي', 'دهن عود', 'مبخرة', 'زعفران سوبر', 'عقال مرعز')), 8, wrap=True)
    zero = hd + search_box('سداري حرير') + state_panel('ما لقينا «سداري حرير»', 'جرّب كلمة أقصر أو تصنيفاً قريباً، أو اطلب المنتج بسعرك من التجار مباشرة.', 'search',
                                                    btn('اطلب منتج بسعرك', 'bargain', 'md', 'hand', True, href='RequestNew-mobile.dc.html') + f'<div style="display: flex; flex-direction: column; gap: 8px; text-align: start"><span style="font-size: 14px; font-weight: 600">عمليات بحث شائعة</span>{sugg}</div>')
    norm = hd + search_box('اسداري') + f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">{banner("نعرض نتائج «سداري»", "البحث يطبّع الهمزات والتاء المربوطة والألف المقصورة. <a href=\"#\">ابحث عن «اسداري» بالضبط</a>", "info", "info")}<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">{product_card(P[1], cta=False)}{product_card(P[2], cta=False)}</div></div>'
    idle = hd + search_box('') + (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 18px"><div style="display: flex; flex-direction: column; gap: 8px"><div style="display: flex; justify-content: space-between; align-items: center"><span style="font-size: 14px; font-weight: 600">عمليات بحثك الأخيرة</span>'
                                  f'<button type="button" style="min-height: 44px; border: 0; background: transparent; color: {C["g7"]}; font-family: inherit; font-size: 14px; text-decoration: underline">مسح</button></div>{row(chip("بشت حساوي", icon="clock") + chip("مبخرة", icon="clock"), 8, wrap=True)}</div>'
                                  f'<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 14px; font-weight: 600">الأكثر بحثاً</span>{sugg}</div></div>')
    load = hd + search_box() + '<div style="padding: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">%s</div>' % ''.join(col(skel('100%', 210, 8) + skel('80%', 12) + skel('50%', 16), 8) for _ in range(4))
    err = hd + search_box() + state_panel('تعذّر البحث', 'صار خلل مؤقت. جرّب مرة ثانية.', 'alert', btn('إعادة المحاولة', 'primary', 'md', 'refresh', True), 'danger')
    p = (phone_panel('قبل الكتابة', idle, kind='فارغ') + phone_panel('لا نتائج', zero, kind='فارغ') + phone_panel('تطبيع البحث العربي', norm, kind='حالة') + phone_panel('تحميل', load, kind='تحميل') + phone_panel('خطأ', err, kind='خطأ'))
    OUT['Search-states.dc.html'] = doc('البحث — الحالات', f'<div style="padding: 40px; display: grid; grid-template-columns: repeat(3, 390px); gap: 40px">{p}</div>', 1330, 1720)

def build():
    acc_orders(); acc_order(); acc_addresses(); acc_wishlist(); acc_return(); acc_profile(); acc_desktop(); acc_states()
    bundle_m(); bundle_d(); success_m(); success_d(); success_states(); policy_m(); policy_d(); search_m(); search_d(); search_states()
    return OUT
