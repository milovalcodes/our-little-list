# Our Little App — working notes for Claude

Private two-person PWA (Emilio & Anely) + Little Star pet game. Live on GitHub Pages; Cloudflare Worker `our-little-list-delivery`; Firebase `our-little-list-5ea59`. Treat live data as production. Never deploy, push `main`, or touch Firebase/Worker without an explicit ask.

## Paths
- App repo (this folder): `D:\Projects\our-little-list` (GitHub `milovalcodes/our-little-list`).
- Little Star editable source: `D:\Projects\little-star-transfer\little-star-transfer-2026-10-17\outputs\baby-star-demo` (local git only, never pushed). `work/our-little-list-publish` there is a junction to this repo.
- Node 24 + pnpm: `C:/Users/elmis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` and `.../dependencies/bin/fallback` (system Node is 18; prepend these to PATH). In PowerShell use `pnpm` after setting `$env:PATH`; in Git Bash call `pnpm.cmd`.

## Commands
- Full tests: `pnpm test` (includes `test:star`). Browser checks need `python -m http.server 8777` + temporarily blanked `firebase-config.js` apiKey (restore after). Firestore emulator needs Java 21 (machine has 17) → run Checks on GitHub instead.
- Little Star: edit the SOURCE folder, then `node qa.mjs` there (needs a static server on 127.0.0.1:8891 serving the source folder), then in this repo `node tools/build-little-star.mjs "<source path>"`. Never hand-edit `little-star.html`, `little-star/engine.mjs`, `little-star/star-gameplay.mjs` or `test/fixtures/*`.
- Preview: `node tools/star-preview.mjs` → `http://localhost:8892/little-star.html?scene=ready` (disposable in-memory nursery).
- Dispatch GitHub Checks on a branch: token from `git credential fill` (never print it), POST `actions/workflows/checks.yml/dispatches`.
- Commits: author `milovalcodes <milovalcodes@users.noreply.github.com>` via `git -c user.name=… -c user.email=…`.

## Gotchas
- Some source lines are CRLF; anchor-based edit scripts must tolerate `\r\n`.
- Bash heredocs with nested quotes break easily; write edit scripts to files (scratchpad) instead.
- `star-pixel.mjs` shader repaints every `.item-sprite`; code-drawn icons use `.pixel-item` to opt out.
- Shop items with `pending:true` are art-pending: coded but unbuyable (`available()`); the art importer flips them.
- Shop UI must not show tier words (beginner/apprentice/master); use star counts.
- Worker plausibility checks (worker/src/star-store.js): catch ≥0.24 s per wish, cooking ≥8 s, cook `steps === grades.length`.

## State (2026-10-17)
- Branch `feat/star-economy-timing` (pushed): v118 economy/pacing + CI test fix; Checks green.
- Branch `feat/star-vfx-gameplay` (local, on top): VFX/SFX/haptics, random hazards, ingredient recipes, bath remake, art-pending catalog. Not pushed, not released, Worker not deployed.
- Art: brief at `<source>/art-brief/ART-BRIEF.md` (Tamagotchi On style, 64 sheets); user generates in ChatGPT into `<source>/art-brief/incoming/`; validate with `node tools/import-art.mjs` (source folder). Atlas packing + flipping `pending` happens after review.
- Next planned: daily games (see `.claude/skills/daily-games`).
