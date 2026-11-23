import { describe, it, expect } from "vitest";
import { imageVerdict, IMAGE_ACCEPT } from "../imagePick";

describe("what a screenshot picker takes (2026-11-23)", () => {
  it("takes the four formats, by type or by extension when the browser gives none", () => {
    expect(imageVerdict("a.png", "image/png")).toEqual({ ok: true, type: "image/png" });
    expect(imageVerdict("Photo.JPG", "")).toEqual({ ok: true, type: "image/jpeg" });
    expect(imageVerdict("x.webp", "application/octet-stream")).toEqual({ ok: true, type: "image/webp" });
    expect(imageVerdict("pasted-1.png", "image/png").ok).toBe(true);
    // a type the browser vouches for still passes (drop of a .bmp)
    expect(imageVerdict("old.bmp", "image/bmp")).toEqual({ ok: true, type: "image/bmp" });
  });
  it("refuses a HEIC photo by name, with what to do instead", () => {
    const why = "HEIC photos can't be shown here: IMG_0042.HEIC. Use a JPG or PNG, or paste a screenshot.";
    expect(imageVerdict("IMG_0042.HEIC", "")).toEqual({ ok: false, why });
    expect(imageVerdict("IMG_0042.HEIC", "image/heic")).toEqual({ ok: false, why });
    expect(imageVerdict("a.heif", "image/heif").ok).toBe(false);
  });
  it("names any other file that is not an image", () => {
    expect(imageVerdict("notes.pdf", "application/pdf")).toEqual({ ok: false, why: "That file is not an image: notes.pdf" });
    expect(imageVerdict("noext", "")).toEqual({ ok: false, why: "That file is not an image: noext" });
  });
  it("the chooser offers JPG, PNG, GIF and WebP only", () => {
    expect(IMAGE_ACCEPT).toContain(".jpg");
    expect(IMAGE_ACCEPT).toContain("image/webp");
    expect(IMAGE_ACCEPT).not.toContain("heic");
    expect(IMAGE_ACCEPT).not.toContain("image/*");
  });
});
