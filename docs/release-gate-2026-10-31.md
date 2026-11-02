# Flagging and gating clients on an old build — the release gate (2026-10-31)

Ben, 2026-10-31: "is there a way we can flag that people are not on the
latest version of the application and prevent use of the application?"

## What existed

- Every bundle stamps itself at build time: `__APP_VERSION__` is
  `git describe --tags --always --dirty` (`app/vite.config.ts`), e.g.
  `v0.84.0-15-gc264a91` — the tag, commits past it, the short SHA. Issue
  reports and UAT runs carry it; no screen showed it and nothing compared it.
- The player keeps the bundle it opened with until the app is closed and
  reopened (CLAUDE.md). A session open across a push, or a phone that
  cached the bundle days ago, runs old code with no warning.
- Nothing in Dataverse said which build is current.

## Decisions (Ben, 2026-10-31: "Build it" on the defaults proposed)

1. **Hard gate at boot, soft banner while running, hard block only below
   a minimum.** A client that OPENS on a stale build is useless until
   reopened (nothing is lost — it has nothing open). A client that goes
   stale while running gets a banner, so an edit in progress is never
   thrown away. A build older than the super admin's minimum is gated at
   once, but never over a screen holding the leave guard: the banner turns
   red and the gate waits until the guard lets go (15 s retries).
2. **The first boot of a clean newer build records it as current.**
   Whatever the host serves IS the latest, so whoever opens a fresh push
   first promotes it — no tooling, no token, no human step. A dirty tree
   (`-dirty`) never records itself; a stamp without a tag (`dev`, a bare
   SHA) is never compared. Settings → Branding → Version holds the
   override: "Make this build current" (a rollback names itself as such),
   "Require this build" (sets the minimum, and the current when the floor
   is above the record), "Clear the minimum".
3. **Each person's row records the build they last opened**
   (`ben_lastbuild`), shown on Settings → Users as "Last opened on …".
   Answers "which build was that report from?" and "who has not reopened
   since the push?".

## Found 2026-11-02: no build had ever promoted itself

Ben: "I never see the prompt that I am using a new version and need to
refresh." The gate's code was right; its INPUT never was. The build's
first step, `tools/uat-compile.mjs`, rewrites the tracked
`app/src/uat/scripts.generated.json` with the HEAD date and the tag
list, so `git describe --dirty` — run next by vite — saw a modified
tracked file and stamped the bundle `-dirty`: every build on a day after
that file's last commit, and every release build in CI (the new tag is
not in the committed copy). The v0.88.0 release package reads
`v0.88.0-dirty`; production ran `v0.87.0-2-g818d497-dirty`. A dirty
build never records itself as current (`shouldRecord`, by design) and
"Make this build current" is disabled on one, so the policy never moved
and no client was ever stale against it.

Fixed: `app/tools/build-stamp.mjs` computes the stamp (git describe,
`-dirty` only when a tracked SOURCE file differs — the generated UAT
file excluded); uat-compile dates its output by content (the newest
case change), not by HEAD; `npm run push` (`tools/push-gate.mjs`)
refuses uncommitted source, a dirty stamp, or a dist that is not HEAD's.
The first CLEAN release after this (v0.88.1 or later) is the first build
that can record itself; clients still on `v0.88.0-dirty` then read as
stale and see the banner, and the gate when they reopen.

Not done, on purpose: a Reload button on the gate. A raw reload inside
the player loses the host handshake (`getContext` never answers — the
view-as banner learned this), so the only road is close and reopen.
Not done: fetching the served `index.html` to compare asset hashes. It
needs no schema, but inside the player the fetch may be answered by the
same stale cache; the recorded build has no such doubt.

## Built (2026-10-31, solution-carrying)

- Schema: `ben_releasepolicy` (memo 2000, JSON `{current, minimum,
  recordedAt, recordedBy}`) on `ben_ltksitesettings` (the `__app__` row);
  `ben_lastbuild` (text 60) on `ben_ltkpeople`. Deployed to dev; the next
  release carries them.
- `shared/schema/release.ts` (pure): `parseBuild` (tag, commits ahead,
  SHA, dirty), `compareBuilds` (tag by semver, then commits ahead — the SHA
  carries no order), `sameBuild`, `ReleasePolicy` + parse/serialize,
  `verdictFor` → current | newer | stale | blocked | unknown (a minimum
  beats a current; an unrecorded policy passes everything), `shouldRecord`
  (clean + newer only), `buildLabel` ("v0.84.0 +15").
- `app/src/release/gate.ts`: `startReleaseGate(viewer, hasRow)` from the
  boot in `main.ts` (hosted only). One check at boot, then every 5 min and
  on return to the tab after a minute away. Records the last build on the
  viewer's roster row (silent write, existing rows only). Gate =
  full-screen `alertdialog` over a blurred, pointer-less app; banner =
  amber (stale) or red (blocked) strip where the view-as banner sits.
  An unreachable settings table never locks anyone out.
- Store: `releasePolicy()` / `saveReleasePolicy()` (`store/config.ts`,
  topic "release"); `recordLastBuild()` (`store/people.ts`);
  `RosterPerson.lastBuild`.
- Settings → Branding → Version (`versionSection` in `screens/settings.ts`):
  this device's build and raw stamp, the current build with who recorded
  it and when, the minimum, the three buttons (each confirms; they write
  at once, not through the tab's Save).
- Settings → Users: "Last opened on <build>" under each person.
- Tests `app/src/__tests__/release.test.ts`; UAT-SET-006 in
  `docs/uat/settings.md`; `release/` in the settings component.
