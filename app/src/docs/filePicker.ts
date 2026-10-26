// The app's file picker (2026-10-27): the browser's "Choose File" control
// is a plain grey UA button — against the house rule that every button
// wears .app-btn — so the input is hidden behind a drop zone in the
// issue reporter's style: drop a file, or choose one; the chosen file
// shows as a chip with its size and a ✕ to clear.

import { clear, el } from "../../../shared/ui/dom";

export interface FilePicker {
  root: HTMLElement;
  /** The chosen file, or null. */
  file: () => File | null;
  /** Clear the choice (the caller's own refusal, say). */
  reset: () => void;
  /** A line under the chip or the zone — a warning, a size note. */
  note: (text: string, warn?: boolean) => void;
}

export function buildFilePicker(opts: {
  /** The input's accept attribute (".pdf", "image/*"); "" = any. */
  accept?: string;
  /** What the zone invites, e.g. "Drop the replacement file here, or". */
  invite?: string;
  onPick: (file: File | null) => void;
}): FilePicker {
  const root = el("div", "app-docs-filepick");
  const input = el("input", "") as HTMLInputElement;
  input.type = "file";
  if ((opts.accept ?? "") !== "") input.accept = opts.accept ?? "";
  input.style.display = "none";
  const zone = el("div", "app-issue-paste app-docs-filezone", opts.invite ?? "Drop a file here, or");
  const pickBtn = el("button", "app-btn app-issue-pick", "choose a file") as HTMLButtonElement;
  pickBtn.type = "button";
  pickBtn.addEventListener("click", () => input.click());
  zone.appendChild(pickBtn);
  const chipRow = el("div", "app-docs-filechips");
  chipRow.style.display = "none";
  const noteEl = el("div", "app-field-hint app-docs-filenote");
  root.append(input, zone, chipRow, noteEl);

  let file: File | null = null;
  const paint = () => {
    clear(chipRow);
    noteEl.textContent = "";
    noteEl.classList.remove("app-docs-addstatus-warn");
    if (file === null) {
      chipRow.style.display = "none";
      zone.style.display = "";
      return;
    }
    const chip = el("span", "app-docs-pplchip app-docs-filechip");
    chip.appendChild(el("span", "app-docs-filename", file.name));
    chip.appendChild(el("span", "app-field-hint", ` · ${file.size >= 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}`));
    const off = el("button", "app-docs-pplchipx", "✕") as HTMLButtonElement;
    off.type = "button";
    off.title = "Remove this file";
    off.setAttribute("aria-label", "Remove this file");
    off.addEventListener("click", () => set(null));
    chip.appendChild(off);
    const change = el("button", "app-link app-docs-filechange", "Change…") as HTMLButtonElement;
    change.type = "button";
    change.addEventListener("click", () => input.click());
    chipRow.append(chip, change);
    chipRow.style.display = "";
    zone.style.display = "none";
  };
  const set = (f: File | null) => {
    file = f;
    input.value = "";
    paint();
    opts.onPick(file);
  };
  input.addEventListener("change", () => set(input.files?.[0] ?? null));
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("app-docs-filezone-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("app-docs-filezone-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("app-docs-filezone-over");
    const f = e.dataTransfer?.files?.[0] ?? null;
    if (f !== null) set(f);
  });
  paint();
  return {
    root,
    file: () => file,
    reset: () => set(null),
    note: (text, warn = false) => {
      noteEl.textContent = text;
      noteEl.classList.toggle("app-docs-addstatus-warn", warn);
    },
  };
}
