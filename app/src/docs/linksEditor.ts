// The links editor (relationships L1, revised per Ben 2026-08-13):
// linking is a PROPERTIES EDIT, so this widget lives inside the Edit
// properties dialog and contributes one form value on save — the pane
// only ever shows links. Add = a relationship choice, then a type-ahead
// search across the non-template registers (docSearch.ts); remove = ✕
// per row. Untouched = writes nothing (the dialog's empty-fields rule).

import { el, clear } from "../../../shared/ui/dom";
import { DocLibrary } from "./docsStore";
import { DOC_LINK_GROUP, DOC_LINK_RELS, DocLink, parseDocLinks, serializeDocLinks } from "./model";
import { DocSearchOpts, buildDocSearch } from "./docSearch";
import { visibleLinks, withHiddenLinks } from "./uatLibraries";

export interface LinksEditorOpts {
  site: string;
  /** Registers the picker searches (caller filters templates out). */
  libraries: DocLibrary[];
  /** The editing document's own uniqueId — never offered as a target. */
  selfUniqueId: string;
  /** The document-id role's internal name ("" = no id caching). */
  docIdInternal: string;
  /** The column's FULL current value (the dialog prefills over REST,
   *  so no feed-clipping risk). */
  initialRaw: string;
  /** The document is FLAGGED regulator-approved — the "Regulator
   *  approved copy" relationship becomes declarable (Ben, 2026-08-14). */
  offerRegulatorCopy: boolean;
  /** The search's own read, for a harness page (docSearch.ts `find`). */
  find?: DocSearchOpts["find"];
}

export interface LinksEditor {
  root: HTMLElement;
  /** The serialized value to write, or null when untouched (or when
   *  the column holds pre-linking text this editor must not clobber). */
  read: () => string | null;
}

export function buildLinksEditor(opts: LinksEditorOpts): LinksEditor {
  const root = el("div", "app-docs-linksbox");
  root.appendChild(el("div", "app-field-label", "Linked documents"));

  const parsed = parseDocLinks(opts.initialRaw);
  if (parsed === null && opts.initialRaw.trim() !== "") {
    // legacy free text predating managed links — never clobbered
    root.appendChild(
      el(
        "div",
        "app-field-hint",
        "This document's links column holds pre-linking text. It is left untouched — " +
          "managed links start once that text is moved or cleared."
      )
    );
    return { root, read: () => null };
  }

  // links into a library this viewer is not shown (UAT only) are never
  // painted — and never dropped by a save either
  const stored: DocLink[] = parsed ?? [];
  const links: DocLink[] = visibleLinks(stored);
  let changed = false;
  const listBox = el("div", "app-docs-linksbox");
  root.appendChild(listBox);

  const paint = () => {
    clear(listBox);
    for (const rel of DOC_LINK_RELS) {
      const group = links.filter((l) => l.rel === rel);
      if (group.length === 0) continue;
      listBox.appendChild(el("div", "app-docs-linkgroup", DOC_LINK_GROUP[rel]));
      for (const l of group) {
        const rowEl = el("div", "app-docs-linkrow");
        rowEl.appendChild(
          el("span", "app-docs-linkname app-docs-linkname-still", l.name !== "" ? l.name : l.uid)
        );
        if (l.docId !== "") rowEl.appendChild(el("span", "app-docs-linkdocid", l.docId));
        const rm = el("button", "app-docs-linkrm", "✕") as HTMLButtonElement;
        rm.title = "Remove this link";
        rm.addEventListener("click", () => {
          const i = links.findIndex(
            (x) => x.uid.toLowerCase() === l.uid.toLowerCase() && x.rel === l.rel
          );
          if (i >= 0) {
            links.splice(i, 1);
            changed = true;
            paint();
          }
        });
        rowEl.appendChild(rm);
        listBox.appendChild(rowEl);
      }
    }
  };
  paint();

  // ---- the inline add area (rebuilt 2026-11-23, report 9) --------------
  // The relationship FIRST, as a labelled choice; then one full-width
  // search whose list floats under it. Picking a document adds the link
  // and folds the area away.
  const addBtn = el("button", "app-btn app-docs-linkadd", "＋ Link a document…") as HTMLButtonElement;
  addBtn.type = "button";
  const addArea = el("div", "app-docs-linkaddarea");
  addArea.style.display = "none";
  root.append(addBtn, addArea);
  let rel: DocLink["rel"] = "peer";

  const relLabel = el("div", "app-field-label", "Relationship");
  relLabel.title = "How the picked document relates to this one";
  const relRow = el("div", "app-issue-kindrow");
  relRow.setAttribute("role", "radiogroup");
  relRow.setAttribute("aria-label", "Relationship");
  const offered: DocLink["rel"][] = opts.offerRegulatorCopy
    ? ["parent", "peer", "child", "regulatorCopy"]
    : ["parent", "peer", "child"];
  const relBtns = offered.map((k) => {
    const b = el(
      "button",
      "app-issue-kind",
      k === "parent"
        ? "Parent"
        : k === "peer"
          ? "Related"
          : k === "child"
            ? "Child"
            : "Regulator copy"
    ) as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(k === rel));
    b.addEventListener("click", () => {
      rel = k;
      for (const x of relBtns) {
        x.classList.toggle("app-issue-kind-on", x === b);
        x.setAttribute("aria-checked", String(x === b));
      }
    });
    relRow.appendChild(b);
    return b;
  });
  relBtns[1].classList.add("app-issue-kind-on");

  const search = buildDocSearch({
    site: opts.site,
    libraries: opts.libraries,
    docIdInternal: opts.docIdInternal,
    excludeUniqueId: opts.selfUniqueId,
    placeholder: "Search documents by name…",
    noneWords: "No documents match",
    find: opts.find,
    onPick: (hit) => {
      // the same document under the same relationship is one link
      if (!links.some((x) => x.uid.toLowerCase() === hit.uniqueId.toLowerCase() && x.rel === rel)) {
        links.push({
          uid: hit.uniqueId,
          rel,
          site: (hit.lib.siteUrl ?? "") !== "" ? hit.lib.siteUrl : opts.site,
          listId: hit.lib.listId,
          name: hit.name,
          docId: hit.docId,
        });
        changed = true;
      }
      addArea.style.display = "none";
      paint();
    },
  });
  const searchLabel = el("div", "app-field-label", "Document");
  addArea.append(relLabel, relRow, searchLabel, search.el);
  addBtn.addEventListener("click", () => {
    addArea.style.display = addArea.style.display === "none" ? "" : "none";
    if (addArea.style.display === "") search.input.focus();
  });

  return { root, read: () => (changed ? serializeDocLinks(withHiddenLinks(stored, links)) : null) };
}
