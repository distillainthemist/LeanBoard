# The 2026-11-23 issue export — review and plan (tranche 1A)

Source: `leanboard-issues-2026-11-23.pdf`, nine reports, all Documents,
all from Ben in the client tenant during the DMS UAT re-run. Reported on
the build stamped `v0.97.0-2-g9b095cf`, which is the v0.98.0 code under
the wrong label (the managed-zip finding of 2026-11-22). None of them is
touched by tranche 1.

Each report was read against the code. Where the cause is confirmed in
the code it says so; where it is not, it says what is still unknown.
**Nothing here is built.** This is tranche 1A of
`backlog-programme-2026-11-22.md`, to be walked with Ben item by item
before any of it is built.

## The nine reports

| # | Report | Kind | What it is | Cause |
|---|---|---|---|---|
| 2 | UAT DOC-068: Message assignees | Bug | Teams refuses the group chat | **Confirmed** |
| 3 | Flag an issue | Bug | (a) the same Teams refusal; (b) "choose an image" did nothing | (a) **confirmed**, (b) not found |
| 7 | UAT DOC-032: Replace content | Bug | "The replace landed wrong" every time | **Confirmed** |
| 6 | UAT DOC-034: check in and submit | Bug | a reviewer who has finished still sees "Review complete" | **Confirmed** |
| 5 | UAT DOC-040: Cancel a revision | Bug | the restored version does not show "Revision cancelled — restored v3.0" | Not confirmed |
| 8 | Checking out a checked-out document | Bug | only a bare error | **Confirmed** |
| 9 | Linking of documents | Bug | cramped layout, no sign that the search is running | **Confirmed** |
| 1 | UAT libraries | Idea | libraries for UAT only; drop the PDF renditions folder | Design |
| 4 | Document controller task visibility | Idea | a controller sees only their own site's tasks | Design |

## A. Teams group messages are refused (reports 2 and 3) — 1 h

**What happened.** "The Teams message did not go: Could not open the
chat: Chat topic contains invalid Character: ':'". It happens whenever a
message goes to MORE than one person, because only a group chat is given
a topic. One recipient works, which is what Ben saw on another task.

**Cause, confirmed.** `docs/notifyModel.ts` `chatTopic` cleans the topic
of quotes and markup but leaves the colon, and every subject the app
writes has one: "Flagged for review: <name>", the ingestion subject, the
lifecycle subjects. Microsoft Graph refuses a colon in a chat topic. The
2026-10-26 fix read the same error as being about the apostrophe; the
apostrophes in that message are only the quotes around the colon.

**Fix.** The colon becomes " –" in the topic; the card keeps the full
subject. While there: every character Graph documents as refused in a
topic goes through one tested list.

**Reach.** Every multi-person Teams message from Documents: review
requests to several reviewers, flags to several owners, ingestion
assignees, approvals with more than one approver.

## B. Replace content says it "landed wrong" (report 7) — 2–3 h

**What happened.** "The replace landed wrong: 974704 bytes for 966366
sent; record kept". Each time, on a `.pptx`.

**Cause, confirmed.** `docs/replaceContent.ts` checks that the file's
size in SharePoint equals the bytes sent, exactly. For Office files that
is never true once the library has columns: SharePoint writes the
document's properties INTO the file as it lands, so the stored file is a
few kilobytes larger (here 8,338 bytes). The replace had worked. The
check was wrong, and the document was left checked out with the new
content and a message saying it had failed.

**The same check is on Add document by upload** (`docs/addDocument.ts`):
there a mismatch DELETES the file just uploaded and says to use the
upload folder. An Office file added to a library whose columns have
default values would hit it.

**Fix.** For Office formats (docx, xlsx, pptx and their macro and
template kin) the check becomes: the record is the same one, the file
was modified by this replace, and its size is within a tolerance of what
was sent. Every other type keeps the exact check. Both dialogs use one
tested rule.

## C. A reviewer who has finished still sees "Review complete" (report 6) — 3–4 h

**What happened.** After pressing "Review complete" the reviewer still
sees the same button, with nothing to say their part is done. The owner,
meanwhile, correctly sees the document as ready to submit for approval.

**Cause, confirmed.** The app knows who has finished
(`reviewsOutstanding` in `docs/model.ts`, read from the version
history) and uses it for the owner's view. The reviewer's own view never
asks it, so the command is offered again.

**Fix.** A reviewer who has recorded "Review complete" since the latest
submit sees, in place of the button, "✓ You completed your review on
<date>" and who it waits on. Pressing the button now also repaints the
viewer at once.

## D. Cancel revision's comment is not shown (report 5) — 2–4 h

**What happened.** The restored version does not show "Revision
cancelled — restored v3.0".

**Cause, NOT confirmed.** The command does write that comment, twice:
on the check-in and on the publish. The likeliest reading: in a library
with content approval, the publish step leaves the new major with an
empty comment, and the history card then falls back to the comment of
the newest DRAFT under it — which is the cancelled revision's own
comment, the wrong words entirely. But I have not seen the version list
after a cancel, and it could also be that the comment lands on a version
the card does not show.

**First step.** A look at one cancelled revision's version history on
dev, with Ben (ten minutes). Then: the card for a restored major reads
the cancel's own words wherever SharePoint put them, and never borrows a
cancelled draft's comment.

## E. Checking out a document someone else holds (report 8) — 2 h

**What happened.** "Check-out did not go through — Someone checked this
document out first."

**Cause, confirmed.** `runCommand` in `docs/docsScreen.ts` finds the
document held and says only that.

**Fix.** The notice is titled "Checked out to <name>" and says since
when, and what can be done: ask them to check it in, or a document
controller can discard their check-out. The document's own panel
repaints with the lock and the name, so the button that failed is gone.

## F. "choose an image" in the flag dialog (report 3) — 1–2 h

**What happened.** Pasting a screenshot worked; choosing a file "didn't
seem to work".

**Cause, not found.** The picker is built the same way as the issue
report's, which works. Two things I can see: a file that is not an
image (or whose type the browser does not report) is ignored without a
word; and the picker sits inside the document viewer, where it has not
been tried.

**Fix.** A file that is not taken says why ("That file is not an image:
<name>"). An image is recognised by its extension when the browser gives
no type. And one question for Ben: what kind of file was chosen.

## G. Linking a document (report 9) — 4–5 h

**What happened.** The search box is squeezed, the relation buttons sit
above it with a sentence between, and nothing shows while the search
runs.

**Cause, confirmed.** `docs/linksEditor.ts` is one of the searches the
type-ahead survey listed as owed (programme item F5): no "Searching…"
line, no guard against a slow answer overwriting a newer one, no catch
if a library cannot be read, and the results push the dialog taller.

**Fix.** The standing type-ahead pattern: a full-width box, a floating
list under it with its own scroll, "Searching…" while it reads, "No
documents match", arrows / Enter / Escape. The relation becomes a
labelled choice ("Relationship") with the sentence gone. Supersede's
"Superseded by" search uses the same builder. This takes one of F5's
ten places off tranche 5.

## H. The PDF rendition folder (report 1, second half) — 0.5 h

Settings → Documents → Libraries carries a "PDF rendition folder" field
per library. Nothing reads it: the stored-rendition recipe was dropped
on 2026-08-08. **Fix:** the field goes. A value already stored is left
alone and ignored.

## I. UAT-only libraries (report 1, first half) — 5–7 h

**The ask.** Mark a library as UAT only; show it only to "a user in UAT
mode".

**What exists.** No "UAT mode". There ARE UAT runs with named testers
(`uat/model.ts`), and the library list is loaded in one place
(`docsConfig`), so one filter there covers the register, Add document,
the document cards, link search, the task panels and the health report.

**Decisions for Ben.**
1. Who is "in UAT mode": the people assigned to a RUNNING UAT run, plus
   super admins (my recommendation); or a switch each person turns on.
2. Whether a UAT library's documents count in the Document Control
   Health report for the people who can see it.

**To say plainly.** This is the app hiding a library. SharePoint's own
permissions are unchanged: someone with the library's URL can still
open it there.

## J. A controller sees only their own site (report 4) — 6–10 h

**The ask.** "A document controller should only get contextual
visibility for tasks related to their own site."

**What a controller sees for everyone today.** Every open document
flag, every ingestion task, every edit-access request, and the health
report across all libraries. Their own reviews and approvals are already
theirs alone.

**Decisions for Ben.**
1. A controller's site: the site on their LeanBoard person row (my
   recommendation). A controller with no site, and every super admin,
   sees everything.
2. A DOCUMENT's site: read from its Organisation unit. A document with
   none belongs to nobody's site — shown to every controller (my
   recommendation), or to none.
3. An ingestion task's site: the task's own "site" (set since v0.84.0).
   A task with none is shown to every controller.
4. Which lists it applies to: flags, ingestion tasks, access requests,
   the health report (my recommendation: all four).
5. Whether a controller may switch to "All sites" (my recommendation:
   no — it is what a super admin is for).

**To say plainly.** As with every scoping in the app, this is what the
app SHOWS. A controller's SharePoint rights are unchanged.

## Order and size

Bugs that stop UAT first, then the two designs.

| Order | Item | Size |
|---|---|---|
| 1 | A. Teams group messages | 1 h |
| 2 | B. Replace content and Add by upload | 2–3 h |
| 3 | C. The reviewer's "Review complete" | 3–4 h |
| 4 | E. Checking out a held document | 2 h |
| 5 | F. The flag dialog's image picker | 1–2 h |
| 6 | H. The PDF rendition folder | 0.5 h |
| 7 | D. Cancel revision's comment | 2–4 h |
| 8 | G. Linking a document | 4–5 h |
| 9 | I. UAT-only libraries | 5–7 h |
| 10 | J. A controller's own site | 6–10 h |

About **27–39 hours**. App-only as far as I can see: the UAT flag sits
in a library's existing settings, and a controller's site is already on
their person row. Every item is a Documents change, so none of it can be
seen in the harness: each needs Ben's check on dev.

## What to tell the UAT testers now

- **Messages to more than one person** fail until A is released. One
  person at a time works.
- **Replace content on Office files** reports a failure but HAS
  replaced the file. Check the document, then check in. Do not repeat
  the replace.

## Walked with Ben before building (2026-11-23)

- **A** — keep a topic on group chats, cleaned: the colon becomes a
  dash; every character Graph refuses goes through one tested list.
- **B** — Office files: same record, modified by this upload, and the
  stored size within 10% of what was sent or 256 KB, whichever is
  larger. Every other type keeps the exact check. Both Replace content
  and Add by upload.
- **C** — a reviewer who has finished sees "✓ You completed your review
  on <date>" in place of the button, and "Waiting on <names>" while
  others are outstanding; once all have finished "Submit for approval"
  is the solid button. While reviews are outstanding it stays available
  as an OUTLINE button with today's warning (the 2026-10-19 decision).
- **E** — the notice is titled "Checked out to <name>", says "Ask them
  to check it in. A document controller can discard their check-out.",
  Close only; the panel and row repaint with the lock. No "since when"
  (the read here does not return it), no Message button.
- **F** — the cause was a HEIC photo (Ben): the browser gives it no
  type, the dialog dropped it without a word, and it could not have
  been drawn anyway. HEIC is REFUSED with a reason ("HEIC photos can't
  be shown here: <name>. Use a JPG or PNG, or paste a screenshot."); the
  chooser offers JPG, PNG, GIF and WebP; any other non-image names
  itself too. The same in the issue report dialog. No in-app
  conversion.
- **H** — the "PDF rendition folder" field is removed; a stored value
  is left alone and ignored; nothing in SharePoint is touched.
- **D** — Ben: the restored version showed NO comment at all (so the
  card did not borrow a draft's comment; the words are simply not on
  the version the card reads). Build: the restored version's card reads
  the cancel's words from wherever SharePoint holds them — the file's
  own check-in comment, then the approval comment — and never a
  cancelled draft's; the cancelled drafts are MARKED "Cancelled" in the
  history. Still unknown: which of those two places has the words. If
  neither does on dev, a sign-in is needed to read the raw version rows
  before going further.
- **G** — a "Relationship" field (Parent / Related / Child; the sentence
  becomes the label's tooltip) FIRST, then a full-width search with a
  floating list: "Searching…", the matches (name, library and document
  ID beneath), "No documents match", a line naming any library that
  could not be read; arrows / Enter / Escape. One shared builder, used
  for "Superseded by" too.
- **I** — a "UAT only" tick per library; hidden from everyone not in
  UAT mode, everywhere the library list is used; a small "UAT" tag on
  the library's name for those who see it. IN UAT MODE = assigned to a
  RUNNING UAT run, plus super admins. A link to a document in a UAT
  library is HIDDEN ENTIRELY from someone who cannot see the library
  (Ben chose this over "not available to you").
- **J** — all recommendations agreed: a controller's site is the site
  on their LeanBoard person row (none = sees everything, as do super
  admins); a document's site is read from its Organisation unit, and a
  document with none shows to EVERY controller; an ingestion task with
  no site shows to every controller; it applies to flags, ingestion
  tasks, access requests and the health report; no "All sites" switch.

Ben, 2026-11-23: "build tranche 1A".

## As built (2026-11-23) — released in v0.99.0

App-only. No schema, no Utilities change. Every item is in the
Documents area, which the harness cannot reach, so **none of it has been
seen running against SharePoint**: the rules are unit-tested, the
screens are Ben's to check on dev. One exception: item G's layout and
keys were seen in the harness on canned answers
(`app/harness/linksdlg.html`: the relationship first, the floating
list, "Searching…", "No documents match", "Could not search …", ↓ and
Enter picking, Escape closing the list only).

| Item | What changed | Where |
| --- | --- | --- |
| A | A group chat's topic is the subject with its colon turned into a dash, quotes and every other character Graph refuses removed, 100 characters at most. | `docs/notifyModel.ts` `chatTopic` |
| B | The landed check is one rule for Replace content and Add by upload: same record, modified by this upload, and for Word, Excel and PowerPoint files the stored size within 10% or 256 KB of what was sent. Every other type keeps the exact size. | `docs/landedCheck.ts`, `replaceContent.ts`, `addDocument.ts`, `sp.ts` (`TimeLastModified`) |
| C | The panel reads the version history when it opens and after every command. A reviewer who has finished sees "✓ You completed your review on <date>" in place of the button, and "Waiting on <names>" or "Every review is complete." While a review is outstanding "Submit for approval" is an outline button on the card with the same warning; once all are in it is the solid one. Until the history has been read the buttons are as before. | `docs/model.ts` `reviewProgress`, `lifecycleCommandsFor`; `viewer.ts` `notes`, `card`; `docsScreen.ts` `loadReviewState` |
| D | The history cards ask for every comment SharePoint holds: the item version's, then the FILE version's by label (two extra reads, only when a major is bare), then the approval comment. A restored major reads the cancel's words wherever they landed, including the check-in under a bare major; it never shows "published from" a cancelled draft; the abandoned drafts read "cancelled". The audit view names the step. | `docs/data.ts` `itemVersions({ fillComments })`, `model.ts` `fillVersionComments`, `headReading`; `viewer.ts` |
| E | "Checked out to <name>", "Ask them to check it in. A document controller can discard their check-out.", Close only. The row and panel repaint first. | `docs/docsScreen.ts` `heldNotice` |
| F | One rule for both pickers: the chooser offers JPG, PNG, GIF and WebP; a HEIC photo is refused by name with what to do; any other non-image names itself; an image the browser gave no type is recognised by its extension and re-typed. | `imagePick.ts`, `docs/flagDialog.ts`, `issues/report.ts` |
| G | One document search for "Link a document" and "Superseded by": the standing type-ahead, with "Searching…", a guard against a slow answer landing over a newer one, a caught failure per library ("Could not search <library>."), name with library and document ID beneath. The link area leads with a "Relationship" choice; the sentence is the label's tooltip. Picking the same document twice under one relationship adds one link. | `docs/docSearch.ts`, `docSearchModel.ts`, `linksEditor.ts`, `lifecycleCmds.ts` |
| H | The "PDF rendition folder" field is gone. A stored value survives a save untouched. | `docs/settingsTab.ts` |
| I | A "UAT only" tick per library, in the library's config JSON. The one library read (`docsConfig`) drops such a library for anyone not in UAT mode and tags its name "· UAT" for those who see it. In UAT mode = super admin, or assigned to a running UAT run; asked once a session and only when some library carries the tick; a failed read hides the library. Links into a hidden library are not painted (declared or derived), not counted in the register, and not dropped by a save. Flags, access requests and ingestion tasks for a hidden library are not listed. | `docs/uatLibraries.ts`, `docsStore.ts`, `settingsTab.ts`, `viewer.ts`, `linksEditor.ts`, `rows.ts`, `docsCards.ts` |
| J | A controller who is not a super admin and has a site on their person row is scoped to it: the flags queue, its count, the flagged scope, the flags and access requests in Document tasks, the ingestion tasks, and the health report. A document is placed by its Organisation unit's term ids (labels when the feed gave none); one with none, or one the walk cannot place, shows to every controller. What a person owns, made or was assigned is theirs whatever the site. | `docs/siteScope.ts`, `docsScreen.ts` `controllerScope`, `judgeFlags`; `healthReport.ts` `keepRow` |

### Limits, said plainly

- **D was built without the evidence, and passed on dev** (Ben,
  2026-11-23): the restored version's card shows the cancel's words and
  the abandoned drafts read "cancelled". Which of the three places held
  the words was not looked at; no sign-in was needed.
- **I and J are what the app shows.** SharePoint's permissions are
  unchanged. A link with no library recorded on it (an older or
  cross-site link) cannot be judged and stays visible.
- **I: a change of UAT standing lands on the next open of the app**
  (added to a run, a run closed).
- **I: a board card set to a UAT-only library** says the library is not
  exposed, for someone outside UAT mode; it does not vanish.
- **J: the scope follows the last known controller standing.** The
  menu's flag count is judged behind the paint, so on the first open it
  can show every site's count for a moment.
- **J: a document tagged to two sites** shows to both sites' controllers.

UAT: UAT-DOC-025, 030, 031, 032, 035, 036, 040, 041, 054, 059 and 073
updated; UAT-DOC-101 (UAT-only library), UAT-DOC-102 (a controller's
site) and UAT-ISS-003 (a photo the app cannot show) added.

## Ben's test walk (2026-11-23, dev)

| # | Item | Result |
|---|---|---|
| 1 | A — Teams group message topic | Pass |
| 2 | B — Replace content on an Office file | Pass |
| 3 | C — Review complete | Not tested on dev: in UAT (two reviewer accounts) |
| 4 | D — Cancel revision's comment, cancelled drafts | Pass |
| 5 | E — a check-out someone else holds | Not tested on dev: in UAT |
| 6 | F — choosing an image (HEIC) | Pass |
| 7 | G — Link a document | Pass |
| 8 | G — Superseded by | Pass |
| 9 | H — PDF rendition folder gone | Pass |
| 10 | I — UAT-only libraries | Not tested on dev: in UAT |
| 11 | J — a controller's site | Not tested on dev: in UAT |

Found in the walk (test 8) and fixed the same day, on dev as
`v0.98.0-23-g6c3ac63`: every lifecycle command that demands a comment
asked "Why is revision needed?". Each now asks its own question
(`LifecycleCommandDef.reasonPrompt`): Request revision "Why is revision
needed?", Mark superseded "Why is it being replaced?", Mark obsolete
"Why is it no longer needed?", Reinstate "Why is it being reinstated?".

Tranche 1A stands tested on dev for A, B, D, F, G and H. C, E, I and J
go to UAT unseen running: UAT-DOC-035 / 036 (C), UAT-DOC-031 (E),
UAT-DOC-101 (I), UAT-DOC-102 (J).
