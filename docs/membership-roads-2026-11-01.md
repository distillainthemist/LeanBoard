# Controller standing: one call per user, not a group listing (2026-11-01)

Ben, 2026-11-01: "why does the whole people list need to be loaded to
determine permissions — would it be more efficient to determine this
specifically for the user? Would this improve the opening experience of
documents in particular (it can take a while for document controller
functions to become visible)?" Then: "Build it, probe first."

## What the trace found

The roster is not the cost. The Improvement tab and the initiative board
header load the people list for names, emails and pickers, and finding
the viewer's own row in it was a convenience that broke when the SDK's
500-row page truncated the list (fixed the same day: `allWhere` pages,
and both screens fall back to a direct single-row lookup of the viewer).

The Documents delay is a different road. Controller standing is
membership of the Document Controllers security group, deliberately
separate from roster roles and fail-closed. `viewerIsController` ran:

1. a FRESH Dataverse read of the documents config row (`appDocsConfig`),
   although the register had just read the same row through the shared
   session cache (`docsConfig`);
2. then a Graph call through the Office 365 Groups connector listing
   EVERY member id of the controllers group, paged at 999, and a `.has`
   on the set (`idSet`);
3. `viewerInPool` listed the owners & approvers group with identity the
   same way.

Each connector round trip costs one to two seconds; a large group pages.
The register paints its rows from the local cache in under a second, and
the FIRST LIVE LOAD waited on `adminReady` too (`docsScreen.ts`, the
`load(true, "open")` call), so the whole open was serialised behind the
two reads — not only the controller buttons.

## The one-call road (why a probe)

The connector's "Send an HTTP request V2" reaches ONE Graph segment,
`/groups` (the connector docs say so), so `/me/checkMemberGroups` and
`/users/{id}/…` are out. Under `/groups` two roads answer for one user:

| Road | Call | Standing |
|---|---|---|
| filter | `GET /groups/{g}/members?$filter=id eq '{u}'&$count=true&$select=id` with `ConsistencyLevel: eventual` | Graph's documented advanced query on the members collection; the connector's `CustomHeader1` carries the header |
| path | `GET /groups/{g}/members/{u}?$select=id` | 200 = member, not-found = not one; undocumented for this collection |

Both must be MEASURED before a gate trusts them: a 404 that really meant
"this path is not allowed" would read every controller as a reader. The
probe therefore runs each road twice — the viewer AND a known
non-member GUID — and compares with the listing's answer.

## What is built (app-only)

- `store/accessGroup.ts`: the Graph passthrough carries up to five
  custom headers; `memberByFilter`, `memberByPath`, `memberByListing`
  return `{member, ms, note}` (null member = refused, fall back).
- `docs/accessProbe.ts` (Settings → Access diagnostics → Run
  diagnostics): a "Membership roads" block — the config row's fresh and
  cached read times, then per linked group the five timed lines and a
  VERDICT naming the road(s) that agreed with the listing on both
  answers. Read-only. UAT-SET-009.
- `docs/accessGates.ts`: the gates read the documents config from the
  SAME session-cached `docsConfig()` the register opens on — the
  separate Dataverse round trip is gone; the Graph calls mark the timing
  readout ("controllers group", "owners & approvers group, n members").
  A relink in Settings → Access control now clears the gates too.
- The remembered standing (`DocUiPrefs.standing`, wire key `st`, on the
  person's `ben_docuijson` the register already reads): the last visit's
  controller/pool answer paints the affordances at once; the live check
  runs in the background, records its answer, and if it MOVED the
  standing the surfaces that paint by it run again (`whenStanding`:
  template library rows, the phone filters, the every-status default +
  first load). No answer remembered = today's behaviour (wait for live).
  Fail-closed stays: a live NO replaces a remembered yes; only an OUTAGE
  (`controllerLookupFailed`) keeps the remembered yes, which is not an
  elevation. SharePoint remains the hard gate. UAT-DOC-091.

## Measured (Ben's run on dev, 2026-11-01 18:33, both groups 2 members)

| Call | Controllers | Owners & approvers |
|---|---|---|
| documents config row, fresh Dataverse read | 74 ms | — |
| documents config, shared session cache | 0 ms | — |
| listing (today's road) | 118 ms | 109 ms |
| filter road, the viewer | 218 ms | 407 ms |
| filter road, a non-member | 142 ms (0 rows) | 161 ms (0 rows) |
| path road, the viewer | 173 ms (200) | 124 ms (200) |
| path road, a non-member | 404 naming the GROUP id | 404 naming the GROUP id |

Both VERDICT lines: "filter road agrees".

## Decision: the gates keep listing

1. **The listing is already one call.** Under one page (999 members) it
   is a single connector round trip, and it measured faster than the
   filter road on both groups. The one-call road only wins once a group
   pages, which no document group here does.
2. **The filter road can lag a grant.** It runs under
   `ConsistencyLevel: eventual`, an index Graph says "might not be
   up-to-date with recent changes". A person made a controller in
   Settings and opening Documents a moment later must not land as a
   reader. The listing reads the live directory.
3. **The path road is unsafe.** Its not-found for a non-member names the
   GROUP id, word for word what a broken group link returns, so a "no"
   and a bad link are indistinguishable. Rejected.

So the connector calls were never the seconds Ben saw. What was: the
fresh config read before the Graph call, both serialised, and the
register's first live load waiting behind them — all now gone (shared
config read; remembered standing paints at once and the first load no
longer waits). The timing readout now names "controllers group" and
"owners & approvers group" so a slow open can be read rather than
guessed. `memberByFilter` stays as the road to switch to if a group ever
pages; `memberByPath` stays for the probe's record.
