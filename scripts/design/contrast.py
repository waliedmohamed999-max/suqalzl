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
