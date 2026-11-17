// Harness stand-in for src/store/attachments (no Dataverse): an
// in-memory list with the same surface the list component uses.
import type { Attachment, AttachmentParent } from "../src/attachments/model";
let rows: Attachment[] = [
  { rowId: "r1", parent: { kind: "initiative", id: "I1" }, kind: "file", fileName: "Contractor audit — October.pdf", url: "", caption: "", sizeKb: 2458, byId: "u2", byName: "Jane Smith", at: "2026-11-10T02:00:00Z" },
  { rowId: "r2", parent: { kind: "initiative", id: "I1" }, kind: "link", fileName: "", url: "https://contoso.sharepoint.com/sites/safety/Shared%20Documents/Plan.docx", caption: "The improvement plan", sizeKb: 0, byId: "u1", byName: "Ben O'Brien", at: "2026-11-12T02:00:00Z" },
  { rowId: "r3", parent: { kind: "initiative", id: "I1" }, kind: "file", fileName: "IMG_2231.jpg", url: "", caption: "Guarding before the retrofit", sizeKb: 840, byId: "u1", byName: "Ben O'Brien", at: "2026-11-15T02:00:00Z" },
];
const pause = () => new Promise((r) => setTimeout(r, 250));
export async function listAttachments(parent: AttachmentParent): Promise<Attachment[]> {
  await pause();
  return rows.filter((r) => r.parent.kind === parent.kind && r.parent.id === parent.id).sort((a, b) => (a.at < b.at ? 1 : -1));
}
export async function addLinkAttachment(parent: AttachmentParent, url: string, caption: string, actor: { whoId: string; who: string }): Promise<void> {
  await pause();
  rows.push({ rowId: `r${rows.length + 1}`, parent, kind: "link", fileName: "", url, caption, sizeKb: 0, byId: actor.whoId, byName: actor.who, at: new Date().toISOString() });
}
export async function addFileAttachment(parent: AttachmentParent, file: File, caption: string, actor: { whoId: string; who: string }): Promise<void> {
  await pause();
  if (/refuse/i.test(file.name)) throw new Error("the upload was refused");
  rows.push({ rowId: `r${rows.length + 1}`, parent, kind: "file", fileName: file.name, url: "", caption, sizeKb: Math.ceil(file.size / 1024), byId: actor.whoId, byName: actor.who, at: new Date().toISOString() });
}
export async function removeAttachment(a: Attachment): Promise<void> {
  await pause();
  rows = rows.filter((r) => r.rowId !== a.rowId);
}
export async function downloadAttachment(a: Attachment): Promise<void> {
  console.log("download", a.fileName);
}
