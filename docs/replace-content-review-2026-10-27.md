# Why Replace content is constrained — a critical review (2026-10-27)

Ben's question, after two destructive test runs: why can the app not
replace a document's content in place, and is the constraint real?

## What the app can and cannot do today

1. **Both copy roads recreate the record.** The legacy
   `File.copyto(boverwrite=true)` and the modern
   `SP.MoveCopyUtil.CopyFileByPath(overwrite=true)` both DELETE the
   destination list item and create a new one: new id, new uniqueId,
   blank properties, the version history reset to v1.0, and the file
   not answering at its path until the viewer reopens ("Item does not
   exist", "File Not Found" — the runs of 2026-10-27). Every link,
   favourite, flag and access request is anchored to the uniqueId, so
   all of them are orphaned. Community reports agree: a copy "never
   takes your version history — it's just creating a new item with the
   same content" ([Microsoft Q&A][q1], [Power Users][q2]). This is
   SharePoint's semantics for copy, not a bug in the app.
2. **The only in-place content write SharePoint offers takes bytes**:
   the file's `$value` PUT, the chunked upload, Graph's
   `PUT /content`, or the connector's own **Update file** — "Updates the
   contents of the file specified by the file identifier"
   ([connector reference][sp]). All of them carry the file's bytes.
3. **The 4A verdict (2026-08-03) was "bytes cannot cross the
   connector"** — four carriages measured, every one re-encoded
   (16 bytes sent, 21/26/29 stored). That verdict is what the staging
   handoff, template copy, the Dataverse relay recipe and now the
   guided replace all bend around (`docs/leanboard-phase4-plan.md`,
   `docs/sharepoint-writes.md`, `docs/deployment-cookbook.md`).

## What the review found

The verdict was true of the DECLARATION, not of the wire.

- The SDK's connector executor
  (`@microsoft/power-apps/dist/internal/data/core/data/executors/connectorDataOperationExecutor.js`)
  builds the HTTP body from the operation's declared parameters. A body
  parameter declared `format: "binary"` whose value is a base64 string
  is **decoded to a `Uint8Array` and sent as
  `application/octet-stream`**; every other body is `JSON.stringify`'d.
  The code comment says it outright: "Returning the base64 string (or
  JSON.stringify'ing it) causes the gateway to forward ASCII content
  verbatim, corrupting uploads."
- That code is in the **installed 1.2.7**, and in 1.3.0, 1.4.0 and
  1.5.0 (each installed into the scratchpad and read). Whether it was in
  the SDK of 2026-08-03 is not recorded; it does not matter now.
- The app's own `connectorCreateFile` declared the body as
  `{ name: "body", in: "body", type: "string" }` — **no `format`** — so
  the executor stringified the base64 and the file arrived re-encoded.
  The two REST carriages (`Files/add` through HttpRequest) could never
  carry bytes: HttpRequest's body is a JSON string by contract.
- A third-party package for code apps
  ([PowerSquared/code-apps-sharepoint-files][ps]) uploads, replaces
  (Update file), downloads (Get file content) and deletes SharePoint
  files through exactly these connector operations with the body
  declared `format: 'binary'`, and names the stringify behaviour as the
  thing to avoid. It states 1.3.0 as its floor; the executor code says
  1.2.7 already has it. Its operation paths are declared "not confirmed
  against the connector swagger"; the reference confirms the operation
  ids and parameters (Update file: dataset, id, body as binary; Get file
  content: dataset, id).

So: **an in-place replace is very probably possible from the app**, by
reading the staged file's bytes (Get file content) and writing them
over the held document (Update file), which keeps the item, its id,
its uniqueId and its history and adds a version. And a **native upload
from the device** (a browser `File` → base64 → Create file declared
binary) is probably possible for Add document, retiring the staging
handoff. "Probably" because the host runtime — the player's data
client, not the SDK — must wrap the `Uint8Array` in a binary Blob as
the executor's comment says it does; only a measurement settles it.

## What is built for the measurement (this commit)

- `docs/sp.ts`: the connector file operations declared with
  `format: "binary"` — `connectorCreateFileBinary`,
  `connectorUpdateFile`, `connectorGetFileContent`,
  `connectorGetFileMetadata` — and `connectorFileIdFor` (the
  connector's double-encoded identifier form, to be checked against
  the Id Create file returns).
- The write-access probe (Settings → Documents → Test write access)
  gains, on its own throw-away file: upload with the binary
  declaration (expect 16 bytes), the identifier check, Get file
  metadata, **Replace content IN PLACE through Update file** (expect
  32 bytes and the SAME item id and GUID), and Get file content read
  back (expect the 32 bytes, byte-identical). The four old carriages
  stay, per the standing rule.

## If the probe is green

1. Replace content: Get file content (staged) → Update file (held
   document) inside the check-out → the file, record and history kept;
   the guided SharePoint step stays as the fallback.
2. Add document: a native file picker beside the staging handoff —
   `File` → Create file (binary) into the target library, then the
   existing metadata-form and check-in sequence.
3. The standing rule becomes: the probe's binary steps run on every SDK
   bump; the 4A verdict is corrected in the plan, the cookbook and
   `sharepoint-writes.md`.

## If the probe is red

The guided replace stands; the Dataverse relay (cookbook recipe 2,
measured green for bytes on 2026-08-08) is the remaining road for a
one-click replace, at the cost of a flow.

[q1]: https://learn.microsoft.com/en-us/answers/questions/5201668/sharepoint-issue-copy-to-and-replace-from-one-site
[q2]: https://powerusers.microsoft.com/t5/General-Power-Automate/Copy-file-to-sharepoint-location-keep-old-versions/m-p/930302
[sp]: https://learn.microsoft.com/en-us/connectors/sharepointonline/
[ps]: https://github.com/PowerSquared/code-apps-sharepoint-files
