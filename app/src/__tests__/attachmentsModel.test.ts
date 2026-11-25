// Attachment captions and the image viewer (programme E2, 2026-11-25).

import { describe, expect, it } from "vitest";

describe("captions and previews (programme E2, 2026-11-25)", () => {
  it("an image a browser can draw opens in the viewer; everything else downloads", async () => {
    const { previewable } = await import("../attachments/model");
    for (const name of ["a.jpg", "b.JPEG", "c.png", "d.gif", "e.webp"]) expect(previewable({ kind: "file", fileName: name })).toBe(true);
    for (const name of ["f.pdf", "g.heic", "h.docx", "noext", "i.svg"]) expect(previewable({ kind: "file", fileName: name })).toBe(false);
    // a link is never a picture, whatever its address ends in
    expect(previewable({ kind: "link", fileName: "x.png" })).toBe(false);
  });
  it("a caption is trimmed to its column", async () => {
    const { cleanCaption, MAX_CAPTION } = await import("../attachments/model");
    expect(cleanCaption("  Before photo  ")).toBe("Before photo");
    expect(cleanCaption("")).toBe("");
    expect(cleanCaption("x".repeat(MAX_CAPTION + 50))).toHaveLength(MAX_CAPTION);
  });
});
