# -*- coding: utf-8 -*-
"""P0-18: /admin screens + the shared admin component kit (Arabic only, desktop first)."""
from lib import *

OUT = {}
W = C['w']

# =====================================================================
# Shared admin components (AdminKit). Each helper = one component in README 4.6.
# =====================================================================

def admin_topbar():
    return (f'<div style="display: flex; align-items: center; gap: 12px; min-height: 64px; border-bottom: 1px solid {C["s200"]}; margin: 0 -24px; padding: 0 24px; background: {C["s50"]}">'
            f'<label for="gs" style="flex: 1; max-width: 480px; display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; border: 1px solid {C["line"]}; border-radius: 8px; background: {W}; color: {C["mu"]}">'
            f'{ic("search", 18)}<span class="sr">بحث في لوحة الإدارة</span><input id="gs" placeholder="ابحث: رقم طلب، منتج، عميل، جوال…" style="flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-family: inherit; font-size: 14px"></label>'
            f'<span style="margin-inline-start: auto; display: flex; gap: 4px; align-items: center">{icbtn("bell", "الإشعارات", badge="4", size=40, border=C["s200"], bg=W)}'
            f'<button type="button" aria-label="حسابي: المالك" style="display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 8px; border: 0; background: transparent; font-family: inherit; font-size: 14px">{avatar("م", s=32)}<span>المالك</span>{ic("chev-d", 16, C["mu"])}</button></span></div>')

def page_header(title, crumbs, actions='', sub=None, status=''):
    """PageHeader: breadcrumbs + h1 (+status) + description + actions (primary at the far end)."""
    return (f'<div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; padding: 16px 0 4px">'
            f'<div style="display: flex; flex-direction: column; gap: 2px; flex: 1 1 320px; min-width: 0">{breadcrumbs(crumbs)}'
            f'<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap"><h1 style="margin: 0; font-size: 24px; font-weight: 700">{title}</h1>{status}</div>'
            + (f'<p style="margin: 0; font-size: 14px; color: {C["mu"]}">{sub}</p>' if sub else '') +
            f'</div><div style="display: flex; gap: 8px; flex-wrap: wrap">{actions}</div></div>')

def ashell(active, main, h_unused=None):
    return (f'<div style="display: flex; flex-wrap: wrap; flex: 1; min-height: 100%">{sidebar("admin", active)}'
            f'<main style="flex: 999 1 560px; min-width: 0; padding: 0 24px 48px; display: flex; flex-direction: column; gap: 16px">{admin_topbar()}{main}</main></div>')

def fsel(label, value, on=False):
    bd = C['ink'] if on else C['line']
    return (f'<button type="button" aria-haspopup="listbox" style="display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 12px; border: {"2px" if on else "1px"} solid {bd}; border-radius: 8px; background: {W}; '
            f'font-family: inherit; font-size: 14px; color: {C["ink"]}; white-space: nowrap"><span style="color: {C["mu"]}">{label}:</span><span style="font-weight: 600">{value}</span>{ic("chev-d", 16, C["mu"])}</button>')

def filter_bar(ph, filters, active=(), count=None, views=None):
    """FilterBar: saved views (tabs) + search + filter selects + active chips + result count. All state in the URL."""
    v = ''
    if views:
        v = f'<div role="tablist" aria-label="عروض محفوظة" style="display: flex; gap: 4px; border-bottom: 1px solid {C["s200"]}; overflow-x: auto">'
        for i, (l, n) in enumerate(views):
            on = i == 0
            v += (f'<button type="button" role="tab" aria-selected="{"true" if on else "false"}" style="display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border: 0; border-bottom: 2px solid {C["ink"] if on else "transparent"}; '
                  f'background: transparent; font-family: inherit; font-size: 14px; font-weight: {700 if on else 400}; color: {C["ink"] if on else C["mu"]}; white-space: nowrap">{l}'
                  + (f'<span style="min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; background: {C["s100"]}; color: {C["b7"]}; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center">{num(n)}</span>' if n is not None else '') + '</button>')
        v += '</div>'
    s = (f'<label style="flex: 1 1 260px; display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; border: 1px solid {C["line"]}; border-radius: 8px; background: {W}; color: {C["mu"]}">'
         f'{ic("search", 18)}<span class="sr">بحث</span><input placeholder="{ph}" style="flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-family: inherit; font-size: 14px"></label>')
    f = ''.join(fsel(a, b, on) for a, b, on in filters)
    chips = ''
    if active:
        chips = (f'<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">' + ''.join(chip(a, rm=True, h=36) for a in active) +
                 f'<button type="button" style="min-height: 36px; border: 0; background: transparent; color: {C["g7"]}; font-family: inherit; font-size: 14px; font-weight: 600; text-decoration: underline">مسح الفلاتر</button>'
                 + (f'<span style="margin-inline-start: auto; font-size: 14px; color: {C["mu"]}">{count}</span>' if count else '') + '</div>')
    return f'<section aria-label="البحث والتصفية" style="display: flex; flex-direction: column; gap: 12px">{v}<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">{s}{f}</div>{chips}</section>'

def cb(on=False, label='تحديد', mixed=False):
    st = 'mixed' if mixed else ('true' if on else 'false')
    inner = ic('check', 14, C['s50'], 2.5) if on else ('<span style="width: 10px; height: 2px; background: %s"></span>' % C['s50'] if mixed else '')
    return (f'<button type="button" role="checkbox" aria-checked="{st}" aria-label="{label}" style="width: 36px; height: 36px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center; padding: 0">'
            f'<span aria-hidden="true" style="width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid {C["ink"] if (on or mixed) else C["ctl"]}; background: {C["ink"] if (on or mixed) else W}; display: inline-flex; align-items: center; justify-content: center">{inner}</span></button>')

def thumb(kind, s=44):
    return f'<span style="width: {s}px; flex: none; display: inline-block">{art(kind, ratio="4 / 5", radius=4)}</span>'

def row_menu(label):
    return icbtn('dots', 'إجراءات ' + label, size=36)

def data_table(cols, rows, sel=(), bulk=None, total='248', page=None, select=True, caption='', min_w=960, sort=0):
    """DataTable (TanStack): select column, sortable headers, numeric columns end-aligned, bulk-action bar, row menu, pagination."""
    sel = set(sel)
    hdr = ''
    if select:
        hdr += f'<th scope="col" style="width: 44px; padding: 4px 8px; border-bottom: 1px solid {C["s200"]}">{cb(len(sel) == len(rows) and rows, "تحديد الكل", bool(sel) and len(sel) < len(rows))}</th>'
    for i, (lab, al) in enumerate(cols):
        srt = ''
        if i == sort and lab:
            srt = ic('chev-d', 14, C['ink'])
        hdr += (f'<th scope="col"{" aria-sort=\"descending\"" if i == sort and lab else ""} style="text-align: {al}; padding: 10px 12px; font-size: 12px; font-weight: 600; color: {C["mu"]}; border-bottom: 1px solid {C["s200"]}; white-space: nowrap">'
                + (f'<button type="button" style="display: inline-flex; align-items: center; gap: 4px; min-height: 32px; border: 0; background: transparent; padding: 0; font-family: inherit; font-size: 12px; font-weight: 600; color: {C["ink"] if i == sort else C["mu"]}">{lab}{srt}</button>' if lab else '') + '</th>')
    body = ''
    for ri, r in enumerate(rows):
        on = ri in sel
        bg = C['g50'] if on else W
        tds = (f'<td style="padding: 4px 8px; border-bottom: 1px solid {C["s100"]}">{cb(on, "تحديد الصف")}</td>' if select else '')
        for (lab, al), c in zip(cols, r):
            tds += f'<td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid {C["s100"]}; text-align: {al}; vertical-align: middle">{c}</td>'
        body += f'<tr style="background: {bg}">{tds}</tr>'
    bulkbar = ''
    if sel and bulk:
        bulkbar = (f'<div role="region" aria-label="إجراءات جماعية" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 12px; background: {C["ink"]}; color: {C["s50"]}" data-surface="inverse-strong">'
                   f'<strong style="font-size: 14px">تم تحديد {num(len(sel))}</strong><span style="width: 1px; height: 20px; background: {C["b6"]}"></span>{bulk}'
                   f'<button type="button" style="margin-inline-start: auto; min-height: 36px; border: 0; background: transparent; color: {C["s200"]}; font-family: inherit; font-size: 14px; text-decoration: underline">إلغاء التحديد</button></div>')
    foot = ''
    if page is not False:
        foot = (f'<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 12px; border-top: 1px solid {C["s200"]}; font-size: 14px; color: {C["mu"]}">'
                f'<span>عرض {num("1–" + str(len(rows)))} من {num(total)}</span><span style="display: inline-flex; align-items: center; gap: 6px">لكل صفحة {fsel("", "20")}</span>'
                f'<span style="margin-inline-start: auto; display: flex; gap: 4px">{btn("السابق", "secondary", "dense", "chev-r", disabled=True)}{btn("التالي", "secondary", "dense", icon_end="chev-l")}</span></div>')
    return (f'<div style="background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px; overflow: hidden">{bulkbar}'
            f'<div style="overflow-x: auto"><table style="width: 100%; min-width: {min_w}px; border-collapse: collapse"><caption class="sr">{caption}</caption><thead style="background: {C["s50"]}"><tr>{hdr}</tr></thead><tbody>{body}</tbody></table></div>{foot}</div>')

def bulk_btns(*labels):
    out = ''
    for l in labels:
        danger = l.startswith('حذف')
        out += (f'<button type="button" style="min-height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid {C["d3"] if danger else C["b6"]}; background: transparent; color: {C["d3"] if danger else C["s50"]}; '
                f'font-family: inherit; font-size: 14px; font-weight: 600">{l}</button>')
    return out

def form_section(title, desc, inner, aside=None):
    """FormSection: title + help on the start side, fields card on the end side; stacks under lg."""
    return (f'<section style="display: flex; flex-wrap: wrap; gap: 16px 32px; padding: 24px 0; border-bottom: 1px solid {C["s200"]}">'
            f'<div style="flex: 1 1 240px; max-width: 300px; display: flex; flex-direction: column; gap: 4px"><h2 style="margin: 0; font-size: 18px; font-weight: 700">{title}</h2>'
            f'<p style="margin: 0; font-size: 14px; color: {C["mu"]}">{desc}</p></div>'
            f'<div style="flex: 999 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 16px; padding: 20px; background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px">{inner}</div></section>')

def textarea(label, value, fid, rows=4, helper=None, counter=None):
    return (f'<div style="display: flex; flex-direction: column; gap: 6px"><label for="{fid}" style="font-size: 14px; font-weight: 600">{label}</label>'
            f'<textarea id="{fid}" rows="{rows}" style="border: 1px solid {C["line"]}; border-radius: 8px; padding: 10px 14px; font-family: inherit; font-size: 16px; background: {W}; resize: vertical">{value}</textarea>'
            + (f'<p style="margin: 0; display: flex; justify-content: space-between; font-size: 12px; color: {C["mu"]}"><span>{helper or ""}</span>{num(counter) if counter else ""}</p>' if (helper or counter) else '') + '</div>')

def rich_editor(label, value):
    tb = ''.join(f'<button type="button" aria-label="{a}" style="width: 36px; height: 36px; border: 0; background: transparent; font-family: inherit; font-size: 14px; font-weight: 700; color: {C["ink"]}">{b}</button>' for a, b in (
        ('عريض', 'B'), ('عنوان', 'H'), ('قائمة', '•'), ('رابط', '⤴'), ('صورة', '▣')))
    return (f'<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">{label}</span><div style="border: 1px solid {C["line"]}; border-radius: 8px; background: {W}; overflow: hidden">'
            f'<div role="toolbar" aria-label="تنسيق النص" style="display: flex; gap: 2px; padding: 4px 8px; border-bottom: 1px solid {C["s200"]}; background: {C["s50"]}">{tb}</div>'
            f'<div style="padding: 12px 14px; min-height: 120px; font-size: 16px; line-height: 26px">{value}</div></div>'
            f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}">يُنظّف HTML على السيرفر (sanitize) قبل الحفظ.</p></div>')

def image_uploader(state='default'):
    """ImageUploader: drop zone + sortable thumbnails (drag handle + keyboard), cover badge, alt text, progress, error tile."""
    tiles = ''
    items = [('bisht', 'صورة رئيسية', 'done'), ('bisht', '', 'done'), ('shal', '', 'drag'), ('bisht', '', 'uploading'), ('bisht', '', 'error')]
    for i, (k, badge, st) in enumerate(items):
        lift = st == 'drag'
        over = ''
        if st == 'uploading':
            over = (f'<span style="position: absolute; inset: 0; background: rgba(251,247,240,.86); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border-radius: 6px">'
                    f'<span style="font-size: 12px; font-weight: 600">يرفع… <bdi dir="ltr">64%</bdi></span><span style="width: 70%; height: 4px; background: {C["s200"]}; border-radius: 999px"><span style="display: block; width: 64%; height: 100%; background: {C["b7"]}; border-radius: 999px"></span></span></span>')
        if st == 'error':
            over = (f'<span role="alert" style="position: absolute; inset: 0; background: {C["dabg"]}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-radius: 6px; border: 1px solid {C["da"]}; padding: 8px; text-align: center">'
                    f'<span style="color: {C["da"]}">{ic("alert", 18)}</span><span style="font-size: 12px; color: {C["da"]}; font-weight: 600">الملف أكبر من 5MB</span><button type="button" style="min-height: 32px; border: 0; background: transparent; color: {C["ink"]}; font-family: inherit; font-size: 12px; text-decoration: underline">إعادة المحاولة</button></span>')
        tiles += (f'<li style="position: relative; width: 120px; display: flex; flex-direction: column; gap: 6px;{" transform: rotate(-2deg); box-shadow: 0 12px 32px rgba(22,18,14,.16);" if lift else ""}">'
                  f'<div style="position: relative; border-radius: 6px; {"outline: 2px solid " + C["ink"] + ";" if lift else ""}">{art(k, radius=6)}{over}'
                  + (f'<span style="position: absolute; top: 6px; inset-inline-start: 6px">{pill(badge, "accent", "star")}</span>' if badge else '') +
                  f'<button type="button" aria-label="اسحب لإعادة الترتيب، الصورة {i + 1}. استخدم الأسهم للتحريك" aria-roledescription="قابل للسحب" style="position: absolute; top: 2px; inset-inline-end: 2px; width: 36px; height: 36px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center; cursor: grab">'
                  f'<span style="width: 28px; height: 28px; border-radius: 6px; background: rgba(251,247,240,.92); display: inline-flex; align-items: center; justify-content: center">{ic("dots", 16)}</span></button></div>'
                  f'<span style="font-size: 12px; color: {C["mu"] if st != "error" else C["da"]}">{"نص بديل ✓" if st == "done" else ("بدون نص بديل" if st == "drag" else "")}</span></li>')
        if i == 1:
            tiles += f'<li aria-hidden="true" style="width: 4px; border-radius: 999px; background: {C["ink"]}; align-self: stretch; margin: 0 -2px"></li>'
    drop = (f'<button type="button" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 20px; border: 1.5px dashed {C["line"]}; border-radius: 8px; background: {C["s50"]}; font-family: inherit; color: {C["ink"]}; cursor: pointer">'
            f'<span style="color: {C["b7"]}">{ic("upload", 24)}</span><strong style="font-size: 14px">اسحب الصور هنا أو اختر من جهازك</strong>'
            f'<span style="font-size: 12px; color: {C["mu"]}">JPG أو PNG أو WebP · حتى 5MB · حتى 10 صور · النسبة المفضلة 4:5 (1600×2000)</span></button>')
    return (f'<div style="display: flex; flex-direction: column; gap: 12px"><span style="font-size: 14px; font-weight: 600">الصور</span>{drop}'
            f'<ul aria-label="صور المنتج بالترتيب" style="list-style: none; margin: 0; padding: 0; display: flex; gap: 12px; flex-wrap: wrap">{tiles}</ul>'
            f'<p role="status" style="margin: 0; font-size: 12px; color: {C["mu"]}">نُقلت الصورة 3 إلى المكان 2. أول صورة هي الرئيسية في البطاقة ومشاركة الرابط.</p></div>')

def variant_matrix():
    """VariantMatrix: options (name + values) -> generated variants (SKU, price, compare-at, stock, active) with bulk edit."""
    opt = lambda name, vals: (f'<div style="display: flex; gap: 12px; align-items: flex-start; padding: 12px; border: 1px solid {C["s200"]}; border-radius: 8px">'
                             f'<span style="padding-top: 8px; color: {C["mu"]}" aria-hidden="true">{ic("dots", 16)}</span>'
                             f'<div style="display: flex; flex-direction: column; gap: 8px; flex: 1"><div style="display: grid; grid-template-columns: 200px 1fr; gap: 10px; align-items: center">'
                             f'<input aria-label="اسم الخيار" value="{name}" style="min-height: 40px; padding: 0 12px; border: 1px solid {C["line"]}; border-radius: 8px; font-family: inherit; font-size: 14px">'
                             f'<div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; min-height: 40px; padding: 4px 8px; border: 1px solid {C["line"]}; border-radius: 8px; background: {W}">'
                             + ''.join(f'<span style="display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 4px 0 10px; border-radius: 999px; background: {C["s100"]}; font-size: 14px">{v}<button type="button" aria-label="إزالة {v}" style="width: 28px; height: 28px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center">{ic("x", 12)}</button></span>' for v in vals) +
                             f'<input aria-label="أضف قيمة" placeholder="أضف قيمة واضغط Enter" style="flex: 1; min-width: 120px; border: 0; outline: none; font-family: inherit; font-size: 14px"></div></div></div>'
                             f'{icbtn("trash", "حذف الخيار " + name, size=36)}</div>')
    opts = opt('المقاس', ['54', '56', '58', '60']) + opt('اللون', ['أسود', 'بني'])
    vrows = []
    data = [('54 · أسود', 'BSH-HS-54-BK', '1,850.00', '2,200.00', '3', True), ('56 · أسود', 'BSH-HS-56-BK', '1,850.00', '2,200.00', '4', True), ('58 · أسود', 'BSH-HS-58-BK', '1,850.00', '2,200.00', '0', True),
            ('60 · أسود', 'BSH-HS-60-BK', '1,950.00', '2,300.00', '2', True), ('54 · بني', 'BSH-HS-54-BR', '1,850.00', '', '1', True), ('56 · بني', 'BSH-HS-56-BR', '1,850.00', '', '0', False)]
    inp = lambda v, lab, w=110, err=False, ltr=True: (f'<input aria-label="{lab}" value="{v}" placeholder="—" {"dir=\"ltr\"" if ltr else ""} style="width: {w}px; min-height: 36px; padding: 0 10px; border: 1px solid {C["da"] if err else C["line"]}; border-radius: 6px; '
                                                     f'font-family: inherit; font-size: 14px; text-align: end; background: {W}"{" aria-invalid=\"true\"" if err else ""}>')
    for i, (n, sku, pr, cmp, st, act) in enumerate(data):
        low = st in ('0', '1', '2', '3')
        vrows.append([f'<span style="font-weight: 600">{n}</span>', inp(sku, 'SKU ' + n, 150), inp(pr, 'السعر ' + n) + f'<span style="font-size: 12px; color: {C["mu"]}"> ر.س</span>',
                      inp(cmp, 'السعر قبل الخصم ' + n, 110, err=(i == 4 and False)), inp(st, 'المخزون ' + n, 70) + (f' {pill("نفد", "danger")}' if st == '0' else (f' {pill("منخفض", "warning")}' if low else '')),
                      f'<span style="font-size: 14px; color: {C["mu"]}">{num("1" if i == 1 else "0")}</span>',
                      f'<button type="button" role="switch" aria-checked="{"true" if act else "false"}" aria-label="تفعيل {n}" style="position: relative; width: 40px; height: 24px; border-radius: 999px; border: 0; background: {C["ink"] if act else C["line"]}"><span aria-hidden="true" style="position: absolute; top: 3px; {"inset-inline-start: 19px" if act else "inset-inline-start: 3px"}; width: 18px; height: 18px; border-radius: 50%; background: {W}"></span></button>'])
    tbl = data_table([('الخيار', 'start'), ('SKU', 'start'), ('السعر (شامل الضريبة)', 'end'), ('قبل الخصم', 'end'), ('المخزون', 'end'), ('محجوز', 'end'), ('مفعّل', 'start')], vrows, sel=(0, 1, 3),
                     bulk=bulk_btns('تعديل السعر', 'تعديل المخزون', 'تفعيل', 'تعطيل'), total='8', page=False, caption='الخيارات المولدة', min_w=820, sort=-1)
    return (f'<div style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 14px; font-weight: 600">الخيارات</span>{btn("أضف خياراً", "secondary", "dense", "plus")}</div>{opts}'
            f'<div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px"><span style="font-size: 14px; font-weight: 600">الأصناف (8)</span><span style="font-size: 12px; color: {C["mu"]}">تتولد تلقائياً من الخيارات. حذف قيمة يؤرشف أصنافها ولا يحذف تاريخ الطلبات.</span></div>{tbl}</div>')

def status_timeline(events, compact=False):
    """StatusTimeline: newest first; status pill + actor + time + optional note; current step emphasised."""
    out = '<ol aria-label="سجل الحالة" style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column">'
    for i, (pl, who, when, note) in enumerate(events):
        cur = i == 0
        last = i == len(events) - 1
        out += (f'<li style="display: flex; gap: 12px"><span aria-hidden="true" style="display: flex; flex-direction: column; align-items: center; width: 16px; flex: none">'
                f'<span style="width: 14px; height: 14px; border-radius: 50%; margin-top: 6px; background: {C["ink"] if cur else W}; border: 2px solid {C["ink"] if cur else C["line"]}"></span>'
                + ('' if last else f'<span style="flex: 1; width: 2px; background: {C["s200"]}; margin: 2px 0"></span>') +
                f'</span><div style="display: flex; flex-direction: column; gap: 4px; padding-bottom: {0 if last else 16}px; flex: 1">'
                f'<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">{pl}<span style="font-size: 12px; color: {C["mu"]}">{when}</span></div>'
                f'<span style="font-size: 14px; color: {C["b7"]}">{who}</span>' + (f'<span style="font-size: 14px; color: {C["mu"]}">{note}</span>' if note else '') + '</div></li>')
    return out + '</ol>'

def confirm_dialog(title, body, confirm, destructive=True, typed=None, extra=''):
    """ConfirmDialog (AlertDialog): focus starts on Cancel; destructive action requires typing the name when typed is set."""
    t = ''
    if typed:
        t = field(f'اكتب «{typed}» للتأكيد', typed[:6], fid='cfm', helper='الزر يتفعل بعد مطابقة النص.')
    return (f'<div role="alertdialog" aria-modal="true" aria-labelledby="cdt" aria-describedby="cdb" style="width: 100%; max-width: 480px; background: {W}; border-radius: 12px; box-shadow: 0 12px 32px rgba(22,18,14,.16); padding: 24px; display: flex; flex-direction: column; gap: 14px">'
            f'<div style="display: flex; gap: 12px; align-items: flex-start"><span style="width: 40px; height: 40px; border-radius: 50%; background: {C["dabg"] if destructive else C["s100"]}; color: {C["da"] if destructive else C["b7"]}; display: inline-flex; align-items: center; justify-content: center; flex: none">{ic("alert" if destructive else "info", 20)}</span>'
            f'<div style="display: flex; flex-direction: column; gap: 6px"><h2 id="cdt" style="margin: 0; font-size: 18px">{title}</h2><p id="cdb" style="margin: 0; font-size: 14px; color: {C["b7"]}">{body}</p></div></div>{extra}{t}'
            f'<div style="display: flex; gap: 8px; justify-content: flex-end">{btn("إلغاء", "secondary", "md", extra=" outline: 2px solid " + C["g7"] + "; outline-offset: 2px;")}'
            f'{btn(confirm, "primary" if not destructive else "primary", "md", "trash" if destructive else None, disabled=bool(typed), extra=(" background: " + C["da"] + "; border-color: " + C["da"] + "; color: #fff;") if destructive and not typed else "")}</div></div>')

def toast(msg, tone='success', action=None):
    fg, bg = TONES[tone]
    return (f'<div role="status" style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 8px; background: {C["ink"]}; color: {C["s50"]}; box-shadow: 0 6px 20px rgba(22,18,14,.10); max-width: 420px" data-surface="inverse-strong">'
            f'<span style="color: {C["d3"] if tone == "danger" else "#8FC79C"}">{ic("check" if tone == "success" else "alert", 18)}</span><span style="font-size: 14px; flex: 1">{msg}</span>'
            + (f'<button type="button" style="min-height: 36px; border: 0; background: transparent; color: {C["g3"]}; font-family: inherit; font-size: 14px; font-weight: 600">{action}</button>' if action else '') +
            f'{icbtn("x", "إغلاق الإشعار", True, size=36)}</div>')

def save_bar(msg='عندك تغييرات غير محفوظة'):
    return (f'<div role="region" aria-label="حفظ التغييرات" style="position: sticky; bottom: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin: 0 -24px; background: {W}; border-top: 1px solid {C["s200"]}; box-shadow: 0 -4px 16px rgba(22,18,14,.06)">'
            f'<span style="display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: {C["wa"]}">{ic("info", 18)}{msg}</span>'
            f'<span style="margin-inline-start: auto; display: flex; gap: 8px">{btn("تجاهل", "ghost", "dense")}{btn("حفظ", "primary", "dense", "check")}</span></div>')

def drawer(title, inner, footer):
    return (f'<aside role="dialog" aria-modal="true" aria-label="{title}" style="position: absolute; top: 0; bottom: 0; inset-inline-end: 0; width: 480px; background: {C["s50"]}; box-shadow: 0 12px 32px rgba(22,18,14,.16); display: flex; flex-direction: column; z-index: 50">'
            f'<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 12px 20px; border-bottom: 1px solid {C["s200"]}"><h2 style="margin: 0; font-size: 18px">{title}</h2>{icbtn("x", "إغلاق", size=40)}</div>'
            f'<div style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px">{inner}</div>'
            f'<div style="display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid {C["s200"]}; background: {W}">{footer}</div></aside>')

def sec_tabs(items, sel=0, label='أقسام'):
    out = f'<div role="tablist" aria-label="{label}" style="display: flex; gap: 4px; border-bottom: 1px solid {C["s200"]}; overflow-x: auto">'
    for i, it in enumerate(items):
        on = i == sel
        out += (f'<button type="button" role="tab" aria-selected="{"true" if on else "false"}" style="min-height: 44px; padding: 0 14px; border: 0; border-bottom: 2px solid {C["ink"] if on else "transparent"}; background: transparent; font-family: inherit; font-size: 14px; '
                f'font-weight: {700 if on else 400}; color: {C["ink"] if on else C["mu"]}; white-space: nowrap">{it}</button>')
    return out + '</div>'

def card2(title, inner, action='', pad=20):
    return (f'<section style="display: flex; flex-direction: column; gap: 14px; padding: {pad}px; background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px; min-width: 0">'
            f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><h2 style="margin: 0; font-size: 16px; font-weight: 700">{title}</h2>{action}</div>{inner}</section>')

def kv(rows):
    return '<dl style="margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 14px">' + ''.join(
        f'<dt style="color: {C["mu"]}">{a}</dt><dd style="margin: 0">{b}</dd>' for a, b in rows) + '</dl>'

def money(v, size=14, w=600, c=None):
    return sar(v, size, w, c)

# =====================================================================
# Artboards
# =====================================================================

def kit():
    def blk(t, inner, note):
        return (f'<section style="display: flex; flex-direction: column; gap: 14px; padding: 20px; background: {C["s50"]}; border: 1px solid {C["s200"]}; border-radius: 12px; min-width: 0">'
                f'<div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap"><h2 style="margin: 0; font-size: 18px">{t}</h2><span style="font-size: 12px; color: {C["mu"]}">{note}</span></div>{inner}</section>')
    ph = page_header('المنتجات', ['الإدارة', 'المنتجات'], btn('استيراد CSV', 'secondary', 'dense', 'upload') + btn('تصدير', 'secondary', 'dense', 'file') + btn('أضف منتجاً', 'primary', 'dense', 'plus'), '248 منتجاً · 12 بانتظار المراجعة')
    fb = filter_bar('ابحث بالاسم أو SKU', [('الحالة', 'الكل', False), ('التصنيف', 'البشوت', True), ('التاجر', 'الكل', False), ('المخزون', 'منخفض', True)], ('التصنيف: البشوت', 'المخزون: منخفض'), '23 نتيجة',
                    [('الكل', 248), ('منشور', 201), ('قيد المراجعة', 12), ('مسودة', 19), ('مؤرشف', 16)])
    rows = [[f'<span style="display: flex; align-items: center; gap: 10px">{thumb("bisht")}<span style="display: flex; flex-direction: column"><a href="AdminProduct-desktop.dc.html" style="color: {C["ink"]}; font-weight: 600; text-decoration: none">بشت حساوي مخيط يدوياً</a><span style="font-size: 12px; color: {C["mu"]}">8 أصناف · BSH-HS</span></span></span>',
             pill('منشور', 'success', 'check'), money(1850), num('9'), row_menu('بشت حساوي')],
            [f'<span style="display: flex; align-items: center; gap: 10px">{thumb("bisht")}<span style="display: flex; flex-direction: column"><span style="font-weight: 600">بشت ملكي شتوي</span><span style="font-size: 12px; color: {C["mu"]}">دار المثال</span></span></span>',
             pill('قيد المراجعة', 'warning', 'clock'), money(2450), num('14'), row_menu('بشت ملكي')]]
    dt = data_table([('المنتج', 'start'), ('الحالة', 'start'), ('السعر', 'end'), ('المخزون', 'end'), ('', 'end')], rows, sel=(0,), bulk=bulk_btns('نشر', 'أرشفة', 'تصدير', 'حذف'), total='23', caption='مثال الجدول', min_w=640)
    fs = form_section('البيانات الأساسية', 'الاسم والوصف يظهران في المتجر ونتائج البحث.', field('اسم المنتج (عربي)', 'بشت حساوي مخيط يدوياً — زري ذهبي', fid='k1') + field('اسم المنتج (إنجليزي)', 'Hand-stitched Hasawi bisht — gold zari', fid='k2'))
    tl = status_timeline([(pill('تم الشحن', 'info', 'truck'), 'بواسطة: المالك · شركة الشحن: [اسم الشركة] · رقم التتبع <bdi dir="ltr">[رقم التتبع]</bdi>', 'اليوم 10:42 ص', None),
                          (pill('جاهز للشحن', 'accent', 'box'), 'بواسطة: دار المثال', 'أمس 6:10 م', None), (pill('قيد التجهيز', 'accent', 'box'), 'بواسطة: دار المثال', 'أمس 1:02 م', 'ملاحظة: التغليف بعلبة هدية'),
                          (pill('جديد', 'info'), 'النظام · بعد تأكيد الدفع', 'أمس 12:40 م', None)])
    states = ''.join(f'<div style="flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 8px"><span style="font-size: 12px; font-weight: 600; color: {C["mu"]}">{a}</span>{b}</div>' for a, b in (
        ('Toast نجاح', toast('حُفظ المنتج ونُشر في المتجر.', 'success', 'عرض في المتجر')), ('Toast خطأ', toast('ما قدرنا نحفظ. تحقق من الحقول المعلّمة.', 'danger')),
        ('شريط الحفظ الثابت', f'<div style="position: relative; margin: 0 24px">{save_bar()}</div>')))
    body = (f'<div style="padding: 48px 56px; display: flex; flex-direction: column; gap: 24px">'
            f'<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600; color: {C["g7"]}">لوحة الإدارة · P0-18</span><h1 style="margin: 0; font-size: 36px">مكونات الإدارة المشتركة (AdminKit)</h1>'
            f'<p style="margin: 0; color: {C["mu"]}; max-width: 900px">ابدأ بها في P3: كل صفحات الإدارة تُركّب منها. الأحجام في الإدارة `dense` 36px على الديسكتوب (44px على اللمس). المواصفات الكاملة في README القسم 4.6.</p></div>'
            + blk('PageHeader', ph, 'مسار + عنوان + حالة + وصف + إجراءات؛ الإجراء الأساسي آخر واحد') + blk('FilterBar', fb, 'عروض محفوظة + بحث + فلاتر + شرائح مطبقة + عدد النتائج؛ كلها في الـ URL')
            + blk('DataTable + Bulk actions', dt, 'تحديد صفوف، شريط إجراءات جماعية، ترتيب، صف إجراءات، ترقيم')
            + f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px">{blk("FormSection", fs, "عنوان ووصف على البداية، والحقول في بطاقة")}{blk("StatusTimeline", tl, "الأحدث أولاً، الحالة + المنفذ + الوقت + ملاحظة")}</div>'
            + blk('ImageUploader', image_uploader(), 'سحب وإفلات، ترتيب بالسحب أو الأسهم، صورة رئيسية، نص بديل، تقدم الرفع، خطأ لكل ملف')
            + blk('VariantMatrix', variant_matrix(), 'خيارات ← أصناف مولدة، تعديل جماعي، تنبيه المخزون')
            + f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 24px">{blk("ConfirmDialog", f"<div style=\"background: {C["scrim"]}; padding: 32px; border-radius: 8px; display: flex; justify-content: center\">{confirm_dialog("حذف المنتج «بشت حساوي»؟", "يُخفى من المتجر فوراً، وتبقى الطلبات السابقة وتقاريرها. لا يمكن التراجع.", "حذف المنتج")}</div>", "AlertDialog، التركيز على إلغاء")}'
            f'{blk("Toast و SaveBar", f"<div style=\"display: flex; flex-wrap: wrap; gap: 16px\">{states}</div>", "النجاح مع إجراء، والخطأ، والحفظ الثابت")}</div>'
            '</div>')
    OUT['AdminKit.dc.html'] = doc('مكونات الإدارة المشتركة (AdminKit)', body, 1440, 3300)

PRODUCTS = [('bisht', 'بشت حساوي مخيط يدوياً — زري ذهبي', 'سوق الزل', 'BSH-HS', 8, ('منشور', 'success', 'check'), 1850, '9', 'البشوت', None),
            ('bisht', 'بشت ملكي شتوي — صوف ناعم', 'دار المثال', 'DM-BSH-01', 6, ('قيد المراجعة', 'warning', 'clock'), 2450, '14', 'البشوت', 'تعديل صور ووصف'),
            ('farwa', 'فروة نجدية مبطنة — جلد طبيعي', 'فراء التجربة', 'FT-FRW-3', 4, ('منشور', 'success', 'check'), 1290, '2', 'الفراوي', None),
            ('agal', 'عقال مرعز أسود — شغل يدوي', 'سوق الزل', 'AGL-MRZ', 3, ('منشور', 'success', 'check'), 185, '0', 'العقل', None),
            ('mabkhara', 'مبخرة نحاس مطعّمة — متوسط', 'مباخر النموذج', 'MN-MBK-2', 1, ('منشور', 'success', 'check'), 640, '11', 'المباخر', None),
            ('oud', 'دهن عود كمبودي — 12 مل', 'عطارة العيّنة', 'AA-OUD-12', 2, ('مرفوض', 'danger', 'x'), 950, '30', 'العود', 'صور غير واضحة'),
            ('saffron', 'زعفران سوبر نقي — 10 جرام', 'سوق الزل', 'SAF-10', 1, ('مسودة', 'neutral'), 145, '40', 'الزعفران', None),
            ('sword', 'سيف عربي مطلي — غمد مزخرف', 'سيوف الأنموذج', 'SA-SWD-1', 1, ('مؤرشف', 'neutral'), 6800, '1', 'السيوف', None)]

def products_list():
    rows = []
    for k, n, v, sku, var, stt, pr, st, cat, note in PRODUCTS:
        stock = num(st) if st not in ('0',) else pill('نفد', 'danger')
        if st in ('1', '2'):
            stock = f'{num(st)} {pill("منخفض", "warning")}'
        rows.append([f'<span style="display: flex; align-items: center; gap: 10px">{thumb(k)}<span style="display: flex; flex-direction: column; min-width: 0"><a href="AdminProduct-desktop.dc.html" style="color: {C["ink"]}; font-weight: 600; text-decoration: none">{n}</a>'
                     f'<span style="font-size: 12px; color: {C["mu"]}">{num(sku)} · {var} أصناف</span></span></span>',
                     v if v != 'سوق الزل' else f'<span style="display: inline-flex; align-items: center; gap: 4px; color: {C["g7"]}; font-weight: 600">{ic("seal", 14)}سوق الزل</span>',
                     cat, f'<span style="display: flex; flex-direction: column; gap: 2px">{pill(*stt)}' + (f'<span style="font-size: 12px; color: {C["mu"]}">{note}</span>' if note else '') + '</span>',
                     money(pr), stock, row_menu(n)])
    main = (page_header('المنتجات', ['الإدارة', 'المنتجات'], btn('استيراد CSV', 'secondary', 'dense', 'upload') + btn('تصدير', 'secondary', 'dense', 'file') + btn('أضف منتجاً', 'primary', 'dense', 'plus', href='AdminProduct-desktop.dc.html'),
                        '248 منتجاً من المنصة و 11 تاجراً. منتجات التجار تمر بالمراجعة قبل النشر (D5).')
            + filter_bar('ابحث بالاسم أو SKU أو الباركود', [('الحالة', 'الكل', False), ('التصنيف', 'الكل', False), ('التاجر', 'الكل', False), ('المخزون', 'الكل', False), ('الترتيب', 'الأحدث', False)], (), None,
                         [('الكل', 248), ('منشور', 201), ('قيد المراجعة', 12), ('مسودة', 19), ('مرفوض', 3), ('مؤرشف', 13)])
            + data_table([('المنتج', 'start'), ('التاجر', 'start'), ('التصنيف', 'start'), ('الحالة', 'start'), ('السعر من', 'end'), ('المخزون', 'end'), ('', 'end')], rows, sel=(1, 2),
                         bulk=bulk_btns('نشر', 'إرجاع للمراجعة', 'نقل لتصنيف', 'أرشفة', 'تصدير', 'حذف'), caption='قائمة المنتجات'))
    OUT['AdminProducts-desktop.dc.html'] = doc('الإدارة — المنتجات', ashell('products', main), 1440, 1300, fluid=True)

def product_form():
    side = (card2('الحالة والنشر', select('الحالة', 'منشور', 'ps') + kv([('آخر تعديل', 'اليوم 10:12 ص · المالك'), ('أُنشئ', '3 نوفمبر 2026')]) + toggle('منتج مميز في الرئيسية', True)
                  + toggle('يقبل الفصال', True, 'الحد الأدنى لكل صنف في تبويب الفصال')) +
            card2('التصنيف والتاجر', select('التاجر', 'سوق الزل (المنصة)', 'pv') + select('التصنيف', 'البشوت ← حساوي', 'pc', 'التاجر يختار من تصنيفاته المسموحة فقط (D4)') + field('الوزن للشحن', '1,200', suffix='جرام', fid='pw')) +
            card2('المعاينة', product_card(P[0], cta=False)))
    main_col = (form_section('البيانات الأساسية', 'الاسم والوصف بالعربي والإنجليزي. الوصف يُنظّف قبل الحفظ.',
                             f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{field("الاسم (عربي)", "بشت حساوي مخيط يدوياً — زري ذهبي", fid="pn1")}{field("الاسم (إنجليزي)", "Hand-stitched Hasawi bisht", fid="pn2")}</div>'
                             + rich_editor('الوصف (عربي)', 'بشت حساوي مخيط يدوياً على يد حرفيين، بزري ذهبي على الأطراف والكتف. قماش صوف إنجليزي خفيف مناسب للمناسبات المسائية.'))
                + form_section('الصور', 'اسحب لإعادة الترتيب. أول صورة هي الرئيسية. اكتب نصاً بديلاً لكل صورة.', image_uploader())
                + form_section('السعر', 'الأسعار شاملة الضريبة (D8). السعر قبل الخصم يُعرض مشطوباً فقط لو كان سعر بيع فعلي سابق.',
                               f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">{field("السعر الأساسي", "1,850.00", suffix="ر.س", fid="pp")}{field("السعر قبل الخصم", "2,200.00", suffix="ر.س", fid="pcmp")}'
                               f'{field("الضريبة المضمنة", "241.30", suffix="ر.س", fid="pvat", helper="محسوبة على السيرفر · 15%")}</div>')
                + form_section('الخيارات والأصناف والمخزون', 'كل صنف له SKU وسعر ومخزون مستقل. المحجوز = في سلال لم تُدفع بعد.', variant_matrix())
                + form_section('SEO والمشاركة', 'يظهر في Google وعند مشاركة الرابط. الرابط يتغير يدوياً فقط، والقديم يتحول 301.',
                               field('رابط المنتج', 'hasawi-bisht-gold-zari', fid='slug', prefix_icon='file', helper='suqalzl.com/p/hasawi-bisht-gold-zari') + field('عنوان الصفحة', 'بشت حساوي مخيط يدوياً بزري ذهبي | سوق الزل', fid='st', helper='58 / 60 حرفاً')
                               + textarea('الوصف المختصر', 'بشت حساوي بخياطة يدوية وزري ذهبي، مقاسات 54 إلى 60، توصيل لكل مدن المملكة.', 'sd', 3, 'يظهر تحت العنوان في نتائج البحث', '96 / 160')
                               + f'<div style="padding: 12px 14px; border: 1px solid {C["s200"]}; border-radius: 8px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; color: {C["mu"]}" dir="ltr">suqalzl.com › p › hasawi-bisht-gold-zari</span>'
                               f'<span style="font-size: 18px; color: {C["inf"]}">بشت حساوي مخيط يدوياً بزري ذهبي | سوق الزل</span><span style="font-size: 14px; color: {C["b7"]}">بشت حساوي بخياطة يدوية وزري ذهبي، مقاسات 54 إلى 60، توصيل لكل مدن المملكة.</span></div>'))
    main = (page_header('بشت حساوي مخيط يدوياً — زري ذهبي', ['الإدارة', 'المنتجات', 'تعديل منتج'], btn('عرض في المتجر', 'ghost', 'dense', 'eye') + btn('نسخ', 'secondary', 'dense') + btn('حذف', 'danger', 'dense', 'trash'), None, pill('منشور', 'success', 'check'))
            + sec_tabs(['البيانات', 'الصور', 'الخيارات والمخزون', 'الفصال', 'SEO'], 0, 'أقسام المنتج')
            + f'<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap"><div style="flex: 999 1 640px; min-width: 0">{main_col}</div><aside style="flex: 1 1 300px; max-width: 340px; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px">{side}</aside></div>'
            + save_bar())
    OUT['AdminProduct-desktop.dc.html'] = doc('الإدارة — نموذج المنتج', ashell('products', main), 1440, 3400, fluid=True)

def categories():
    tree = [(0, 'bisht', 'البشوت', 48, True, True, False), (1, 'bisht', 'حساوي', 21, True, False, False), (1, 'bisht', 'ملكي', 14, True, False, True), (1, 'bisht', 'شتوي', 9, True, False, False), (1, 'bisht', 'أطفال', 4, False, False, False),
            (0, 'farwa', 'الفراوي', 17, True, False, False), (0, 'agal', 'العقل', 22, True, False, False), (0, 'mabkhara', 'المباخر', 31, True, False, False), (0, 'sword', 'السيوف الفاخرة', 6, True, False, False),
            (0, 'saffron', 'الزعفران السوبر', 9, True, False, False), (0, 'oud', 'العود ودهن العود', 26, True, False, False)]
    rows = ''
    for i, (lvl, k, n, cnt, active, expanded, dragging) in enumerate(tree):
        if i == 3:
            rows += f'<li aria-hidden="true" style="height: 0; border-top: 2px solid {C["ink"]}; margin: 0 {lvl * 32 + 16}px 0 16px; position: relative"><span style="position: absolute; top: -5px; inset-inline-start: 0; width: 8px; height: 8px; border-radius: 50%; background: {C["ink"]}"></span></li>'
        rows += (f'<li role="treeitem" aria-level="{lvl + 1}"{" aria-expanded=\"true\"" if expanded else ""} aria-selected="{"true" if dragging else "false"}" style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 6px 12px; padding-inline-start: {12 + lvl * 32}px; '
                 f'border-bottom: 1px solid {C["s100"]}; background: {C["g50"] if dragging else W};{" box-shadow: 0 12px 32px rgba(22,18,14,.16); transform: translateX(-8px); border: 1px solid " + C["ink"] + ";" if dragging else ""}">'
                 f'<button type="button" aria-label="اسحب لنقل {n}. استخدم Alt مع الأسهم" style="width: 36px; height: 36px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center; cursor: grab; color: {C["mu"]}">{ic("dots", 18)}</button>'
                 + (f'<button type="button" aria-label="{"طي" if expanded else "توسيع"} {n}" style="width: 28px; height: 28px; border: 0; background: transparent; display: inline-flex; align-items: center; justify-content: center">{ic("chev-d" if expanded else "chev-l", 16)}</button>' if lvl == 0 else '<span style="width: 28px"></span>') +
                 f'{thumb(k, 36)}<span style="flex: 1; font-size: 14px; font-weight: {700 if lvl == 0 else 400}">{n}</span><span style="font-size: 12px; color: {C["mu"]}">{num(cnt)} منتج</span>'
                 f'{pill("ظاهر" if active else "مخفي", "success" if active else "neutral")}{pill("في الرئيسية", "accent") if lvl == 0 and i < 3 else ""}{row_menu(n)}</li>')
    tr = (f'<div style="background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px; overflow: hidden"><div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid {C["s200"]}; background: {C["s50"]}">'
          f'<span style="font-size: 14px; color: {C["mu"]}">اسحب لتغيير الترتيب أو النقل تحت تصنيف آخر. الترتيب يُحفظ تلقائياً.</span>{pill("حُفظ", "success", "check")}</div><ul role="tree" aria-label="شجرة التصنيفات" style="list-style: none; margin: 0; padding: 0">{rows}</ul></div>')
    edit = card2('تعديل: ملكي', field('الاسم (عربي)', 'ملكي', fid='cn1') + field('الاسم (إنجليزي)', 'Royal', fid='cn2') + select('التصنيف الأب', 'البشوت', 'cpar') + field('الرابط', 'royal-bisht', fid='cslug')
                 + field('عمولة خاصة', '', 'افتراضي: 10%', suffix='%', fid='ccom', helper='تتقدم على العمولة الافتراضية وتتأخر عن عمولة التاجر (6.1)') + image_uploader().split('<ul')[0] + '</div>'
                 + toggle('ظاهر في المتجر', True) + toggle('يظهر في الرئيسية', False) + row(btn('حفظ', 'primary', 'dense', 'check') + btn('حذف', 'danger', 'dense', 'trash'), 8))
    main = (page_header('التصنيفات', ['الإدارة', 'التصنيفات'], btn('أضف تصنيفاً', 'primary', 'dense', 'plus'), '14 تصنيفاً رئيسياً. التجار يضيفون منتجات في التصنيفات المسموحة لهم فقط.')
            + f'<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap"><div style="flex: 999 1 560px; min-width: 0">{tr}</div><aside style="flex: 1 1 320px; max-width: 380px">{edit}</aside></div>')
    OUT['AdminCategories-desktop.dc.html'] = doc('الإدارة — التصنيفات', ashell('cats', main), 1440, 1400, fluid=True)

def bundles():
    rows = [[f'<span style="display: flex; align-items: center; gap: 10px">{thumb("bisht")}<span style="display: flex; flex-direction: column"><span style="font-weight: 600">باقة المناسبة</span><span style="font-size: 12px; color: {C["mu"]}">بشت + عقال + دهن عود</span></span></span>',
             pill('منشور', 'success', 'check'), money(2690), money(2985, 14, 400, C['mu']), f'<span style="color: {C["su"]}; font-weight: 600"><bdi dir="ltr">−10%</bdi></span>', num('3'), row_menu('باقة المناسبة')],
            [f'<span style="display: flex; align-items: center; gap: 10px">{thumb("mabkhara")}<span style="display: flex; flex-direction: column"><span style="font-weight: 600">باقة البخور</span><span style="font-size: 12px; color: {C["mu"]}">مبخرة + عود + فحم</span></span></span>',
             pill('مسودة', 'neutral'), money(780), money(845, 14, 400, C['mu']), f'<span style="color: {C["su"]}; font-weight: 600"><bdi dir="ltr">−8%</bdi></span>', num('12'), row_menu('باقة البخور')]]
    items = ''.join(f'<li style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid {C["s100"]}">{ic("dots", 16, C["mu"])}{thumb(k, 40)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 14px; font-weight: 600">{n}</span>'
                    f'<span style="font-size: 12px; color: {C["mu"]}">{v}</span></span>{stepper(1)}{money(p)}{icbtn("trash", "إزالة " + n, size=36)}</li>' for k, n, v, p in (
        ('bisht', 'بشت حساوي', 'الصنف: يختاره العميل (المقاس واللون)', 1850), ('agal', 'عقال مرعز أسود', 'الصنف: 58', 185), ('oud', 'دهن عود كمبودي 12 مل', 'الصنف: الوحيد', 950)))
    form = (f'{field("اسم الباقة", "باقة المناسبة", fid="bn")}<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 14px; font-weight: 600">المنتجات (من منتجات المنصة فقط)</span>'
            f'<ul style="list-style: none; margin: 0; padding: 0">{items}</ul>{btn("أضف منتجاً", "secondary", "dense", "plus")}</div>'
            f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{field("سعر الباقة", "2,690.00", suffix="ر.س", fid="bp")}{field("مجموع الأسعار منفصلة", "2,985.00", suffix="ر.س", fid="bcp", helper="يُحسب تلقائياً · توفير 295.00 ر.س")}</div>'
            + image_uploader().split('<ul')[0] + '</div>' + toggle('منشورة', True))
    main = (page_header('الباقات', ['الإدارة', 'الباقات'], btn('أنشئ باقة', 'primary', 'dense', 'plus'), 'الباقات للمنصة فقط في المرحلة الأولى (SPEC 5).')
            + data_table([('الباقة', 'start'), ('الحالة', 'start'), ('السعر', 'end'), ('منفصلة', 'end'), ('التوفير', 'end'), ('المخزون المتاح', 'end'), ('', 'end')], rows, total='6', caption='الباقات', min_w=820)
            + f'<div style="height: 900px"></div>' + drawer('تعديل الباقة', form, btn('إلغاء', 'ghost', 'dense') + btn('حفظ الباقة', 'primary', 'dense', 'check')))
    OUT['AdminBundles-desktop.dc.html'] = doc('الإدارة — الباقات', f'<div style="position: relative; display: flex; flex: 1">{ashell("bundles", main)}<div aria-hidden="true" style="position: absolute; inset: 0; background: {C["scrim"]}; z-index: 40"></div>{drawer("تعديل الباقة", form, btn("إلغاء", "ghost", "dense") + btn("حفظ الباقة", "primary", "dense", "check"))}</div>'.replace(drawer('تعديل الباقة', form, btn('إلغاء', 'ghost', 'dense') + btn('حفظ الباقة', 'primary', 'dense', 'check')), '', 1), 1440, 1240, fluid=True)

ORDERS = [('SZ-100231', 'محمد ع.', 'الرياض', 3, ('مدفوع', 'info'), ('جديد', 'info'), 4077, 'مدى', 'منذ 12 د'),
          ('SZ-100230', 'سارة م.', 'جدة', 1, ('مدفوع', 'info'), ('قيد التجهيز', 'accent', 'box'), 1290, 'تابي', 'منذ ساعة'),
          ('SZ-100228', 'فهد ق.', 'الدمام', 2, ('شُحن جزئياً', 'info', 'truck'), ('تم الشحن', 'info', 'truck'), 3640, 'Apple Pay', 'أمس'),
          ('SZ-100225', 'نورة ح.', 'الرياض', 1, ('مكتمل', 'success', 'check'), ('مكتمل', 'success', 'check'), 640, 'بطاقة', 'أمس'),
          ('SZ-100224', 'خالد ش.', 'مكة', 1, ('بانتظار الدفع', 'warning', 'clock'), ('—', 'neutral'), 950, 'تمارا', 'منذ 2 يوم'),
          ('SZ-100219', 'ريم ع.', 'الخبر', 2, ('ملغي', 'neutral'), ('ملغي', 'neutral'), 2035, 'مدى', 'منذ 3 أيام')]

def orders_list():
    rows = [[f'<a href="AdminOrder-desktop.dc.html" style="font-weight: 700; color: {C["ink"]}">{num(n)}</a>', f'<span style="display: flex; flex-direction: column"><span>{c}</span><span style="font-size: 12px; color: {C["mu"]}">{city}</span></span>',
             num(sub), pill(*pay), pill(*ful), money(tot), pm, f'<span style="font-size: 12px; color: {C["mu"]}">{t}</span>', row_menu(n)] for n, c, city, sub, pay, ful, tot, pm, t in ORDERS]
    main = (page_header('الطلبات', ['الإدارة', 'الطلبات'], btn('تصدير', 'secondary', 'dense', 'file'), 'كل طلب ينقسم لطلبات فرعية لكل تاجر (D3). الحالة الرئيسية مشتقة منها.')
            + filter_bar('رقم الطلب، اسم العميل، الجوال', [('حالة الدفع', 'الكل', False), ('حالة التنفيذ', 'جديد', True), ('التاجر', 'الكل', False), ('طريقة الدفع', 'الكل', False), ('الفترة', '30 يوم', True)],
                         ('التنفيذ: جديد', 'الفترة: آخر 30 يوم'), '8 نتائج', [('الكل', 1284), ('تحتاج إجراء', 8), ('بانتظار الدفع', 3), ('قيد التنفيذ', 21), ('مكتملة', 1190), ('ملغاة', 62)])
            + data_table([('الطلب', 'start'), ('العميل', 'start'), ('شحنات', 'end'), ('الدفع', 'start'), ('التنفيذ', 'start'), ('الإجمالي', 'end'), ('الطريقة', 'start'), ('التاريخ', 'start'), ('', 'end')], rows, sel=(0, 1),
                         bulk=bulk_btns('طباعة الفواتير', 'طباعة قوائم التجهيز', 'تصدير'), total='8', caption='الطلبات'))
    OUT['AdminOrders-desktop.dc.html'] = doc('الإدارة — الطلبات', ashell('orders', main), 1440, 1100, fluid=True)

def order_detail():
    def sub(n, vendor, status, items, tl, ship_form=False):
        it = ''.join(f'<div style="display: flex; align-items: center; gap: 10px; padding: 8px 0">{thumb(k, 40)}<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 14px; font-weight: 600">{nm}</span><span style="font-size: 12px; color: {C["mu"]}">{num(sku)} · {opt}</span></span>'
                     f'<span style="font-size: 14px">× {num(q)}</span>{money(p * q)}</div>' for k, nm, sku, opt, q, p in items)
        sf = ''
        if ship_form:
            sf = (f'<div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1.5px solid {C["ink"]}; border-radius: 8px; background: {C["s50"]}"><strong style="font-size: 14px">تغيير الحالة إلى «تم الشحن»</strong>'
                  f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{select("شركة الشحن", "اختر الشركة", "car")}{field("رقم التتبع", "", "مثال: 1234567890", fid="trk")}</div>'
                  f'{field("رابط التتبع (اختياري)", "", "https://", fid="trl")}{textarea("ملاحظة داخلية (اختياري)", "", "sn", 2)}'
                  f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}">الشحن يدوي (D17): العميل يرى الشركة ورقم التتبع والرابط، ويوصله SMS وإيميل.</p>'
                  f'<div style="display: flex; gap: 8px">{btn("تأكيد الشحن وإشعار العميل", "primary", "dense", "truck")}{btn("إلغاء", "ghost", "dense")}</div></div>')
        return card2(f'{num(n)} · {vendor}', it + sf + f'<details open="open"><summary style="min-height: 36px; cursor: pointer; font-size: 14px; font-weight: 600; color: {C["b7"]}">سجل الحالة</summary><div style="padding-top: 8px">{status_timeline(tl)}</div></details>',
                     f'<span style="display: flex; gap: 8px; align-items: center">{pill(*status)}{btn("تغيير الحالة", "secondary", "dense", icon_end="chev-d")}{btn("قائمة التجهيز", "ghost", "dense", "file")}</span>')
    s1 = sub('SZ-100231-1', 'سوق الزل', ('قيد التجهيز', 'accent', 'box'), [('agal', 'عقال مرعز أسود', 'AGL-MRZ-58', '58', 1, 185), ('saffron', 'زعفران سوبر 10 جرام', 'SAF-10', 'علبة زجاج', 2, 145)],
             [(pill('قيد التجهيز', 'accent', 'box'), 'المالك', 'اليوم 9:30 ص', None), (pill('جديد', 'info'), 'النظام · بعد تأكيد الدفع من Moyasar', 'اليوم 9:02 ص', None)], ship_form=True)
    s2 = sub('SZ-100231-2', 'دار المثال', ('جديد', 'info'), [('bisht', 'بشت حساوي يدوي — سعر فصال مقفول', 'DM-BSH-56', '56 · أسود · PR-10023', 2, 1500)],
             [(pill('جديد', 'info'), 'النظام', 'اليوم 9:02 ص', 'بانتظار تجهيز التاجر · مهلة التجهيز: 24 ساعة')])
    r = lambda a, b, s=False: f'<div style="display: flex; justify-content: space-between; font-size: {16 if s else 14}px; {"font-weight: 700;" if s else ""}"><span style="color: {C["ink"] if s else C["mu"]}">{a}</span>{b}</div>'
    pay = card2('الدفع', r('المنتجات', money(3987)) + r('الشحن (3)', money(90)) + r('الخصم', '<span>—</span>') + hr() + r('الإجمالي', money(4077, 16, 700), True) + r('الضريبة المضمنة', money(531.78, 12, 400, C['mu']))
                + kv([('الطريقة', 'مدى · •••• 4421'), ('مرجع Moyasar', '<bdi dir="ltr">pay_[المرجع]</bdi>'), ('الحالة', pill('مدفوع', 'success', 'check'))]) + btn('استرجاع مبلغ', 'secondary', 'dense', 'return'))
    cust = card2('العميل', kv([('الاسم', '<a href="AdminCustomer-desktop.dc.html">محمد ع.</a>'), ('الجوال', '<bdi dir="ltr">05X XXX XX12</bdi>'), ('الطلبات السابقة', '7')]) + hr()
                 + '<strong style="font-size: 14px">عنوان التوصيل</strong><p style="margin: 0; font-size: 14px; color: ' + C['b7'] + '">محمد ع. · الرياض، حي الملقا، شارع [اسم الشارع]، مبنى 0000 · <bdi dir="ltr">RRRA1234</bdi></p>')
    notes = card2('ملاحظات داخلية', textarea('أضف ملاحظة (لا يراها العميل)', '', 'on', 2) + f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}">كل ملاحظة تُسجل في سجل العمليات.</p>')
    main = (page_header('الطلب <bdi dir="ltr">SZ-100231</bdi>', ['الإدارة', 'الطلبات', 'SZ-100231'], btn('طباعة الفاتورة', 'secondary', 'dense', 'file') + btn('إرسال رسالة للعميل', 'secondary', 'dense', 'msg') + btn('إلغاء الطلب', 'danger', 'dense', 'x'),
                        'اليوم 9:02 ص · 3 شحنات من 3 تجار', f'{pill("مدفوع", "success", "check")}{pill("قيد التنفيذ", "info")}')
            + f'<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap"><div style="flex: 999 1 640px; min-width: 0; display: flex; flex-direction: column; gap: 16px">{s1}{s2}'
            f'{card2("SZ-100231-3 · مباخر النموذج", "<span style=\"font-size: 14px; color: " + C["mu"] + "\">1 منتج · " + pill("تم الشحن", "info", "truck") + " · [شركة الشحن] · <bdi dir=\"ltr\">[رقم التتبع]</bdi></span>", btn("فتح", "ghost", "dense", icon_end="chev-d"))}</div>'
            f'<aside style="flex: 1 1 320px; max-width: 380px; display: flex; flex-direction: column; gap: 16px">{pay}{cust}{notes}</aside></div>')
    OUT['AdminOrder-desktop.dc.html'] = doc('الإدارة — تفاصيل الطلب', ashell('orders', main), 1440, 1800, fluid=True)

def invoice():
    rows = [['عقال مرعز أسود · AGL-MRZ-58', num(1), '160.87', '24.13', '185.00'], ['زعفران سوبر 10 جرام · SAF-10', num(2), '252.17', '37.83', '290.00'], ['شحن الطلب الفرعي', num(1), '21.74', '3.26', '25.00']]
    body = (f'<div style="padding: 40px; background: {C["s100"]}; flex: 1; display: flex; justify-content: center"><article aria-label="فاتورة ضريبية مبسطة" style="width: 794px; min-height: 1123px; background: {W}; padding: 48px; display: flex; flex-direction: column; gap: 24px; box-shadow: 0 6px 20px rgba(22,18,14,.10)">'
            f'<div style="display: flex; justify-content: space-between; align-items: flex-start">{logo(False, 20)}<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px"><h1 style="margin: 0; font-size: 24px">فاتورة ضريبية مبسطة</h1>'
            f'<span style="font-size: 14px; color: {C["mu"]}" dir="ltr">Simplified Tax Invoice</span></div></div>'
            f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 14px">{kv([("رقم الفاتورة", "<bdi dir=\"ltr\">INV-[رقم]</bdi>"), ("رقم الطلب", "<bdi dir=\"ltr\">SZ-100231-1</bdi>"), ("التاريخ", "17 نوفمبر 2026")])}'
            f'{kv([("البائع", "[الاسم القانوني للمنشأة]"), ("الرقم الضريبي", "[الرقم الضريبي]"), ("السجل التجاري", "[رقم السجل]")])}</div>'
            + table(['الصنف', 'الكمية', 'قبل الضريبة', 'الضريبة 15%', 'الإجمالي'], [[r[0], r[1]] + [f'<span style="display: block; text-align: end">{money(float(x))}</span>' for x in r[2:]] for r in rows], 'بنود الفاتورة', 600)
            + f'<div style="display: flex; justify-content: space-between; align-items: flex-end"><div role="img" aria-label="رمز QR للفاتورة (TLV حسب ZATCA)" style="width: 120px; height: 120px; border: 1px dashed {C["line"]}; display: flex; align-items: center; justify-content: center; font-size: 12px; color: {C["mu"]}; text-align: center">QR (TLV)</div>'
            f'<div style="width: 300px; display: flex; flex-direction: column; gap: 6px; font-size: 14px">{"".join(f"<div style=\"display: flex; justify-content: space-between\"><span>{a}</span>{money(b, 14, 600)}</div>" for a, b in (("الإجمالي قبل الضريبة", 434.78), ("ضريبة القيمة المضافة", 65.22)))}'
            f'{hr()}<div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700"><span>الإجمالي شامل الضريبة</span>{money(500, 16, 700)}</div></div></div>'
            f'<p style="margin: auto 0 0; font-size: 12px; color: {C["mu"]}">جميع المبالغ بالريال السعودي (SAR). نموذج الفاتورة والجهة البائعة بانتظار اعتماد finance-zatca (O2). القالب للطباعة A4 وملف PDF.</p></article></div>')
    OUT['AdminInvoice-print.dc.html'] = doc('الإدارة — فاتورة للطباعة (A4)', body, 900, 1220)

def returns_():
    rows = [[f'<a href="#" style="font-weight: 700; color: {C["ink"]}">{num(n)}</a>', num(o), c, reason, pill(*st), money(amt), f'<span style="font-size: 12px; color: {C["mu"]}">{t}</span>', row_menu(n)] for n, o, c, reason, st, amt, t in (
        ('RT-2041', 'SZ-100188-2', 'نورة ح.', 'المقاس غير مناسب', ('طلب استرجاع', 'warning', 'clock'), 1850, 'منذ ساعتين'), ('RT-2039', 'SZ-100171-1', 'فهد ق.', 'المنتج تالف', ('معتمد', 'info'), 640, 'أمس'),
        ('RT-2033', 'SZ-100140-1', 'سارة م.', 'غير مطابق للوصف', ('مسترد', 'success', 'check'), 950, 'منذ 4 أيام'), ('RT-2030', 'SZ-100122-3', 'خالد ش.', 'غيّرت رأيي', ('مرفوض', 'danger', 'x'), 185, 'منذ 6 أيام'))]
    detail = card2('RT-2041 · SZ-100188-2', f'<div style="display: flex; gap: 10px">{thumb("bisht", 64)}<div style="display: flex; flex-direction: column; gap: 2px"><strong style="font-size: 14px">بشت حساوي · مقاس 56 · أسود</strong><span style="font-size: 14px; color: {C["mu"]}">الكمية 1 · سوق الزل</span>{money(1850)}</div></div>'
                   + kv([('السبب', 'المقاس غير مناسب'), ('تاريخ التسليم', '12 نوفمبر · داخل مدة الاسترجاع'), ('ملاحظة العميل', '«المقاس أكبر من المتوقع، أبي 54»')])
                   + f'<div style="display: flex; gap: 8px">{"".join(f"<span style=\"width: 72px\">{art(k, radius=6)}</span>" for k in ("bisht", "bisht"))}</div>'
                   + field('مبلغ الاسترجاع', '1,850.00', suffix='ر.س', fid='ra', helper='كامل أو جزئي · عبر Moyasar Refund API إلى نفس وسيلة الدفع')
                   + banner('أثر على رصيد التاجر', 'لو دخل رصيد التاجر يُسجل قيد REFUND_DEBIT تلقائياً (6.2). هنا البائع المنصة، فلا قيد على تاجر.', 'info', 'info')
                   + row(btn('اعتماد الاسترجاع', 'primary', 'dense', 'check') + btn('رفض مع سبب', 'danger', 'dense', 'x'), 8)
                   + f'<details><summary style="min-height: 36px; cursor: pointer; font-size: 14px; font-weight: 600">سجل الحالة</summary>{status_timeline([(pill("طلب استرجاع", "warning", "clock"), "العميل", "اليوم 8:14 ص", None)])}</details>')
    main = (page_header('الاسترجاعات', ['الإدارة', 'الاسترجاعات'], btn('تصدير', 'secondary', 'dense', 'file'), 'الاسترجاع من لوحة الإدارة فقط (6.2). الحالات: طلب ← معتمد ← مستلم ← مسترد، أو مرفوض.')
            + filter_bar('رقم الاسترجاع أو الطلب', [('الحالة', 'الكل', False), ('السبب', 'الكل', False), ('الفترة', '30 يوم', False)], (), None, [('الكل', 41), ('بانتظار القرار', 2), ('معتمد', 3), ('مسترد', 33), ('مرفوض', 3)])
            + f'<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap"><div style="flex: 999 1 560px; min-width: 0">{data_table([("الاسترجاع", "start"), ("الطلب الفرعي", "start"), ("العميل", "start"), ("السبب", "start"), ("الحالة", "start"), ("المبلغ", "end"), ("التاريخ", "start"), ("", "end")], [[r[i] for i in range(8)] for r in rows], select=False, total="41", caption="الاسترجاعات", min_w=760)}</div>'
            f'<aside style="flex: 1 1 340px; max-width: 420px">{detail}</aside></div>')
    OUT['AdminReturns-desktop.dc.html'] = doc('الإدارة — الاسترجاعات', ashell('returns', main), 1440, 1300, fluid=True)

def customers():
    rows = [[f'<span style="display: flex; align-items: center; gap: 10px">{avatar(n[0], s=32)}<a href="AdminCustomer-desktop.dc.html" style="font-weight: 600; color: {C["ink"]}">{n}</a></span>', f'<bdi dir="ltr">{ph}</bdi>', city, num(o), money(sp), t, pill(*st), row_menu(n)]
            for n, ph, city, o, sp, t, st in (('محمد ع.', '05X XXX XX12', 'الرياض', 7, 12480, 'اليوم', ('نشط', 'success')), ('سارة م.', '05X XXX XX40', 'جدة', 3, 4310, 'أمس', ('نشط', 'success')),
                                                ('فهد ق.', '05X XXX XX77', 'الدمام', 12, 21900, 'منذ 3 أيام', ('نشط', 'success')), ('عبدالله ر.', '05X XXX XX05', 'مكة', 1, 185, 'منذ شهر', ('محظور', 'danger', 'x')),
                                                ('نورة ح.', '05X XXX XX63', 'الرياض', 0, 0, 'منذ أسبوع', ('بدون طلبات', 'neutral')))]
    main = (page_header('العملاء', ['الإدارة', 'العملاء'], btn('تصدير', 'secondary', 'dense', 'file'), 'الجوال يظهر مقنّعاً، وكشفه يُسجل في سجل العمليات (صلاحية customers.view).')
            + filter_bar('الاسم أو الجوال أو الإيميل', [('المدينة', 'الكل', False), ('الطلبات', 'الكل', False), ('الحالة', 'الكل', False), ('موافقة التسويق', 'الكل', False)], (), None, [('الكل', 3420), ('عملاء جدد', 312), ('بلا طلبات', 1104), ('محظورون', 6)])
            + data_table([('العميل', 'start'), ('الجوال', 'start'), ('المدينة', 'start'), ('الطلبات', 'end'), ('إجمالي الإنفاق', 'end'), ('آخر نشاط', 'start'), ('الحالة', 'start'), ('', 'end')], rows, total='3,420', caption='العملاء'))
    OUT['AdminCustomers-desktop.dc.html'] = doc('الإدارة — العملاء', ashell('customers', main), 1440, 1000, fluid=True)

def customer_detail():
    k = ''.join(f'<div style="display: flex; flex-direction: column; gap: 2px; padding: 14px; background: {W}; border: 1px solid {C["s200"]}; border-radius: 8px"><span style="font-size: 12px; color: {C["mu"]}">{a}</span><span style="font-size: 20px; font-weight: 700">{b}</span></div>' for a, b in (
        ('الطلبات', num(7)), ('إجمالي الإنفاق', money(12480, 20, 700)), ('متوسط السلة', money(1782.86, 20, 700)), ('طلبات الأسعار', num(4))))
    orders = data_table([('الطلب', 'start'), ('التاريخ', 'start'), ('الحالة', 'start'), ('الإجمالي', 'end')], [[f'<a href="AdminOrder-desktop.dc.html">{num(n)}</a>', d, pill(*s), money(t)] for n, d, s, t in (
        ('SZ-100231', '17 نوفمبر', ('قيد التنفيذ', 'info'), 4077), ('SZ-100140', '2 نوفمبر', ('مكتمل', 'success', 'check'), 950), ('SZ-100088', '20 أكتوبر', ('مكتمل', 'success', 'check'), 3210))], select=False, total='7', caption='طلبات العميل', min_w=520)
    prof = card2('البيانات', kv([('الجوال', '<bdi dir="ltr">05X XXX XX12</bdi> <button type="button" style="border: 0; background: transparent; color: ' + C['g7'] + '; font-family: inherit; font-size: 14px; text-decoration: underline; min-height: 32px">إظهار</button>'),
                                   ('الإيميل', 'm•••@example.com'), ('اللغة', 'العربية'), ('عضو منذ', 'مارس 2026'), ('موافقة التسويق', pill('موافق', 'success', 'check'))]))
    addr = card2('العناوين (2)', '<p style="margin: 0; font-size: 14px">المنزل · الرياض، حي الملقا (افتراضي)</p><p style="margin: 0; font-size: 14px">العمل · الرياض، حي العليا</p>')
    act = card2('إجراءات', toggle('تعليق ميزة الفصال لهذا العميل', False, 'بعد محاولات مشاركة تواصل متكررة') + btn('حظر العميل', 'danger', 'dense', 'x') + btn('حذف الحساب (PDPL)', 'ghost', 'dense', 'trash'))
    main = (page_header('محمد ع.', ['الإدارة', 'العملاء', 'محمد ع.'], btn('إرسال رسالة', 'secondary', 'dense', 'msg'), 'الرياض · آخر نشاط اليوم', pill('نشط', 'success'))
            + f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px">{k}</div>'
            + f'<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap"><div style="flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 16px">{sec_tabs(["الطلبات (7)", "طلبات الأسعار (4)", "الاسترجاعات (1)", "التقييمات (2)", "السجل"], 0, "سجل العميل")}{orders}</div>'
            f'<aside style="flex: 1 1 300px; max-width: 360px; display: flex; flex-direction: column; gap: 16px">{prof}{addr}{act}</aside></div>')
    OUT['AdminCustomer-desktop.dc.html'] = doc('الإدارة — ملف العميل', ashell('customers', main), 1440, 1200, fluid=True)

def coupons():
    rows = [[f'<code style="font-family: inherit; font-weight: 700; padding: 2px 8px; border: 1px dashed {C["line"]}; border-radius: 4px" dir="ltr">{c}</code>', t, sc, f'<span><bdi dir="ltr">{u}</bdi></span>', d, pill(*s), row_menu(c)] for c, t, sc, u, d, s in (
        ('WINTER10', 'نسبة 10% · حد أقصى 200.00 ر.س', 'عام (تتحمله المنصة)', '124 / 500', '1 – 30 نوفمبر', ('فعّال', 'success', 'check')), ('FREESHIP', 'شحن مجاني فوق 500.00 ر.س', 'عام', '58 / ∞', 'مستمر', ('فعّال', 'success', 'check')),
        ('DM50', 'مبلغ 50.00 ر.س', 'دار المثال (يتحمله التاجر)', '9 / 100', '1 – 15 نوفمبر', ('منتهٍ', 'neutral')), ('NATIONAL94', 'نسبة 15%', 'البشوت فقط', '0 / 1000', 'يبدأ 20 سبتمبر', ('مجدول', 'info')))]
    form = (field('الكود', 'WINTER10', fid='cc', helper='حروف لاتينية كبيرة وأرقام فقط') + '<div role="radiogroup" aria-label="نوع الخصم" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">'
            + ''.join(radio_row(a, None, i == 0, f'ct{i}', 'ct') for i, a in enumerate(('نسبة', 'مبلغ ثابت', 'شحن مجاني'))) + '</div>'
            + f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{field("القيمة", "10", suffix="%", fid="cv")}{field("أقصى خصم", "200.00", suffix="ر.س", fid="cmx")}{field("أقل قيمة للطلب", "300.00", suffix="ر.س", fid="cmin")}{field("حد الاستخدام", "500", fid="cl")}</div>'
            + f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{field("يبدأ", "1 نوفمبر 2026 · 12:00 ص", fid="cs", prefix_icon="cal")}{field("ينتهي", "30 نوفمبر 2026 · 11:59 م", fid="ce", prefix_icon="cal")}</div>'
            + select('ينطبق على', 'كل التصنيفات', 'cap') + field('لكل عميل', '1', fid='cpu') + toggle('فعّال', True)
            + banner('من يتحمل الخصم', 'الكوبون العام يتوزع على الطلبات الفرعية وتتحمله المنصة، ولا يقلل صافي التاجر (6.1).', 'info', 'info'))
    main = (page_header('الكوبونات والعروض', ['الإدارة', 'الكوبونات والعروض'], btn('أنشئ كوبوناً', 'primary', 'dense', 'plus'), None)
            + sec_tabs(['الكوبونات', 'عروض سوق الزل (مراجعة)', 'المواسم'], 0, 'الأقسام')
            + filter_bar('ابحث بالكود', [('الحالة', 'الكل', False), ('النطاق', 'الكل', False)], (), None, None)
            + data_table([('الكود', 'start'), ('الخصم', 'start'), ('النطاق', 'start'), ('الاستخدام', 'end'), ('المدة', 'start'), ('الحالة', 'start'), ('', 'end')], rows, select=False, total='4', caption='الكوبونات', min_w=820)
            + '<div style="height: 700px"></div>')
    page = (f'<div style="position: relative; display: flex; flex: 1">{ashell("coupons", main)}<div aria-hidden="true" style="position: absolute; inset: 0; background: {C["scrim"]}; z-index: 40"></div>'
            f'{drawer("تعديل الكوبون WINTER10", form, btn("إلغاء", "ghost", "dense") + btn("حفظ الكوبون", "primary", "dense", "check"))}</div>')
    OUT['AdminCoupons-desktop.dc.html'] = doc('الإدارة — الكوبونات والعروض', page, 1440, 1240, fluid=True)

def reviews():
    def rv(name, prod, r, text, st, reply=None, photos=0):
        return (f'<article style="display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid {C["s100"]}">{cb(False, "تحديد التقييم")}<div style="flex: 1; display: flex; flex-direction: column; gap: 6px">'
                f'<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">{stars(r, None, 14)}<strong style="font-size: 14px">{name}</strong><span style="font-size: 12px; color: {C["mu"]}">على {prod} · مشتري موثّق</span>{pill(*st)}</div>'
                f'<p style="margin: 0; font-size: 16px">{text}</p>' + (f'<div style="display: flex; gap: 6px">{"".join(f"<span style=\"width: 56px\">{art(chr(0) and k or k, radius=4)}</span>" for k in ["bisht"] * photos)}</div>' if photos else '')
                + (f'<div style="padding: 10px 12px; background: {C["s100"]}; border-radius: 8px; font-size: 14px"><strong>رد المتجر:</strong> {reply}</div>' if reply else '') +
                f'<div style="display: flex; gap: 8px">{btn("اعتماد", "secondary", "dense", "check")}{btn("إخفاء", "ghost", "dense", "eye-off")}{btn("رد", "ghost", "dense", "msg")}</div></div></article>')
    lst = (f'<div style="background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px; overflow: hidden">'
           + rv('سارة م.', 'بشت حساوي', 4.0, 'الخياطة ممتازة والزري فخم، لكن التوصيل تأخر يوم.', ('بانتظار المراجعة', 'warning', 'clock'), None, 2)
           + rv('فهد ق.', 'دهن عود كمبودي', 5.0, 'ريحة ثابتة وفخمة، يستاهل.', ('معتمد', 'success', 'check'), 'شكراً لك، نسعد بخدمتك دائماً.')
           + rv('عبدالله ر.', 'عقال مرعز', 1.0, 'تواصل معي على [رقم محذوف بالفلتر]', ('مخفي', 'neutral'), None) + '</div>')
    main = (page_header('التقييمات', ['الإدارة', 'التقييمات'], '', 'التقييم يحتاج شراء مؤكد. المعتمد فقط يظهر في المتجر.')
            + filter_bar('ابحث في نص التقييم', [('النجوم', 'الكل', False), ('المنتج', 'الكل', False), ('التاجر', 'الكل', False), ('بصور', 'الكل', False)], (), None, [('بانتظار المراجعة', 7), ('معتمد', 418), ('مخفي', 12)]) + lst)
    OUT['AdminReviews-desktop.dc.html'] = doc('الإدارة — التقييمات', ashell('reviews', main), 1440, 1100, fluid=True)

def content():
    banners = ''.join(f'<li style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid {C["s100"]}"><button type="button" aria-label="اسحب لترتيب {t}" style="width: 36px; height: 36px; border: 0; background: transparent; color: {C["mu"]}">{ic("dots", 18)}</button>'
                      f'<span style="width: 160px; flex: none">{art(k, tone="dark", ratio="16 / 11", radius=6)}</span><div style="flex: 1; display: flex; flex-direction: column; gap: 2px"><strong style="font-size: 14px">{t}</strong>'
                      f'<span style="font-size: 12px; color: {C["mu"]}">الرابط: {l} · {d}</span></div>{pill(*s)}{row_menu(t)}</li>' for k, t, l, d, s in (
        ('bisht', 'بشوت مخيطة يدوياً بزري ذهبي', '/c/bisht', 'دائم', ('ظاهر', 'success')), ('oud', 'موسم العود', '/c/oud', '20 نوفمبر – 5 ديسمبر', ('مجدول', 'info')), ('farwa', 'الفراوي الشتوية', '/c/farwa', 'انتهى 10 نوفمبر', ('منتهٍ', 'neutral'))))
    secs = ''.join(f'<li style="display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 6px 12px; border-bottom: 1px solid {C["s100"]};{" background: " + C["g50"] + "; box-shadow: 0 12px 32px rgba(22,18,14,.16); border: 1px solid " + C["ink"] + ";" if i == 2 else ""}">'
                   f'<button type="button" aria-label="اسحب لترتيب {t}" style="width: 36px; height: 36px; border: 0; background: transparent; color: {C["mu"]}">{ic("dots", 18)}</button><span style="color: {C["b7"]}">{ic(icn, 20)}</span>'
                   f'<span style="flex: 1; display: flex; flex-direction: column"><span style="font-size: 14px; font-weight: 600">{t}</span><span style="font-size: 12px; color: {C["mu"]}">{tp}</span></span>'
                   f'<button type="button" role="switch" aria-checked="{"true" if on else "false"}" aria-label="إظهار {t}" style="position: relative; width: 40px; height: 24px; border-radius: 999px; border: 0; background: {C["ink"] if on else C["line"]}"><span aria-hidden="true" style="position: absolute; top: 3px; {"inset-inline-start: 19px" if on else "inset-inline-start: 3px"}; width: 18px; height: 18px; border-radius: 50%; background: {W}"></span></button>{row_menu(t)}</li>'
                   for i, (icn, t, tp, on) in enumerate((('image', 'البنرات', 'BANNERS', True), ('grid', 'تسوّق حسب التصنيف', 'CATEGORIES', True), ('zap', 'عروض الساعة (سوق الزل)', 'DEALS', True), ('box', 'الأكثر طلباً', 'FEATURED', True),
                                                          ('gift', 'الباقات', 'BUNDLES', False), ('tag', 'منتجات: البشوت', 'CATEGORY_PRODUCTS · البشوت', True))))
    pages = data_table([('الصفحة', 'start'), ('الرابط', 'start'), ('آخر تعديل', 'start'), ('الحالة', 'start'), ('', 'end')], [[t, f'<bdi dir="ltr">/pages/{s}</bdi>', d, pill(*st), row_menu(t)] for t, s, d, st in (
        ('سياسة الخصوصية', 'privacy', '15 نوفمبر · legal-contracts', ('منشورة', 'success')), ('الاسترجاع والاستبدال', 'returns', '15 نوفمبر', ('منشورة', 'success')), ('الشروط والأحكام', 'terms', '14 نوفمبر', ('مسودة', 'neutral')),
        ('الشحن والتوصيل', 'shipping', '14 نوفمبر', ('منشورة', 'success')), ('الأسئلة الشائعة', 'faq', '12 نوفمبر', ('منشورة', 'success')), ('من نحن', 'about', '10 نوفمبر', ('منشورة', 'success')))], select=False, total='7', caption='الصفحات', min_w=640)
    main = (page_header('المحتوى', ['الإدارة', 'المحتوى'], btn('معاينة الرئيسية', 'secondary', 'dense', 'eye') + btn('أضف بانراً', 'primary', 'dense', 'plus'), None)
            + sec_tabs(['البنرات', 'أقسام الرئيسية', 'الصفحات'], 0, 'أقسام المحتوى')
            + f'<div style="display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 24px; align-items: start">'
            f'{card2("البنرات (3)", "<ul style=\"list-style: none; margin: 0; padding: 0\">" + banners + "</ul><p style=\"margin: 0; font-size: 12px; color: " + C["mu"] + "\">لكل بانر: عنوان، سطر فرعي، نص زر، رابط، صورة جوال 16:11 وديسكتوب 5:4، ومدة عرض.</p>", btn("أضف", "secondary", "dense", "plus"))}'
            f'{card2("أقسام الرئيسية (اسحب للترتيب)", "<ul style=\"list-style: none; margin: 0; padding: 0\">" + secs + "</ul>", btn("أضف قسماً", "secondary", "dense", "plus"))}</div>'
            + card2('الصفحات', pages + f'<p style="margin: 0; font-size: 12px; color: {C["mu"]}">صفحات السياسات يراجعها legal-contracts قبل النشر. تحرير الصفحة بنفس محرر الوصف (rich text + sanitize).</p>'))
    OUT['AdminContent-desktop.dc.html'] = doc('الإدارة — المحتوى', ashell('cms', main), 1440, 1500, fluid=True)

def settings():
    nav = ''.join(f'<a href="#{i}"{" aria-current=\"true\"" if i == 0 else ""} style="display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border-radius: 8px; text-decoration: none; font-size: 14px; color: {C["ink"]}; '
                  f'background: {C["s100"] if i == 0 else "transparent"}; font-weight: {700 if i == 0 else 400}; border-inline-start: 3px solid {C["ink"] if i == 0 else "transparent"}">{ic(icn, 18, C["b7"])}{t}</a>' for i, (icn, t) in enumerate((
        ('store', 'بيانات المتجر'), ('file', 'الضريبة والفواتير'), ('card', 'الدفع'), ('truck', 'الشحن ومناطقه'), ('phone', 'الرسائل SMS'), ('msg', 'واتساب'), ('chart', 'Pixels والتحليلات'), ('lock', 'الأمان'))))
    store = form_section('بيانات المتجر', 'تظهر في الفوتر والفواتير والإيميلات.', f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{field("اسم المتجر (عربي)", "سوق الزل", fid="s1")}{field("اسم المتجر (إنجليزي)", "Souq AlZal", fid="s2")}'
                         f'{field("الاسم القانوني", "[الاسم القانوني للمنشأة]", fid="s3")}{field("رقم السجل التجاري", "[رقم السجل]", fid="s4")}{field("إيميل الدعم", "support@example.com", fid="s5")}{field("جوال الدعم", "05X XXX XXXX", fid="s6", prefix_icon="phone")}</div>'
                         + field('العنوان الوطني', '[العنوان الوطني المختصر]', fid='s7'))
    tax = form_section('الضريبة والفواتير', 'الأسعار شاملة الضريبة (D8). نموذج الفاتورة حسب قرار O2.', f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{field("الرقم الضريبي", "[الرقم الضريبي]", fid="t1", helper="15 رقماً يبدأ وينتهي بـ 3")}'
                       f'{field("نسبة الضريبة", "15", suffix="%", fid="t2")}{field("العمولة الافتراضية", "10", suffix="%", fid="t3")}{field("أيام الحجز قبل إتاحة الرصيد", "7", suffix="يوم", fid="t4")}</div>' + toggle('إظهار "شامل الضريبة" تحت كل سعر', True))
    def provider(name, st, mode, keyline):
        return (f'<div style="display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid {C["s200"]}; border-radius: 8px"><strong style="font-size: 14px; width: 110px" dir="ltr">{name}</strong>{pill(*st)}{pill(mode, "neutral")}'
                f'<span style="flex: 1; font-size: 12px; color: {C["mu"]}" dir="ltr">{keyline}</span>{btn("إعداد", "secondary", "dense", "gear")}</div>')
    pay = form_section('الدفع', 'المفاتيح السرية في متغيرات البيئة فقط، ولا تُعرض هنا أبداً. هذا الشاشة للحالة والتفعيل.',
                       provider('Moyasar', ('متصل', 'success', 'check'), 'sandbox', 'pk_test_••••4f2a · webhook ✓ آخر حدث قبل 3 د') + provider('Tabby', ('غير مفعّل', 'neutral'), 'sandbox', 'بانتظار حساب التاجر')
                       + provider('Tamara', ('غير مفعّل', 'neutral'), 'sandbox', 'بانتظار حساب التاجر') + f'<div style="display: flex; gap: 8px; flex-wrap: wrap">{"".join(chip(m, True) for m in ("مدى", "Apple Pay", "البطاقات", "STC Pay"))}{chip("تابي")}{chip("تمارا")}</div>'
                       + select('من يتحمل رسوم الدفع (O1)', 'المنصة', 'gfb'))
    zones = data_table([('المنطقة', 'start'), ('المدن', 'start'), ('رسوم أساسية', 'end'), ('لكل كجم', 'end'), ('مجاني فوق', 'end'), ('المدة', 'start'), ('', 'end')], [
        ['الرياض', 'الرياض، الخرج', money(25), money(3), money(500), '1–2 يوم', row_menu('الرياض')], ['الغربية', 'جدة، مكة، المدينة، الطائف', money(30), money(4), money(500), '2–3 أيام', row_menu('الغربية')],
        ['الشرقية', 'الدمام، الخبر، الأحساء', money(30), money(4), money(500), '2–3 أيام', row_menu('الشرقية')], ['باقي المملكة', 'كل المدن الأخرى', money(40), money(5), '<span>—</span>', '3–5 أيام', row_menu('باقي المملكة')]],
        select=False, page=False, caption='مناطق الشحن', min_w=720)
    ship = form_section('الشحن ومناطقه', 'الرسوم لكل طلب فرعي حسب المدينة والوزن (6.6). الشحن يدوي: التاجر أو المالك يدخل الشركة ورقم التتبع (D17).', zones + btn('أضف منطقة', 'secondary', 'dense', 'plus')
                        + field('شركات الشحن المتاحة للاختيار', 'SMSA، Aramex، SPL، J&T، أخرى', fid='car', helper='تظهر في قائمة "شركة الشحن" عند تغيير الحالة إلى تم الشحن'))
    sms = form_section('الرسائل SMS', 'مزود الرسائل حسب O5. اسم المرسل يحتاج تسجيلاً مسبقاً.', f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{select("المزود", "Taqnyat", "sp")}{field("اسم المرسل", "SUQALZL", fid="sn", helper="بانتظار اعتماد التسجيل")}</div>'
                       + ''.join(toggle(t, on) for t, on in (('تأكيد الطلب والدفع', True), ('شحن الطلب برقم التتبع', True), ('السلة المتروكة (للموافقين فقط، D19)', True), ('طلب تقييم بعد التسليم', False))) + btn('إرسال رسالة تجريبية', 'secondary', 'dense', 'send'))
    wa = form_section('واتساب', 'زر التواصل العائم وقوالب الإشعارات.', field('رقم واتساب للتواصل', '9665XXXXXXXX', fid='wa', helper='يُستخدم في زر واتساب العائم ورابط wa.me') + toggle('إظهار الزر العائم', True) + toggle('إشعارات واتساب عبر Cloud API', False, 'تحتاج حساب واتساب للأعمال وقوالب معتمدة'))
    px = form_section('Pixels والتحليلات', 'تُحمّل فقط بعد موافقة الكوكيز (PDPL).', f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{field("GA4 Measurement ID", "G-XXXXXXX", fid="g4")}{field("Meta Pixel ID", "", "اختياري", fid="mp")}{field("Snap Pixel ID", "", "اختياري", fid="snp")}{field("TikTok Pixel ID", "", "اختياري", fid="ttp")}</div>')
    sec = form_section('الأمان', 'إعدادات الدخول للإدارة والتجار.', toggle('التحقق بخطوتين (OTP للجوال) للإدارة', True) + toggle('التحقق بخطوتين للتجار', False, 'مقترح؛ بانتظار قرار') + select('انتهاء الجلسة بعد عدم النشاط', '60 دقيقة', 'sto')
                       + card2('الجلسات النشطة (2)', '<p style="margin: 0; font-size: 14px">Chrome · Windows · الرياض · هذا الجهاز</p><p style="margin: 0; font-size: 14px">Safari · iPhone · الرياض · قبل 3 ساعات ' + btn('إنهاء', 'ghost', 'dense') + '</p>', pad=14))
    main = (page_header('الإعدادات', ['الإدارة', 'الإعدادات'], '', 'كل تغيير يُسجل في سجل العمليات. صلاحية settings.manage.')
            + f'<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap"><nav aria-label="أقسام الإعدادات" style="flex: 1 1 200px; max-width: 240px; display: flex; flex-direction: column; gap: 2px; position: sticky; top: 16px">{nav}</nav>'
            f'<div style="flex: 999 1 640px; min-width: 0">{store}{tax}{pay}{ship}{sms}{wa}{px}{sec}</div></div>' + save_bar())
    OUT['AdminSettings-desktop.dc.html'] = doc('الإدارة — الإعدادات', ashell('settings', main), 1440, 3500, fluid=True)

def staff():
    rows = [[f'<span style="display: flex; align-items: center; gap: 10px">{avatar(n[0], s=32)}<span style="display: flex; flex-direction: column"><span style="font-weight: 600">{n}</span><span style="font-size: 12px; color: {C["mu"]}">{e}</span></span></span>',
             pill(*r), p, t, pill(*s), row_menu(n)] for n, e, r, p, t, s in (
        ('المالك', 'owner@example.com', ('مدير عام', 'accent', 'seal'), 'كل الصلاحيات', 'الآن', ('نشط', 'success')), ('أحمد ف.', 'ops@example.com', ('موظف', 'neutral'), 'الطلبات، المنتجات، العملاء', 'قبل ساعة', ('نشط', 'success')),
        ('منى ك.', 'content@example.com', ('موظف', 'neutral'), 'المحتوى، التقييمات', 'أمس', ('نشط', 'success')), ('[دعوة مرسلة]', 'finance@example.com', ('موظف', 'neutral'), 'المالية، التقارير', '—', ('بانتظار القبول', 'warning', 'clock')))]
    perms = [('orders.manage', 'إدارة الطلبات والاسترجاع'), ('products.review', 'إدارة ومراجعة المنتجات'), ('vendors.manage', 'إدارة التجار'), ('payouts.manage', 'التسويات والتحويلات'),
             ('cms.manage', 'المحتوى والبنرات'), ('customers.view', 'عرض العملاء'), ('reports.view', 'التقارير'), ('settings.manage', 'الإعدادات')]
    pm = ''.join(f'<label style="display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 4px; border-bottom: 1px solid {C["s100"]}"><input type="checkbox" class="sr"{" checked=\"checked\"" if on else ""}>'
                 f'<span aria-hidden="true" style="width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid {C["ink"] if on else C["ctl"]}; background: {C["ink"] if on else W}; display: inline-flex; align-items: center; justify-content: center">{ic("check", 14, C["s50"], 2.5) if on else ""}</span>'
                 f'<span style="flex: 1; font-size: 14px">{d}</span><code style="font-family: inherit; font-size: 12px; color: {C["mu"]}" dir="ltr">{k}</code></label>' for (k, d), on in zip(perms, (True, True, False, False, False, True, False, False)))
    edit = card2('صلاحيات: أحمد ف.', select('الدور', 'موظف (صلاحيات مخصصة)', 'role') + pm + banner('صلاحيات حساسة', 'التسويات والإعدادات تحتاج تأكيداً بكلمة المرور ورمز OTP عند الحفظ.', 'warning', 'lock')
                 + row(btn('حفظ الصلاحيات', 'primary', 'dense', 'check') + btn('تعطيل الحساب', 'danger', 'dense'), 8))
    main = (page_header('الموظفون والصلاحيات', ['الإدارة', 'الموظفون والصلاحيات'], btn('دعوة موظف', 'primary', 'dense', 'plus'), 'SUPER_ADMIN واحد على الأقل دائماً. كل تغيير صلاحية يُسجل.')
            + f'<div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap"><div style="flex: 999 1 560px; min-width: 0">{data_table([("الموظف", "start"), ("الدور", "start"), ("الصلاحيات", "start"), ("آخر دخول", "start"), ("الحالة", "start"), ("", "end")], rows, select=False, total="4", caption="الموظفون", min_w=760)}</div>'
            f'<aside style="flex: 1 1 340px; max-width: 420px">{edit}</aside></div>')
    OUT['AdminStaff-desktop.dc.html'] = doc('الإدارة — الموظفون والصلاحيات', ashell('staff', main), 1440, 1100, fluid=True)

def audit():
    rows = [[f'<span style="font-size: 12px; color: {C["mu"]}">{t}</span>', f'<span style="display: flex; align-items: center; gap: 8px">{avatar(a[0], s=28)}{a}</span>', pill(*act), f'<a href="#">{ent}</a>', f'<bdi dir="ltr" style="font-size: 12px; color: {C["mu"]}">{ip}</bdi>',
             btn('عرض التغيير', 'ghost', 'dense', icon_end='chev-d')] for t, a, act, ent, ip in (
        ('اليوم 10:42 ص', 'المالك', ('تغيير حالة طلب', 'info'), 'SZ-100231-1: قيد التجهيز ← تم الشحن', '185.x.x.21'), ('اليوم 10:12 ص', 'المالك', ('تعديل منتج', 'neutral'), 'بشت حساوي: السعر', '185.x.x.21'),
        ('اليوم 9:58 ص', 'أحمد ف.', ('اعتماد استرجاع', 'warning'), 'RT-2039 · 640.00 ر.س', '94.x.x.7'), ('أمس 8:40 م', 'المالك', ('تعديل صلاحيات', 'danger', 'lock'), 'أحمد ف.: + customers.view', '185.x.x.21'),
        ('أمس 6:02 م', 'منى ك.', ('نشر صفحة', 'neutral'), 'سياسة الخصوصية', '51.x.x.110'))]
    diff = (f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px"><div style="padding: 12px; border-radius: 8px; background: {C["dabg"]}"><strong style="font-size: 12px; color: {C["da"]}">قبل</strong>'
            f'<pre style="margin: 6px 0 0; font-family: inherit; font-size: 14px; white-space: pre-wrap" dir="ltr">basePrice: 1,950.00\ncompareAtPrice: 2,200.00</pre></div>'
            f'<div style="padding: 12px; border-radius: 8px; background: {C["subg"]}"><strong style="font-size: 12px; color: {C["su"]}">بعد</strong><pre style="margin: 6px 0 0; font-family: inherit; font-size: 14px; white-space: pre-wrap" dir="ltr">basePrice: 1,850.00\ncompareAtPrice: 2,200.00</pre></div></div>')
    main = (page_header('سجل العمليات', ['الإدارة', 'سجل العمليات'], btn('تصدير', 'secondary', 'dense', 'file'), 'للقراءة فقط. لا يمكن تعديل أو حذف أي سجل.')
            + filter_bar('ابحث في الكيان أو المعرّف', [('المستخدم', 'الكل', False), ('نوع العملية', 'الكل', False), ('الكيان', 'الكل', False), ('الفترة', '7 أيام', True)], ('الفترة: آخر 7 أيام',), '214 عملية')
            + data_table([('الوقت', 'start'), ('المستخدم', 'start'), ('العملية', 'start'), ('الكيان', 'start'), ('IP', 'start'), ('', 'end')], rows, select=False, total='214', caption='سجل العمليات', min_w=860)
            + card2('تفاصيل: تعديل منتج · بشت حساوي · اليوم 10:12 ص', diff))
    OUT['AdminAudit-desktop.dc.html'] = doc('الإدارة — سجل العمليات', ashell('audit', main), 1440, 1250, fluid=True)

def admin_states():
    def dp(label, kind, inner, w=660, h=520):
        return (f'<section aria-label="{label}" style="width: {w}px; flex: none; display: flex; flex-direction: column; gap: 10px"><div style="display: flex; align-items: center; gap: 8px"><span style="font-size: 12px; font-weight: 700; background: {C["g5"]}; color: {C["ink"]}; border-radius: 999px; padding: 2px 10px">{kind}</span>'
                f'<h2 style="margin: 0; font-size: 16px">{label}</h2></div><div style="position: relative; height: {h}px; background: {C["s50"]}; border: 1px solid {C["s200"]}; border-radius: 12px; overflow: hidden; padding: 20px; display: flex; flex-direction: column; gap: 14px">{inner}</div></section>')
    skrows = ''.join(f'<div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid {C["s100"]}">{skel("20px", 20)}{skel("44px", 55, 4)}{skel("40%", 14)}{skel("12%", 14)}{skel("10%", 14)}</div>' for _ in range(6))
    load = page_header('المنتجات', ['الإدارة', 'المنتجات'], btn('أضف منتجاً', 'primary', 'dense', 'plus')) + f'<div aria-busy="true" style="background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px">{skrows}</div>'
    empty = page_header('المنتجات', ['الإدارة', 'المنتجات']) + f'<div style="background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px">' + state_panel('ما فيه منتجات بعد', 'أضف أول منتج، أو استورد منتجاتك من ملف CSV المصدّر من زد.', 'box', btn('أضف منتجاً', 'primary', 'md', 'plus', True) + btn('استيراد CSV', 'secondary', 'md', 'upload', True)) + '</div>'
    noresult = filter_bar('ابحث بالاسم أو SKU', [('الحالة', 'منشور', True)], ('الحالة: منشور', 'بحث: «سداري حرير»'), '0 نتيجة') + f'<div style="background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px">' + state_panel('لا نتائج مطابقة', 'جرّب كلمة أقصر أو أزل بعض الفلاتر. البحث يطبّع الهمزات والتاء المربوطة.', 'search', btn('مسح الفلاتر', 'secondary', 'md', full=True)) + '</div>'
    err = page_header('الطلبات', ['الإدارة', 'الطلبات']) + banner('تعذّر تحميل الطلبات', 'صار خلل في الاتصال بالخادم. الفلاتر محفوظة. رمز الخطأ: <bdi dir="ltr">ORD-503</bdi>', 'danger', 'alert', btn('إعادة المحاولة', 'secondary', 'dense', 'refresh'))
    delc = f'<div style="position: absolute; inset: 0; background: {C["scrim"]}; display: flex; align-items: center; justify-content: center; padding: 24px">{confirm_dialog("حذف التصنيف «أطفال»؟", "فيه 4 منتجات. اختر تصنيفاً تنتقل له المنتجات قبل الحذف.", "حذف ونقل المنتجات", extra=select("انقل المنتجات إلى", "البشوت ← حساوي", "mv"))}</div>'
    deltyped = f'<div style="position: absolute; inset: 0; background: {C["scrim"]}; display: flex; align-items: center; justify-content: center; padding: 24px">{confirm_dialog("حذف الموظف «أحمد ف.» نهائياً؟", "يفقد الدخول فوراً، وتبقى عملياته في السجل باسمه.", "حذف الموظف", typed="أحمد ف.")}</div>'
    leave = f'<div style="position: absolute; inset: 0; background: {C["scrim"]}; display: flex; align-items: center; justify-content: center; padding: 24px">{confirm_dialog("تخرج بدون حفظ؟", "عندك تغييرات على «بشت حساوي» ما حُفظت.", "خروج بدون حفظ", destructive=False)}</div>'
    ok = page_header('بشت حساوي مخيط يدوياً', ['الإدارة', 'المنتجات', 'تعديل'], btn('عرض في المتجر', 'ghost', 'dense', 'eye'), None, pill('منشور', 'success', 'check')) + f'<div style="position: absolute; bottom: 20px; inset-inline-start: 20px">{toast("حُفظ المنتج ونُشر في المتجر.", "success", "عرض في المتجر")}</div>'
    valid = page_header('منتج جديد', ['الإدارة', 'المنتجات', 'جديد']) + banner('ما حُفظ المنتج: 3 حقول تحتاج تصحيح', '<a href="#">اسم المنتج (إنجليزي) مطلوب</a> · <a href="#">صورة واحدة على الأقل</a> · <a href="#">صنف 58 · أسود: السعر قبل الخصم أقل من السعر</a>', 'danger', 'alert') + field('اسم المنتج (إنجليزي)', '', fid='ve', error='مطلوب لصفحة المنتج بالإنجليزي و SEO.')
    deny = state_panel('ما عندك صلاحية لهذه الصفحة', 'صفحة التسويات تحتاج صلاحية payouts.manage. اطلبها من مدير الحساب.', 'lock', btn('رجوع للرئيسية', 'secondary', 'md', full=True), 'warning')
    panels = (dp('تحميل الجدول', 'تحميل', load) + dp('فارغ: لا منتجات', 'فارغ', empty) + dp('لا نتائج للبحث والفلاتر', 'فارغ', noresult) + dp('خطأ في التحميل', 'خطأ', err)
              + dp('تأكيد حذف مع نقل', 'تأكيد الحذف', delc) + dp('تأكيد حذف بكتابة الاسم', 'تأكيد الحذف', deltyped) + dp('مغادرة بدون حفظ', 'تأكيد', leave) + dp('نجاح الحفظ', 'نجاح', ok)
              + dp('خطأ تحقق عند الحفظ', 'خطأ', valid) + dp('بدون صلاحية (403)', 'خطأ', deny))
    body = f'<div style="padding: 40px; display: grid; grid-template-columns: repeat(3, 660px); gap: 40px">{panels}</div>'
    OUT['Admin-states-p018.dc.html'] = doc('الإدارة — الحالات المشتركة', body, 2140, 2440)

def admin_responsive():
    # tablet 768: DataTable -> cards under md; mobile 390: order detail stacked
    cardrows = ''.join(f'<article style="display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid {C["s100"]}">{cb(False, "تحديد")}{thumb(k, 56)}<div style="flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0">'
                       f'<strong style="font-size: 14px">{n}</strong><span style="font-size: 12px; color: {C["mu"]}">{v} · {num(sku)}</span><div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">{pill(*stt)}{money(pr)}<span style="font-size: 12px; color: {C["mu"]}">المخزون {num(st)}</span></div></div>{row_menu(n)}</article>'
                       for k, n, v, sku, var, stt, pr, st, cat, note in PRODUCTS[:5])
    tablet = (f'<div style="width: 768px; height: 1100px; flex: none; border: 1px solid {C["s200"]}; border-radius: 16px; overflow: hidden; background: {C["s50"]}; display: flex; flex-direction: column">'
              f'<header data-surface="inverse" style="background: {C["b9"]}; padding: 6px 12px; display: flex; align-items: center; gap: 8px">{icbtn("menu", "القائمة", True)}<span style="font-size: 16px; font-weight: 700; color: {C["s50"]}; flex: 1">المنتجات</span>{icbtn("search", "بحث", True)}{icbtn("bell", "الإشعارات", True, "4")}</header>'
              f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">{filter_bar("ابحث بالاسم أو SKU", [("الحالة", "الكل", False), ("التصنيف", "الكل", False)], (), None, [("الكل", 248), ("منشور", 201), ("مراجعة", 12)])}'
              f'<div style="background: {W}; border: 1px solid {C["s200"]}; border-radius: 12px">{cardrows}</div></div>'
              f'<div style="margin-top: auto; padding: 12px 16px; background: {W}; border-top: 1px solid {C["s200"]}">{btn("أضف منتجاً", "primary", "lg", "plus", True)}</div></div>')
    mobile = (f'<div style="width: 390px; height: 1100px; flex: none; border: 1px solid {C["s200"]}; border-radius: 16px; overflow: hidden; background: {C["s50"]}; display: flex; flex-direction: column">'
              f'<header data-surface="inverse" style="background: {C["b9"]}; padding: 6px 8px; display: flex; align-items: center; gap: 4px"><a href="#" aria-label="رجوع" style="width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; color: {C["s50"]}">{ic("chev-r", 22)}</a>'
              f'<span style="font-size: 16px; font-weight: 700; color: {C["s50"]}; flex: 1">الطلب <bdi dir="ltr">SZ-100231</bdi></span>{icbtn("dots", "إجراءات", True)}</header>'
              f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px"><div style="display: flex; gap: 6px; flex-wrap: wrap">{pill("مدفوع", "success", "check")}{pill("قيد التنفيذ", "info")}</div>'
              f'{card2("SZ-100231-1 · سوق الزل", status_timeline([(pill("قيد التجهيز", "accent", "box"), "المالك", "9:30 ص", None), (pill("جديد", "info"), "النظام", "9:02 ص", None)]), pill("قيد التجهيز", "accent"), 14)}'
              f'{card2("الدفع", kv([("الإجمالي", money(4077, 16, 700)), ("الطريقة", "مدى")]), "", 14)}</div>'
              f'<div style="margin-top: auto; padding: 12px 16px; background: {W}; border-top: 1px solid {C["s200"]}; display: flex; gap: 8px">{btn("تغيير الحالة", "primary", "lg", extra=" flex: 1;")}{btn("الفاتورة", "secondary", "lg", "file")}</div></div>')
    body = (f'<div style="padding: 40px; display: flex; flex-direction: column; gap: 20px"><div style="display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 28px">الإدارة على التابلت والجوال</h1>'
            f'<p style="margin: 0; color: {C["mu"]}; max-width: 1000px">ديسكتوب أولاً؛ تحت lg يصير الـ Sidebar Sheet، وتحت md يتحول DataTable لبطاقات بنفس الحقول والتحديد، والإجراء الأساسي في شريط ثابت بالأسفل، والأزرار 44px على اللمس.</p></div>'
            f'<div style="display: flex; gap: 40px; align-items: flex-start">{tablet}{mobile}</div></div>')
    OUT['Admin-responsive.dc.html'] = doc('الإدارة — التابلت والجوال', body, 1320, 1280)

def build():
    kit(); products_list(); product_form(); categories(); bundles(); orders_list(); order_detail(); invoice(); returns_(); customers(); customer_detail()
    coupons(); reviews(); content(); settings(); staff(); audit(); admin_states(); admin_responsive()
    return OUT
