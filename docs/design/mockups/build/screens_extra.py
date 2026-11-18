# -*- coding: utf-8 -*-
from lib import *

OUT = {}

# ============================================================ LOGIN / OTP
def login_hero():
    return ('<div data-surface="inverse" style="background: %s; padding: 32px 24px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start">%s%s'
            '<h1 style="margin: 0; font-size: 28px; color: %s">أهلاً بك</h1><p style="margin: 0; font-size: 16px; color: %s">ادخل برقم جوالك. نرسل لك رمز تحقق، بدون كلمة مرور.</p></div>') % (
        C['b9'], logo(True, 20), ornament(C['g5'], 40), C['s50'], C['ondark'])

def phone_field(val='', err=None, fid='ph'):
    bd = C['da'] if err else C['line']
    out = ('<div style="display: flex; flex-direction: column; gap: 6px"><label for="%s" style="font-size: 14px; font-weight: 600">رقم الجوال</label>'
           '<div style="display: flex; align-items: center; min-height: 52px; border: 1px solid %s; border-radius: 8px; background: %s; overflow: hidden;%s">'
           '<span style="padding: 0 14px; align-self: stretch; display: inline-flex; align-items: center; border-inline-end: 1px solid %s; background: %s; font-size: 16px; font-weight: 600"><bdi dir="ltr">+966</bdi></span>'
           '<input id="%s" type="tel" dir="ltr" inputmode="tel" autocomplete="tel-national" value="%s" placeholder="5X XXX XXXX" aria-describedby="%s-d"%s style="flex: 1; min-width: 0; border: 0; outline: none; padding: 0 14px; font-family: inherit; font-size: 16px; text-align: end; background: transparent"></div>') % (
        fid, bd, C['w'], (' box-shadow: 0 0 0 1px %s;' % C['da']) if err else '', C['s200'], C['s100'], fid, val, fid, ' aria-invalid="true"' if err else '')
    if err:
        out += '<p id="%s-d" style="margin: 0; display: flex; gap: 6px; font-size: 14px; color: %s">%s<span>%s</span></p>' % (fid, C['da'], ic('alert', 16), err)
    else:
        out += '<p id="%s-d" style="margin: 0; font-size: 12px; color: %s">رقم سعودي يبدأ بـ 5. يقبل الأرقام العربية ٠–٩.</p>' % (fid, C['mu'])
    return out + '</div>'

def otp_boxes(vals, err=False):
    return otp6(''.join(vals), err)

def _old_otp_boxes(vals, err=False):
    return ('<div role="group" aria-label="رمز التحقق من 4 أرقام" style="display: flex; gap: 12px; justify-content: center; direction: ltr">%s</div>' % ''.join(
        '<input aria-label="الرقم %d" value="%s" inputmode="numeric" autocomplete="%s" maxlength="1" style="width: 60px; height: 60px; text-align: center; font-size: 24px; font-weight: 700; border: %s solid %s; border-radius: 8px; background: %s; font-family: inherit">' % (
            i + 1, v, 'one-time-code' if i == 0 else 'off', '2px' if (v or err) else '1px', C['da'] if err else (C['ink'] if v else C['line']), C['w']) for i, v in enumerate(vals)))

def login_m():
    body = (header_m(back='#', title='تسجيل الدخول', search=False).replace(icbtn('bag', 'السلة', True, 3), '') + login_hero() +
            '<div style="padding: 24px 16px; display: flex; flex-direction: column; gap: 18px">%s%s%s%s</div>' % (
                phone_field('55 123 4567'), btn('أرسل رمز التحقق', 'primary', 'lg', full=True, href='OTP-mobile.dc.html'),
                '<p style="margin: 0; font-size: 12px; color: %s; line-height: 20px">بالمتابعة توافق على <a href="#">الشروط والأحكام</a> و<a href="#">سياسة الخصوصية</a>. نستخدم رقمك لتأكيد طلباتك وطلبات الأسعار فقط.</p>' % C['mu'],
                '%s<a href="Login-staff-desktop.dc.html" style="display: flex; align-items: center; justify-content: center; min-height: 44px; font-size: 14px; font-weight: 600">دخول التجار والإدارة بالبريد</a>' % hr()))
    OUT['Login-mobile.dc.html'] = doc('تسجيل الدخول بالجوال — جوال', body, 390, 844)

def otp_m():
    body = (header_m(back='Login-mobile.dc.html', title='رمز التحقق', search=False).replace(icbtn('bag', 'السلة', True, 3), '') +
            '<div style="padding: 32px 16px; display: flex; flex-direction: column; gap: 20px; align-items: stretch">'
            '<div style="display: flex; flex-direction: column; gap: 6px; text-align: center"><h1 style="margin: 0; font-size: 24px">أدخل الرمز</h1><p style="margin: 0; font-size: 16px; color: %s">أرسلنا رمزاً من 6 أرقام إلى <bdi dir="ltr">+966 55 123 4567</bdi></p>'
            '<a href="Login-mobile.dc.html" style="min-height: 44px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600">تغيير الرقم</a></div>%s'
            '<p role="status" style="margin: 0; font-size: 14px; color: %s; text-align: center">إعادة الإرسال بعد <bdi dir="ltr">00:42</bdi></p>%s%s</div>') % (
        C['mu'], otp_boxes(('4', '7', '1', '9', '0', '')), C['mu'], btn('تحقق ودخول', 'primary', 'lg', full=True),
        '<p style="margin: 0; font-size: 12px; color: %s; text-align: center">الرمز صالح 5 دقائق. يُعبأ تلقائياً من الرسالة على الأجهزة التي تدعم ذلك.</p>' % C['mu'])
    OUT['OTP-mobile.dc.html'] = doc('رمز التحقق OTP — جوال', body, 390, 844)

def login_d():
    body = (header_d().split('<nav aria-label="التصنيفات"')[0] +
            '<main style="flex: 1; padding: 56px 32px"><div style="max-width: 960px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; border: 1px solid %s; border-radius: 12px; overflow: hidden; background: %s">'
            '<div data-surface="inverse" style="background: %s; padding: 48px; display: flex; flex-direction: column; gap: 16px; justify-content: center">%s%s<h1 style="margin: 0; font-size: 36px; color: %s">أهلاً بك في سوق الزل</h1>'
            '<p style="margin: 0; font-size: 16px; color: %s">تابع طلباتك، وطلبات الأسعار والفصال، وعناوينك ومفضلتك من مكان واحد.</p></div>'
            '<div style="padding: 48px; display: flex; flex-direction: column; gap: 18px; justify-content: center"><h2 style="margin: 0; font-size: 24px">الدخول برقم الجوال</h2>%s%s'
            '<p style="margin: 0; font-size: 12px; color: %s">بالمتابعة توافق على <a href="#">الشروط والأحكام</a> و<a href="#">سياسة الخصوصية</a>.</p></div></div></main>') % (
        C['s200'], C['w'], C['b9'], logo(True, 20), ornament(C['g5'], 48), C['s50'], C['ondark'], phone_field('55 123 4567', fid='phd'), btn('أرسل رمز التحقق', 'primary', 'lg', full=True), C['mu']) + footer_d()
    OUT['Login-desktop.dc.html'] = doc('تسجيل الدخول — ديسكتوب', body, 1440, 1100, fluid=True)

def staff_d():
    body = ('<main style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px 24px; background: %s"><div style="width: 100%%; max-width: 440px; display: flex; flex-direction: column; gap: 20px; padding: 40px; background: %s; border: 1px solid %s; border-radius: 12px">'
            '<div style="display: flex; justify-content: center">%s</div><div style="display: flex; flex-direction: column; gap: 4px; text-align: center"><h1 style="margin: 0; font-size: 24px">دخول التجار والإدارة</h1><p style="margin: 0; font-size: 14px; color: %s">بالبريد وكلمة المرور، ثم رمز تحقق لجوالك المسجل.</p></div>'
            '%s%s<div style="display: flex; justify-content: space-between; align-items: center">%s<a href="#" style="min-height: 44px; display: inline-flex; align-items: center; font-size: 14px; font-weight: 600">نسيت كلمة المرور؟</a></div>%s%s'
            '<p style="margin: 0; font-size: 14px; color: %s; text-align: center">تاجر جديد؟ <a href="#">سجّل متجرك</a></p></div></main>') % (
        C['s100'], C['w'], C['s200'], logo(False, 20), C['mu'], field('البريد الإلكتروني', 'owner@example.com', fid='em'),
        field('كلمة المرور', '••••••••••', fid='pw', helper='8 أحرف على الأقل'), check('تذكرني على هذا الجهاز', False, 'rm'), btn('دخول', 'primary', 'lg', full=True), hr(), C['mu'])
    OUT['Login-staff-desktop.dc.html'] = doc('دخول التجار والإدارة — ديسكتوب', body, 1440, 900, fluid=True)

def login_states():
    hd = header_m(back='#', title='رمز التحقق', search=False).replace(icbtn('bag', 'السلة', True, 3), '')
    wrong = hd + '<div style="padding: 32px 16px; display: flex; flex-direction: column; gap: 16px">%s<p role="alert" style="margin: 0; display: flex; gap: 6px; justify-content: center; font-size: 14px; color: %s">%s<span>الرمز غير صحيح. باقي لك 3 محاولات.</span></p>%s</div>' % (
        otp_boxes(('4', '7', '1', '9', '0', '3'), True), C['da'], ic('alert', 16), btn('تحقق ودخول', 'primary', 'lg', full=True))
    sending = hd + '<div style="padding: 32px 16px; display: flex; flex-direction: column; gap: 16px">%s%s</div>' % (otp_boxes(('4', '7', '1', '9', '0', '3')), btn('جارٍ التحقق…', 'primary', 'lg', full=True, disabled=True))
    locked = hd + state_panel('محاولات كثيرة', 'لحماية حسابك أوقفنا إرسال الرموز لهذا الرقم مؤقتاً. حاول مرة ثانية بعد ساعة.', 'lock', '<p style="margin: 0; font-size: 14px; color: %s">تقدر تطلب رمزاً جديداً بعد <bdi dir="ltr">58:12</bdi></p>' % C['mu'] + btn('تواصل معنا', 'secondary', 'md', 'msg', True), 'danger')
    expired = hd + '<div style="padding: 32px 16px; display: flex; flex-direction: column; gap: 16px">%s%s%s</div>' % (otp_boxes(('4', '7', '1', '', '', '')), banner('انتهت صلاحية الرمز', 'مرّت 5 دقائق. اطلب رمزاً جديداً وأكمل.', 'warning', 'clock'), btn('أرسل رمزاً جديداً', 'primary', 'lg', 'refresh', True))
    badphone = header_m(back='#', title='تسجيل الدخول', search=False).replace(icbtn('bag', 'السلة', True, 3), '') + '<div style="padding: 24px 16px; display: flex; flex-direction: column; gap: 16px">%s%s</div>' % (
        phone_field('12 345', 'الرقم ناقص. اكتب 9 أرقام تبدأ بـ 5.', 'phe'), btn('أرسل رمز التحقق', 'primary', 'lg', full=True))
    neterr = header_m(back='#', title='تسجيل الدخول', search=False).replace(icbtn('bag', 'السلة', True, 3), '') + '<div style="padding: 24px 16px; display: flex; flex-direction: column; gap: 16px">%s%s%s</div>' % (
        phone_field('55 123 4567', fid='phn'), banner('ما قدرنا نرسل الرمز', 'مشكلة مؤقتة في خدمة الرسائل. حاول بعد دقيقة.', 'danger', 'alert'), btn('حاول مرة ثانية', 'primary', 'lg', 'refresh', True))
    panels = (phone_panel('خطأ تحقق: رقم غير صالح', badphone, kind='خطأ') + phone_panel('تحميل: التحقق', sending, kind='تحميل') + phone_panel('خطأ: رمز غير صحيح', wrong, kind='خطأ') +
              phone_panel('مهلة: الرمز انتهى', expired, kind='مهلة') + phone_panel('حد المحاولات (5/ساعة)', locked, kind='حد') + phone_panel('خطأ: فشل إرسال SMS', neterr, kind='خطأ'))
    body = '<div style="padding: 40px; display: grid; grid-template-columns: repeat(3, 390px); gap: 40px">%s</div>' % panels
    OUT['Login-states.dc.html'] = doc('الدخول و OTP — الحالات', body, 1330, 1720)

# ===================================================== /souq/request/new
def request_new():
    cats = '<div role="radiogroup" aria-label="التصنيف" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px">%s</div>' % ''.join(
        '<button type="button" role="radio" aria-checked="%s" style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; min-height: 88px; border-radius: 8px; border: %s solid %s; background: %s; font-family: inherit; font-size: 12px; font-weight: 600; color: %s">%s%s</button>' % (
            'true' if k == 'sword' else 'false', '2px' if k == 'sword' else '1px', C['ink'] if k == 'sword' else C['line'], C['w'], C['ink'],
            '<span style="width: 48px">%s</span>' % art(k, ratio='1 / 1', radius=4, label=n), n) for k, n in CATS[1:9])
    desc = ('<div style="display: flex; flex-direction: column; gap: 6px"><label for="rd" style="font-size: 14px; font-weight: 600">صف المنتج اللي تبيه</label>'
            '<textarea id="rd" rows="4" aria-describedby="rd-d" style="border: 1px solid %s; border-radius: 8px; padding: 10px 14px; font-family: inherit; font-size: 16px; background: %s; resize: vertical">سيف عربي بغمد فضي منقوش، طول النصل 80 سم تقريباً، للإهداء.</textarea>'
            '<p id="rd-d" style="margin: 0; display: flex; justify-content: space-between; font-size: 12px; color: %s"><span>بدون أرقام تواصل أو روابط</span><bdi dir="ltr">62/500</bdi></p></div>') % (C['line'], C['w'], C['mu'])
    imgs = ('<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">صور مرجعية (اختياري، حتى 3)</span><div style="display: flex; gap: 8px">'
            '<div style="position: relative; width: 96px">%s<button type="button" aria-label="حذف الصورة" style="position: absolute; top: -6px; inset-inline-end: -6px; width: 44px; height: 44px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center"><span style="width: 26px; height: 26px; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center">%s</span></button></div>'
            '<button type="button" style="width: 96px; aspect-ratio: 1 / 1; border: 1px dashed %s; border-radius: 8px; background: %s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-family: inherit; font-size: 12px; color: %s">%sأضف صورة</button></div>'
            '<p style="margin: 0; font-size: 12px; color: %s">JPG أو PNG أو WebP، حتى 5 ميجا للصورة.</p></div>') % (art('sword', ratio='1 / 1', radius=8), C['ink'], C['s50'], ic('x', 14), C['line'], C['w'], C['b7'], ic('upload', 20), C['mu'])
    body = (header_m(back='Souq-mobile.dc.html', title='اطلب منتج بسعرك', search=False) +
            '<div style="padding: 16px 16px 120px; display: flex; flex-direction: column; gap: 20px">%s<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 14px; font-weight: 600">التصنيف</span>%s</div>%s%s'
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">%s%s</div>%s%s</div>') % (
        banner('طلب مفتوح', 'يوصل لكل التجار المعتمدين في تصنيف السيوف (7 تجار)، وكل واحد يرد بمنتج من منتجاته.', 'info', 'users'), cats, desc, imgs,
        field('سعرك للقطعة', '4,500', suffix='ر.س', fid='rp', big=True), field('الكمية', '1', fid='rq'), select('مدينة التوصيل', 'الدمام', 'rc'),
        '<p style="margin: 0; font-size: 12px; color: %s; text-align: center">الطلب مفتوح 48 ساعة · باقي لك <bdi dir="ltr">3</bdi> من <bdi dir="ltr">5</bdi> طلبات مفتوحة</p>' % C['mu']) + \
        '<div style="position: absolute; bottom: 0; inset-inline: 0; background: %s; border-top: 1px solid %s; padding: 10px 16px 16px">%s</div>' % (C['w'], C['s200'], btn('أرسل الطلب لـ 7 تجار', 'primary', 'lg', 'send', True))
    OUT['RequestNew-mobile.dc.html'] = doc('طلب منتج بسعرك /souq/request/new — جوال', body, 390, 1700)

def request_states():
    hd = header_m(back='#', title='اطلب منتج بسعرك', search=False)
    contact = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px"><div style="display: flex; flex-direction: column; gap: 6px"><label for="rx" style="font-size: 14px; font-weight: 600">صف المنتج اللي تبيه</label>' \
        '<textarea id="rx" rows="4" aria-invalid="true" aria-describedby="rx-d" style="border: 1px solid %s; box-shadow: 0 0 0 1px %s; border-radius: 8px; padding: 10px 14px; font-family: inherit; font-size: 16px; background: %s">سيف بغمد فضي، تواصلوا معي على wa.me/9665xxxx</textarea>' \
        '<p id="rx-d" style="margin: 0; display: flex; gap: 6px; font-size: 14px; color: %s">%s<span>الوصف فيه رابط تواصل. احذفه؛ التجار يردون عليك هنا داخل المنصة.</span></p></div>%s</div>' % (
            C['da'], C['da'], C['w'], C['da'], ic('alert', 16), btn('أرسل الطلب', 'primary', 'lg', 'send', True, disabled=True))
    nocat = hd + state_panel('ما فيه تجار في هذا التصنيف بعد', 'تصنيف "سداري" ما فيه تجار معتمدين يستقبلون طلبات حالياً. جرّب تصنيفاً قريباً أو تواصل معنا.', 'store', btn('اختر تصنيفاً آخر', 'primary', 'md', full=True) + btn('تواصل عبر واتساب', 'secondary', 'md', 'msg', True))
    up = hd + '<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">%s%s</div>' % (
        banner('ما ارتفعت الصورة', 'الصورة أكبر من 5 ميجا. صغّرها أو اختر صورة ثانية.', 'danger', 'image', btn('اختر صورة أخرى', 'secondary', 'sm', 'upload')),
        '<div style="display: flex; gap: 8px"><div style="width: 96px; display: flex; flex-direction: column; gap: 6px">%s%s</div></div>' % (skel('96px', 96, 8), '<span style="font-size: 12px; color: %s">يرفع… <bdi dir="ltr">64%%</bdi></span>' % C['mu']))
    ok = hd + state_panel('وصل طلبك لـ 7 تجار', 'طلب رقم <bdi dir="ltr">PR-10031</bdi>. نبلغك برسالة أول ما يوصلك عرض.', 'check', btn('تابع العروض', 'primary', 'md', full=True, href='Offers-mobile.dc.html'), 'success')
    panels = phone_panel('خطأ: وسيلة تواصل في الوصف', contact, kind='خطأ') + phone_panel('فارغ: لا تجار في التصنيف', nocat, kind='فارغ') + phone_panel('تحميل/خطأ رفع صورة', up, kind='تحميل/خطأ') + phone_panel('نجاح', ok, kind='نجاح')
    body = '<div style="padding: 40px; display: flex; gap: 40px">%s</div>' % panels
    OUT['RequestNew-states.dc.html'] = doc('طلب منتج بسعرك — الحالات', body, 1760, 880)

# ========================================================= LTR (English)
def sar_en(v, size=16, w=700, c=None, strike=False):
    return sar(v, size, w, c or (C['mu'] if strike else C['ink']), strike=strike, lang='en')

def product_en():
    hdr = ('<header data-surface="inverse-strong" style="background: %s; padding: 6px 8px; display: flex; align-items: center; gap: 4px">%s<div style="flex: 1; display: flex; justify-content: center">'
           '<a href="#" aria-label="Souq AlZal, home" style="display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: %s"><span aria-hidden="true" style="width: 34px; height: 34px; border: 1px solid %s; transform: rotate(45deg); display: inline-flex; align-items: center; justify-content: center"><span style="transform: rotate(-45deg); color: %s; font-weight: 700">ز</span></span><span style="font-size: 18px; font-weight: 700">Souq AlZal</span></a></div>%s%s</header>') % (
        C['ink'], icbtn('menu', 'Menu', True), C['s50'], C['g5'], C['g5'], icbtn('user', 'Account', True), icbtn('bag', 'Cart', True, 3).replace('، 3 عناصر', ', 3 items'))
    crumbs = ('<nav aria-label="Breadcrumb" style="padding: 8px 16px"><ol style="list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; align-items: center; font-size: 14px">'
              '<li style="display: inline-flex; align-items: center; gap: 4px"><a href="#" style="min-height: 44px; display: inline-flex; align-items: center; color: %s; text-decoration: none">Home</a>%s</li>'
              '<li style="display: inline-flex; align-items: center; gap: 4px"><a href="#" style="min-height: 44px; display: inline-flex; align-items: center; color: %s; text-decoration: none">Bishts</a>%s</li><li aria-current="page" style="color: %s">Hasawi bisht</li></ol></nav>') % (
        C['b7'], ic('chev-r', 14, C['mu']), C['b7'], ic('chev-r', 14, C['mu']), C['mu'])
    gal = '<div style="position: relative">%s<span style="position: absolute; bottom: 12px; inset-inline-start: 12px; padding: 2px 10px; border-radius: 999px; background: rgba(22,18,14,.72); color: %s; font-size: 12px; font-weight: 600">1 / 5</span><div style="position: absolute; top: 8px; inset-inline-end: 8px">%s</div></div>' % (
        art('bisht', radius=0, label='Product image (illustrative placeholder)'), C['s50'], icbtn('heart', 'Add to wishlist', bg='rgba(251,247,240,.92)'))
    disc_en = '<span style="display: inline-flex; align-items: center; min-height: 24px; padding: 2px 8px; border-radius: 4px; background: %s; color: %s; font-size: 12px; font-weight: 700"><span class="sr">Discount </span>−16%%</span>' % (C['da'], C['w'])
    opts = row(''.join(option_chip(s, s == '56', s == '62') for s in ('50', '52', '54', '56', '58', '60', '62')), 8, wrap=True).replace('، غير متوفر', ', unavailable')
    barg = ('<div style="display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid %s; border-radius: 8px; background: %s"><div style="display: flex; align-items: center; gap: 10px">'
            '<span style="width: 40px; height: 40px; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center; flex: none">%s</span>'
            '<div style="display: flex; flex-direction: column"><strong style="font-size: 16px">Have a price in mind?</strong><span style="font-size: 14px; color: %s">Name your price. The owner and 12 bisht sellers compete for your request.</span></div></div>%s</div>') % (
        C['g5'], C['w'], C['s100'], C['g7'], ic('hand', 22), C['mu'], btn('Name your price', 'bargain', 'md', 'hand', True))
    acc = ''.join('<section style="border-bottom: 1px solid %s"><h2 style="margin: 0"><button type="button" aria-expanded="false" style="width: 100%%; display: flex; align-items: center; justify-content: space-between; min-height: 56px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 16px; font-weight: 700; color: %s">%s%s</button></h2></section>' % (
        C['s200'], C['ink'], t, ic('chev-d', 18, C['mu'])) for t in ('Description', 'Specifications', 'Shipping & returns', 'Reviews (38)'))
    sticky = ('<div style="position: absolute; bottom: 0; inset-inline: 0; background: %s; border-top: 1px solid %s; padding: 10px 16px 16px; display: flex; align-items: center; gap: 12px">'
              '<div style="display: flex; flex-direction: column">%s<span style="font-size: 12px; color: %s">Size 56 · Black</span></div>%s</div>') % (C['w'], C['s200'], sar_en(1850, 18), C['mu'], btn('Add to cart', 'primary', 'lg', 'bag', extra=' flex: 1;'))
    body = hdr + crumbs + gal + (
            '<div style="padding: 16px 16px 120px; display: flex; flex-direction: column; gap: 18px">'
            '<div style="display: flex; flex-direction: column; gap: 6px"><a href="#" style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: %s; text-decoration: none">%sSold by Souq AlZal</a>'
            '<h1 style="margin: 0; font-size: 24px">Hand-stitched Hasawi bisht — gold zari</h1>%s</div>'
            '<div style="display: flex; flex-direction: column; gap: 4px"><div style="display: flex; align-items: baseline; gap: 10px">%s%s%s</div><span style="font-size: 12px; color: %s">Price includes VAT</span></div>'
            '<fieldset style="border: 0; margin: 0; padding: 0"><legend style="padding: 0 0 10px; font-size: 14px; font-weight: 700">Size: 56</legend>%s</fieldset>'
            '<fieldset style="border: 0; margin: 0; padding: 0"><legend style="padding: 0 0 10px; font-size: 14px; font-weight: 700">Colour: Black</legend>%s</fieldset>'
            '<div style="display: flex; gap: 10px">%s%s</div>%s<div>%s</div>'
            '<p style="margin: 0; font-size: 12px; color: %s; line-height: 20px">LTR check: start = left. Chevrons point right, the wishlist sits top-right (end), the WhatsApp button moves to the right (end), and the riyal sign sits left of the number (same as Arabic).</p></div>') % (
        C['g7'], ic('seal', 14), stars(4.8, 38, 14).replace('التقييم', 'Rated').replace(' من 5', ' of 5').replace(' تقييم', ' reviews'), sar_en(1850, 24), sar_en(2200, 16, 400, strike=True), disc_en, C['mu'], opts,
        row(swatch('Black', '#1B1714', True) + swatch('Brown', '#5A3D2B') + swatch('Navy', '#1F2A44') + swatch('Beige', '#D8C3A0'), 6, wrap=True),
        stepper(1, 'Quantity').replace('زيادة الكمية', 'Increase quantity').replace('إنقاص الكمية', 'Decrease quantity'), btn('Add to cart', 'primary', 'lg', 'bag', extra=' flex: 1;'), barg, acc, C['mu']) + sticky + wa_float(96).replace('تواصل معنا عبر واتساب', 'Chat with us on WhatsApp')
    OUT['Product-mobile-en.dc.html'] = doc('Product page — mobile (English, LTR)', body, 390, 2100, lang='en')

def menu_sheet(logged=True):
    acct = (('<div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: %s; border-radius: 8px">%s<div style="display: flex; flex-direction: column; flex: 1"><strong style="font-size: 16px">أهلاً، محمد</strong>'
             '<span style="font-size: 12px; color: %s"><bdi dir="ltr">+966 55 XXX XX12</bdi></span></div><a href="#" style="min-height: 44px; display: inline-flex; align-items: center; font-size: 14px; font-weight: 600">حسابي</a></div>') % (C['s100'], avatar('م', s=40), C['mu'])) if logged else \
        ('<div style="display: flex; flex-direction: column; gap: 10px; padding: 16px; background: %s; border-radius: 8px"><strong style="font-size: 16px">ادخل برقم جوالك</strong><span style="font-size: 14px; color: %s">تابع طلباتك وطلبات الأسعار والمفضلة.</span>%s</div>' % (
            C['s100'], C['mu'], btn('تسجيل الدخول', 'primary', 'md', full=True, href='Login-mobile.dc.html')))
    item = lambda icon, t, extra='', href='#': ('<a href="%s" style="display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 4px; color: %s; text-decoration: none; font-size: 16px; border-bottom: 1px solid %s">%s<span style="flex: 1">%s</span>%s%s</a>' % (
        href, C['ink'], C['s100'], icon, t, extra, ic('chev-l', 16, C['mu'])))
    cats = ''.join(item('<span style="width: 32px; flex: none">%s</span>' % art(k, ratio='1 / 1', radius=4, label=n), n, href='Category-mobile.dc.html') for k, n in CATS[1:10])
    souq = ('<a href="Souq-mobile.dc.html" data-surface="inverse" style="display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 14px; border-radius: 8px; background: %s; color: %s; text-decoration: none; font-size: 16px; font-weight: 700">%s<span style="flex: 1">سوق الزل</span>%s%s</a>' % (
        C['b9'], C['s50'], ic('zap', 20, C['g5']), live_badge(True), ic('chev-l', 16, C['g5'])))
    acc = ''.join(item(ic(i, 20, C['b7']), t, ('<span style="min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; background: %s; color: %s; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center">%s</span>' % (C['g5'], C['ink'], num(b))) if b else '') for i, t, b in (
        ('bag', 'طلباتي', None), ('hand', 'طلبات الأسعار والفصال', '3'), ('heart', 'المفضلة', None), ('pin', 'العناوين', None))) if logged else ''
    help_ = ''.join(item(ic(i, 20, C['b7']), t) for i, t in (('truck', 'الشحن والتوصيل'), ('return', 'الاسترجاع والاستبدال'), ('info', 'الأسئلة الشائعة'), ('store', 'بِع في سوق الزل')))
    lang = ('<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 8px"><span style="font-size: 14px; color: %s">اللغة</span>'
            '<div role="group" aria-label="اللغة" style="display: inline-flex; border: 1px solid %s; border-radius: 8px; overflow: hidden">'
            '<button type="button" aria-pressed="true" style="min-height: 44px; padding: 0 16px; border: 0; background: %s; color: %s; font-family: inherit; font-size: 14px; font-weight: 600">العربية</button>'
            '<button type="button" aria-pressed="false" lang="en" style="min-height: 44px; padding: 0 16px; border: 0; background: %s; color: %s; font-family: inherit; font-size: 14px">English</button></div></div>') % (C['mu'], C['line'], C['ink'], C['s50'], C['w'], C['ink'])
    sec = lambda t, inner: '<section style="display: flex; flex-direction: column"><h3 style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: %s">%s</h3>%s</section>' % (C['mu'], t, inner)
    return ('<div aria-hidden="true" style="position: absolute; inset: 0; background: %s"></div>'
            '<nav role="dialog" aria-modal="true" aria-label="القائمة" style="position: absolute; top: 0; bottom: 0; inset-inline-start: 0; width: 336px; background: %s; display: flex; flex-direction: column; box-shadow: 0 12px 32px rgba(22,18,14,.16); z-index: 50">'
            '<div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 8px 16px; border-bottom: 1px solid %s">%s%s</div>'
            '<div style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 20px">%s%s%s%s%s%s</div>'
            '<div style="padding: 12px 16px 16px; border-top: 1px solid %s">%s</div></nav>') % (
        C['scrim'], C['s50'], C['s200'], logo(False, 18), icbtn('x', 'إغلاق القائمة'), acct, souq, sec('التصنيفات', cats), sec('حسابي', acc) if logged else '', sec('المساعدة', help_), lang,
        C['s200'], btn('تواصل معنا عبر واتساب', 'secondary', 'md', 'msg', True))

def menu_m():
    body = header_m() + '<div style="flex: 1; background: %s"></div>' % C['s100'] + menu_sheet(True)
    OUT['Menu-mobile.dc.html'] = doc('القائمة الجانبية — جوال', body, 390, 1320)

def menu_states():
    guest = header_m() + '<div style="flex: 1; background: %s"></div>' % C['s100'] + menu_sheet(False)
    err = header_m() + '<div style="flex: 1; background: %s"></div>' % C['s100'] + menu_sheet(True).replace(
        '>التصنيفات</h3>', '>التصنيفات</h3>' + banner('تعذّر تحميل التصنيفات', 'نعرض آخر قائمة محفوظة.', 'warning', 'alert', btn('إعادة المحاولة', 'secondary', 'md', 'refresh')), 1)
    panels = phone_panel('زائر غير مسجل', guest, 1320, kind='حالة') + phone_panel('خطأ: تعذّر تحميل التصنيفات', err, 1320, kind='خطأ')
    body = '<div style="padding: 40px; display: flex; gap: 40px">%s</div>' % panels
    OUT['Menu-states.dc.html'] = doc('القائمة الجانبية — الحالات', body, 900, 1440)

def build():
    menu_m(); menu_states()
    login_m(); otp_m(); login_d(); staff_d(); login_states()
    request_new(); request_states(); product_en()
    return OUT
