#!/usr/bin/env bash
# Token / RTL / currency rules from docs/design/tokens.md §10 (v1.1). Fails (exit 1) on any hit in src/.
# Needs ripgrep (rg).
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0
check() {
  local title=$1; shift
  local out
  out=$(rg -n --pcre2 "$@" src 2>/dev/null) || true
  if [[ -n "$out" ]]; then echo "✗ $title"; echo "$out"; fail=1; fi
}

# 1) physical direction utilities (use ms/me/ps/pe/start/end/border-s/e/rounded-s/e/text-start/end)
check "physical direction classes" --glob '*.{ts,tsx}' --glob '!src/generated/**' \
  -e '(?<![\w-])(-?m[lr]|p[lr]|left|right|border-[lr]|rounded-[lr]|rounded-[tb][lr]|text-(left|right)|float-(left|right))-[\w\[]' \
  -e '(?<![\w-])text-(left|right)(?![\w-])'
# 2) forbidden weights / tracking / radii / leading, shadcn translucent rings, tiny text
check "font/tracking/radius/leading outside the scale" --glob '*.{ts,tsx}' --glob '!src/generated/**' \
  -e '(?<![\w-])(font-(thin|extralight|light|medium|extrabold|black)|tracking-(tight|tighter|wide|wider|widest)|rounded-(xl|2xl|3xl)|leading-none)(?![\w-])' \
  -e 'ring-ring/[0-9]+' -e 'text-\[(1[01]|[0-9])px\]'
# 3) hex colours only in globals.css
check "hex colours outside globals.css" --glob '*.{ts,tsx,css}' --glob '!src/app/globals.css' --glob '!src/generated/**' \
  -e '(?<![\w&])#[0-9A-Fa-f]{3,8}\b(?![\w-])' 
# 4) currency only via src/lib/format/money.ts (+ messages), never Intl currency style (comment lines skipped)
check "currency outside lib/format/money.ts" --glob '*.{ts,tsx}' --glob '!src/lib/format/money.ts' --glob '!src/generated/**' \
  -e '^(?!\s*(\*|//)).*(ر\.س|\\u20C1|\x{20C1})' -e "style:\s*['\"]currency['\"]"
# 5) 36px buttons are dashboard-only
check "dense buttons in store routes" --glob 'src/app/**/(store)/**' --glob 'src/components/{store,souq}/**' \
  -e 'size=["\x27](dense|icon-dense)["\x27]'

[[ $fail -eq 0 ]] && echo "tokens lint: ok"
exit $fail
