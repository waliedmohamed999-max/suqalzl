import localFont from "next/font/local";

/**
 * IBM Plex Sans Arabic, 400/600/700 only (tokens.md 3.1, 3.2 plan A, 9.2).
 * Files are built by scripts/fonts/subset.sh from the official IBM release (OFL, see
 * src/app/fonts/IBM-Plex-OFL-LICENSE.txt). The "Plex Fallback" metric overrides live in globals.css.
 */

// Core subset (Arabic + Latin). Preloaded on every page.
export const plex = localFont({
  src: [
    { path: "./fonts/plex-arabic-core-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-arabic-core-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/plex-arabic-core-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

// Rare Arabic code points only. Never preloaded; the browser fetches it only if such a glyph renders.
export const plexExt = localFont({
  src: [
    { path: "./fonts/plex-arabic-ext-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-arabic-ext-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0600-0620,U+0653-065F,U+066E-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC",
    },
  ],
});

/**
 * Saudi riyal sign U+20C1 (tokens.md 8.4.2): NOT wired yet. SAMA's official SVG is not in
 * docs/design/assets/riyal-sign/ (tokens.md 8.4.8), so RIYAL_SIGN_READY stays false and <Price>
 * renders the text unit. When the file arrives:
 *   1. python3 scripts/fonts/build_riyal_font.py docs/design/assets/riyal-sign/sama-saudi-riyal-symbol.svg src/app/fonts
 *   2. add the `riyal` localFont below (src ./fonts/souq-riyal-sign.woff2, weight "100 900",
 *      display "block", preload, unicode-range U+20C1, variable --font-riyal) and its class on <html>
 *   3. set RIYAL_SIGN_READY = true in src/lib/format/money.ts (backend-engineer owns that file).
 */
export const fontClassNames = `${plex.variable} ${plexExt.variable}`;
