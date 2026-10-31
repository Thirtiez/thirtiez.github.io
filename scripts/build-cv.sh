#!/usr/bin/env bash
# Prints portfolio/cv/index.html to the one-page PDF behind the portfolio's "Download CV" button.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/portfolio/cv/index.html"
out="$root/portfolio/assets/cv/Davide_Trenti_CV.pdf"

chrome="${CHROME:-}"
if [ -z "$chrome" ]; then
    for c in \
        "/c/Program Files/Google/Chrome/Application/chrome.exe" \
        "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
        "$(command -v google-chrome || true)" \
        "$(command -v chromium || true)"; do
        if [ -n "$c" ] && [ -x "$c" ]; then chrome="$c"; break; fi
    done
fi
[ -n "$chrome" ] || { echo "Chrome not found; set CHROME=/path/to/chrome" >&2; exit 1; }

# Chrome on Windows wants native paths.
if command -v cygpath >/dev/null; then
    src_arg="file:///$(cygpath -m "$src")"
    out_arg="$(cygpath -w "$out")"
else
    src_arg="file://$src"
    out_arg="$out"
fi

"$chrome" --headless=new --disable-gpu --no-pdf-header-footer \
    --virtual-time-budget=10000 --run-all-compositor-stages-before-draw \
    --print-to-pdf="$out_arg" "$src_arg" 2>/dev/null

echo "Wrote $out"
# pdftotext ends every page with a form feed, so counting them counts pages.
if command -v pdftotext >/dev/null; then
    pages="$(pdftotext "$out" - | tr -cd '\f' | wc -c | tr -d ' ')"
    echo "Pages: $pages"
    [ "$pages" = "1" ] || { echo "CV must fit on one page" >&2; exit 1; }
fi
