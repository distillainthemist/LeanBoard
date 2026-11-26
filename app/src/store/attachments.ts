// Attachments & links (issue 5, 2026-11-17) — ben_ltkattachment. One row
// per attachment: a FILE in the row's file column (the issue-file road:
// create the row, then the SDK's uploadFileToRecord) or a LINK. Reads
// are cached by parent; every write goes through writing().

import { Ben_ltkattachmentsService } from "../generated/services/Ben_ltkattachmentsService";
import type { Ben_ltkattachments } from "../generated/models/Ben_ltkattachmentsModel";
import { allWhere, odata } from "./dv";
import { memoRead, writing } from "./changes";
import { nowIso } from "../../../shared/schema/id";
import { Attachment, AttachmentParent, AttachmentParentKind, cleanCaption, MAX_CAPTION, mimeFor, sortAttachments } from "../attachments/model";

const TOPIC = "attachments";

function fromRow(r: Ben_ltkattachments): Attachment {
  const url = r.ben_url ?? "";
  return {
    rowId: r.ben_ltkattachmentid,
    parent: { kind: (r.ben_parentkind === "action" ? "action" : r.ben_parentkind === "docapproval" ? "docapproval" : "initiative") as AttachmentParentKind, id: r.ben_parentid ?? "" },
    kind: url !== "" ? "link" : "file",
    fileName: r.ben_filename ?? "",
    url,
    caption: r.ben_caption ?? "",
    sizeKb: typeof r.ben_sizekb === "number" ? r.ben_sizekb : 0,
    byId: r.ben_uploadedbyid ?? "",
    byName: r.ben_uploadedbyname ?? "",
    at: r.ben_at ?? r.createdon ?? "",
  };
}

const filterFor = (p: AttachmentParent): string => `ben_parentkind eq '${odata(p.kind)}' and ben_parentid eq '${odata(p.id)}'`;

/** A parent's attachments, newest first. */
export async function listAttachments(parent: AttachmentParent): Promise<Attachment[]> {
  if (parent.id === "") return [];
  const rows = await memoRead(TOPIC, `${parent.kind}|${parent.id}`, () => allWhere(Ben_ltkattachmentsService.getAll, filterFor(parent)));
  return sortAttachments(rows.map(fromRow));
}

/** Every attachment of a kind whose parent id starts with a prefix —
 *  a document's approval evidence across all its versions, in one read
 *  (report 12, 2026-11-27). */
export async function listAttachmentsUnder(kind: AttachmentParentKind, prefix: string): Promise<Attachment[]> {
  if (prefix === "") return [];
  const rows = await memoRead(TOPIC, `${kind}|${prefix}*`, () => allWhere(Ben_ltkattachmentsService.getAll, `ben_parentkind eq '${odata(kind)}' and startswith(ben_parentid,'${odata(prefix)}')`));
  return sortAttachments(rows.map(fromRow));
}

type Actor = { whoId: string; who: string };

const base = (parent: AttachmentParent, caption: string, actor: Actor) => ({
  ben_parentkind: parent.kind,
  ben_parentid: parent.id,
  ben_caption: caption.trim().slice(0, MAX_CAPTION),
  ben_uploadedbyid: actor.whoId,
  ben_uploadedbyname: actor.who,
  ben_at: nowIso(),
});

/** Attach a link. */
export async function addLinkAttachment(parent: AttachmentParent, url: string, caption: string, actor: Actor): Promise<void> {
  const made = await writing(
    TOPIC,
    Ben_ltkattachmentsService.create({ ...base(parent, caption, actor), ben_name: (caption.trim() || url).slice(0, 300), ben_url: url } as never)
  );
  if (made.success === false) throw new Error(made.error?.message ?? "the link could not be saved");
}

/** Attach a file: the row first, then its bytes. A refused upload takes
 *  the row away again — a row with no file is not an attachment. */
export async function addFileAttachment(parent: AttachmentParent, file: File, caption: string, actor: Actor): Promise<void> {
  const made = await Ben_ltkattachmentsService.create({
    ...base(parent, caption, actor),
    ben_name: (caption.trim() || file.name).slice(0, 300),
    ben_filename: file.name.slice(0, 300),
    ben_sizekb: Math.max(1, Math.ceil(file.size / 1024)),
  } as never);
  const id = made.data?.ben_ltkattachmentid;
  if (made.success === false || id === undefined) throw new Error(made.error?.message ?? "the attachment's row could not be created");
  let refused = "";
  try {
    const up = await writing(TOPIC, Ben_ltkattachmentsService.upload(id, "ben_file", file, file.name));
    if (up.success === false) refused = up.error?.message ?? "the upload was refused";
  } catch (e) {
    refused = e instanceof Error ? e.message : String(e);
  }
  if (refused !== "") {
    await writing(TOPIC, Ben_ltkattachmentsService.delete(id)).catch(() => undefined);
    throw new Error(refused);
  }
}

export async function removeAttachment(a: Attachment): Promise<void> {
  await writing(TOPIC, Ben_ltkattachmentsService.delete(a.rowId));
}

/** Change an attachment's caption (programme E2, 2026-11-25) — it could
 *  only be set as a link was added, and a file had none. "" clears it:
 *  the row then reads by its file name or its address again. */
export async function renameAttachment(a: Attachment, caption: string): Promise<void> {
  const next = cleanCaption(caption);
  await writing(TOPIC, Ben_ltkattachmentsService.update(a.rowId, { ben_caption: next, ben_name: (next || a.fileName || a.url).slice(0, 300) } as never));
}

/** A file's bytes as a blob of its own type — the download's, and the
 *  image viewer's. */
export async function attachmentBlob(a: Attachment): Promise<Blob> {
  const [{ getClient }, { dataSourcesInfo }] = await Promise.all([import("@microsoft/power-apps/data"), import("../../.power/schemas/appschemas/dataSourcesInfo")]);
  const down = await getClient(dataSourcesInfo).downloadFileFromRecord("ben_ltkattachments", a.rowId, "ben_file");
  if (down.success === false || !(down.data instanceof Uint8Array)) throw new Error(down.error?.message ?? "the file could not be read");
  return new Blob([down.data as BlobPart], { type: mimeFor(a.fileName) });
}

/** A file's bytes, handed to the browser as a download. */
export async function downloadAttachment(a: Attachment, blob?: Blob): Promise<void> {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob ?? (await attachmentBlob(a)));
  link.download = a.fileName !== "" ? a.fileName : "attachment";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}
