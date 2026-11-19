#!/usr/bin/env bash
# IBM Plex Sans Arabic subsets for the web (tokens.md 3.2 / 9.2, plan A).
# Input: a folder with the official IBM Plex Sans Arabic fonts (OFL), .ttf or .woff2, e.g.
#   npm pack @ibm/plex-sans-arabic@1.1.0 && tar xzf ibm-plex-sans-arabic-1.1.0.tgz
#   bash scripts/fonts/subset.sh package/fonts/complete/woff2
# Requires: pip install fonttools brotli
# --no-hinting: the official v1.1 files carry TrueType hinting; keeping it puts the 3 core files at
# ~78 KB (over the 77 KB font budget, tokens.md 12.2). Unhinted core = ~59 KB. Check on Windows (P6).
# Output: src/app/fonts/plex-arabic-core-{400,600,700}.woff2 (preloaded) and plex-arabic-ext-{400,700}.woff2.
set -euo pipefail
SRC=${1:?path to the IBM Plex Sans Arabic font folder}
OUT=${2:-src/app/fonts}
mkdir -p "$OUT"
CORE='U+0020-007E,U+00A0,U+00D7,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2212,U+060C,U+061B,U+061F,U+0621-063A,U+0640-0652,U+0660-066D,U+0670,U+0679,U+067E,U+0686,U+0698,U+06A4,U+06AF,U+06CC,U+06D4,U+200C-200F'
EXT='U+0600-0620,U+0653-065F,U+066E-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC'
FEAT='ccmp,locl,init,medi,fina,rlig,calt,liga,kern,mark,mkmk'

src_of() {
  local style=$1
  for ext in ttf woff2 woff; do
    if [[ -f "$SRC/IBMPlexSansArabic-$style.$ext" ]]; then echo "$SRC/IBMPlexSansArabic-$style.$ext"; return; fi
  done
  echo "missing IBMPlexSansArabic-$style in $SRC" >&2; exit 1
}

for W in 400:Regular 600:SemiBold 700:Bold; do
  N=${W%%:*}; S=${W##*:}
  pyftsubset "$(src_of "$S")" --unicodes="$CORE" --layout-features="$FEAT" --flavor=woff2 --no-hinting --output-file="$OUT/plex-arabic-core-$N.woff2"
done
for W in 400:Regular 700:Bold; do
  N=${W%%:*}; S=${W##*:}
  pyftsubset "$(src_of "$S")" --unicodes="$EXT" --layout-features='*' --flavor=woff2 --no-hinting --output-file="$OUT/plex-arabic-ext-$N.woff2"
done
ls -l "$OUT"/plex-arabic-*.woff2
