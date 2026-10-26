# Issue round 2026-10-26 (third export) — findings and plan

Source: the issues export of 2026-10-26 04:55 UTC (10 reports: Ellen
Black ×7, Kat Stojakovic ×3; four from the DMS UAT run). Analysed
2026-10-26 against v0.78.0 with the five embedded screenshots.

| # | Report | Cause | Rectification | Effort | Status |
|---|---|---|---|---|---|
| 1 | UAT DOC-031: comments not captured, minor versions not captured (Ellen) · 7 Mark reviewed creates a major, no comments saved (Ellen) | One mechanism. A check-in lands as a MINOR with its comment (v10.1 "Some changes"). On a library with content approval, every reader-facing act — approve, Mark reviewed, the quick edit — then publishes through the forms engine (`_ModerationStatus = 0`), and SharePoint records that publish as a NEW MAJOR with no check-in comment. So the version cards read "v11.0 Published · No comment" while the comments sit on the folded drafts beneath each card (the screenshot's carets). Mark reviewed producing a major is by design (CA1: the review stamp must be reader-facing on a moderated library); the comment going missing is not. | Publish through SharePoint's own approve road for files (`Approve(comment)`), which carries a comment onto the major — the lifecycle's own sentence ("Approved — …", "Periodic review — no changes — …") lands on it; the forms-engine road stays as the fallback. The version card also shows what it was published from: "v11.0 · published from v10.1 “Some changes”". The Version history hint says it: "a check-in is a draft (minor); approval, Mark reviewed and a controller's quick edit publish a major". Settings → Documents → Health warns when minor versions are OFF on a library (every check-in would be a major). Ben confirms the UAT Library's versioning settings (major and minor; content approval). | 2 h | |
| 2 | Opening the LeanBoard link opens a template document every time, even after re-saving the link and on refresh (Kat) | The saved link is a WORK link from a Teams card: it carries `ltkdoc=<library:item>&ltkmode=work`, the "come do your step" route, which lands on the hub's Documents tab with that document open. Every launch of that URL — and every refresh, which re-runs the launch — replays it. | Honour a document payload ONCE per browser session (a stamp of the payload in session storage): a refresh or a second open of the same link lands on the register. The viewer header says "Opened from a link to this document" with a "Copy the plain LeanBoard link" action, so the bookmark can be fixed in one click; the hub's ? menu gets the same copy action. | 1 h | |
| 3 | Chat to self: cannot flag to yourself (Kat) | Teams refuses a one-to-one chat with yourself ("Duplicate" member) — the app reports the refusal as an error even though the flag itself was raised and already shows in your Document tasks under Flags. | When every recipient is you, skip Teams and say so: "Flagged — it is in your Document tasks under Flags (Teams cannot message you about your own flag)". The notify panel, the ingestion message dialog and the lifecycle cards say the same instead of a refusal. | 0.5 h | |
| 4 | Document task does not disappear after approving Ellen's revision request; a Teams message goes each time (Kat) | Approve & grant writes the grant to the document (the Revision editors column — the authorization of record), then marks the request granted in the ledger, a Dataverse row every signed-in user must be able to write. Kat's ledger write fails (her Dataverse role, or a concurrent change), the dialog's done state only WARNS ("The ledger update did not land — the request may reappear"), the task is rebuilt from the ledger, so it stays — and each repeat re-sends the "granted" card. | Tasks derive from the record: a request whose grantee is already in the document's Revision editors column counts as granted (the ledger is repaired in the background, and the row says "granted — ledger catching up" if it cannot be). Approve & grant refuses a second grant for someone already in the column instead of re-sending the card. The done-state warning turns red and names the fix. Ben checks Kat's Dataverse security role can write `ben_ltkdoclibrary` (she was Restricted View on SharePoint; the Dataverse side may be read-only too). | 1.5 h | |
| 5 | UAT DOC-034: "Check in & submit for review" not offered (Ellen) | The button appears only when Submit for review is offered on the row: a standards library with the status column mapped, the document in the DRAFT stage, and you its owner. Ellen's document was already In Review (screenshot 5) — then the one-flow button is rightly absent. | The check-in dialog says why when the button is absent ("Submit for review is not offered here: the document is In Review"). UAT-DOC-034's precondition names the stage. | 0.5 h | |
| 6 | Flag for review: "unable to send the Teams message" (Ellen, screenshot: `Chat topic contains invalid Character: '''`) | Two things. The group-chat TOPIC is the flag's subject, which carries the document name in quotes and an apostrophe — Graph refuses `'` in a topic (a one-to-one chat has no topic, so it only bites with two or more recipients). And Ellen was the reviewer herself — report 3's self case. | Sanitise the topic (quotes, apostrophes and the other characters Graph refuses dropped; length capped) — the card's subject stays intact. The self case as in 3. | 0.5 h | |
| 8 | UAT DOC-040: Cancel revision not offered when the document is checked out to someone else (Ellen) | By design today: the command hides while someone ELSE holds the check-out; the UAT case promises a refusal naming the holder (the command's own refusal text already exists for it). | Offer Cancel revision… and let the command refuse with the holder's name ("Kat holds this document checked out — the revision can be cancelled once it is checked in or discarded"), as the case says. | 0.3 h | |
| 9 | UAT DOC-042: the notify panel reads as if sent before pressing Send; cannot add a recipient after removing one (Ellen) | The panel pre-writes the message in the past tense ("Hi — Ellen has submitted …") inside an editable box under "Let the next step know", with no line saying nothing has gone yet; chips can be removed but there is no way to add a person. | A "Not sent yet — check who hears, edit the words, then send" line; buttons "Send on Teams" / "Send by email"; an "Add person…" search (Entra, like the people pickers) that appends a chip. | 1 h | |
| 10 | Idea: "Show only approved" for general users only; owners, approvers and controllers land on every status (Ellen) | The approved-only default applies to everyone, with the choice remembered per view. | Proposed rule: document controllers and super admins land on every status; everyone else on approved documents; the remembered choice still wins. Option B: also anyone the tasks query finds named as owner, approver or reviewer on a document (one extra query at mount). Ben picks. | 0.5 h | |

## Order (proposed)

1. **Versions and comments** — 1 (+7), the publish road and the cards.
2. **Kat's loop** — 4 (derive from the column; refuse the re-grant).
3. **The replayed link** — 2.
4. **Teams** — 6 (topic), 3 (self case).
5. **Notify panel** — 9.
6. **Small** — 8, 5, 10.

About 8 h. All app-only; no schema change.

## Questions for Ben

- 1/7: the UAT Library's versioning settings — are major AND minor
  versions on, with content approval? (The screenshot shows only
  majors, consistent with minors folded under the carets; if minors
  are OFF, every check-in is a major by SharePoint's rule and the
  Health warning will say so.)
- 4: Kat's Dataverse security role — can she write the document
  libraries table (`ben_ltkdoclibrary`)? The ledger of access requests
  lives there.
- 10: the default rule — controllers and super admins only, or option
  B (anyone named on a document)?
