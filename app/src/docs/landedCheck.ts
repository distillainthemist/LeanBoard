// Did an upload land? (2026-11-23, the UAT re-run: "The replace landed
// wrong: 974704 bytes for 966366 sent" on every .pptx.) Pure, tested.
//
// The app checked that the size stored in SharePoint equals the bytes
// it sent, exactly. For Office files that is never true once a library
// has columns: SharePoint writes the document's properties INTO the
// file as it lands (property demotion), so the stored file is a few
// kilobytes larger. Replace content then said it had failed when it had
// worked, and Add document deleted the file it had just uploaded.
//
// The rule now: an Office file's stored size must be within a tolerance
// of what was sent; every other type must match exactly (SharePoint
// does not rewrite a PDF or an image, so a difference there is a fault).

/** The formats SharePoint's document parsers write properties into. */
export const REWRITTEN_EXTS = ["docx", "docm", "dotx", "dotm", "doc", "dot", "xlsx", "xlsm", "xlsb", "xltx", "xltm", "xls", "xlt", "pptx", "pptm", "potx", "potm", "ppsx", "ppsm", "ppt", "pot", "pps", "vsdx", "vsdm"];

/** Ben, 2026-11-23: within 10% of the size sent, or 256 KB, whichever
 *  is larger. Demotion adds kilobytes; a cut-short upload or another
 *  file entirely falls well outside. */
export const SIZE_TOLERANCE_RATIO = 0.1;
export const SIZE_TOLERANCE_BYTES = 256 * 1024;

export function isRewritten(ext: string): boolean {
  return REWRITTEN_EXTS.includes(ext.trim().replace(/^\./, "").toLowerCase());
}

/** Is the stored size what an upload of `sent` bytes should leave? */
export function sizeLanded(ext: string, sent: number, landed: number): boolean {
  if (!Number.isFinite(landed) || landed <= 0 || sent <= 0) return false;
  if (!isRewritten(ext)) return landed === sent;
  return Math.abs(landed - sent) <= Math.max(SIZE_TOLERANCE_BYTES, sent * SIZE_TOLERANCE_RATIO);
}

/** Why a check failed, for the dialog: both sizes, and for an Office
 *  file that the difference is past what SharePoint's own rewriting
 *  explains. */
export function sizeMismatchWords(ext: string, sent: number, landed: number): string {
  const base = `${landed} bytes stored for ${sent} sent`;
  return isRewritten(ext) ? `${base} — more than SharePoint's own rewriting of an Office file explains` : base;
}
