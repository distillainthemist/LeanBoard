// Did an upload land? An Office file is rewritten by SharePoint as it
// lands, so its stored size is judged by a tolerance; every other type
// must match exactly.

import { describe, expect, it } from "vitest";
import { isRewritten, sizeLanded, sizeMismatchWords } from "../docs/landedCheck";

describe("which files SharePoint rewrites", () => {
  it("Office formats, old and new, whatever the case", () => {
    for (const e of ["pptx", "DOCX", ".xlsx", "docm", "ppt", "xls", "doc", "vsdx"]) expect(isRewritten(e)).toBe(true);
  });
  it("nothing else", () => {
    for (const e of ["pdf", "png", "jpg", "txt", "csv", "zip", "msg", ""]) expect(isRewritten(e)).toBe(false);
  });
});

describe("the stored size after an upload", () => {
  it("the UAT re-run's .pptx: 8,338 bytes larger is fine", () => {
    expect(sizeLanded("pptx", 966366, 974704)).toBe(true);
  });
  it("an Office file within 10% or 256 KB, whichever is larger, either way", () => {
    expect(sizeLanded("docx", 20000, 20000)).toBe(true);
    expect(sizeLanded("docx", 20000, 20000 + 256 * 1024)).toBe(true); // a small file: the 256 KB floor
    expect(sizeLanded("docx", 20000, 20000 + 256 * 1024 + 1)).toBe(false);
    expect(sizeLanded("xlsx", 50_000_000, 54_900_000)).toBe(true); // a large file: 10%
    expect(sizeLanded("xlsx", 50_000_000, 55_100_000)).toBe(false);
    expect(sizeLanded("pptx", 5_000_000, 4_600_000)).toBe(true);
  });
  it("an Office file cut short, or empty, is still caught", () => {
    expect(sizeLanded("pptx", 5_000_000, 2_000_000)).toBe(false);
    expect(sizeLanded("pptx", 966366, 0)).toBe(false);
    expect(sizeLanded("pptx", 966366, -1)).toBe(false);
  });
  it("every other type must match to the byte", () => {
    expect(sizeLanded("pdf", 966366, 966366)).toBe(true);
    expect(sizeLanded("pdf", 966366, 974704)).toBe(false);
    expect(sizeLanded("png", 100, 101)).toBe(false);
  });
  it("says both sizes, and for an Office file what the difference means", () => {
    expect(sizeMismatchWords("pdf", 10, 12)).toBe("12 bytes stored for 10 sent");
    expect(sizeMismatchWords("pptx", 5_000_000, 2_000_000)).toContain("more than SharePoint's own rewriting");
  });
});
