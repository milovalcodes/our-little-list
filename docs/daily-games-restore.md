# Daily games backup and restoration

Prepared October 24, 2026. Baseline: `5309649af3898a46868b78a5ccecf884e1438d53` (v140), tagged `backup/daily-games-2026-10-24` locally. The retirement is v141.

The external task folder `C:/Users/elmis/Documents/Codex/2026-10-24/let-s-deactivate-the-daily-games/backup/` contains a complete source ZIP, full Git bundle, removal manifest and checksums. The backup includes original runtime, Worker, rules, tests, CI, content and styles. It contains no production database export or deployed credentials. Production records and nursery storage are retained in place; no reset or migration is required for this change.

## Release order

After publishing is explicitly authorized: deploy the existing Worker with unchanged bindings/secrets, deploy Firestore rules to the existing project, then publish Pages. Worker first stops all game schedulers/rewards and drains old game outbox messages; rules freeze old-client writes; Pages removes the UI and replaces the offline cache. Check the deployed versions and question delivery. No manual database deletes. The previously queued `activities-open` message is dropped; its existing daily opening marker is retained to avoid a duplicate morning ping. Already accepted provider notifications cannot be recalled, but their links resolve to the question.

## What remains

Daily question opens at 9 a.m. Eastern; answer privacy and memory archives stay intact. `wordWeeks` supplies immutable winners and final totals, including legacy score normalization. Unsettled weeks are preserved without inventing a winner. Historical result and duel summaries remain member-readable; private game boards, resets and plans default to deny. All old documents, personal wallets and paid reward ledgers remain stored. No further competition rewards are imported into Little Star.

## Restore on a new branch

1. Verify the bundle with `git bundle verify <backup-path>/our-little-app-before-retirement.bundle`. Import its tag with `git fetch <backup-path>/our-little-app-before-retirement.bundle refs/tags/backup/daily-games-2026-10-24:refs/tags/backup/daily-games-2026-10-24` if missing.
2. Create a restoration branch from current main. Run `git revert retirement/daily-games-2026-10-24` (the local tag marking the retirement commit) to recover its exact files and tests, resolving later shared-code changes individually. The ZIP is an additional extractable copy; do not overwrite the current app wholesale.
3. Review the question engine and calendars against the actual restoration date. Do not allow old settlement code to crown every paused week or old streak/result notifications to replay. Choose a new start boundary and preserve all existing historical wins, balances and reward ledgers. Restore reward syncing only after deciding its explicit cutoff and verifying no replay payouts.
4. Run the restored daily unit/browser/emulator suites and shared notification/offline checks on isolated fixtures. Verify both accounts and mobile layouts. Confirm old outstanding clocks/resets cannot resume as new rounds.
5. Publish only when requested: restore compatible backend rules and Worker behavior, then Pages. Never reset production saves or re-provision secrets, users or the Durable Object.

The external backup also includes `star-ui-before-retirement.js`, the editable companion wallet source. Its competition promotion was removed in that source and through the checked `tools/build-star-kitchen.mjs` release transform; restore both deliberately if rewards return. Do not rebuild the current release wholesale from the older C: companion.
