# -*- coding: utf-8 -*-
import re
"""Shared components for the Souq AlZal P0 design canvas.
Every helper returns inline-styled markup so the canvas editor can edit it.
Values come from docs/design/tokens.md (+ the 3 proposed additions in README).
"""

C = dict(
    ink='#16120E', b9='#2E2018', b7='#4A3426', b5='#6E5240',
    g5='#C29A4B', g6='#A67F35', g7='#7E5F22',
    s50='#FBF7F0', s100='#F3EADB', s200='#E6D7BE', w='#FFFFFF', mu='#6B5E52',
    su='#2F6B3F', wa='#8A5A0F', da='#A23B2A', inf='#2D5B7A',
    subg='#E8F1EA', wabg='#F8EEDC', dabg='#F8E7E3', infbg='#E6EEF4',
    # tokens.md 1.0 additions
    b8='#3B2B21', b6='#5C4334', g50='#FAF3E3', g3='#DDBE7C', s300='#BCAA92', d3='#F0A08F',
    wa6='#16803E', wa7='#15783A',   # tokens 1.1 whatsapp / whatsapp-hover (FAB only)
    line='#8F7B66',      # --input (sand-500): field borders, 4.04:1 on white
    ctl='#6E5240',       # checkbox / radio border (brown-500) 7.13:1
    ondark='#BCAA92',    # muted-foreground inside inverse scope (sand-300)
    scrim='rgba(22,18,14,.55)',
)
FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, 'Geeza Pro', 'Noto Sans Arabic', system-ui, sans-serif"

# ---------------------------------------------------------------- icons
_P = {
 'search': '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>',
 'bag': '<path d="M5 8h14l-1 12H6L5 8z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path>',
 'user': '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"></path>',
 'menu': '<path d="M4 7h16M4 12h16M4 17h16"></path>',
 'heart': '<path d="M12 20s-7-4.4-8.5-9A4.7 4.7 0 0 1 12 6.6 4.7 4.7 0 0 1 20.5 11C19 15.6 12 20 12 20z"></path>',
 'star': '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z"></path>',
 'chev-l': '<path d="M15 6l-6 6 6 6"></path>',
 'chev-r': '<path d="M9 6l6 6-6 6"></path>',
 'chev-d': '<path d="M6 9l6 6 6-6"></path>',
 'chev-u': '<path d="M6 15l6-6 6 6"></path>',
 'arrow-r': '<path d="M5 12h14M13 6l6 6-6 6"></path>',
 'clock': '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>',
 'flame': '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.6-8.3 2.1 1.4 2.6 3.6 2.4 5.2 1.4-.8 2-2.4 2-3.7 2.6 1.9 5 4.4 5 7.1 0 3.4-2.6 5.9-6.5 5.9z"></path>',
 'hand': '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"></path><path d="M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5"></path><path d="M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14"></path><path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.6a6 6 0 0 1-4.6-2.2L4.6 15a1.6 1.6 0 0 1 2.4-2l1 1"></path>',
 'x': '<path d="M6 6l12 12M18 6L6 18"></path>',
 'check': '<path d="M5 12.5l4.5 4.5L19 7.5"></path>',
 'sliders': '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"></path><circle cx="16" cy="7" r="2"></circle><circle cx="10" cy="17" r="2"></circle>',
 'sort': '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"></path>',
 'truck': '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"></path><circle cx="7" cy="17.5" r="1.8"></circle><circle cx="17" cy="17.5" r="1.8"></circle>',
 'shield': '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"></path><path d="M8.5 12l2.5 2.5 4.5-4.5"></path>',
 'lock': '<rect x="5" y="10.5" width="14" height="10" rx="2"></rect><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"></path>',
 'bell': '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"></path><path d="M10 20.5a2 2 0 0 0 4 0"></path>',
 'home': '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"></path>',
 'box': '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"></path><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"></path>',
 'tag': '<path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z"></path><circle cx="8" cy="8.5" r="1.4"></circle>',
 'chart': '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"></path>',
 'users': '<circle cx="9" cy="8.5" r="3.5"></circle><path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5"></path><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.5 3.5 5.2"></path>',
 'store': '<path d="M4 9.5L5.5 4h13L20 9.5"></path><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"></path><path d="M5 11.5V20h14v-8.5M10 20v-5h4v5"></path>',
 'wallet': '<rect x="3" y="6" width="18" height="14" rx="2"></rect><path d="M3 10h18M16 15h2"></path><path d="M6 6l9-3 1.5 3"></path>',
 'gear': '<circle cx="12" cy="12" r="3"></circle><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"></path>',
 'inbox': '<path d="M3 13l2.5-8h13L21 13v6H3z"></path><path d="M3 13h5l1.5 2.5h5L16 13h5"></path>',
 'plus': '<path d="M12 5v14M5 12h14"></path>',
 'minus': '<path d="M5 12h14"></path>',
 'alert': '<path d="M12 4l9 16H3z"></path><path d="M12 10v4.5M12 17.5v.01"></path>',
 'info': '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 11v5.5M12 8v.01"></path>',
 'refresh': '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L20 9.5"></path><path d="M20 4.5v5h-5"></path>',
 'wifi-off': '<path d="M3 3l18 18"></path><path d="M8.5 16.5a5 5 0 0 1 7 0M5 12.8a10 10 0 0 1 4.2-2.4M19 12.8a10 10 0 0 0-3-2M2 9a15 15 0 0 1 4.5-2.8M22 9a15 15 0 0 0-10-3.8"></path><path d="M12 20v.01"></path>',
 'pin': '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"></path><circle cx="12" cy="10" r="2.3"></circle>',
 'msg': '<path d="M4 19.5l1.3-3.8A8 8 0 1 1 8.5 19z"></path>',
 'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"></path><circle cx="12" cy="12" r="2.8"></circle>',
 'eye-off': '<path d="M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.6 3.3M6.4 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.2-1"></path>',
 'share': '<circle cx="6" cy="12" r="2.3"></circle><circle cx="18" cy="6" r="2.3"></circle><circle cx="18" cy="18" r="2.3"></circle><path d="M8 11l8-4M8 13l8 4"></path>',
 'grid': '<rect x="4" y="4" width="6.5" height="6.5" rx="1"></rect><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"></rect><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"></rect><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"></rect>',
 'card': '<rect x="3" y="5.5" width="18" height="13" rx="2"></rect><path d="M3 10h18M7 15h3"></path>',
 'phone': '<rect x="7" y="2.5" width="10" height="19" rx="2"></rect><path d="M11 18.5h2"></path>',
 'seal': '<path d="M12 2.8l2.3 1.7 2.8-.2.9 2.7 2.4 1.5-.8 2.7.8 2.7-2.4 1.5-.9 2.7-2.8-.2L12 21.2l-2.3-1.7-2.8.2-.9-2.7-2.4-1.5.8-2.7-.8-2.7 2.4-1.5.9-2.7 2.8.2z"></path><path d="M8.8 12l2.2 2.2 4.2-4.2"></path>',
 'return': '<path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"></path>',
 'zap': '<path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z"></path>',
 'send': '<path d="M21 3L10 14M21 3l-6.5 18-4.5-7-7-4.5z"></path>',
 'file': '<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v4h4M9 13h6M9 17h6"></path>',
 'logout': '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"></path>',
 'cal': '<rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M4 10h16M9 3v4M15 3v4"></path>',
 'trend-up': '<path d="M3 17l6-6 4 4 8-8"></path><path d="M15 7h6v6"></path>',
 'trend-down': '<path d="M3 7l6 6 4-4 8 8"></path><path d="M15 17h6v-6"></path>',
 'image': '<rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect><circle cx="9" cy="10" r="1.8"></circle><path d="M20.5 16l-5-5-9 8.5"></path>',
 'upload': '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"></path>',
 'trash': '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"></path>',
 'edit': '<path d="M4 20h4L19 9l-4-4L4 16z"></path>',
 'dots': '<circle cx="5" cy="12" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="19" cy="12" r="1.2"></circle>',
 'gift': '<rect x="3.5" y="8" width="17" height="4" rx="1"></rect><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z"></path>',
}

def ic(name, s=20, c='currentColor', sw=1.75, label=None):
    a = 'role="img" aria-label="%s"' % label if label else 'aria-hidden="true"'
    flip = ' transform: scaleX(-1);' if name in ('arrow-r', 'send', 'return', 'logout') else ''
    return ('<svg %s viewBox="0 0 24 24" width="%d" height="%d" style="flex: none; fill: none; stroke: %s; '
            'stroke-width: %s; stroke-linecap: round; stroke-linejoin: round;%s">%s</svg>') % (a, s, s, c, sw, flip, _P[name])

def star_fill(s=14, c=C['g6']):
    return ('<svg aria-hidden="true" viewBox="0 0 24 24" width="%d" height="%d" style="flex: none; fill: %s; stroke: none">%s</svg>'
            % (s, s, c, _P['star']))

# ------------------------------------------------------------- product art
# Neutral line drawings (our own) instead of product photos.
_ART = {
 'bisht': '<path d="M60 22c-14 0-26 4-34 9L8 76l17 7 4-20v77h62V63l4 20 17-7-18-45c-8-5-20-9-34-9z"></path><path d="M52 23l-6 117M68 23l6 117" style="stroke: %(g)s"></path><path d="M52 23c2 10 14 10 16 0" style="stroke: %(g)s"></path>',
 'farwa': '<path d="M60 24c-14 0-26 4-34 9L10 78l16 6 4-20v76h60V64l4 20 16-6-16-45c-8-5-20-9-34-9z"></path><path d="M44 26c4 4 2 9 6 12s2 9 6 12 2 8 4 90M76 26c-4 4-2 9-6 12s-2 9-6 12-2 8-4 90" style="stroke: %(g)s"></path>',
 'agal': '<ellipse cx="60" cy="62" rx="42" ry="15"></ellipse><ellipse cx="60" cy="62" rx="34" ry="10" style="stroke: %(g)s"></ellipse><path d="M88 74c2 18 0 36-4 52M94 72c4 18 4 36 0 50"></path><path d="M82 126h6M90 122h6" style="stroke: %(g)s"></path>',
 'mabkhara': '<path d="M38 132h44l-6-14H44z"></path><path d="M48 118l4-34h16l4 34"></path><path d="M30 84h60l-6-18H36z" style="stroke: %(g)s"></path><path d="M40 66c2-12 10-18 20-18s18 6 20 18"></path><path d="M60 48v-8M56 30c-4-6 4-10 0-16M66 32c-4-6 4-10 0-16" style="stroke: %(g)s"></path>',
 'oud': '<path d="M48 54h24l6 10v64a6 6 0 0 1-6 6H48a6 6 0 0 1-6-6V64z"></path><path d="M52 54V40h16v14"></path><path d="M56 40V14h8v26" style="stroke: %(g)s"></path><path d="M42 84h36M42 108h36" style="stroke: %(g)s"></path>',
 'saffron': '<path d="M36 76h48v52a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6z"></path><path d="M32 66h56v10H32z" style="stroke: %(g)s"></path><path d="M60 56c-4-10-14-14-20-12 2 8 10 14 20 12zM60 56c4-10 14-14 20-12-2 8-10 14-20 12zM60 56c-2-12 0-22 0-26 0 4 2 14 0 26z"></path><path d="M60 58v8" style="stroke: %(g)s"></path>',
 'sword': '<path d="M26 128c18-30 44-64 76-100-10 40-34 78-64 108z"></path><path d="M22 118l20 20" style="stroke: %(g)s"></path><path d="M20 140l-6 6M28 132l-14 14" style="stroke: %(g)s"></path>',
 'masbaha': '<circle cx="60" cy="58" r="34" style="stroke-dasharray: 2 7; stroke-width: 6"></circle><path d="M60 92v20" style="stroke: %(g)s"></path><path d="M54 112h12l-2 22h-8z"></path>',
 'shal': '<path d="M14 40h92L60 126z"></path><path d="M24 48h72M34 60h52" style="stroke: %(g)s"></path><path d="M60 126v10M54 126l-4 10M66 126l4 10"></path>',
}

def art(kind='bisht', h=None, tone='sand', radius=8, ratio='4 / 5', label='صورة المنتج (بديل توضيحي)', pad=18, extra=''):
    bg, st, g = (C['s100'], C['b5'], C['g6']) if tone == 'sand' else (C['b7'], C['ondark'], C['g5'])
    if tone == 'white':
        bg = C['w']
    size = ('height: %dpx;' % h) if h else ('aspect-ratio: %s;' % ratio)
    return ('<div role="img" aria-label="%s" style="position: relative; width: 100%%; %s background: %s; border-radius: %dpx; '
            'display: flex; align-items: center; justify-content: center; overflow: hidden; flex: none;%s">'
            '<svg aria-hidden="true" viewBox="0 0 120 150" style="height: 72%%; max-width: 80%%; fill: none; stroke: %s; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round">%s</svg>'
            '</div>') % (label, size, bg, radius, extra, st, _ART[kind] % {'g': g})

# ------------------------------------------------------------------ money
def fmt(v, compact=False):
    s = '{:,.2f}'.format(v)
    if compact and s.endswith('.00'):
        s = s[:-3]
    return s

# Saudi riyal sign U+20C1 (tokens 8.4). The official SAMA glyph is not available in this environment,
# so the sign is drawn as a labelled dashed PLACEHOLDER of the exact size/position: height 0.698em
# (= Plex digit height), on the baseline, LEFT of the number in both directions, U+00A0 between.
RIYAL_PH = ('<span class="riyal" role="img" aria-label="%s" title="مكان رمز الريال الرسمي U+20C1 (placeholder حتى يُضاف ملف ساما)" '
            'style="display: inline-block; width: 0.62em; height: 0.698em; border: 1px dashed currentColor; border-radius: 2px; vertical-align: baseline; box-sizing: border-box"></span>')

def riyal(lang='ar'):
    return RIYAL_PH % ('ريال سعودي' if lang == 'ar' else 'Saudi riyal')

def price_markup(amount, lang='ar'):
    if lang == 'ar':
        return '<bdi class="price" dir="rtl" style="white-space: nowrap"><bdi dir="ltr">%s</bdi>\u00a0%s</bdi>' % (amount, riyal('ar'))
    return '<bdi class="price" dir="ltr" style="white-space: nowrap">%s\u00a0<bdi dir="ltr">%s</bdi></bdi>' % (riyal('en'), amount)

def sar(v, size=15, w=700, c=None, compact=False, strike=False, lang='ar'):
    c = c or C['ink']
    inner = price_markup(fmt(v, compact), lang)
    if strike:
        return ('<span style="font-size: %dpx; font-weight: %d; color: %s; white-space: nowrap"><span class="sr">%s</span><s>%s</s></span>' % (
            size, w, c, 'السعر قبل الخصم ' if lang == 'ar' else 'Was ', inner))
    return '<span style="font-size: %dpx; font-weight: %d; color: %s; white-space: nowrap">%s</span>' % (size, w, c, inner)

def num(t):
    return '<bdi dir="ltr">%s</bdi>' % t

# ---------------------------------------------------------------- buttons
def btn(label, kind='primary', size='md', icon=None, full=False, href=None, disabled=False, icon_end=None, extra=''):
    size = {'sm': 'md', 'xs': 'dense'}.get(size, size)   # tokens 1.1: sizes are md 44 / lg 52 / dense 36
    h = {'dense': 36, 'md': 44, 'lg': 52}[size]
    fs = {'dense': 14, 'md': 16, 'lg': 16}[size]
    px = {'dense': 12, 'md': 16, 'lg': 22}[size]
    k = {
        'primary': (C['ink'], C['s50'], C['ink']),
        'gold': (C['g5'], C['ink'], C['g5']),
        'primary-inverse': (C['g5'], C['ink'], C['g5']),   # Button variant=primary rendered inside data-surface=inverse
        'secondary': ('transparent', C['ink'], C['ink']),
        'bargain': (C['w'], C['g7'], C['g5']),
        'bargain-dark': ('transparent', C['g5'], C['g5']),
        'ghost': ('transparent', C['ink'], 'transparent'),
        'ghost-dark': ('transparent', C['s50'], 'transparent'),
        'light': (C['s50'], C['ink'], C['s50']),
        'danger': ('transparent', C['da'], C['da']),
        'success': (C['su'], C['w'], C['su']),
    }[kind]
    bg, fg, bd = k
    if disabled:
        bg, fg, bd = C['s200'], C['mu'], C['s200']
    bw = '1.5px' if kind.startswith('bargain') else '1px'
    style = ('display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: %dpx; padding: 0 %dpx; '
             'border-radius: 8px; border: %s solid %s; background: %s; color: %s; font-family: inherit; font-size: %dpx; font-weight: 600; '
             'text-decoration: none; white-space: nowrap; cursor: pointer;%s%s') % (
        h, px, bw, bd, bg, fg, fs, ' width: 100%;' if full else '', extra)
    inner = (ic(icon, 16 if size == 'dense' else 18) if icon else '') + '<span>%s</span>' % label + (ic(icon_end, 18) if icon_end else '')
    if href:
        return '<a href="%s" style="%s">%s</a>' % (href, style, inner)
    return '<button type="button"%s style="%s">%s</button>' % (' disabled="disabled"' if disabled else '', style, inner)

def icbtn(name, label, dark=False, badge=None, size=44, bg='transparent', c=None, border=None):
    c = c or (C['s50'] if dark else C['ink'])
    b = ''
    if badge is not None:
        b = ('<span aria-hidden="true" style="position: absolute; top: 2px; inset-inline-start: 2px; min-width: 20px; height: 20px; padding: 0 5px; '
             'border-radius: 999px; background: %s; color: %s; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center">%s</span>' % (C['g5'], C['ink'], badge))
    bd = 'border: 1px solid %s;' % border if border else 'border: 0;'
    return ('<button type="button" aria-label="%s" style="position: relative; width: %dpx; height: %dpx; display: inline-flex; align-items: center; '
            'justify-content: center; %s border-radius: 8px; background: %s; color: %s; cursor: pointer; flex: none">%s%s</button>') % (
        label + ('، %s عناصر' % badge if badge is not None else ''), size, size, bd, bg, c, ic(name, 22), b)

# ---------------------------------------------------------- chips & pills
def chip(label, sel=False, icon=None, rm=False, live=False, count=None, dark=False, h=44):
    h = max(h, 44)
    if dark:
        bg, fg, bd = (C['g5'], C['ink'], C['g5']) if sel else ('transparent', C['s100'], C['b5'])
    else:
        bg, fg, bd = (C['ink'], C['s50'], C['ink']) if sel else (C['w'], C['ink'], C['line'])
    dot = ('<span aria-hidden="true" class="pulse" style="width: 8px; height: 8px; border-radius: 50%%; background: %s; flex: none"></span>' % C['da']) if live else ''
    cnt = (' <span style="font-weight: 400">(%s)</span>' % num(count)) if count is not None else ''
    x = ('<span aria-hidden="true" style="display: inline-flex">%s</span>' % ic('x', 14)) if rm else ''
    lab = ' aria-label="إزالة فلتر %s"' % label if rm else ''
    pressed = ' aria-pressed="%s"' % ('true' if sel else 'false') if not rm else ''
    return ('<button type="button"%s%s style="display: inline-flex; align-items: center; gap: 6px; min-height: %dpx; padding: 0 14px; border-radius: 999px; '
            'border: 1px solid %s; background: %s; color: %s; font-family: inherit; font-size: 13px; font-weight: 500; white-space: nowrap; flex: none; cursor: pointer">'
            '%s%s<span>%s%s</span>%s</button>') % (lab, pressed, h, bd, bg, fg, dot, ic(icon, 16) if icon else '', label, cnt, x)

TONES = {'success': ('su', 'subg'), 'warning': ('wa', 'wabg'), 'danger': ('da', 'dabg'), 'info': ('inf', 'infbg'),
         'neutral': ('b7', 's100'), 'gold': ('g7', 'g50'), 'accent': ('g7', 'g50')}

def pill(label, tone='neutral', icon=None):
    fg, bg = TONES[tone]
    return ('<span style="display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 2px 10px; border-radius: 999px; background: %s; '
            'color: %s; font-size: 12px; font-weight: 600; white-space: nowrap; line-height: 20px">%s%s</span>') % (C[bg], C[fg], ic(icon, 14) if icon else '', label)

def disc(pct, on_dark=False):
    # tokens 1.0: discount = danger-700 / white (6.57:1). Signed value isolated LTR (review a8).
    return ('<span style="display: inline-flex; align-items: center; min-height: 24px; padding: 2px 8px; border-radius: 4px; background: %s; color: %s; '
            'font-size: 12px; font-weight: 700; white-space: nowrap"><span class="sr">خصم </span><bdi dir="ltr">\u2212%d%%</bdi></span>') % (C['da'], C['w'], pct)

def live_badge(dark=True, label='مباشر'):
    return ('<span style="display: inline-flex; align-items: center; gap: 6px; min-height: 24px; padding: 2px 10px; border-radius: 999px; '
            'border: 1px solid %s; color: %s; font-size: 12px; font-weight: 600; white-space: nowrap">'
            '<span aria-hidden="true" class="pulse" style="width: 8px; height: 8px; border-radius: 50%%; background: %s"></span>%s</span>') % (
        C['b6'] if dark else C['line'], C['s50'] if dark else C['ink'], C['d3'] if dark else C['da'], label)

def stars(r, n=None, size=13, dark=False):
    c = C['ondark'] if dark else C['mu']
    t = '<span style="display: inline-flex; align-items: center; gap: 3px; font-size: %dpx; color: %s; white-space: nowrap" aria-label="التقييم %s من 5%s">' % (
        size, c, r, ('، %s تقييم' % n) if n else '')
    t += star_fill(size + 1, C['g5'] if dark else C['g6'])
    t += '<span aria-hidden="true" style="font-weight: 600; color: %s">%s</span>' % (C['s50'] if dark else C['ink'], num(r))
    if n:
        t += '<span aria-hidden="true">(%s)</span>' % num(n)
    return t + '</span>'

# ---------------------------------------------------------------- counters
def countdown(h, m, s, dark=True, size='md', label='ينتهي خلال', holes=None):
    """Segmented HH:MM:SS. Digits aria-hidden; the static aria-label announces once."""
    fs, bw, bh = {'sm': (13, 26, 26), 'md': (16, 34, 34), 'lg': (22, 46, 46)}[size]
    bg, fg, bd = (C['ink'], C['g5'], C['b5']) if dark else (C['w'], C['ink'], C['line'])
    vals = holes or ('%02d' % h, '%02d' % m, '%02d' % s)
    seg = lambda v: ('<span style="min-width: %dpx; height: %dpx; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; '
                     'background: %s; color: %s; border: 1px solid %s; font-size: %dpx; font-weight: 700; font-variant-numeric: tabular-nums">%s</span>') % (bw, bh, bg, fg, bd, fs, v)
    sep = '<span style="color: %s; font-weight: 700">:</span>' % (C['ondark'] if dark else C['mu'])
    spoken = 'أقل من ساعة' if h == 0 else '%d ساعة تقريباً' % h
    return ('<span role="timer" aria-label="%s %s" style="display: inline-flex; align-items: center; gap: 4px; direction: ltr">'
            '<span aria-hidden="true" style="display: inline-flex; align-items: center; gap: 4px">%s%s%s%s%s</span></span>') % (
        label, spoken, seg(vals[0]), sep, seg(vals[1]), sep, seg(vals[2]))

def timer_inline(t, tone='warning', icon='clock', label=None):
    fg = C[TONES[tone][0]]
    return ('<span style="display: inline-flex; align-items: center; gap: 4px; color: %s; font-size: 14px; font-weight: 600; white-space: nowrap">%s%s<bdi dir="ltr">%s</bdi></span>') % (
        fg, ic(icon, 16), ('<span>%s</span>' % label) if label else '', t)

def stockbar(left, total, dark=False, urgent=False):
    # StockMeter (tokens 11.3): text carries the info, the bar is decorative. low (<= 3) -> urgent fill.
    urgent = urgent or (0 < left <= 3)
    pct = max(4, int(round(100.0 * (total - left) / total)))
    track = C['b7'] if dark else C['s200']
    fill = (C['g5'] if dark else C['b7']) if not urgent else (C['d3'] if dark else C['da'])
    fg = C['s50'] if dark else C['ink']
    sub = C['ondark'] if dark else C['mu']
    return ('<div style="display: flex; flex-direction: column; gap: 6px">'
            '<div style="display: flex; justify-content: space-between; font-size: 13px"><span style="color: %s; font-weight: 600">%s</span>'
            '<span style="color: %s">بيع %s من %s</span></div>'
            '<div aria-hidden="true" style="height: 6px; border-radius: 999px; background: %s; overflow: hidden">'
            '<div style="width: %d%%; height: 100%%; background: %s; border-radius: 999px"></div></div></div>') % (
        (C['d3'] if dark else C['da']) if urgent else fg, qty_text(left), sub, num(total - left), num(total), track, pct, fill)

def qty_text(n):
    # Arabic plural (ICU in messages): قطعة / قطعتان / قطع / قطعة (11+)
    if n == 1:
        return 'باقي قطعة واحدة'
    if n == 2:
        return 'باقي قطعتان'
    if 3 <= n <= 10:
        return 'باقي %s قطع' % num(n)
    return 'باقي %s قطعة' % num(n)

# ------------------------------------------------------------------ forms
def field(label, value='', ph='', suffix=None, helper=None, error=None, fid='f', big=False, prefix_icon=None, success=None):
    bd = C['da'] if error else C['line']
    ring = ' box-shadow: 0 0 0 1px %s;' % C['da'] if error else ''
    fs = 22 if big else 15
    h = 56 if big else 48
    desc = []
    out = '<div style="display: flex; flex-direction: column; gap: 6px">'
    out += '<label for="%s" style="font-size: 13px; font-weight: 600; color: %s">%s</label>' % (fid, C['ink'], label)
    out += ('<div style="display: flex; align-items: center; gap: 8px; min-height: %dpx; padding: 0 14px; border-radius: 8px; border: 1px solid %s; background: %s;%s">' % (h, bd, C['w'], ring))
    if prefix_icon:
        out += '<span style="color: %s; display: inline-flex">%s</span>' % (C['mu'], ic(prefix_icon, 18))
    aria = ''
    if helper or error:
        aria = ' aria-describedby="%s-d"' % fid
    if error:
        aria += ' aria-invalid="true"'
    out += ('<input id="%s" value="%s" placeholder="%s"%s style="flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-family: inherit; '
            'font-size: %dpx; font-weight: %d; color: %s; padding: 0; font-variant-numeric: tabular-nums">') % (fid, value, ph, aria, fs, 700 if big else 400, C['ink'])
    if suffix:
        out += '<span style="font-size: 14px; color: %s; font-weight: 500">%s</span>' % (C['mu'], suffix)
    out += '</div>'
    if error:
        out += '<p id="%s-d" style="margin: 0; display: flex; gap: 6px; align-items: flex-start; font-size: 13px; color: %s">%s<span>%s</span></p>' % (fid, C['da'], ic('alert', 16), error)
    elif success:
        out += '<p id="%s-d" style="margin: 0; display: flex; gap: 6px; font-size: 13px; color: %s">%s<span>%s</span></p>' % (fid, C['su'], ic('check', 16), success)
    elif helper:
        out += '<p id="%s-d" style="margin: 0; font-size: 13px; color: %s; line-height: 20px">%s</p>' % (fid, C['mu'], helper)
    return out + '</div>'

def select(label, value, fid='s', helper=None, compact=False):
    out = '<div style="display: flex; flex-direction: column; gap: 6px">'
    if label:
        out += '<label for="%s" style="font-size: 13px; font-weight: 600; color: %s">%s</label>' % (fid, C['ink'], label)
    out += ('<button type="button" id="%s" aria-haspopup="listbox" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: %dpx; padding: 0 14px; '
            'border-radius: 8px; border: 1px solid %s; background: %s; font-family: inherit; font-size: 15px; color: %s; text-align: start; cursor: pointer">'
            '<span>%s</span>%s</button>') % (fid, 44 if compact else 48, C['line'], C['w'], C['ink'], value, ic('chev-d', 18, C['mu']))
    if helper:
        out += '<p style="margin: 0; font-size: 13px; color: %s">%s</p>' % (C['mu'], helper)
    return out + '</div>'

def stepper(q=1, label='الكمية', locked=False):
    dis = ' disabled="disabled"' if locked else ''
    c = C['mu'] if locked else C['ink']
    b = lambda n, l: ('<button type="button" aria-label="%s"%s style="width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; color: %s; cursor: pointer">%s</button>' % (l, dis, c, ic(n, 18)))
    return ('<div role="group" aria-label="%s" style="display: inline-flex; align-items: center; border: 1px solid %s; border-radius: 8px; background: %s; flex: none">'
            '%s<output aria-live="polite" style="min-width: 32px; text-align: center; font-weight: 700; color: %s">%s</output>%s</div>') % (
        label, C['s200'] if locked else C['line'], C['s100'] if locked else C['w'], b('minus', 'إنقاص الكمية'), c, q, b('plus', 'زيادة الكمية'))

def toggle(label, on=False, hint=None):
    tr = C['ink'] if on else C['line']
    kn = 'inset-inline-start: 22px' if on else 'inset-inline-start: 2px'
    return ('<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px">'
            '<span style="display: flex; flex-direction: column"><span style="font-size: 15px; color: %s">%s</span>%s</span>'
            '<button type="button" role="switch" aria-checked="%s" aria-label="%s" style="position: relative; width: 46px; height: 26px; border-radius: 999px; border: 0; background: %s; flex: none; cursor: pointer">'
            '<span aria-hidden="true" style="position: absolute; top: 3px; %s; width: 20px; height: 20px; border-radius: 50%%; background: %s; box-shadow: 0 1px 2px rgba(22,18,14,.3)"></span></button></div>') % (
        C['ink'], label, ('<span style="font-size: 13px; color: %s">%s</span>' % (C['mu'], hint)) if hint else '', 'true' if on else 'false', label, tr, kn, C['w'])

def check(label, on=False, fid='c', count=None):
    box = ('<span aria-hidden="true" style="width: 22px; height: 22px; border-radius: 4px; border: 1.5px solid %s; background: %s; display: inline-flex; align-items: center; justify-content: center; flex: none; color: %s">%s</span>'
           % (C['ink'] if on else C['ctl'], C['ink'] if on else C['w'], C['s50'], ic('check', 14, C['s50'], 2.5) if on else ''))
    cnt = '<span style="margin-inline-start: auto; color: %s; font-size: 13px">%s</span>' % (C['mu'], num(count)) if count is not None else ''
    return ('<label for="%s" style="display: flex; align-items: center; gap: 10px; min-height: 44px; font-size: 15px; color: %s; cursor: pointer">'
            '<input id="%s" type="checkbox"%s style="position: absolute; opacity: 0; width: 1px; height: 1px">%s<span>%s</span>%s</label>') % (
        fid, C['ink'], fid, ' checked="checked"' if on else '', box, label, cnt)

def radio_row(label, sub=None, on=False, fid='r', name='g', right=None, body=''):
    dot = ('<span aria-hidden="true" style="width: 22px; height: 22px; border-radius: 50%%; border: 1.5px solid %s; display: inline-flex; align-items: center; justify-content: center; flex: none">%s</span>'
           % (C['ink'] if on else C['ctl'], ('<span style="width: 12px; height: 12px; border-radius: 50%%; background: %s"></span>' % C['ink']) if on else ''))
    bd = C['ink'] if on else C['s200']
    return ('<div style="border: 1px solid %s; border-radius: 8px; background: %s;%s">'
            '<label for="%s" style="display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 14px; cursor: pointer">'
            '<input id="%s" type="radio" name="%s"%s style="position: absolute; opacity: 0; width: 1px; height: 1px">%s'
            '<span style="display: flex; flex-direction: column; gap: 2px; flex: 1"><span style="font-size: 15px; font-weight: 600; color: %s">%s</span>%s</span>%s</label>%s</div>') % (
        bd, C['w'], ' box-shadow: 0 0 0 1px %s;' % C['ink'] if on else '', fid, fid, name, ' checked="checked"' if on else '', dot, C['ink'], label,
        ('<span style="font-size: 13px; color: %s">%s</span>' % (C['mu'], sub)) if sub else '', right or '', body)

def option_chip(label, sel=False, disabled=False, w=None):
    if disabled:
        return ('<button type="button" disabled="disabled" aria-label="%s، غير متوفر" style="min-width: %s; min-height: 44px; padding: 0 12px; border-radius: 8px; border: 1px dashed %s; background: %s; '
                'color: %s; font-family: inherit; font-size: 14px; text-decoration: line-through">%s</button>') % (label, w or '52px', C['line'], C['s100'], C['mu'], num(label))
    return ('<button type="button" aria-pressed="%s" style="min-width: %s; min-height: 44px; padding: 0 12px; border-radius: 8px; border: %s solid %s; background: %s; '
            'color: %s; font-family: inherit; font-size: 14px; font-weight: %d; cursor: pointer">%s</button>') % (
        'true' if sel else 'false', w or '52px', '2px' if sel else '1px', C['ink'] if sel else C['line'], C['w'],
        C['ink'], 700 if sel else 500, num(label))

def swatch(label, hexc, sel=False):
    ring = ('box-shadow: 0 0 0 2px %s, 0 0 0 4px %s;' % (C['s50'], C['ink'])) if sel else ('border: 1px solid %s;' % C['line'])
    return ('<button type="button" aria-pressed="%s" style="display: inline-flex; flex-direction: column; align-items: center; gap: 6px; min-width: 52px; min-height: 44px; '
            'border: 0; background: transparent; font-family: inherit; font-size: 13px; color: %s; cursor: pointer; padding: 4px 0">'
            '<span aria-hidden="true" style="width: 32px; height: 32px; border-radius: 50%%; background: %s; %s"></span><span style="font-weight: %d">%s</span></button>') % (
        'true' if sel else 'false', C['ink'], hexc, ring, 700 if sel else 400, label)

# ---------------------------------------------------------------- layout
def ornament(c=None, w=56):
    c = c or C['g5']
    return ('<div aria-hidden="true" style="display: flex; align-items: center; gap: 8px; color: %s">'
            '<span style="width: %dpx; height: 1px; background: %s"></span><span style="width: 6px; height: 6px; transform: rotate(45deg); border: 1px solid %s"></span>'
            '<span style="width: %dpx; height: 1px; background: %s"></span></div>') % (c, w, c, c, w, c)

def sec_title(title, link=None, eyebrow=None, dark=False, href='#', size=20, sub=None):
    fg = C['s50'] if dark else C['ink']
    eb = ('<span style="font-size: 12px; font-weight: 600; color: %s; letter-spacing: 0">%s</span>' % (C['g5'] if dark else C['g7'], eyebrow)) if eyebrow else ''
    sb = ('<span style="font-size: 13px; color: %s">%s</span>' % (C['ondark'] if dark else C['mu'], sub)) if sub else ''
    lk = ('<a href="%s" style="display: inline-flex; align-items: center; gap: 4px; min-height: 44px; font-size: 14px; font-weight: 600; color: %s; text-decoration: none">%s%s</a>'
          % (href, C['g5'] if dark else C['g7'], link, ic('chev-l', 16))) if link else ''
    return ('<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px">'
            '<div style="display: flex; flex-direction: column; gap: 2px">%s<h2 style="margin: 0; font-size: %dpx; line-height: 1.4; font-weight: 700; color: %s">%s</h2>%s</div>%s</div>') % (
        eb, size, fg, title, sb, lk)

def card(inner, pad=16, gap=12, bg=None, bd=None, radius=8, extra=''):
    return ('<div style="display: flex; flex-direction: column; gap: %dpx; padding: %dpx; background: %s; border: 1px solid %s; border-radius: %dpx;%s">%s</div>'
            % (gap, pad, bg or C['w'], bd or C['s200'], radius, extra, inner))

def row(inner, gap=8, align='center', justify='flex-start', wrap=False, extra=''):
    return '<div style="display: flex; align-items: %s; justify-content: %s; gap: %dpx;%s%s">%s</div>' % (
        align, justify, gap, ' flex-wrap: wrap;' if wrap else '', extra, inner)

def col(inner, gap=8, extra=''):
    return '<div style="display: flex; flex-direction: column; gap: %dpx;%s">%s</div>' % (gap, extra, inner)

def txt(t, size=15, w=400, c=None, tag='p', extra=''):
    return '<%s style="margin: 0; font-size: %dpx; font-weight: %d; color: %s; line-height: 1.6;%s">%s</%s>' % (tag, size, w, c or C['ink'], extra, t, tag)

def skel(w='100%', h=16, r=4, extra=''):
    return '<div aria-hidden="true" class="skel" style="width: %s; height: %spx; border-radius: %dpx; background: %s;%s"></div>' % (w, h, r, C['s200'], extra)

def hr(c=None):
    return '<div aria-hidden="true" style="height: 1px; background: %s; flex: none"></div>' % (c or C['s200'])

def banner(title, body, tone='info', icon='info', action=None):
    fg, bg = TONES[tone]
    return ('<div role="%s" style="display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 8px; background: %s; color: %s">%s'
            '<div style="display: flex; flex-direction: column; gap: 4px; flex: 1"><strong style="font-size: 14px">%s</strong><span style="font-size: 13px; line-height: 20px; color: %s">%s</span>%s</div></div>') % (
        'alert' if tone == 'danger' else 'status', C[bg], C[fg], ic(icon, 20), title, C['ink'], body, action or '')

def avatar(t, dark=False, s=36):
    return ('<span aria-hidden="true" style="width: %dpx; height: %dpx; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center; '
            'font-size: %dpx; font-weight: 700; flex: none; border: 1px solid %s">%s</span>') % (s, s, C['b9'] if not dark else C['b7'], C['g5'], int(s * .4), C['g6'], t)

# ------------------------------------------------------------- store chrome
def logo(dark=True, size=20):
    fg = C['s50'] if dark else C['ink']
    return ('<a href="Main.dc.html" aria-label="سوق الزل، الرئيسية" style="display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: %s">'
            '<span aria-hidden="true" style="width: 34px; height: 34px; border: 1px solid %s; transform: rotate(45deg); display: inline-flex; align-items: center; justify-content: center; flex: none">'
            '<span style="transform: rotate(-45deg); color: %s; font-weight: 700; font-size: 15px">ز</span></span>'
            '<span style="display: flex; flex-direction: column; line-height: 1.1"><span style="font-size: %dpx; font-weight: 700">سوق الزل</span>'
            '<span style="font-size: 12px; font-weight: 600; color: %s; direction: ltr; text-align: end" aria-hidden="true">SOUQ ALZAL</span></span></a>') % (
        fg, C['g5'], C['g5'], size, C['ondark'] if dark else C['mu'])

def header_m(cart=3, back=None, title=None, search=True):
    if back:
        left = ('<a href="%s" aria-label="رجوع" style="width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; color: %s">%s</a>' % (back, C['s50'], ic('chev-r', 22)))
        mid = '<h1 style="margin: 0; font-size: 16px; font-weight: 600; color: %s; flex: 1">%s</h1>' % (C['s50'], title)
        return ('<header data-surface="inverse-strong" style="background: %s; padding: 6px 8px; display: flex; align-items: center; gap: 4px; flex: none">%s%s%s</header>' % (C['ink'], left, mid, icbtn('bag', 'السلة', True, cart)))
    h = ('<header data-surface="inverse-strong" style="background: %s; padding: 6px 8px; display: flex; align-items: center; gap: 4px; flex: none">%s<div style="flex: 1; display: flex; justify-content: center">%s</div>%s%s</header>' % (
        C['ink'], icbtn('menu', 'القائمة', True), logo(True, 18), icbtn('user', 'حسابي', True), icbtn('bag', 'السلة', True, cart)))
    if search:
        h += ('<div style="background: %s; padding: 0 16px 12px; flex: none"><label for="q" style="display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 8px; background: %s; color: %s">'
              '%s<span style="position: absolute; width: 1px; height: 1px; overflow: hidden">بحث</span><input id="q" placeholder="ابحث عن بشت، عود، زعفران…" style="flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-family: inherit; font-size: 15px; color: %s"></label></div>') % (
            C['ink'], C['b9'], C['ondark'], ic('search', 18), C['s50'])
    return h

CATS = [('souq', 'سوق الزل'), ('bisht', 'بشوت'), ('farwa', 'فراوي'), ('agal', 'عقل'), ('mabkhara', 'مباخر'), ('sword', 'سيوف'), ('saffron', 'زعفران'), ('oud', 'عود ودهن عود'), ('shal', 'شالات'), ('masbaha', 'خواتم ومسابح')]

def cat_rail(active=None, dark=True):
    out = '<nav aria-label="التصنيفات" data-surface="inverse-strong" style="background: %s; padding: 0 16px 12px; display: flex; gap: 8px; overflow-x: auto; flex: none">' % (C['ink'] if dark else C['s50'])
    for k, n in CATS[:8]:
        if k == 'souq':
            out += ('<a href="Souq-mobile.dc.html" style="display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid %s; color: %s; font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; flex: none">'
                    '<span aria-hidden="true" class="pulse" style="width: 8px; height: 8px; border-radius: 50%%; background: #E0563F"></span>سوق الزل · مباشر</a>') % (C['g5'], C['g5'])
        else:
            sel = (k == active)
            out += ('<a href="Category-mobile.dc.html"%s style="display: inline-flex; align-items: center; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid %s; background: %s; color: %s; font-size: 13px; font-weight: 500; text-decoration: none; white-space: nowrap; flex: none">%s</a>') % (
                ' aria-current="page"' if sel else '', C['g5'] if sel else C['b5'], C['g5'] if sel else 'transparent', C['ink'] if sel else C['s100'], n)
    return out + '</nav>'

def wa_float(bottom=24):
    # WhatsAppFab (tokens 1.1): whatsapp #16803E, hover #15783A, 56x56, shadow-md, no motion, end side.
    return ('<a href="#" class="wa" aria-label="تواصل معنا عبر واتساب" style="position: absolute; bottom: %dpx; inset-inline-end: 16px; width: 56px; height: 56px; border-radius: 50%%; background: %s; color: %s; '
            'display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(22,18,14,.10); z-index: 30">%s</a>') % (bottom, C['wa6'], C['w'], ic('msg', 26))

def footer_m():
    links = ['من نحن', 'الأسئلة الشائعة', 'الشحن والتوصيل', 'الاسترجاع والاستبدال', 'الخصوصية', 'الشروط والأحكام', 'بِع في سوق الزل']
    pays = ['مدى', 'Visa', 'Mastercard', 'Apple Pay', 'STC Pay', 'تابي', 'تمارا']
    out = '<footer data-surface="inverse" style="background: %s; color: %s; padding: 32px 16px 96px; display: flex; flex-direction: column; gap: 20px; margin-top: auto; flex: none">' % (C['b9'], C['s100'])
    out += logo(True, 18)
    out += ornament(C['g6'], 40)
    out += '<nav aria-label="روابط المتجر" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px">'
    for l in links:
        out += '<a href="#" style="min-height: 44px; display: flex; align-items: center; color: %s; font-size: 14px; text-decoration: none">%s</a>' % (C['s100'], l)
    out += '</nav>'
    out += '<div style="display: flex; flex-wrap: wrap; gap: 6px" aria-label="طرق الدفع المتاحة">' + ''.join(
        '<span style="min-height: 28px; padding: 4px 10px; border: 1px solid %s; border-radius: 4px; font-size: 12px; color: %s; direction: ltr">%s</span>' % (C['b5'], C['s100'], p) for p in pays) + '</div>'
    out += '<p style="margin: 0; font-size: 12px; line-height: 20px; color: %s">السجل التجاري: [رقم السجل] · الرقم الضريبي: [الرقم الضريبي]<br>الأسعار شاملة ضريبة القيمة المضافة 15%%</p>' % C['ondark']
    return out + '</footer>'

def header_d(active=None, cart=3):
    out = '<div style="background: %s; color: %s; font-size: 13px; text-align: center; padding: 8px 32px">توصيل لجميع مدن المملكة · دفع آمن · أقساط عبر تابي وتمارا</div>' % (C['b9'], C['s100'])
    out += ('<header data-surface="inverse-strong" style="background: %s; padding: 0 32px"><div style="max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 24px; min-height: 76px">%s'
            '<label for="qd" style="flex: 1; max-width: 560px; display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 8px; background: %s; color: %s">%s'
            '<span style="position: absolute; width: 1px; height: 1px; overflow: hidden">بحث</span><input id="qd" placeholder="ابحث عن بشت، عود، زعفران…" style="flex: 1; border: 0; outline: none; background: transparent; font-family: inherit; font-size: 15px; color: %s"></label>'
            '<div style="margin-inline-start: auto; display: flex; gap: 4px">%s%s%s</div></div></header>') % (
        C['ink'], logo(True, 20), C['b9'], C['ondark'], ic('search', 18), C['s50'], icbtn('heart', 'المفضلة', True), icbtn('user', 'حسابي', True), icbtn('bag', 'السلة', True, cart))
    out += '<nav aria-label="التصنيفات" style="background: %s; border-bottom: 1px solid %s; padding: 0 32px"><div style="max-width: 1280px; margin: 0 auto; display: flex; gap: 4px; align-items: center; min-height: 52px">' % (C['ink'], C['b7'])
    for k, n in CATS:
        if k == 'souq':
            out += ('<a href="Souq-desktop.dc.html" style="display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; color: %s; font-size: 14px; font-weight: 700; text-decoration: none">'
                    '<span aria-hidden="true" class="pulse" style="width: 8px; height: 8px; border-radius: 50%%; background: #E0563F"></span>سوق الزل <span style="font-size: 12px; font-weight: 600; border: 1px solid %s; border-radius: 999px; padding: 0 8px">مباشر</span></a>') % (C['g5'], C['g5'])
        else:
            sel = k == active
            out += '<a href="Category-desktop.dc.html"%s style="display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; color: %s; font-size: 14px; font-weight: %d; text-decoration: none; border-bottom: 2px solid %s">%s</a>' % (
                ' aria-current="page"' if sel else '', C['g5'] if sel else C['s100'], 600 if sel else 400, C['g5'] if sel else 'transparent', n)
    return out + '</div></nav>'

def footer_d():
    cols = [('تسوّق', ['بشوت', 'فراوي', 'عقل', 'مباخر', 'عود ودهن عود']), ('سوق الزل', ['عروض الساعة', 'عروض اليوم', 'اطلب منتج بسعرك', 'كيف يعمل الفصال']),
            ('المساعدة', ['الأسئلة الشائعة', 'الشحن والتوصيل', 'الاسترجاع والاستبدال', 'تتبع طلبك']), ('عن سوق الزل', ['من نحن', 'بِع في سوق الزل', 'الخصوصية', 'الشروط والأحكام'])]
    out = '<footer data-surface="inverse" style="background: %s; color: %s; padding: 48px 32px 32px; margin-top: auto"><div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px">' % (C['b9'], C['s100'])
    out += '<div style="display: grid; grid-template-columns: 1.4fr repeat(4, minmax(0, 1fr)); gap: 32px">'
    out += col(logo(True, 20) + '<p style="margin: 0; font-size: 14px; line-height: 24px; color: %s">منتجات خليجية أصيلة من تجار موثّقين، بدفع آمن وتوصيل لجميع مدن المملكة.</p>' % C['ondark'] + ornament(C['g6'], 40), 16)
    for t, ls in cols:
        out += '<nav aria-label="%s" style="display: flex; flex-direction: column"><h2 style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: %s">%s</h2>%s</nav>' % (
            t, C['g5'], t, ''.join('<a href="#" style="min-height: 44px; display: flex; align-items: center; color: %s; font-size: 14px; text-decoration: none">%s</a>' % (C['s100'], l) for l in ls))
    out += '</div>' + hr(C['b7'])
    pays = ['مدى', 'Visa', 'Mastercard', 'Apple Pay', 'STC Pay', 'تابي', 'تمارا']
    out += row('<p style="margin: 0; font-size: 12px; color: %s">© سوق الزل · السجل التجاري: [رقم السجل] · الرقم الضريبي: [الرقم الضريبي] · الأسعار شاملة ضريبة القيمة المضافة 15%%</p>' % C['ondark'] +
               '<div aria-label="طرق الدفع المتاحة" style="display: flex; gap: 6px">' + ''.join('<span style="padding: 4px 10px; border: 1px solid %s; border-radius: 4px; font-size: 12px; direction: ltr">%s</span>' % (C['b5'], p) for p in pays) + '</div>', 16, 'center', 'space-between', True)
    return out + '</div></footer>'

def ribbon(text='بيانات توضيحية · المربع المتقطع = مكان رمز الريال الرسمي (مؤقت)'):
    return ('<div style="position: absolute; top: 0; inset-inline-end: 0; z-index: 20; background: %s; color: %s; font-size: 12px; font-weight: 600; padding: 4px 10px; border-end-start-radius: 8px; pointer-events: none; display: flex; align-items: center; gap: 6px" aria-hidden="true">'
            '<span style="display: inline-block; width: 0.62em; height: 0.698em; border: 1px dashed currentColor; border-radius: 2px"></span>%s</div>' % (C['g5'], C['ink'], text))

def breadcrumbs(items):
    out = '<nav aria-label="مسار التصفح"><ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 13px">'
    for i, it in enumerate(items):
        last = i == len(items) - 1
        if last:
            out += '<li aria-current="page" style="color: %s">%s</li>' % (C['mu'], it)
        else:
            out += '<li style="display: inline-flex; align-items: center; gap: 4px"><a href="#" style="color: %s; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center">%s</a>%s</li>' % (C['b7'], it, ic('chev-l', 14, C['mu']))
    return out + '</ol></nav>'

# ----------------------------------------------------------------- products
P = [
    dict(k='bisht', name='بشت حساوي مخيط يدوياً — زري ذهبي', vendor='سوق الزل', platform=True, price=1850, was=2200, opts=True, bargain=True),
    dict(k='bisht', name='بشت ملكي شتوي — صوف ناعم', vendor='دار المثال', r=4.8, n=212, price=2450, opts=True, bargain=True),
    dict(k='farwa', name='فروة نجدية مبطنة — جلد طبيعي', vendor='فراء التجربة', r=4.6, n=87, price=1290, was=1490, opts=True),
    dict(k='agal', name='عقال مرعز أسود — شغل يدوي', vendor='سوق الزل', platform=True, price=185, opts=False),
    dict(k='mabkhara', name='مبخرة نحاس مطعّمة — مقاس متوسط', vendor='مباخر النموذج', r=4.9, n=143, price=640, opts=False, bargain=True),
    dict(k='oud', name='دهن عود كمبودي — 12 مل', vendor='عطارة العيّنة', r=4.7, n=301, price=950, was=1100, opts=True),
    dict(k='saffron', name='زعفران سوبر نقي — 10 جرام', vendor='سوق الزل', platform=True, price=145, opts=False),
    dict(k='sword', name='سيف عربي مطلي — غمد مزخرف', vendor='سيوف الأنموذج', r=4.8, n=26, price=6800, opts=False, bargain=True),
]

def vendor_line(p, dark=False):
    if p.get('platform'):
        return ('<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: %s; font-weight: 600">%s سوق الزل</span>' % (C['g5'] if dark else C['g7'], ic('seal', 14)))
    return row('<span style="font-size: 12px; color: %s">%s</span>' % (C['ondark'] if dark else C['mu'], p['vendor']) + stars(p['r'], None, 12, dark), 6, extra=' min-width: 0')

def product_card(p, cta=True, href='Product-mobile.dc.html', dense=False):
    pct = int(round(100 * (p['was'] - p['price']) / p['was'])) if p.get('was') else None
    badge = ('<span style="position: absolute; top: 8px; inset-inline-start: 8px">%s</span>' % disc(pct)) if pct else ''
    if p.get('bargain') and not pct:
        badge = ('<span style="position: absolute; top: 8px; inset-inline-start: 8px; display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 2px 8px; border-radius: 4px; background: %s; color: %s; font-size: 12px; font-weight: 600; border: 1px solid %s">%sيقبل الفصال</span>'
                 % (C['w'], C['g7'], C['g5'], ic('hand', 14)))
    fav = ('<button type="button" aria-label="أضف %s إلى المفضلة" aria-pressed="false" style="position: absolute; top: 4px; inset-inline-end: 4px; width: 44px; height: 44px; border-radius: 50%%; border: 0; background: transparent; '
           'display: inline-flex; align-items: center; justify-content: center; cursor: pointer"><span style="width: 34px; height: 34px; border-radius: 50%%; background: rgba(251,247,240,.92); display: inline-flex; align-items: center; justify-content: center; color: %s">%s</span></button>') % (p['name'], C['ink'], ic('heart', 18))
    price = sar(p['price'], 16, 700)
    if p.get('was'):
        price += sar(p['was'], 13, 400, C['mu'], False, True)
    if cta:
        if p['opts']:
            act = ('<a href="%s" style="display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; border-radius: 8px; border: 1px solid %s; color: %s; font-size: 13px; font-weight: 600; text-decoration: none">متوفر بعدة خيارات%s</a>'
                   % (href, C['line'], C['ink'], ic('chev-l', 16)))
        else:
            act = btn('أضف إلى السلة', 'primary', 'md', 'bag', True, extra=' font-size: 13px;')
    else:
        act = ''
    return ('<article style="display: flex; flex-direction: column; gap: 10px; min-width: 0">'
            '<div style="position: relative">%s%s%s</div>'
            '<div style="display: flex; flex-direction: column; gap: 4px; min-width: 0">%s'
            '<h3 style="margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; min-height: 44px"><a href="%s" style="color: %s; text-decoration: none">%s</a></h3>'
            '<div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap">%s</div></div>%s</article>') % (
        art(p['k']), badge, fav, vendor_line(p), href, C['ink'], p['name'], price, act)

# ------------------------------------------------------------------- deals
D = [
    dict(k='bisht', name='بشت حساوي مخيط يدوياً — زري ذهبي', vendor='سوق الزل', platform=True, price=1387.5, was=1850, left=4, total=20, t=(0, 42, 18), bargain=True),
    dict(k='oud', name='دهن عود كمبودي — 12 مل', vendor='عطارة العيّنة', r=4.7, price=760, was=950, left=7, total=30, t=(0, 18, 5), bargain=True),
    dict(k='mabkhara', name='مبخرة نحاس مطعّمة', vendor='مباخر النموذج', r=4.9, price=512, was=640, left=2, total=15, t=(0, 3, 51), bargain=False, urgent=True),
    dict(k='farwa', name='فروة نجدية مبطنة', vendor='فراء التجربة', r=4.6, price=1032, was=1290, left=0, total=12, t=(0, 0, 0), bargain=False, sold=True),
    dict(k='saffron', name='زعفران سوبر نقي — 10 جرام', vendor='سوق الزل', platform=True, price=116, was=145, left=38, total=100, t=(9, 12, 40)),
    dict(k='agal', name='عقال مرعز أسود', vendor='سوق الزل', platform=True, price=148, was=185, left=21, total=40, t=(52, 3, 10)),
]

def pct_of(d):
    return int(round(100 * (d['was'] - d['price']) / d['was']))

def deal_card_row(d, holes=None):
    """Horizontal deal card for /souq mobile lists (light surface)."""
    sold = d.get('sold')
    urgent = d.get('urgent')
    img = ('<div style="position: relative; width: 116px; flex: none">%s<span style="position: absolute; top: 6px; inset-inline-start: 6px">%s</span>%s</div>' % (
        art(d['k'], radius=6), disc(pct_of(d)), ('<span style="position: absolute; inset: 0; background: rgba(251,247,240,.78); display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 13px; font-weight: 700; color: %s">نفدت الكمية</span>' % C['ink']) if sold else ''))
    if sold:
        timer = pill('انتهى العرض', 'neutral', 'clock')
        acts = row(btn('نبّهني بعروض مشابهة', 'secondary', 'sm', 'bell'), 8)
        stock = '<p style="margin: 0; font-size: 13px; color: %s">بيعت كل القطع (%s)</p>' % (C['mu'], num(d['total']))
    else:
        tone = 'warning' if (d['t'][0] == 0 and d['t'][1] < 10) else 'neutral'
        timer = timer_inline('%02d:%02d:%02d' % d['t'] if not holes else holes, tone, 'clock', 'ينتهي خلال ')
        stock = stockbar(d['left'], d['total'], False, urgent)
        a = btn('اشترِ الآن', 'primary', 'md', extra=' flex: 1; padding: 0 12px;')
        if d.get('bargain'):
            a += btn('فاصل', 'bargain', 'md', 'hand', href='Bargain-mobile.dc.html', extra=' padding: 0 12px;')
        acts = row(a, 8)
    return ('<article style="display: flex; gap: 12px; padding: 12px; background: %s; border: 1px solid %s; border-radius: 8px">%s'
            '<div style="display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0">%s%s'
            '<h3 style="margin: 0; font-size: 14px; line-height: 22px; font-weight: 600"><a href="#" style="color: %s; text-decoration: none">%s</a></h3>'
            '<div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap">%s%s</div>%s%s</div></article>') % (
        C['w'], C['s200'], img, timer, vendor_line(d), C['ink'], d['name'],
        sar(d['price'], 16, 700), sar(d['was'], 13, 400, C['mu'], False, True), stock, acts)

def deal_card_feature(d, holes=None, dark=True):
    """Hero flash deal on brown-900."""
    acts = btn('اشترِ الآن', 'primary-inverse', 'md', extra=' flex: 1;')
    if d.get('bargain'):
        acts += btn('فاصل', 'bargain-dark', 'md', 'hand', href='Bargain-mobile.dc.html')
    return ('<article style="display: flex; flex-direction: column; gap: 14px; padding: 16px; background: %s; border: 1px solid %s; border-radius: 12px">'
            '<div style="position: relative">%s<span style="position: absolute; top: 10px; inset-inline-start: 10px">%s</span>'
            '<span style="position: absolute; top: 10px; inset-inline-end: 10px; display: inline-flex; align-items: center; gap: 4px; min-height: 24px; padding: 2px 8px; border-radius: 4px; background: %s; color: %s; font-size: 12px; font-weight: 700">%sعرض الساعة</span></div>'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 13px; color: %s">ينتهي خلال</span>%s</div>'
            '%s<h3 style="margin: 0; font-size: 17px; line-height: 26px; font-weight: 600"><a href="#" style="color: %s; text-decoration: none">%s</a></h3>'
            '<div style="display: flex; align-items: baseline; gap: 10px">%s%s</div>%s<div style="display: flex; gap: 8px">%s</div></article>') % (
        C['b9'], C['b6'], art(d['k'], tone='dark', ratio='4 / 3', radius=8), disc(pct_of(d), True), C['ink'], C['g5'], ic('zap', 14),
        C['ondark'], countdown(*d['t'], dark=True, size='md', holes=holes), vendor_line(d, True), C['s50'], d['name'],
        sar(d['price'], 22, 700, C['s50'], True), sar(d['was'], 14, 400, C['ondark'], False, True), stockbar(d['left'], d['total'], True), acts)

def deal_card_mini(d, holes=None, w=168):
    """Compact card for horizontal rails on dark bands (home souq strip)."""
    return ('<article style="width: %dpx; flex: none; display: flex; flex-direction: column; gap: 8px; padding: 10px; background: %s; border: 1px solid %s; border-radius: 8px">'
            '<div style="position: relative">%s<span style="position: absolute; top: 6px; inset-inline-start: 6px">%s</span></div>'
            '<h3 style="margin: 0; font-size: 13px; line-height: 20px; font-weight: 600; min-height: 40px"><a href="Souq-mobile.dc.html" style="color: %s; text-decoration: none">%s</a></h3>'
            '<div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap">%s%s</div>%s</article>') % (
        w, C['b8'], C['b6'], art(d['k'], tone='dark', radius=6), disc(pct_of(d), True), C['s50'], d['name'],
        sar(d['price'], 15, 700, C['s50'], True), sar(d['was'], 12, 400, C['ondark'], False, True), stockbar(d['left'], d['total'], True, d.get('urgent')))

# ---------------------------------------------------------------- dashboards
def sidebar(kind='admin', active='home'):
    if kind == 'admin':
        items = [('home', 'home', 'الرئيسية', None), ('box', 'products', 'المنتجات', '12'), ('grid', 'cats', 'التصنيفات', None), ('bag', 'orders', 'الطلبات', '8'),
                 ('return', 'returns', 'الاسترجاعات', '2'), ('users', 'customers', 'العملاء', None), ('store', 'vendors', 'التجار', '3'), ('wallet', 'finance', 'المالية', None),
                 ('zap', 'souq', 'سوق الزل', '5'), ('tag', 'coupons', 'الكوبونات والعروض', None), ('star', 'reviews', 'التقييمات', None), ('image', 'cms', 'المحتوى', None),
                 ('gear', 'settings', 'الإعدادات', None), ('file', 'audit', 'سجل العمليات', None)]
        head = '<div style="display: flex; flex-direction: column; gap: 4px; padding: 4px 8px 16px">%s<span style="font-size: 12px; color: %s; padding-inline-start: 44px">لوحة الإدارة</span></div>' % (logo(True, 17), C['ondark'])
    else:
        items = [('home', 'home', 'الرئيسية', None), ('box', 'products', 'المنتجات', None), ('bag', 'orders', 'الطلبات', '6'), ('inbox', 'requests', 'طلبات الأسعار', '5'),
                 ('zap', 'deals', 'العروض', None), ('wallet', 'finance', 'المالية', None), ('star', 'reviews', 'التقييمات', '2'), ('users', 'team', 'الفريق', None),
                 ('store', 'profile', 'ملف المتجر', None), ('bell', 'notif', 'الإشعارات', None)]
        head = ('<div style="display: flex; flex-direction: column; gap: 10px; padding: 4px 8px 16px">%s<div style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid %s; border-radius: 8px">%s'
                '<span style="display: flex; flex-direction: column"><span style="font-size: 14px; font-weight: 600; color: %s">دار المثال</span><span style="font-size: 12px; color: %s">لوحة التاجر · معتمد</span></span></div></div>') % (
            logo(True, 17), C['b7'], avatar('د', True, 32), C['s50'], C['ondark'])
    out = '<aside data-surface="inverse" style="flex: 0 0 240px; background: %s; padding: 20px 12px; display: flex; flex-direction: column; gap: 2px">%s<nav aria-label="القائمة الجانبية" style="display: flex; flex-direction: column; gap: 2px">' % (C['b9'], head)
    for icn, key, lab, cnt in items:
        on = key == active
        out += ('<a href="%s"%s style="display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: %d; color: %s; background: %s;%s">%s<span style="flex: 1">%s</span>%s</a>') % (
            'VendorInbox-desktop.dc.html' if key == 'requests' else '#', ' aria-current="page"' if on else '', 600 if on else 400, C['s50'] if on else C['s100'], C['b7'] if on else 'transparent',
            (' border-inline-start: 3px solid %s;' % C['g5']) if on else ' border-inline-start: 3px solid transparent;', ic(icn, 20, C['g5'] if on else C['ondark']), lab,
            ('<span style="min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: %s; color: %s; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center">%s</span>' % (C['g5'], C['ink'], num(cnt))) if cnt else '')
    out += '</nav><div style="margin-top: auto; padding-top: 16px">%s</div></aside>' % (
        '<a href="#" style="display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; color: %s; font-size: 14px; text-decoration: none">%sتسجيل الخروج</a>' % (C['s100'], ic('logout', 20, C['ondark'])))
    return out

def topbar(title, crumbs, period=True, kind='admin'):
    seg = ''
    if period:
        opts = ['اليوم', '7 أيام', '30 يوم', 'هذا الشهر', 'مخصص']
        seg = '<div role="group" aria-label="فترة البيانات" style="display: inline-flex; border: 1px solid %s; border-radius: 8px; overflow: hidden; background: %s">' % (C['line'], C['w'])
        for i, o in enumerate(opts):
            on = i == 2
            seg += '<button type="button" aria-pressed="%s" style="min-height: 40px; padding: 0 14px; border: 0; %s background: %s; color: %s; font-family: inherit; font-size: 13px; font-weight: %d; cursor: pointer">%s</button>' % (
                'true' if on else 'false', ('border-inline-start: 1px solid %s;' % C['s200']) if i else '', C['ink'] if on else 'transparent', C['s50'] if on else C['ink'], 600 if on else 400, num(o))
        seg += '</div>'
    return ('<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 16px 0">'
            '<div style="display: flex; flex-direction: column; gap: 2px; flex: 1 1 260px">%s<h1 style="margin: 0; font-size: 24px; line-height: 36px; font-weight: 700; color: %s">%s</h1></div>'
            '%s<div style="display: flex; gap: 4px">%s%s</div></div>') % (
        breadcrumbs(crumbs), C['ink'], title, seg, icbtn('search', 'بحث', border=C['s200'], bg=C['w']), icbtn('bell', 'الإشعارات', badge='4', border=C['s200'], bg=C['w']))

def kpi(label, value, delta=None, up=True, note=None, icon=None, is_money=True, emphasis=False):
    d = ''
    if delta:
        tone = C['su'] if up else C['da']
        d = '<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: %s">%s<bdi>%s</bdi><span style="font-weight: 400; color: %s">عن الفترة السابقة</span></span>' % (
            tone, ic('trend-up' if up else 'trend-down', 16), delta, C['mu'])
    v = sar(value, 24, 700) if is_money else '<span style="font-size: 24px; font-weight: 700; color: %s">%s</span>' % (C['ink'], num(value))
    return ('<div style="display: flex; flex-direction: column; gap: 6px; padding: 16px; background: %s; border: 1px solid %s; border-radius: 8px; min-width: 0">'
            '<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 13px; color: %s; font-weight: 500">%s</span>%s</div>%s%s%s</div>') % (
        C['w'], C['g5'] if emphasis else C['s200'], C['mu'], label, ('<span style="color: %s">%s</span>' % (C['g6'], ic(icon, 20))) if icon else '', v, d,
        ('<span style="font-size: 12px; color: %s; line-height: 18px">%s</span>' % (C['mu'], note)) if note else '')

def table(headers, rows, caption=None, min_w=640):
    th = ''.join('<th scope="col" style="text-align: start; padding: 10px 12px; font-size: 12px; font-weight: 600; color: %s; border-bottom: 1px solid %s; white-space: nowrap">%s</th>' % (C['mu'], C['s200'], h) for h in headers)
    tr = ''
    for r in rows:
        tr += '<tr>' + ''.join('<td style="padding: 12px; font-size: 14px; color: %s; border-bottom: 1px solid %s; vertical-align: middle">%s</td>' % (C['ink'], C['s100'], c) for c in r) + '</tr>'
    cap = '<caption style="position: absolute; width: 1px; height: 1px; overflow: hidden">%s</caption>' % caption if caption else ''
    return ('<div style="overflow-x: auto"><table style="width: 100%%; min-width: %dpx; border-collapse: collapse">%s<thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (min_w, cap, th, tr))

# ------------------------------------------------------------ states panels
def state_panel(title, body, icon='inbox', actions='', tone='neutral', foot='', dark=False):
    ring = {'neutral': (C['s100'], C['b5']), 'danger': (C['dabg'], C['da']), 'warning': (C['wabg'], C['wa']), 'info': (C['infbg'], C['inf']), 'success': (C['subg'], C['su'])}[tone]
    return ('<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 32px 24px">'
            '<span aria-hidden="true" style="width: 64px; height: 64px; border-radius: 50%%; background: %s; color: %s; display: inline-flex; align-items: center; justify-content: center">%s</span>'
            '<h2 style="margin: 0; font-size: 18px; line-height: 28px; font-weight: 700; color: %s">%s</h2>'
            '<p style="margin: 0; font-size: 14px; line-height: 22px; color: %s; max-width: 300px">%s</p>%s%s</div>') % (
        ring[0] if not dark else C['b7'], ring[1] if not dark else C['g5'], ic(icon, 28), C['s50'] if dark else C['ink'], title, C['ondark'] if dark else C['mu'], body,
        ('<div style="display: flex; flex-direction: column; gap: 8px; width: 100%%; max-width: 300px; margin-top: 4px">%s</div>' % actions) if actions else '', foot)

def phone_panel(label, inner, h=760, bg=None, kind=''):
    tag = ('<span style="font-size: 12px; font-weight: 700; color: %s; background: %s; border-radius: 999px; padding: 2px 10px">%s</span>' % (C['ink'], C['g5'], kind)) if kind else ''
    return ('<section aria-label="%s" style="width: 390px; flex: none; display: flex; flex-direction: column; gap: 10px">'
            '<div style="display: flex; align-items: center; gap: 8px">%s<h2 style="margin: 0; font-size: 15px; font-weight: 700; color: %s">%s</h2></div>'
            '<div style="position: relative; width: 390px; height: %dpx; background: %s; border: 1px solid %s; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column">%s</div></section>') % (
        label, tag, C['ink'], label, h, bg or C['s50'], C['s200'], inner)

# ------------------------------------------------------------------ document
HELMET = """<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&amp;display=swap" rel="stylesheet">
<style>
body{margin:0;background:#FBF7F0}
*{box-sizing:border-box}
bdi{unicode-bidi:isolate}
a{color:#7E5F22}a:hover{color:#4A3426}
button,input,select,textarea{font-family:inherit}
:focus-visible{outline:2px solid #7E5F22;outline-offset:2px}
[data-surface=inverse] :focus-visible,[data-surface=inverse-strong] :focus-visible{outline-color:#C29A4B}
[data-surface=default] :focus-visible{outline-color:#7E5F22}
.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
s{text-decoration-thickness:1px}
.pulse{animation:szpulse 1.6s ease-in-out infinite}
@keyframes szpulse{0%,100%{opacity:1}50%{opacity:.55}}
.skel{animation:szsk 1.4s ease-in-out infinite}
@keyframes szsk{0%,100%{opacity:1}50%{opacity:.55}}
@media (prefers-reduced-motion: reduce){.pulse,.skel{animation:none}}
.wa{transition:none}.wa:hover{background:#15783A !important}
</style>
</helmet>"""

TIMER_JS = """class Component extends DCLogic {
componentDidMount() { this.iv = setInterval(() => this.setState({ t: ((this.state && this.state.t) || 0) + 1 }), 1000); }
componentWillUnmount() { clearInterval(this.iv); }
renderVals() {
const t = (this.state && this.state.t) || 0;
const f = (s) => { s = Math.max(0, s - t); const p = (n) => String(n).padStart(2, '0'); return { h: p(Math.floor(s / 3600)), m: p(Math.floor(s % 3600 / 60)), s: p(s % 60), all: p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60) }; };
return { __VALS__ };
}
}"""

def timer_js(vals):
    return TIMER_JS.replace('__VALS__', vals)

STATIC_JS = """class Component extends DCLogic {
renderVals() { return {}; }
}"""

FS = {10: 12, 11: 12, 12: 12, 13: 14, 14: 14, 15: 16, 16: 16, 17: 18, 18: 18, 19: 20, 20: 20, 22: 24, 24: 24, 26: 28, 28: 28, 30: 28, 32: 36, 36: 36, 40: 36, 44: 36, 52: 36}
LH = {12: 20, 14: 22, 16: 26, 18: 28, 20: 30, 24: 36, 28: 40, 36: 52}

def _norm_style(m):
    st = m.group(1)
    fm = re.search(r'font-size: (\d+)px', st)
    st = st.replace('font-weight: 500', 'font-weight: 600')
    if fm:
        f = FS.get(int(fm.group(1)), int(fm.group(1)))
        st = re.sub(r'font-size: \d+px', 'font-size: %dpx' % f, st)
        st = re.sub(r'\s*line-height: [^;"]+;?', ' ', st).rstrip()
        if st and not st.endswith(';'):
            st += ';'
        st += ' line-height: %dpx' % LH[f]
    return 'style="%s"' % st.strip()

_NUM_RS = re.compile(r'(\u2212?[0-9][0-9,]*(?:\.[0-9]+)?)(?:\s|\u00a0)?ر\.س')

def _riyal_text(m):
    t = m.group(1)
    t = _NUM_RS.sub(lambda n: price_markup(n.group(1), 'ar'), t)
    t = t.replace('ر.س', riyal('ar'))
    return '>' + t + '<'

def normalize(html):
    """Enforce tokens.md 3.3 (type scale 12..36, line-heights, weights 400/600/700) and 8.4 (riyal sign instead of text)."""
    html = re.sub(r'style="([^"]*)"', _norm_style, html)
    return re.sub(r'>([^<>]*ر\.س[^<>]*)<', _riyal_text, html)

def doc(title, body, w, h, fluid=False, js=None, bg=None, dark_surface=False, lang='ar'):
    d = 'rtl' if lang == 'ar' else 'ltr'
    if fluid:
        root = '<div dir="%s" lang="%s" style="position: relative; width: 100%%; min-height: %dpx; background: %s; color: %s; font-family: %s; font-size: 16px; line-height: 26px; display: flex; flex-direction: column">' % (d, lang, h, bg or C['s50'], C['ink'], FONT)
    else:
        root = '<div dir="%s" lang="%s" style="position: relative; width: %dpx; height: %dpx; overflow: hidden; background: %s; color: %s; font-family: %s; font-size: 16px; line-height: 26px; display: flex; flex-direction: column">' % (d, lang, w, h, bg or C['s50'], C['ink'], FONT)
    props = '{"$preview":{"width":%d,"height":%d}}' % (w, h)
    rib = ribbon() if lang == 'ar' else ribbon('Illustrative data · dashed box = official riyal sign (placeholder)')
    html = ('<!doctype html>\n<html lang="%s" dir="%s">\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n%s\n%s%s%s</div>\n</x-dc>\n'
            '<script type="text/x-dc" data-dc-script data-props=\'%s\'>\n%s\n</script>\n</body>\n</html>\n') % (
        lang, d, title, HELMET, root, rib, normalize(body), props, js or STATIC_JS)
    return html


def otp6(vals='', err=False, fid='otp', label='رمز التحقق'):
    """InputOTP (D20): ONE real input (autocomplete=one-time-code) drawn over 6 visual boxes. 24px (input-lg)."""
    vals = (vals + '      ')[:6]
    boxes = ''.join('<span style="width: 48px; height: 56px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: %s; border: %s solid %s; font-size: 24px; font-weight: 700; color: %s">%s</span>' % (
        C['w'], '2px' if (v.strip() or err or i == len(vals.rstrip())) else '1px', C['da'] if err else (C['ink'] if (v.strip() or i == len(vals.rstrip())) else C['line']), C['ink'], v.strip()) for i, v in enumerate(vals))
    return ('<div style="position: relative; display: flex; justify-content: center"><label for="%s" class="sr">%s من 6 أرقام</label>'
            '<div aria-hidden="true" style="display: flex; gap: 8px; direction: ltr">%s</div>'
            '<input id="%s" value="%s" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr"%s style="position: absolute; inset: 0; width: 100%%; opacity: 0; font-size: 24px; border: 0; background: transparent">'
            '</div>') % (fid, label, boxes, fid, vals.strip(), ' aria-invalid="true"' if err else '')
