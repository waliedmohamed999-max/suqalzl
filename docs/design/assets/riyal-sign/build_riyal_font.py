#!/usr/bin/env python3
"""Build the one-glyph "Souq Riyal Sign" font (U+20C1) from SAMA's official SVG.

Spec: docs/design/tokens.md section 8.4 (v1.1).

This script never draws the symbol. Its only input is the official file published by
the Saudi Central Bank (SAMA): https://www.sama.gov.sa/ar-sa/Currency/Documents/Saudi_Riyal_Symbol-2.svg
(listed on https://www.sama.gov.sa/en-US/Currency/SRS/Pages/Guideline.aspx).
Save that file unchanged as docs/design/assets/riyal-sign/sama-saudi-riyal-symbol.svg and record
its SHA-256 (printed below) in tokens.md 8.4.

What the script does (geometry is only scaled and translated, never edited):
  1. Normalises the SVG to plain absolute paths with picosvg (resolves <g>, transforms, shapes).
  2. Scales it uniformly so its height equals the IBM Plex Sans Arabic figure height (698/1000 em),
     sitting on the baseline (yMin = 0). Aspect ratio is preserved (SAMA rules 5 and 6).
  3. Adds side bearings of 50 units on each side (Plex digits use 51..77 at 400).
  4. Writes a TrueType font with Plex vertical metrics (ascent 1085, descent 415) so the
     line box never changes when the glyph appears, as WOFF2 (web) and TTF (PDF, OG images,
     Figma, Flutter).

Usage:
  python3 -m venv .venv && .venv/bin/pip install "fonttools[woff]>=4.60" brotli picosvg
  .venv/bin/python docs/design/assets/riyal-sign/build_riyal_font.py \
      docs/design/assets/riyal-sign/sama-saudi-riyal-symbol.svg  src/app/fonts
Outputs: souq-riyal-sign.woff2, souq-riyal-sign.ttf
"""
import hashlib
import pathlib
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import SVGPath
from fontTools.misc.timeTools import timestampFromString
from fontTools.ttLib import TTFont
from picosvg.svg import SVG

UPM = 1000
FIGURE_HEIGHT = 698  # IBM Plex Sans Arabic: '1' yMax and OS/2 capHeight (measured, both weights)
SIDE_BEARING = 50
ASCENT, DESCENT = 1085, 415  # IBM Plex Sans Arabic hhea/OS2 metrics
FAMILY = "Souq Riyal Sign"
CODEPOINT = 0x20C1


def main(svg_path: str, out_dir: str) -> None:
    src = pathlib.Path(svg_path)
    raw = src.read_bytes()
    print(f"input  {src.name}  sha256={hashlib.sha256(raw).hexdigest()}")

    pico = SVG.parse(str(src)).topicosvg()  # absolute paths only, no transforms/groups
    svg_paths = SVGPath.fromstring(pico.tostring().encode())

    bp = BoundsPen(None)
    svg_paths.draw(bp)
    if bp.bounds is None:
        sys.exit("no drawable geometry found in the SVG")
    x0, y0, x1, y1 = bp.bounds  # SVG space, y grows downwards
    scale = FIGURE_HEIGHT / (y1 - y0)
    width = round((x1 - x0) * scale)
    advance = width + 2 * SIDE_BEARING
    # x' = (x - x0) * s + SB ;  y' = (y1 - y) * s   (flip Y so the bottom sits on the baseline)
    affine = (scale, 0, 0, -scale, SIDE_BEARING - x0 * scale, y1 * scale)

    tt_pen = TTGlyphPen(None)
    svg_paths.draw(TransformPen(Cu2QuPen(tt_pen, max_err=0.5, reverse_direction=True), affine))
    sign = tt_pen.glyph()
    notdef = TTGlyphPen(None).glyph()

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder([".notdef", "uni20C1"])
    fb.setupCharacterMap({CODEPOINT: "uni20C1"})
    fb.setupGlyf({".notdef": notdef, "uni20C1": sign})
    fb.setupHorizontalMetrics({".notdef": (500, 0), "uni20C1": (advance, SIDE_BEARING)})
    fb.setupHorizontalHeader(ascent=ASCENT, descent=-DESCENT, lineGap=0)
    fb.setupNameTable({
        "familyName": FAMILY,
        "styleName": "Regular",
        "uniqueFontIdentifier": f"{FAMILY} 1.0",
        "fullName": FAMILY,
        "psName": "SouqRiyalSign-Regular",
        "version": "Version 1.000",
        "description": "U+20C1 SAUDI RIYAL SIGN, glyph from the official SAMA SVG (scaled only).",
    })
    fb.setupOS2(
        version=4, sTypoAscender=ASCENT, sTypoDescender=-DESCENT, sTypoLineGap=0,
        usWinAscent=ASCENT, usWinDescent=DESCENT, sCapHeight=FIGURE_HEIGHT, sxHeight=516,
        usWeightClass=400, fsType=0, fsSelection=0x40 | 0x80,  # REGULAR | USE_TYPO_METRICS
        ulUnicodeRange1=0, achVendID="SQZL",
    )
    fb.setupPost()
    fb.setupHead(unitsPerEm=UPM, created=timestampFromString("Wed Nov 18 00:00:00 2026"),
                 modified=timestampFromString("Wed Nov 18 00:00:00 2026"))  # fixed -> reproducible bytes

    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    ttf = out / "souq-riyal-sign.ttf"
    fb.save(str(ttf))
    font = TTFont(str(ttf))
    font.flavor = "woff2"
    woff2 = out / "souq-riyal-sign.woff2"
    font.save(str(woff2))

    # ---- verification ----
    chk = TTFont(str(woff2))
    gs = chk.getGlyphSet()
    vb = BoundsPen(gs)
    gs["uni20C1"].draw(vb)
    assert chk.getBestCmap() == {CODEPOINT: "uni20C1"}, "cmap must contain U+20C1 only"
    assert abs(vb.bounds[1]) <= 1 and abs(vb.bounds[3] - FIGURE_HEIGHT) <= 1, vb.bounds
    print(f"glyph  bounds={tuple(round(v) for v in vb.bounds)} advance={advance} "
          f"aspect={(x1 - x0) / (y1 - y0):.4f} (unchanged from source)")
    for f in (woff2, ttf):
        print(f"output {f}  {f.stat().st_size} bytes")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
