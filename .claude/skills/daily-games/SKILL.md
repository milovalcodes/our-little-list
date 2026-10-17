---
name: daily-games
description: Context and plan for the competitive daily games (Little Word / Wordle, Word Search, mini crossword). Use when changing their rules, scoring, UI or tie-breaks.
---

Files: `word-game.js` (Wordle rules, `WORD_ATTEMPTS`, `scoreGuess`), `daily-word.js` (accepted guesses = lexicon + answer lists), `word-scores.js`, `timed-games.js` (search + crossword UI, 120 s server clock), `timed-game.js`, `connected-crossword.js`, `round-engine.js`, `weekly-report.js`, `word-tiebreaker.js`, `firestore.rules`, Worker settlement in `worker/src/`. Little Star reads results as stardust (`little-star/engine.mjs` `scoreResult`, `ECONOMY.wordPoints`) — keep both in sync.

Current rules: Wordle 5 guesses, 100/40/30/20/10; search & crossword `round(found/total*50)`; Sunday/tie rounds ×2; resets 9 a.m. America/New_York. Saved puzzles and frozen weekly plans must never be regenerated. History must stay readable (score changes apply forward only).

Agreed plan, in order:
1. Rebalance: Wordle 6 guesses, 60/50/40/30/20/10; keep every game's max ≈50–60. Update Little Star `wordPoints`, firestore rules, tests, guide release note.
2. Time bonus for search & crossword (e.g. +1 per 5 s left when all found); tie-break on time before hard trio rounds.
3. Crossword: real letter-by-letter grid entry, auto-advance, across/down toggle, crossings; standard 5×5; no check/reveal in competition.
4. Share grid, streaks, guess distribution; side-by-side results with times; partner results hidden until you finish (verify current behaviour first).

Run the full release checklist (`.github/workflows/checks.yml`) — rules changes need the Firestore emulator (GitHub Checks).
