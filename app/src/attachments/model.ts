// Attachments & links (issue 5, 2026-11-17) — the pure model. Evidence
// that lives WITH an initiative or an action: a file (held in the
// Dataverse row's file column) or a link, with a caption, who added it
// and when. Working documents stay in the working folder; this is for
// what must not wander off with a folder. Visibility follows the parent
// (app-level — the rows stay readable through Dataverse itself).

/** "docapproval" (2026-11-27, report 12): the evidence for an approval
 *  made on someone's behalf — its parent id is "<file id>/<version>"
 *  (docs/onBehalfModel.ts). */
export type AttachmentParentKind = "initiative" | "action" | "docapproval";

export interface AttachmentParent {
  kind: AttachmentParentKind;
  id: string;
}

export interface Attachment {
  /** The row's GUID. */
  rowId: string;
  parent: AttachmentParent;
  kind: "file" | "link";
  /** A file's name. */
  fileName: string;
  /** A link's address. */
  url: string;
  caption: string;
  sizeKb: number;
  byId: string;
  byName: string;
  /** ISO moment it was added. */
  at: string;
}

/** The biggest file an attachment takes. The column allows 32 MB; the
 *  limit said to people is a round number under it. */
export const MAX_ATTACHMENT_MB = 30;
export const MAX_CAPTION = 300;

/** Why a picked file cannot be attached; "" = it can. */
export function fileProblem(file: { name: string; size: number }): string {
  if (file.size <= 0) return `“${file.name}” is empty.`;
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) return `“${file.name}” is ${sizeLabel(Math.ceil(file.size / 1024))} — the limit is ${MAX_ATTACHMENT_MB} MB. Put large files in the working folder and add a link.`;
  return "";
}

/** A typed address as it is stored: trimmed, https:// added when no
 *  scheme was typed; "" when it is not a web address (only http and
 *  https are kept — never a script or a file path). */
export function cleanUrl(raw: string): string {
  const t = raw.trim();
  if (t === "" || /\s/.test(t)) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  if (!/^https?:\/\//i.test(withScheme)) return "";
  // a host with a dot, or localhost — "https://notes" is a typo, not a link
  const host = withScheme.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  if (host === "" || (!host.includes(".") && !/^localhost(:\d+)?$/i.test(host))) return "";
  return withScheme.slice(0, 2000);
}

/** "840 KB" / "2.4 MB". */
export function sizeLabel(kb: number): string {
  if (!Number.isFinite(kb) || kb <= 0) return "";
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  const mb = kb / 1024;
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

/** What a row is called in the list: its caption, else the file's name
 *  or the link's host. */
export function attachmentTitle(a: Pick<Attachment, "kind" | "caption" | "fileName" | "url">): string {
  if (a.caption.trim() !== "") return a.caption.trim();
  if (a.kind === "file") return a.fileName !== "" ? a.fileName : "File";
  return a.url.replace(/^https?:\/\//i, "").split(/[?#]/)[0].replace(/\/$/, "") || "Link";
}

/** "Jane Smith · 2026-11-17 · 840 KB". */
export function attachmentMeta(a: Pick<Attachment, "kind" | "caption" | "fileName" | "byName" | "at" | "sizeKb">): string {
  return [a.kind === "file" && a.caption.trim() !== "" ? a.fileName : "", a.byName, a.at.slice(0, 10), a.kind === "file" ? sizeLabel(a.sizeKb) : ""].filter((x) => x !== "").join(" · ");
}

/** Who may take an attachment off: whoever added it, and whoever
 *  manages its parent (the initiative's people and admins; whoever may
 *  edit the action). */
export function mayRemoveAttachment(a: Pick<Attachment, "byId">, viewer: { whoId: string; managesParent: boolean }): boolean {
  return viewer.managesParent || (viewer.whoId !== "" && a.byId === viewer.whoId);
}

/** The image types the app can SHOW (programme E2, 2026-11-25): what a
 *  browser draws. Everything else — a PDF, a HEIC photo — downloads. */
const PREVIEW_EXT = ["jpg", "jpeg", "png", "gif", "webp"];

/** Does a click on this attachment open it in the app's viewer? */
export function previewable(a: Pick<Attachment, "kind" | "fileName">): boolean {
  return a.kind === "file" && PREVIEW_EXT.includes(fileExt(a.fileName));
}

/** A caption as it is stored: trimmed, within the column. */
export function cleanCaption(raw: string): string {
  return raw.trim().slice(0, MAX_CAPTION);
}

/** Newest first. */
export function sortAttachments<T extends Pick<Attachment, "at">>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** A file name's extension, lower-case, no dot ("pdf"); "" when it has
 *  none — what the document register's type chip is keyed by. */
export function fileExt(fileName: string): string {
  const name = fileName.trim();
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  const ext = name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

/** A browser's type for a file name — enough for a download to open in
 *  the right app. */
export function mimeFor(fileName: string): string {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const types: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain",
    csv: "text/csv",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return types[ext] ?? "application/octet-stream";
}
