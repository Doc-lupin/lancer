#!/bin/bash
# Every check in one command, as fast as the machine allows.
#
#   tools/check_all.sh [--quick]
#
#   1. Unit tests and the data checks.
#   2. Section A browser checks: the seven that don't measure time run in
#      parallel; camera, controls and zoom run alone (they time wheel notches,
#      key holds and CPU work per frame).
#   3. The Section B view checks in one pass (tools/check_views.mjs: pictures,
#      performance, label contrast against docs/section-b/baseline/accepted).
#      --quick: the 12 quick views, for iterating. Run without --quick before
#      asking the GM to approve a change.
# Logs go to $LOG (default /tmp/lancer-checks). Exits 1 if any step fails.

cd "$(dirname "$0")/.." || exit 2
QUICK=; [ "${1:-}" = --quick ] && QUICK=--quick
LOG=${LOG:-/tmp/lancer-checks}
rm -rf "$LOG"; mkdir -p "$LOG"
T0=$(date +%s)

step() { # name command...
  local name=$1; shift
  local start; start=$(date +%s)
  "$@" > "$LOG/$name.log" 2>&1
  local rc=$?
  echo "$rc" > "$LOG/$name.rc"
  printf '%s %-18s %4d s\n' "$([ $rc = 0 ] && echo 'ok  ' || echo FAIL)" "$name" "$(( $(date +%s) - start ))"
}

step unit npm test
step data python3 tools/validate_map.py --complete
step catalog python3 tools/world_catalog.py --check

# check_stars alone first: it builds the dev server's dependency cache, which
# parallel servers would otherwise build at once and clash over.
step stars node tools/check_stars.mjs
for batch in "cubemap lanes effects jitter" "system planet"; do
  for c in $batch; do step "$c" node "tools/check_$c.mjs" & done
  wait
done
for c in camera controls zoom; do step "$c" node "tools/check_$c.mjs"; done

step views node tools/check_views.mjs $QUICK --out "$LOG/views"
grep -E '^(PASS|FAIL)' "$LOG/views.log"

failed=$(grep -L '^0$' "$LOG"/*.rc | xargs -r -n1 basename | sed 's/\.rc$//' | tr '\n' ' ')
echo
if [ -n "$failed" ]; then echo "FAIL: $failed(logs in $LOG) in $(( $(date +%s) - T0 )) s"; exit 1; fi
echo "PASS: every check${QUICK:+ (quick views)} in $(( $(date +%s) - T0 )) s"
