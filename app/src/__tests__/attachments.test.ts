// Attachments & links (issue 5, 2026-11-17) — the pure rules.
import { describe, expect, it } from "vitest";
import { attachmentMeta, attachmentTitle, cleanUrl, fileProblem, mayRemoveAttachment, mimeFor, sizeLabel, sortAttachments } from "../attachments/model";

describe("a link's address", () => {
  it("keeps a web address, adding https:// when none was typed", () => {
    expect(cleanUrl(" https://contoso.sharepoint.com/sites/x/doc.pdf ")).toBe("https://contoso.sharepoint.com/sites/x/doc.pdf");
    expect(cleanUrl("contoso.sharepoint.com/sites/x")).toBe("https://contoso.sharepoint.com/sites/x");
    expect(cleanUrl("http://localhost:5199/a")).toBe("http://localhost:5199/a");
  });
  it("refuses what is not a web address", () => {
    expect(cleanUrl("")).toBe("");
    expect(cleanUrl("javascript:alert(1)")).toBe("");
    expect(cleanUrl("file:///C:/x.docx")).toBe("");
    expect(cleanUrl("notes")).toBe("");
    expect(cleanUrl("two words.com")).toBe("");
    expect(cleanUrl("mailto:a@b.com")).toBe("");
  });
});

describe("a file", () => {
  it("is refused when empty or over the limit, with what to do instead", () => {
    expect(fileProblem({ name: "a.pdf", size: 1024 })).toBe("");
    expect(fileProblem({ name: "a.pdf", size: 30 * 1024 * 1024 })).toBe("");
    expect(fileProblem({ name: "a.pdf", size: 0 })).toBe("“a.pdf” is empty.");
    expect(fileProblem({ name: "big.mp4", size: 31 * 1024 * 1024 })).toBe("“big.mp4” is 31 MB — the limit is 30 MB. Put large files in the working folder and add a link.");
  });
  it("words its size", () => {
    expect(sizeLabel(0)).toBe("");
    expect(sizeLabel(0.4)).toBe("1 KB");
    expect(sizeLabel(840)).toBe("840 KB");
    expect(sizeLabel(2458)).toBe("2.4 MB");
    expect(sizeLabel(20480)).toBe("20 MB");
  });
  it("names a type a download opens with", () => {
    expect(mimeFor("Report.PDF")).toBe("application/pdf");
    expect(mimeFor("plan.xlsx")).toContain("spreadsheetml");
    expect(mimeFor("noext")).toBe("application/octet-stream");
  });
});

describe("the list's words", () => {
  const file = { kind: "file" as const, caption: "", fileName: "audit.pdf", url: "", byName: "Jane Smith", at: "2026-11-17T03:00:00Z", sizeKb: 840 };
  const link = { kind: "link" as const, caption: "", fileName: "", url: "https://contoso.sharepoint.com/sites/x/?id=1", byName: "Jane Smith", at: "2026-11-17T03:00:00Z", sizeKb: 0 };
  it("titles by caption, else the file's name or the link's place", () => {
    expect(attachmentTitle(file)).toBe("audit.pdf");
    expect(attachmentTitle({ ...file, caption: " The audit " })).toBe("The audit");
    expect(attachmentTitle(link)).toBe("contoso.sharepoint.com/sites/x");
    expect(attachmentTitle({ ...link, caption: "Site" })).toBe("Site");
  });
  it("says who, when and how big — and the file's name under a caption", () => {
    expect(attachmentMeta(file)).toBe("Jane Smith · 2026-11-17 · 840 KB");
    expect(attachmentMeta({ ...file, caption: "The audit" })).toBe("audit.pdf · Jane Smith · 2026-11-17 · 840 KB");
    expect(attachmentMeta(link)).toBe("Jane Smith · 2026-11-17");
  });
  it("lists newest first", () => {
    expect(sortAttachments([{ at: "2026-11-01" }, { at: "2026-11-17" }, { at: "2026-11-05" }]).map((a) => a.at)).toEqual(["2026-11-17", "2026-11-05", "2026-11-01"]);
  });
});

describe("who may remove one", () => {
  it("whoever added it, and whoever manages its parent", () => {
    expect(mayRemoveAttachment({ byId: "u1" }, { whoId: "u1", managesParent: false })).toBe(true);
    expect(mayRemoveAttachment({ byId: "u1" }, { whoId: "u2", managesParent: false })).toBe(false);
    expect(mayRemoveAttachment({ byId: "u1" }, { whoId: "u2", managesParent: true })).toBe(true);
    expect(mayRemoveAttachment({ byId: "" }, { whoId: "", managesParent: false })).toBe(false);
  });
});
