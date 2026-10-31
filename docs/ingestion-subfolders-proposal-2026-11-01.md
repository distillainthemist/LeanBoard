# Ingestion tasks: files in sub-folders — review and proposal (2026-11-01)

Ben, 2026-11-01: files arrive in nested structures; the task should
handle sub-folders within its folder, show each file's path (read-only)
to help set metadata, and NOT replicate the structure on landing — every
file lands flat in the destination library as today.

## What happens today (traced at v0.85.0)

| Step | Code | With a sub-folder |
|---|---|---|
| Listing | `renderListPage(site, list, viewXml, "", task.folder)` → RenderListDataAsStream with `FolderServerRelativeUrl`; the View has NO `Scope`; `parseRenderPage` drops `FSObjType !== 0` | Lists the task folder's DIRECT files only. A sub-folder is dropped as a row; the files inside it are never seen. First page only (`rowLimit: 500`, `next` ignored). |
| Grid, sheet, Set for selected, Run | work on the listed rows | Sub-folder files are not in the grid, not in the sheet, not run. |
| Rename on Save ("Name on ingestion") | `newUrl = ${task.folder}/${newName}` | Hard-codes the task root — if sub-folder files were listed, renaming one would MOVE it to the root. |
| Landing | `copyFileByPath(row.serverUrl → ${destRoot}/${row.name})`, bracket, `recycleFile(source)` | Already flat: the destination path uses the leaf name only. Nothing to change for "no structure replicated". |
| End task / Cancel | `fetchFolderCounts` → `ItemCount` ("n files have NOT been ingested") then `recycleFolder` | **Trap today:** `ItemCount` counts a sub-folder as ONE item. A sub-folder holding forty files reads as "1 file has not been ingested" and the whole tree goes to the recycle bin. |

So the ask is mostly one listing change, plus the places that assume a
flat folder. And the current behaviour is worse than "unsupported": a
nested drop is silently ignored and then under-counted on close-out.

## Proposal

### 1. The listing walks the tree (server-side)

`RenderQueryOpts.scope?: "recursive"` → `<View Scope="RecursiveAll">`.
With `FolderServerRelativeUrl` set, RenderListDataAsStream returns every
file under the task folder, at any depth, in one paged feed; the
existing `FSObjType` filter still drops the folder rows. The reload
follows `next` until the feed ends (cap 2000 files; the status line
says when the cap was hit). Nothing else about the feed changes — the
same fields, the same per-row values.

Hosted check (Ben): `FolderServerRelativeUrl` + `Scope="RecursiveAll"`
together is how SharePoint's own "flat view inside a folder" works, but
this tenant has not been asked for it by the app yet. UAT-DOC-090 step 1
is that check.

### 2. The path, derived and read-only

A pure `subFolderOf(serverUrl, taskFolder)` in `ingestionModel.ts`:
`/sites/x/Ingestion/Task A/Policies/2024/Fatigue.pdf` with task folder
`/sites/x/Ingestion/Task A` → `Policies/2024`; a root file → `""`.
Shown as a muted second line under the file name in the Document cell
(`.app-ing-path`, "Policies › 2024"), never a column and never editable.
The grid's default sort becomes folder, then name, so a tree reads as a
tree; clicking the Name header sorts by name alone as today.

### 3. Folder groups, selectable (the metadata helper)

The reason for the path is "set the same metadata on everything in that
folder". In the default sort the grid gets a group row per sub-folder
(`.app-ing-group`): the path, the file count, a checkbox that selects
every file in the group (and un-selects them), and "Open ↗" to that
sub-folder in SharePoint. Set for selected… then does the rest, as it
does now. Root files sit under a first group "Task folder". In any
other sort the group rows go and the path line under each name stays.

No new write road: selection + Set for selected is the one that exists.

### 4. Rename stays in the file's own folder

`newUrl = ${dirOf(row.serverUrl)}/${newName}` — a renamed file keeps
its place in the tree until the run flattens it. The "already in the
folder" refusal reads the same.

### 5. Flat landing, with the clash caught BEFORE the run

Landing is unchanged: `${destRoot}/${row.name}`. The new exposure is two
files with the same name in different sub-folders — today the second
copy is refused at run time with "already exists in <library>", which is
honest but late. A pure `duplicateNames(rows)` marks both rows not-ready
(⚠ "Another file in this task has the same name — rename one with Name
on ingestion"), so Run stays greyed until a name changes. The
destination clash check stays as the backstop.

### 6. The sheet carries the folder, for reference

Files sheet: a "Folder" column after "Name on ingestion", filled from
the path, with the guidance row saying it is for reference and edits are
ignored. `parseSheet` skips the `__folder` internal. Rows are written in
folder-then-name order so a filled sheet reads like the grid.

### 7. Close-out counts files, not items

End task and Cancel use the recursive listing's count (files, with the
number of sub-folders) for their warnings instead of `ItemCount`:
"12 files in 3 sub-folders have NOT been ingested; the folder and
everything in it go to the site's recycle bin." `recycleFolder` already
takes the tree. Empty sub-folders left after a run go with the folder
at End task and are never shown.

### Out of scope (deliberately)

- Replicating the structure in the destination (Ben: never).
- Writing a folder name into metadata automatically. The path is read-
  only on screen; the person picks the term. A later option could offer
  "Use the folder name as <column>" on the group row — not now.
- Moving files between sub-folders from the grid.

## Estimate and shape

Half a day, app-only. Modules: `docs/rows.ts` (scope), `docs/data.ts`
(none — the folder arg already exists), `docs/ingestionModel.ts`
(`subFolderOf`, `duplicateNames`, group builder), `docs/ingestionScreen.ts`
(reload loop, path line, group rows, rename dir, pre-flight mark,
close-out counts), `docs/sheetRoundTrip.ts` (Folder column),
`style.css`. Tests for the pure parts. UAT: DOC-063 (path line, group
select), DOC-067 (duplicate-name pre-flight), DOC-068 (close-out count),
DOC-087/088 (Folder column round trip), new DOC-090 (a nested drop lists
and lands flat).

## Decisions for Ben

1. Group rows with a select-all checkbox per sub-folder (recommended),
   or the path line only.
2. Duplicate names across sub-folders: block before the run
   (recommended), or keep the run-time refusal only.
3. The sheet's Folder column: include, read-only (recommended), or leave
   the sheet as it is.
