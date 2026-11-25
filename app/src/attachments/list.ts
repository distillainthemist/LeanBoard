// Attachments & links (issue 5, 2026-11-17) — the list, wherever a
// parent shows it: an initiative's details pane, the action dialog. Add
// a file (picked, or dropped on the block) or a link; open or download;
// remove. Data in the store (store/attachments.ts), rules in model.ts.

import { el, clear, onEscape } from "../../../shared/ui/dom";
import { confirmRemoval } from "../prompts";
import { fileTypeChip } from "../../../shared/ui/format";
import { Attachment, AttachmentParent, attachmentMeta, attachmentTitle, cleanCaption, cleanUrl, fileExt, fileProblem, MAX_ATTACHMENT_MB, MAX_CAPTION, mayRemoveAttachment, previewable } from "./model";

export interface AttachmentsOpts {
  host: HTMLElement;
  parent: AttachmentParent;
  actor: { whoId: string; who: string };
  /** May add: the initiative's people and admins; whoever may edit the action. */
  canAdd: boolean;
  /** Manages the parent — may remove anyone's attachment, not only their own. */
  managesParent: boolean;
  /** The block's heading. */
  heading?: string;
  /** The count changed (a header chip follows it). */
  onCount?: (n: number) => void;
}

export interface AttachmentsHandle {
  refresh: () => Promise<void>;
  teardown: () => void;
}

/** An image attachment in a viewer inside the app (programme E2,
 *  2026-11-25): the picture, its name, Download and Close. A viewer, not
 *  a form — Escape or a click beside it closes it. The bytes are already
 *  here, so Download hands over the same blob. */
/** A blob as a `data:` address. The player's content policy refuses a
 *  `blob:` address as a picture's source, so the viewer never uses one. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("the picture could not be read"));
    reader.readAsDataURL(blob);
  });
}

function showImage(a: Attachment, blob: Blob, url: string, download: (blob: Blob) => Promise<void>): void {
  const overlay = el("div", "app-modal-overlay app-modal-top app-att-viewer");
  const box = el("div", "app-modal app-att-viewerbox");
  const head = el("div", "app-att-viewerhead");
  head.appendChild(el("div", "app-modal-title", attachmentTitle(a)));
  const tools = el("div", "app-att-viewertools");
  const save = el("button", "app-btn", "Download") as HTMLButtonElement;
  save.type = "button";
  save.addEventListener("click", () => void download(blob));
  const shut = el("button", "app-btn app-btn-primary", "Close") as HTMLButtonElement;
  shut.type = "button";
  tools.append(save, shut);
  head.appendChild(tools);
  const img = el("img", "app-att-viewerimg") as HTMLImageElement;
  img.alt = attachmentTitle(a);
  const stage = el("div", "app-att-viewerstage");
  img.addEventListener("error", () => {
    // never a broken picture: say so, and Download still works
    img.remove();
    stage.appendChild(el("div", "app-cp-muted app-att-viewernone", "This picture cannot be shown here. Download it to open it."));
  });
  img.src = url;
  stage.appendChild(img);
  box.append(head, stage);
  overlay.appendChild(box);
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    // the viewer's alone: the dialog underneath stays open
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  document.addEventListener("keydown", onKey, true);
  shut.addEventListener("click", close);
  overlay.addEventListener("pointerdown", (e) => {
    if (e.target === overlay) close();
  });
  document.body.appendChild(overlay);
  shut.focus();
}

const btn = (label: string, cls = "app-link"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export function mountAttachments(o: AttachmentsOpts): AttachmentsHandle {
  const wrap = el("div", "app-att");
  o.host.appendChild(wrap);
  let dead = false;
  let list: Attachment[] = [];
  let busy = "";
  let error = "";
  let linkOpen = false;
  /** The row whose caption is being edited (its row id), or null. */
  let renaming: string | null = null;

  const head = el("div", "app-att-head");
  const title = el("span", "app-att-title", o.heading ?? "Attachments & links");
  head.appendChild(title);
  // "＋ Add file" and "＋ Add link" sit together on one line UNDER the
  // heading (Ben, 2026-11-17: beside it, the second wrapped away alone)
  const adds = el("div", "app-att-adds");
  const picker = el("input") as HTMLInputElement;
  picker.type = "file";
  picker.multiple = true;
  picker.style.display = "none";
  const addFile = btn("＋ Add file");
  addFile.title = `Attach a file (up to ${MAX_ATTACHMENT_MB} MB each) — or drop files here`;
  addFile.addEventListener("click", () => picker.click());
  const addLink = btn("＋ Add link");
  addLink.title = "Attach a link to a document, a folder or a page";
  addLink.addEventListener("click", () => {
    linkOpen = true;
    paint();
  });
  if (o.canAdd) adds.append(addFile, addLink, picker);
  const status = el("div", "app-att-status");
  const linkForm = el("div", "app-att-linkform");
  const rows = el("div", "app-att-rows");
  wrap.append(head, adds, status, linkForm, rows);
  if (!o.canAdd) adds.style.display = "none";

  const load = async () => {
    try {
      const { listAttachments } = await import("../store/attachments");
      const got = await listAttachments(o.parent);
      if (dead) return;
      list = got;
      o.onCount?.(list.length);
    } catch (e) {
      if (dead) return;
      error = `The attachments could not be read: ${e instanceof Error ? e.message : String(e)}`;
    }
    paint();
  };

  const upload = async (files: File[]) => {
    if (files.length === 0 || busy !== "") return;
    error = "";
    const problems: string[] = [];
    const { addFileAttachment } = await import("../store/attachments");
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const why = fileProblem(file);
      if (why !== "") {
        problems.push(why);
        continue;
      }
      busy = files.length > 1 ? `Uploading ${i + 1} of ${files.length}: ${file.name}…` : `Uploading ${file.name}…`;
      paint();
      try {
        await addFileAttachment(o.parent, file, "", o.actor);
      } catch (e) {
        problems.push(`“${file.name}” was not attached: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (dead) return;
    }
    busy = "";
    error = problems.join(" ");
    await load();
  };
  picker.addEventListener("change", () => {
    const files = Array.from(picker.files ?? []);
    picker.value = "";
    void upload(files);
  });
  if (o.canAdd) {
    // files dropped on the block are attached (a drop anywhere else in
    // the app is the browser's own business)
    wrap.addEventListener("dragover", (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      wrap.classList.add("app-att-over");
    });
    wrap.addEventListener("dragleave", () => wrap.classList.remove("app-att-over"));
    wrap.addEventListener("drop", (e) => {
      wrap.classList.remove("app-att-over");
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      void upload(files);
    });
  }

  const paintLinkForm = () => {
    clear(linkForm);
    linkForm.style.display = linkOpen ? "" : "none";
    if (!linkOpen) return;
    const url = el("input", "app-input") as HTMLInputElement;
    url.type = "url";
    url.placeholder = "Link — https://…";
    url.setAttribute("aria-label", "Link address");
    const cap = el("input", "app-input") as HTMLInputElement;
    cap.type = "text";
    cap.placeholder = "What it is (optional)";
    cap.maxLength = MAX_CAPTION;
    cap.setAttribute("aria-label", "What the link is");
    const err = el("div", "app-cp-err", "");
    const save = btn("Add link", "app-btn app-btn-primary");
    const cancel = btn("Cancel");
    const go = () => {
      const clean = cleanUrl(url.value);
      if (clean === "") {
        err.textContent = "That does not read as a web address. Paste the whole link, starting https://";
        url.focus();
        return;
      }
      save.disabled = true;
      void (async () => {
        try {
          const { addLinkAttachment } = await import("../store/attachments");
          await addLinkAttachment(o.parent, clean, cap.value, o.actor);
          linkOpen = false;
          error = "";
          await load();
        } catch (e) {
          save.disabled = false;
          err.textContent = `The link was not saved: ${e instanceof Error ? e.message : String(e)}`;
        }
      })();
    };
    save.addEventListener("click", go);
    for (const input of [url, cap]) {
      input.addEventListener("keydown", (e) => {
        // never the form around it: Enter adds the link
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.stopPropagation();
        go();
      });
    }
    cancel.addEventListener("click", () => {
      linkOpen = false;
      paint();
    });
    const row = el("div", "app-att-linkrow");
    row.append(url, cap, save, cancel);
    linkForm.append(row, err);
    url.focus();
  };

  const paint = () => {
    if (dead) return;
    title.textContent = `${o.heading ?? "Attachments & links"}${list.length > 0 ? ` · ${list.length}` : ""}`;
    addFile.disabled = busy !== "";
    status.textContent = busy !== "" ? busy : error;
    status.className = "app-att-status" + (busy === "" && error !== "" ? " app-att-status-err" : "");
    status.style.display = busy !== "" || error !== "" ? "" : "none";
    paintLinkForm();
    clear(rows);
    if (list.length === 0) {
      rows.appendChild(el("div", "app-cp-muted app-att-none", o.canAdd ? "Nothing attached yet. Add a file or a link, or drop files here." : "Nothing attached."));
      return;
    }
    for (const a of list) {
      const row = el("div", "app-att-row");
      // the document register's own type chip (PDF, DOCX, XLSX…), and
      // LINK for a link — never a generic page icon (Ben, 2026-11-17)
      const chip = fileTypeChip(a.kind === "file" ? fileExt(a.fileName) : "link");
      chip.classList.add("app-att-chip");
      row.appendChild(chip);
      const main = el("div", "app-att-main");
      const mayChange = mayRemoveAttachment(a, { whoId: o.actor.whoId, managesParent: o.managesParent });
      if (renaming === a.rowId) {
        // the caption, edited in place (programme E2): Enter saves,
        // Escape leaves it; emptied, the row reads by its file name again
        const box = el("input", "app-input app-att-rename") as HTMLInputElement;
        box.value = a.caption;
        box.maxLength = MAX_CAPTION;
        box.placeholder = a.kind === "file" ? a.fileName : a.url;
        box.setAttribute("aria-label", "Caption");
        const done = (save: boolean) => {
          if (renaming !== a.rowId) return;
          renaming = null;
          const next = cleanCaption(box.value);
          if (!save || next === a.caption) {
            paint();
            return;
          }
          void (async () => {
            try {
              const { renameAttachment } = await import("../store/attachments");
              await renameAttachment(a, next);
              error = "";
            } catch (e) {
              error = `The caption could not be saved: ${e instanceof Error ? e.message : String(e)}`;
            }
            await load();
          })();
        };
        box.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          e.stopPropagation();
          done(true);
        });
        onEscape(box, () => {
          done(false);
          return true;
        });
        box.addEventListener("blur", () => done(true));
        main.appendChild(box);
        setTimeout(() => {
          box.focus();
          box.select();
        }, 0);
      } else if (a.kind === "link") {
        const link = el("a", "app-att-name", attachmentTitle(a)) as HTMLAnchorElement;
        link.href = a.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = `Open in a new tab\n${a.url}`;
        main.appendChild(link);
      } else {
        const open = btn(attachmentTitle(a), "app-link app-att-name");
        // an image opens in the app's viewer; every other file downloads
        const shows = previewable(a);
        open.title = shows ? `Open ${a.fileName}` : `Download ${a.fileName}`;
        open.addEventListener("click", () => {
          open.disabled = true;
          void (async () => {
            try {
              const { attachmentBlob, downloadAttachment } = await import("../store/attachments");
              if (shows) {
                const blob = await attachmentBlob(a);
                showImage(a, blob, await blobToDataUrl(blob), (again) => downloadAttachment(a, again));
              } else await downloadAttachment(a);
              error = "";
            } catch (e) {
              error = `“${a.fileName}” could not be ${shows ? "opened" : "downloaded"}: ${e instanceof Error ? e.message : String(e)}`;
            }
            open.disabled = false;
            paint();
          })();
        });
        main.appendChild(open);
      }
      main.appendChild(el("div", "app-att-meta", attachmentMeta(a)));
      row.appendChild(main);
      if (mayChange && renaming !== a.rowId) {
        const rename = btn("Rename", "app-link app-att-rename-link");
        rename.title = a.caption !== "" ? "Change the caption" : "Give it a caption";
        rename.addEventListener("click", () => {
          renaming = a.rowId;
          paint();
        });
        row.appendChild(rename);
      }
      if (mayChange) {
        const x = btn("✕", "app-link app-att-x");
        x.title = `Remove ${attachmentTitle(a)}`;
        x.setAttribute("aria-label", x.title);
        x.addEventListener("click", () => {
          void (async () => {
            const ok = await confirmRemoval(attachmentTitle(a), a.kind === "file" ? "The file is deleted for everyone. This cannot be undone." : "The link is removed for everyone.");
            if (!ok) return;
            try {
              const { removeAttachment } = await import("../store/attachments");
              await removeAttachment(a);
              error = "";
            } catch (e) {
              error = `It could not be removed: ${e instanceof Error ? e.message : String(e)}`;
            }
            await load();
          })();
        });
        row.appendChild(x);
      }
      rows.appendChild(row);
    }
  };

  rows.appendChild(el("div", "app-cp-muted app-att-none", "Loading…"));
  void load();
  return {
    refresh: load,
    teardown: () => {
      dead = true;
      wrap.remove();
    },
  };
}
