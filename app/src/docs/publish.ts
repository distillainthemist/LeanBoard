// Publishing a reader-facing change on a moderated library (CA1). The
// file's own Approve road carries the step's comment onto the version
// it publishes; the forms engine is the fallback when that road is
// refused (a library without the file approve door, a permission gap)
// — it publishes too, but records a comment-less major (2026-10-26,
// UAT DOC-031: "comments not captured").
import { validateItemErrors } from "./model";
import { approveFile, validateUpdateListItem } from "./sp";

export async function publishReaderFacing(
  site: string,
  listId: string,
  itemId: number,
  serverUrl: string,
  comment: string
): Promise<{ ok: boolean; status: string; data: null; road: "approve" | "forms" | "" }> {
  const text = comment.trim() !== "" ? comment.trim() : "Published";
  const a = await approveFile(site, serverUrl, text).catch(() => ({ ok: false, status: "", data: null }));
  if (a.ok) return { ok: true, status: "", data: null, road: "approve" };
  const pub = await validateUpdateListItem(site, listId, itemId, [{ FieldName: "_ModerationStatus", FieldValue: "0" }], false);
  const errs = validateItemErrors(pub.data);
  if (pub.ok && errs.length === 0) return { ok: true, status: "", data: null, road: "forms" };
  return { ok: false, status: errs.map((e) => `${e.field}: ${e.message}`).join("; ") || pub.status || a.status, data: null, road: "" };
}
