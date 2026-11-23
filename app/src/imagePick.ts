// What a screenshot picker takes (2026-11-23, report 3). A HEIC photo
// from a phone arrives with no type at all, was dropped without a word,
// and could not have been drawn anyway — so it is refused by name, with
// what to do instead. Pure: no DOM beyond the File the caller holds.

/** The chooser's filter: the four formats every browser draws. */
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp";

const BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};
const HEIC = new Set(["heic", "heif"]);

const extOf = (name: string): string => {
  const at = name.lastIndexOf(".");
  return at >= 0 ? name.slice(at + 1).trim().toLowerCase() : "";
};

/** Whether a chosen file is an image this app can show: the type to
 *  carry (the browser's, else the extension's), or why not. */
export function imageVerdict(name: string, type: string): { ok: true; type: string } | { ok: false; why: string } {
  const ext = extOf(name);
  const t = type.trim().toLowerCase();
  if (HEIC.has(ext) || t === "image/heic" || t === "image/heif") {
    return { ok: false, why: `HEIC photos can't be shown here: ${name}. Use a JPG or PNG, or paste a screenshot.` };
  }
  if (Object.values(BY_EXT).includes(t)) return { ok: true, type: t };
  // no type from the browser (or a vague one): the extension decides
  if ((t === "" || t === "application/octet-stream") && BY_EXT[ext] !== undefined) return { ok: true, type: BY_EXT[ext] };
  // another image type the browser itself vouches for (bmp, svg, avif)
  if (t.startsWith("image/")) return { ok: true, type: t };
  return { ok: false, why: `That file is not an image: ${name}` };
}

/** The file to keep: itself, or re-typed when the browser gave none. */
export function typedImage(f: File, type: string): File {
  return f.type === type ? f : new File([f], f.name, { type, lastModified: f.lastModified });
}
