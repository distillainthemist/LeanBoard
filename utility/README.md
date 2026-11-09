# LeanBoard Utilities

The second code app: task-specific tools beside LeanBoard, in the same
LeanToolKitData solution. First tool: Cadence Current State. Plan and
decisions: [../docs/cadence-current-state-plan-2026-11.md](../docs/cadence-current-state-plan-2026-11.md).

Shipped: v0.89.0 (the hub, the scan, the review, JSON / Excel export) and
v0.90.0 (Outlook-only connections, the result emailed with the files
attached, task links that open straight into a scan) and v0.92.0 (notice
given — created / last-modified times, hours of notice and a short-notice
flag on every meeting and series; plan doc, Tweaks 2026-11-09). The
calendar probe stays behind the hub's footer link (`#/probe`).

Build and push from this folder: `npm ci`, `npx tsc --noEmit`,
`npx vitest run`, `npm run build`, then `npm run push` (commit first — the
push gate refuses uncommitted source or a bundle not built from HEAD; the
push goes into the LeanToolKitData solution, so a release's managed export
carries both apps). The native-dialog gate in `app/tools` scans this
folder too. UAT cases: `docs/uat/cadence.md`.
