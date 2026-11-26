# AGENTS.md

## Project Overview

Personal website for myself deployed on GitHub Pages and made available on the web at https://timothybryantjr.com.

Framework-free static site: plain HTML, CSS and JavaScript in `site/`, no build step. The deploy workflow
(`.github/workflows/pages.yaml`) runs `.github/scripts/generate_status.py` and `generate_medium.py` to write
`site/status.json` and `site/medium.json` (gitignored, absent locally), then publishes `site/`.

## Coding Standards

- Keep it dependency-free: no framework, bundler or package manager.
- Shared styles live in `site/assets/styles.css`; reuse its tokens and classes.
- Never put fetched data into the DOM with `innerHTML`; use `textContent` and validated URLs.

## Commands

No install step. Checks (`factory/checks.sh`): `node --check` on `site/assets/*.js`, `py_compile` on
`.github/scripts/*.py`, and every relative `href`/`src` in `site/*.html` resolves.

Dev server on a given port: `python3 -m http.server $PORT --directory site`, then http://localhost:$PORT.
The status and writing sections need `status.json`/`medium.json`, so locally they show their failure state.

## Boundaries

- Never commit or render the `STATUS_*` endpoint URLs; they are Actions secrets.
- Don't change `site/CNAME` or the deploy workflow without a human.

## Software factory

`/factory run` builds every open GitHub issue labeled `factory` through
intake → spec → build → gate → review → approve, one PR per issue. State is in
`factory/jobs/` (gitignored); `factory/bin/job` is its only writer. Checks:
`factory/checks.sh`. Dashboard: `cd factory && python3 -m http.server`, then
open http://localhost:8000/dashboard.html.

Each job works in its own git worktree, a full checkout of the repo at
`.worktrees/<job-id>` (gitignored). A tool run from the repo root that doesn't
read `.gitignore` sees those copies too; exclude `.worktrees/` in its config.

The gate fails any branch that adds, changes or deletes `factory/*`, `.claude/*`, `.github/*`,
the pre-commit config or `site/CNAME` (`protected_paths` in `factory/config.json`). A job that truly
needs one of these escalates to a human.
