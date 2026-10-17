---
name: little-star-build
description: Rebuild and verify Little Star after editing its source (engine, UI, minigames, cooking, CSS). Use whenever a Little Star change needs QA, a rebuild into the app repo, or a preview check.
---

1. Set PATH (Git Bash): `export PATH="/c/Users/elmis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/c/Users/elmis/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"`
2. `S=/d/Projects/little-star-transfer/little-star-transfer-2026-10-17/outputs/baby-star-demo`
3. Start the QA static server once (background): `python -m http.server 8891 --bind 127.0.0.1 --directory "$S"`
4. `cd "$S" && node qa.mjs` → must end with `PASS 14 suites`. For a failing suite run `node <suite>.test.mjs` alone.
5. `cd /d/Projects/our-little-list && node tools/build-little-star.mjs "$(cygpath -w "$S")" && pnpm.cmd test`
6. Optional visual check: preview server `star-preview` (`.claude/launch.json`), `?scene=ready`, mobile preset.
7. Commit in both repos (source repo is local-only). Stop the 8891 server by PID when done.

Rules: never hand-edit generated files in the app repo; keep tests' intent when updating expectations; new engine actions must also be added to `STAR_ACTIONS` in `worker/src/star-store.js`.
