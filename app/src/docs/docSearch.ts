// Search-and-pick a document (2026-11-23, report 9) — the standing
// type-ahead pattern (docs/ui-standard.md): a full-width box, the list
// floating under it with its own scroll, "Searching…" while it reads,
// a stale answer never painted over a newer one, ↑ ↓ / Enter / Escape.
// One builder for "Link a document" and Supersede's "Superseded by".

import { el, onEscape } from "../../../shared/ui/dom";
import { DocLibrary } from "./docsStore";
import { buildRenderViewXml } from "./rows";
import { renderListPage } from "./data";
import { DocSearchHit, DocSearchPage, hitSubline, mergeDocHits, unreadWords } from "./docSearchModel";

export type DocHit = DocSearchHit<DocLibrary>;

export interface DocSearchOpts {
  site: string;
  libraries: DocLibrary[];
  /** The document-id role's internal name ("" = none shown or cached). */
  docIdInternal: string;
  /** Never offered: the document being edited. */
  excludeUniqueId: string;
  placeholder: string;
  /** "No documents match" */
  noneWords: string;
  onPick: (hit: DocHit) => void;
  /** The read behind the search, one answer per library in order —
   *  SharePoint's by default; a harness page gives its own. */
  find?: (q: string) => Promise<DocSearchPage[]>;
}

const libName = (l: DocLibrary) => l.config.title || l.name;

export function buildDocSearch(o: DocSearchOpts): { el: HTMLElement; input: HTMLInputElement } {
  const input = el("input", "app-input") as HTMLInputElement;
  input.placeholder = o.placeholder;
  input.setAttribute("aria-label", o.placeholder);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.autocomplete = "off";
  const pop = el("div", "app-ta-pop app-docs-searchpop");
  pop.setAttribute("role", "listbox");
  pop.style.display = "none";
  const box = el("div", "app-ta-box app-docs-searchbox");
  box.append(input, pop);

  let options: { el: HTMLButtonElement; run: () => void }[] = [];
  let active = 0;
  let gen = 0;
  let timer = 0;
  const empty = () => {
    while (pop.firstChild) pop.removeChild(pop.firstChild);
    options = [];
  };
  const open = () => {
    pop.style.display = "";
    input.setAttribute("aria-expanded", "true");
    // at the foot of a long form the list would open below the fold
    pop.scrollIntoView?.({ block: "nearest" });
  };
  const close = () => {
    pop.style.display = "none";
    input.setAttribute("aria-expanded", "false");
  };
  const note = (words: string) => pop.appendChild(el("div", "app-ta-note", words));
  const paintActive = () => {
    options.forEach((x, n) => {
      x.el.classList.toggle("app-ta-opt-on", n === active);
      x.el.setAttribute("aria-selected", String(n === active));
    });
    options[active]?.el.scrollIntoView({ block: "nearest" });
  };

  const look = async (q: string, mine: number) => {
    const pages: DocSearchPage[] = o.find !== undefined ? await o.find(q) : await Promise.all(
      o.libraries.map((l) =>
        renderListPage(
          o.site,
          l.listId,
          buildRenderViewXml({
            nameWords: q.split(/\s+/),
            fields: o.docIdInternal !== "" ? [o.docIdInternal] : [],
            rowLimit: 6,
          })
        ).then(
          // a read that failed softly carries its error beside no rows
          (page) => ({ rows: page.rows, failed: (page.error ?? "") !== "" }),
          () => ({ rows: [], failed: true })
        )
      )
    );
    if (mine !== gen) return; // a newer search is on its way
    const { hits, unread } = mergeDocHits(o.libraries, pages, {
      exclude: o.excludeUniqueId,
      docIdInternal: o.docIdInternal,
      max: 12,
      nameOf: libName,
    });
    empty();
    for (const hit of hits) {
      const b = el("button", "app-ta-opt") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("role", "option");
      b.appendChild(el("span", "app-ta-opt-name", hit.name));
      b.appendChild(el("span", "app-ta-opt-sub", hitSubline(libName(hit.lib), hit.docId)));
      const run = () => {
        gen++;
        input.value = "";
        empty();
        close();
        o.onPick(hit);
      };
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", run);
      options.push({ el: b, run });
      pop.appendChild(b);
    }
    if (hits.length === 0 && unread.length < o.libraries.length) note(o.noneWords);
    if (unread.length > 0) note(unreadWords(unread));
    active = 0;
    open();
    paintActive();
  };

  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    const q = input.value.trim();
    const mine = ++gen;
    empty();
    if (q === "") return close();
    note("Searching…");
    open();
    timer = window.setTimeout(() => void look(q, mine), 300);
  });
  input.addEventListener("focus", () => {
    if (input.value.trim() !== "" && pop.firstChild !== null) open();
  });
  input.addEventListener("blur", () =>
    setTimeout(() => {
      if (document.activeElement !== input) close();
    }, 150)
  );
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
      paintActive();
    } else if (e.key === "Enter") {
      // never the dialog's own Save
      e.preventDefault();
      options[active]?.run();
    }
  });
  onEscape(input, () => {
    if (pop.style.display === "none") return false;
    close();
    return true;
  });
  return { el: box, input };
}
