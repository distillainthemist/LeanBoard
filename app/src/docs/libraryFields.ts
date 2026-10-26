// The library's live columns with BOTH of SharePoint's required flags
// folded in: the list field's own, and the content types' field links
// (a column made required through the content type reports
// `Required: false` on the field — the form never marked it, and the
// check-in refused the upload afterwards; Ben, 2026-10-26). Every form
// that marks, validates or pre-flights required columns reads from here.
import { SpField, fieldsFromResponse } from "./model";
import { fetchContentTypeRequired, fetchFields } from "./sp";

export async function loadLibraryFields(
  site: string,
  listId: string
): Promise<{ ok: boolean; status: string; fields: SpField[] }> {
  const [fr, ctRequired] = await Promise.all([fetchFields(site, listId), fetchContentTypeRequired(site, listId)]);
  const fields = fr.ok ? fieldsFromResponse(fr.data) : [];
  return {
    ok: fr.ok,
    status: fr.status,
    fields: fields.map((f) => (!f.required && ctRequired.has(f.internal) ? { ...f, required: true } : f)),
  };
}
