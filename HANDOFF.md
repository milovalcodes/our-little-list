# Handoff: daily games + Little Star art (2026-10-17)

Read `CLAUDE.md` first (paths, Node 24 PATH, commands, gotchas). Treat live data as production. **Never** push `main`, deploy the Worker, deploy Firestore rules or touch Firebase data unless the owner explicitly asks.

## Where things are

- **App repo:** `D:\Projects\our-little-list`, branch **`feat/daily-games`** (pushed). It is based on `feat/star-vfx-gameplay`, which holds the unreleased Little Star v118 work.
- **Little Star source:** `D:\Projects\little-star-transfer\little-star-transfer-2026-10-17\outputs\baby-star-demo`. This is a local git repo, never pushed. Its latest commits are `0efa761` (classic art remake) and `4da3abe` (classic additions), both on top of `ecc7dc6` (six-guess stardust).
- **Commits on `feat/daily-games`**, oldest first:
  1. `45a846d`: six-guess Little Word, forward-only rebalance
  2. `40401e0`: time bonus and time tie-break
  3. `dcb7638`: letter-by-letter crossword entry, no checking
  4. `37b0015`: 5×5 mini crossword, plus results, streaks and sharing
  5. `132ae34`: takes back an accidental Little Star build that `37b0015` picked up
  6. `dae8485`: Little Star classic art overhaul build, committed on purpose
- **Not committed:** `art-brief/` in the app repo (51 MB of working art). Keep it out of the app repo, because the repo is published on GitHub Pages. It belongs with the source folder.

## What was done (daily games plan, steps 1–4)

Every scoring change is **forward-only from game day 2026-10-19**. Constants: `SCORING_V3_DAY` in `word-scores.js` and `MINI_CROSSWORD_START` in `round-engine.js`. Older days, weeks, crowns and stardust keep their old values.

1. **Little Word:** 6 guesses scored 60/50/40/30/20/10. Days before the cutover keep 5 guesses scored 100/40/30/20/10. Changed:
   - `wordAttempts(day)`, `wordTable(day)` and `wordCeiling` in `word-scores.js`
   - Firestore rules (`let most = day >= '2026-10-19' ? 6 : 5`)
   - league ceilings, weekly report maximums, practice (6 tries)
   - Little Star `ECONOMY.wordPoints`, edited in the source repo and rebuilt
   - guide v119 note, with the cache version bumped to v119
2. **Time bonus:** a fully solved Word Search or crossword earns +1 per 5 s left, up to +10 (doubled on hard days). It uses server `startedAt`/`finishedAt`, which the rules already enforce. A week tied on points goes to whoever left more total time on fully solved boards (`weekTimeSaved` in `league-scores.js`). Only an exact tie opens the hard trio. The Worker (`worker/src/activity-week.js`) records `decidedBy:'time'` and `saved`.
3. **Crossword:**
   - **Entry:** letter-by-letter (`crossword-entry.js` plus `timed-games.js`): on-screen keyboard and physical keys, auto-advance, across/down toggle, shared crossings.
   - **No checking:** words are credited silently once every square is right, and wrong squares are dashed only after the round ends.
   - **Layout:** from 2026-10-19 the daily board is a **5×5 lattice** (`mini-crossword.js`): 3 across + 3 down five-letter answers crossing at 9 squares. Catalog version 7, clocks 2:00 normal / 3:00 hard.
   - **Seasonal days** borrow the other difficulty, then everyday words, when needed.
   - **Calendar:** `worker/src/compiled-crosswords.json` was recompiled (`node scripts/compile-worker-crosswords.mjs --write`). All 728 days fill, and earlier days and tie templates are byte-identical.
   - **Rules:** accept catalog 7 only at 5×5 with 6 entries, the exact clocks and day ≥ 2026-10-19.
   - **Tie-break crosswords are unchanged** (big hard board, 5:00).
4. **Results** (`daily-results.js`, `share-result.js`):
   - Partner tries, times and points for a game stay hidden until your own round is over. This applies to the game panels, the weekly race (`hidePartnerUntilPlayed`) and the tie-break live score.
   - After you finish: side-by-side results with times, a play/clear streak and best time, a Little Word guess distribution, and a spoiler-free share grid (share sheet, otherwise clipboard).

## Verification status

- `pnpm test` (unit) and the full local `pnpm run test:browser` passed on the daily-games code.
- GitHub Checks (these include the Firestore emulator rules tests) are **green on `132ae34`**, the full daily-games work.
- **Next action:** a Checks run for `dae8485` (art build) was dispatched at handoff. Confirm it is green, or dispatch Checks on `feat/daily-games`. Get the token from `git credential fill` (never print it), then `POST repos/milovalcodes/our-little-list/actions/workflows/checks.yml/dispatches` with `{"ref":"feat/daily-games"}`. Check that the run is green, and fix any failures on the branch.

## Release needs (owner must approve each)

The changes only take effect live if **all three** ship together, ideally before the first 9 a.m. ET opening on Mon 2026-10-19:

1. **Firestore rules deploy:** six guesses, the mini crossword shape.
2. **Worker deploy** of `our-little-list-delivery`: the new compiled calendar, so the Worker creates minis, plus time tie-break settlement.
3. **App release:** merge to `main` / GitHub Pages.

If the live (old) code opens Monday first, the week's plan (`gamePlans/2026-10-19`) is saved with old-style crosswords. That is safe: frozen plans are kept and the rules still accept them. Minis would then start the following week. Scoring cutovers are by date either way.

## Open follow-ups / ideas

- Should tie-break crosswords also become minis? They currently stay as large hard boards.
- Practice crosswords still use the old "type the whole word, check" form.
- Local/preview mode (`firebaseConfig={}`) still draws legacy crosswords. Tests seed a mini via `setTo('timedPuzzles', …)`.
- The Little Star simulated `scoreResult` in the engine doesn't include the time bonus. Live stardust uses the shared `timedPoints`, so it does.
- Art: per `CLAUDE.md`, flipping `pending` was meant to happen after review. `dae8485` ships the rebuilt build with those items buyable, so confirm the owner reviewed the art.

## Working tips

- Some files have CRLF line endings. For anchored edits, use a small Node script that normalizes `\r\n` (write scripts to a temp folder, not inline bash heredocs with nested quotes).
- Browser tests need `python -m http.server 8777` in the repo. The tests stub `firebase-config.js`, so no live data is touched.
- Little Star changes: edit the source, run `node qa.mjs` there (it needs a server on 127.0.0.1:8891), then run `node tools/build-little-star.mjs "<source>"` in this repo. Never hand-edit the built files.
