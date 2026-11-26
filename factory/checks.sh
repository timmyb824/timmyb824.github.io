#!/usr/bin/env bash
# The repo's checks. Exit 0 only when the branch is fit to review.
#
# The gate runs this script from the main checkout with the job's worktree as
# the working directory. Keep it fast, deterministic and non-interactive: no
# watch modes, no prompts, nothing that rewrites files.
set -euo pipefail

for script in site/assets/*.js; do node --check "$script"; done
python3 -m py_compile .github/scripts/*.py
find .github/scripts -name __pycache__ -prune -exec rm -rf {} +  # leave no files behind

# Every relative href/src in the HTML points at a file that exists.
python3 - <<'PY'
import pathlib, re, sys
missing = []
for page in pathlib.Path("site").glob("*.html"):
    for target in re.findall(r'(?:href|src)="([^"]*)"', page.read_text()):
        if re.match(r"(https?:|data:|mailto:|tel:|#|$)", target):
            continue
        path = target.split("#")[0].split("?")[0]
        if not (page.parent / path).exists():
            missing.append(f"{page}: {target}")
if missing:
    sys.exit("broken local links:\n" + "\n".join(missing))
PY
