# -*- coding: utf-8 -*-
"""Generates the Design canvas (project/canvas.json + one .dc.html per artboard).
Run: python3 build_canvas.py  ->  ../canvas/project/
"""
import json, os, re, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import screens_store, screens_souq, screens_dash, screens_extra, screens_admin, screens_account

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'canvas', 'project')

PAGES = [
    ('base', 'الأساسيات', [('الفهرس والمبادئ', ['Main']), ('الهوية والمكونات', ['Foundations', 'Components'])]),
    ('store', 'المتجر', [
        ('الرئيسية / والقائمة الجانبية للجوال', ['Home-mobile', 'Home-desktop', 'Home-states', 'Menu-mobile', 'Menu-states']),
        ('التصنيف والفلاتر /c/[slug]', ['Category-mobile', 'Category-filters-mobile', 'Category-desktop', 'Category-states']),
        ('صفحة المنتج /p/[slug] (ومعها نسخة LTR إنجليزية)', ['Product-mobile', 'Product-mobile-en', 'Product-desktop', 'Product-states']),
        ('السلة والدفع /cart → /checkout', ['Cart-mobile', 'Checkout-mobile', 'Checkout-desktop', 'Cart-states']),
        ('الدخول و OTP /login', ['Login-mobile', 'OTP-mobile', 'Login-desktop', 'Login-staff-desktop', 'Login-states']),
        ('حسابي /account (P0-18)', ['AccountOrders-mobile', 'AccountOrder-mobile', 'AccountAddresses-mobile', 'AccountWishlist-mobile', 'AccountReturn-mobile', 'AccountProfile-mobile', 'Account-desktop', 'Account-states']),
        ('الباقة /bundles/[slug] ونجاح الطلب /checkout/success (P0-18)', ['Bundle-mobile', 'Bundle-desktop', 'OrderSuccess-mobile', 'OrderSuccess-desktop', 'OrderSuccess-states']),
        ('السياسات /pages/[slug] والبحث وكل المنتجات (P0-18)', ['Policy-mobile', 'Policy-desktop', 'Search-mobile', 'Search-desktop', 'Search-states']),
    ]),
    ('souq', 'سوق الزل والفصال', [
        ('السوق الحي /souq', ['Souq-mobile', 'Souq-desktop', 'Souq-states']),
        ('نافذة اطلب سعرك /p/[slug]?bargain=1', ['Bargain-mobile', 'Bargain-desktop', 'Bargain-states']),
        ('طلب منتج بسعرك /souq/request/new', ['RequestNew-mobile', 'RequestNew-states']),
        ('مقارنة عروض الفصال /account/requests/[number]', ['Offers-mobile', 'Offers-desktop', 'Offers-states']),
    ]),
    ('dash', 'لوحات الإدارة والتاجر', [
        ('لوحة الإدارة /admin', ['Admin-desktop', 'Admin-mobile', 'Admin-states']),
        ('لوحة التاجر /vendor', ['Vendor-desktop', 'Vendor-mobile', 'Vendor-states']),
        ('صندوق طلبات الأسعار /vendor/requests', ['VendorInbox-desktop', 'VendorInbox-mobile', 'VendorReply-mobile', 'VendorInbox-states']),
        ('إعدادات الفصال في نموذج المنتج', ['VendorBargainSettings-desktop']),
    ]),
    ('admin', 'لوحة الإدارة (P0-18)', [
        ('مكونات الإدارة المشتركة والحالات والتجاوب', ['AdminKit', 'Admin-states-p018', 'Admin-responsive']),
        ('المنتجات: القائمة والنموذج', ['AdminProducts-desktop', 'AdminProduct-desktop']),
        ('التصنيفات والباقات', ['AdminCategories-desktop', 'AdminBundles-desktop']),
        ('الطلبات والفاتورة والاسترجاع', ['AdminOrders-desktop', 'AdminOrder-desktop', 'AdminInvoice-print', 'AdminReturns-desktop']),
        ('العملاء', ['AdminCustomers-desktop', 'AdminCustomer-desktop']),
        ('الكوبونات والتقييمات والمحتوى', ['AdminCoupons-desktop', 'AdminReviews-desktop', 'AdminContent-desktop']),
        ('الإعدادات والموظفون وسجل العمليات', ['AdminSettings-desktop', 'AdminStaff-desktop', 'AdminAudit-desktop']),
    ]),
]
LIVE_POS = {'VendorBargainSettings-desktop.dc.html': (0, 11340)}
LIVE_NOTE_Y = {'dash_r3': 11080}
INTERACTIVE = {'Bargain-mobile', 'Bargain-desktop'}
TITLES = {
    'Main': 'الفهرس', 'Foundations': 'Design tokens', 'Components': 'المكونات', 'AdminKit': 'AdminKit · مكونات الإدارة', 'Admin-states-p018': 'الإدارة · الحالات', 'Admin-responsive': 'الإدارة · تابلت وجوال',
    'AdminInvoice-print': 'الفاتورة · طباعة A4',
}

def label(stem):
    if stem in TITLES:
        return TITLES[stem]
    parts = stem.split('-')
    kind = {'mobile': 'جوال', 'desktop': 'ديسكتوب', 'states': 'الحالات', 'en': 'English LTR'}
    return stem.replace('-mobile-en', ' · جوال LTR').replace('-mobile', ' · جوال').replace('-desktop', ' · ديسكتوب').replace('-states', ' · الحالات')

def main():
    files = {}
    for m in (screens_store, screens_souq, screens_dash, screens_extra, screens_admin, screens_account):
        files.update(m.build())
    os.makedirs(OUT_DIR, exist_ok=True)
    for old in os.listdir(OUT_DIR):
        if old.endswith('.dc.html'):
            os.remove(os.path.join(OUT_DIR, old))
    boards, order, notes = {}, [], {}
    pages = []
    for pid, pname, rows in PAGES:
        pages.append({'id': pid, 'name': pname})
        y = 0
        for ri, (rtitle, stems) in enumerate(rows):
            x = 0
            maxh = 0
            for st in stems:
                fn = st + '.dc.html'
                html = files[fn]
                w, h = map(int, re.search(r'"\$preview":\{"width":(\d+),"height":(\d+)\}', html).groups())
                e = {'x': x, 'y': y + 260, 'w': w, 'h': h, 'title': label(st), 'page': pid}
                if 'fluid' and 'width: 100%' in html.split('<x-dc>')[1][:3000] and 'min-height' in html.split('<x-dc>')[1][:3000]:
                    e['expand'] = 'fill'
                if st in INTERACTIVE:
                    e['is_interactive'] = True
                boards[fn] = e
                order.append(fn)
                x += w + 80
                maxh = max(maxh, h)
            notes['%s_r%d' % (pid, ri)] = {'x': 0, 'y': y, 'text': rtitle, 'kind': 'title1', 'maxW': max(x - 80, 900), 'page': pid}
            y += 260 + maxh + 200
    # positions changed on the live canvas (editor/owner) are kept on every republish
    for k, (x, y) in LIVE_POS.items():
        if k in boards:
            boards[k]['x'], boards[k]['y'] = x, y
    for k, y in LIVE_NOTE_Y.items():
        if k in notes:
            notes[k]['y'] = y
    missing = set(files) - set(boards)
    assert not missing, missing
    for fn, html in files.items():
        with open(os.path.join(OUT_DIR, fn), 'w', encoding='utf-8') as f:
            f.write(html)
    canvas = {
        'v': 3,
        'createdOnFiles': {'v': 1, 'at': '2026-11-17T23:42:39Z'},
        'title': 'سوق الزل — تصاميم P0',
        'launch': {'view': 'canvas', 'page': 'base'},
        'pages': pages,
        'boards': boards,
        'order': order,
        'notes': notes,
        'designSystems': [],
    }
    # Main must be first in order
    order.remove('Main.dc.html'); order.insert(0, 'Main.dc.html')
    with open(os.path.join(OUT_DIR, 'canvas.json'), 'w', encoding='utf-8') as f:
        json.dump(canvas, f, ensure_ascii=False, indent=1)
    print(len(files), 'artboards ->', os.path.abspath(OUT_DIR))

if __name__ == '__main__':
    main()
