// The term manager (term-store-proposal-2026-10.md §3, built 2026-10-12):
// a full-screen sheet for ONE term set — the tree on the left (collapsible,
// searchable), the selected term on the right: a row per working
// language (the default label and its synonyms), the description, the
// id, where it is used (a search count), Save, ＋ Add child, Delete.
//
// Rename = edit the default label; the GUID, and so every tag, is kept.
// Delete is offered only for a term with no children and a usage count
// of zero. There is no move: the term store's API has none. On a set the
// app syncs (the Organisation set) the STRUCTURE is locked — names,
// adds and deletes belong to the Organisation editor and the sync —
// while synonyms, translations and descriptions, which the app does not
// hold, stay editable here. Every write invalidates the walk cache.

import { clear, el } from "../../../shared/ui/dom";
import { markDialog, trapFocus } from "../../../shared/ui/focusTrap";
import { promptConfirm, promptText } from "../prompts";
import {
  createTerm,
  deleteTerm,
  fetchTermDetail,
  fetchTermPaths,
  fetchTermStoreLanguages,
  invalidateTermPaths,
  patchTerm,
} from "./sp";
import { searchPage } from "./data";
import { spErrorText } from "./model";
import { taxonomySearchProperty } from "./rows";
import { LanguageLabels, TermLabel, TreeNode, buildTree, composeLabels, labelsByLanguage, nodeLabel, visibleIds } from "./termManagerModel";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export interface TermManagerOpts {
  site: string;
  setId: string;
  setName: string;
  /** The app syncs this set: structure read-only here. */
  structureLocked: boolean;
  /** The site columns reading this set — the usage count searches them. */
  columnsUsingSet: string[];
  /** The exposed libraries the usage count may search. */
  listIds: string[];
  /** Called after any write, so the caller can repaint its own lists. */
  onChanged?: () => void;
  /** Colours (Ben, 2026-10-12: set here, not in a separate section):
   *  the site state palette, this set's entries by term id, the built-in
   *  glyph for a label, and where a change goes (the caller saves). */
  palette?: {
    states: { key: string; label: string; color: string }[];
    entries: Record<string, { color: string; glyph: string; label?: string }>;
    glyphFor: (label: string) => string;
    onChange: (termId: string, label: string, entry: { color: string; glyph: string } | null) => void;
  };
}

export function openTermManager(o: TermManagerOpts): () => void {
  const scrim = el("div", "app-docs-scrim app-docs-scrim-right");
  const sheet = el("div", "app-docs-dialog app-docs-viewer app-ing-sheet app-tm-sheet");
  markDialog(sheet, `Term set ${o.setName}`);
  scrim.appendChild(sheet);
  document.body.appendChild(scrim);
  const untrap = trapFocus(sheet);
  let dead = false;
  let dirty = false;
  const closeNow = () => {
    dead = true;
    untrap();
    scrim.remove();
    document.removeEventListener("keydown", onKey);
  };
  const close = () => {
    if (!dirty) {
      closeNow();
      return;
    }
    void promptConfirm({ title: "Discard unsaved changes?", note: "The selected term has edits you have not saved.", confirmLabel: "Discard", danger: true }).then((ok) => {
      if (ok) closeNow();
    });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !sheet.querySelector(".ltk-dialog-overlay") && !document.querySelector(".app-modal-top")) close();
  };
  document.addEventListener("keydown", onKey);

  // ---- head -----------------------------------------------------------------
  const head = el("div", "app-docs-viewhead");
  const titleBlock = el("div", "app-docs-viewtitle");
  const titleRow = el("div", "app-ing-titlerow");
  titleRow.appendChild(el("div", "app-docs-viewdocname", o.setName || "Term set"));
  const meta = el("div", "app-ing-meta", "Loading…");
  titleBlock.append(titleRow, meta);
  head.appendChild(titleBlock);
  const headActions = el("span", "app-ing-headactions");
  const addTop = btn("＋ Add top-level term");
  addTop.disabled = true;
  if (!o.structureLocked) headActions.appendChild(addTop);
  head.appendChild(headActions);
  const closeBtn = btn("✕", "app-btn app-docs-viewclose");
  closeBtn.title = "Close";
  closeBtn.addEventListener("click", close);
  head.appendChild(closeBtn);
  sheet.appendChild(head);

  const body = el("div", "app-tm-body");
  sheet.appendChild(body);
  const left = el("div", "app-tm-tree");
  const right = el("div", "app-tm-term");
  body.append(left, right);
  right.appendChild(el("div", "app-field-hint", "Select a term to see its labels."));

  void (async () => {
    const [langRes, walk] = await Promise.all([fetchTermStoreLanguages(o.site), fetchTermPaths(o.site, o.setId, 6, 400)]);
    if (dead) return;
    const ld = (langRes.data ?? {}) as { defaultLanguageTag?: string; languageTags?: string[] };
    const defaultLang = ld.defaultLanguageTag ?? "en-US";
    const languages = Array.isArray(ld.languageTags) && ld.languageTags.length > 0 ? [defaultLang, ...ld.languageTags.filter((t) => t !== defaultLang)] : [defaultLang];
    if (walk.error !== "") {
      meta.textContent = `Could not read the set: ${walk.error}`;
      return;
    }
    let tree = buildTree(walk.nodes);
    const expanded = new Set<string>(tree.nodes.filter((n) => n.depth === 0).map((n) => n.id));
    let selectedId = "";
    let query = "";
    const paintMeta = () => {
      meta.textContent = `${tree.nodes.length} term${tree.nodes.length === 1 ? "" : "s"} · ${languages.length} language${languages.length === 1 ? "" : "s"} (${languages.join(", ")})${walk.truncated ? " · the walk was cut short — the deepest levels may be missing" : ""}${o.structureLocked ? " · structure managed by the Organisation sync" : ""}`;
    };
    paintMeta();
    addTop.disabled = false;

    // ---- the tree ---------------------------------------------------------
    const search = el("input", "app-input app-tm-search") as HTMLInputElement;
    search.type = "search";
    search.placeholder = "Find a term…";
    const list = el("div", "app-tm-list");
    left.append(search, list);
    search.addEventListener("input", () => {
      query = search.value;
      paintTree();
    });
    const paintTree = () => {
      clear(list);
      const show = visibleIds(tree.nodes, query);
      const walkDown = (parentId: string) => {
        for (const n of tree.childrenOf.get(parentId) ?? []) {
          if (show !== null && !show.has(n.id)) continue;
          const kids = (tree.childrenOf.get(n.id) ?? []).filter((k) => show === null || show.has(k.id));
          const row = el("div", "app-tm-row" + (n.id === selectedId ? " app-tm-row-on" : ""));
          row.style.paddingLeft = `${8 + n.depth * 18}px`;
          const open = show !== null || expanded.has(n.id);
          const toggle = btn(kids.length > 0 ? (open ? "▾" : "▸") : "", "app-org-toggle");
          toggle.setAttribute("aria-expanded", String(open));
          toggle.disabled = kids.length === 0;
          toggle.addEventListener("click", (e) => {
            e.stopPropagation();
            if (expanded.has(n.id)) expanded.delete(n.id);
            else expanded.add(n.id);
            paintTree();
          });
          const name = btn(nodeLabel(n), "app-link app-tm-name");
          name.addEventListener("click", () => void select(n.id));
          row.append(toggle, name);
          const colourKey = o.palette?.entries[n.id]?.color ?? "";
          if (colourKey !== "") {
            const dot = el("span", "app-tm-dot");
            dot.style.background = o.palette?.states.find((p) => p.key === colourKey)?.color ?? "transparent";
            dot.title = o.palette?.states.find((p) => p.key === colourKey)?.label ?? "";
            row.appendChild(dot);
          }
          if (kids.length > 0 && !open) row.appendChild(el("span", "app-org-summary", `${kids.length}`));
          list.appendChild(row);
          if (open) walkDown(n.id);
        }
      };
      walkDown("");
      if (list.childElementCount === 0) list.appendChild(el("div", "app-field-hint", query.trim() === "" ? "No terms yet." : `No term matches "${query.trim()}".`));
    };
    paintTree();

    // ---- the term panel ---------------------------------------------------
    const select = async (id: string) => {
      if (dirty) {
        const ok = await promptConfirm({ title: "Discard unsaved changes?", note: "The selected term has edits you have not saved.", confirmLabel: "Discard", danger: true });
        if (!ok) return;
        dirty = false;
      }
      selectedId = id;
      paintTree();
      clear(right);
      right.appendChild(el("div", "app-loading-line", "Reading the term…"));
      const r = await fetchTermDetail(o.site, o.setId, id);
      if (dead || selectedId !== id) return;
      clear(right);
      const node = tree.nodes.find((n) => n.id === id);
      if (!r.ok || !node) {
        right.appendChild(el("div", "app-cp-err", `Could not read the term: ${spErrorText(r.status)}`));
        return;
      }
      const d = r.data as { labels?: TermLabel[]; descriptions?: { languageTag?: string; description?: string }[] };
      const byLang = labelsByLanguage(Array.isArray(d.labels) ? d.labels : [], languages);
      const descriptions = new Map<string, string>();
      for (const x of Array.isArray(d.descriptions) ? d.descriptions : []) descriptions.set((x.languageTag ?? defaultLang).trim(), (x.description ?? "").trim());
      paintTerm(node, byLang, descriptions);
    };

    const paintTerm = (node: TreeNode, byLang: Map<string, LanguageLabels>, descriptions: Map<string, string>) => {
      clear(right);
      const crumb = el("div", "app-ing-meta", node.path.slice(0, -1).join(" › ") || "top level");
      const title = el("div", "app-docs-viewdocname app-tm-title", nodeLabel(node));
      right.append(crumb, title);
      const status = el("div", "app-ing-status");
      const markDirty = () => {
        dirty = true;
        saveBtn.disabled = false;
        status.textContent = "Unsaved changes.";
      };
      // one row per working language: the default label and its synonyms
      const langBox = el("div", "app-tm-langs");
      const inputsByLang = new Map<string, { name: HTMLInputElement; synonyms: string[] }>();
      for (const [tag, slot] of byLang) {
        const row = el("div", "app-tm-lang");
        const cap = el("div", "app-field-label", tag === defaultLang ? `${tag} · default language` : tag);
        const nameIn = el("input", "app-input") as HTMLInputElement;
        nameIn.value = slot.name;
        nameIn.placeholder = tag === defaultLang ? "Default label" : `Translation (${tag})`;
        nameIn.disabled = o.structureLocked && tag === defaultLang;
        nameIn.title = nameIn.disabled ? "The name is managed in Settings → Organisation and synced" : "The default label in this language";
        nameIn.addEventListener("input", markDirty);
        const chips = el("div", "app-im-links app-tm-chips");
        const synonyms = [...slot.synonyms];
        const paintChips = () => {
          clear(chips);
          synonyms.forEach((s, i) => {
            const chip = el("span", "app-im-link");
            chip.appendChild(el("span", undefined, s));
            const x = btn("×", "app-im-link-x");
            x.title = "Remove this synonym";
            x.addEventListener("click", () => {
              synonyms.splice(i, 1);
              paintChips();
              markDirty();
            });
            chip.appendChild(x);
            chips.appendChild(chip);
          });
          const adder = el("input", "app-input app-tm-synin") as HTMLInputElement;
          adder.placeholder = "＋ synonym, Enter to add";
          adder.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = adder.value.trim();
              if (v === "") return;
              synonyms.push(v);
              paintChips();
              markDirty();
              chips.querySelector<HTMLInputElement>(".app-tm-synin")?.focus();
            }
          });
          chips.appendChild(adder);
        };
        paintChips();
        inputsByLang.set(tag, { name: nameIn, synonyms });
        row.append(cap, nameIn, chips);
        langBox.appendChild(row);
      }
      right.appendChild(langBox);
      // the description, in the default language
      const descCap = el("div", "app-field-label", "Description");
      const desc = el("textarea", "app-input") as HTMLTextAreaElement;
      desc.rows = 2;
      desc.value = descriptions.get(defaultLang) ?? "";
      desc.addEventListener("input", markDirty);
      right.append(descCap, desc);
      // colour and glyph (the register's chips and the cards' states key
      // on the term id, so a rename keeps them)
      if (o.palette) {
        const pal = o.palette;
        const colourRow = el("div", "app-tm-colourrow");
        colourRow.appendChild(el("div", "app-field-label", "Colour"));
        const pick = el("select", "app-input app-tm-colourpick") as HTMLSelectElement;
        const none = el("option", "", "— no colour —") as HTMLOptionElement;
        none.value = "";
        pick.appendChild(none);
        for (const p of pal.states) {
          const opt = el("option", "", p.label) as HTMLOptionElement;
          opt.value = p.key;
          pick.appendChild(opt);
        }
        pick.value = pal.entries[node.id]?.color ?? "";
        const swatch = el("span", "app-docs-statusswatch");
        const paintSwatch = () => {
          swatch.style.background = pal.states.find((p) => p.key === pick.value)?.color ?? "transparent";
        };
        paintSwatch();
        const glyph = el("input", "app-input app-docs-palglyph") as HTMLInputElement;
        glyph.maxLength = 2;
        glyph.placeholder = pal.glyphFor(nodeLabel(node)) || "—";
        glyph.value = pal.entries[node.id]?.glyph ?? "";
        glyph.title = "Shown before the value; blank uses the built-in match";
        const write = () => {
          const label = nodeLabel(node);
          if (pick.value === "" && glyph.value.trim() === "") pal.onChange(node.id, label, null);
          else pal.onChange(node.id, label, { color: pick.value, glyph: glyph.value.trim() });
          paintSwatch();
          paintTree();
        };
        pick.addEventListener("change", write);
        glyph.addEventListener("input", write);
        const line = el("div", "app-tm-colourline");
        line.append(pick, swatch, glyph, el("span", "app-field-hint", "Saved with Settings → Save."));
        colourRow.appendChild(line);
        right.appendChild(colourRow);
      }
      // the id — colours and filters key on it
      const idRow = el("div", "app-tm-idrow");
      idRow.appendChild(el("span", "app-field-hint", `Term id ${node.id}`));
      const copy = btn("Copy", "app-link");
      copy.addEventListener("click", () => {
        void navigator.clipboard?.writeText(node.id).then(() => (copy.textContent = "Copied"));
      });
      idRow.appendChild(copy);
      right.appendChild(idRow);
      // usage: a search count over the columns reading this set
      const useRow = el("div", "app-tm-userow");
      const useBtn = btn("Count usage");
      const useText = el("span", "app-field-hint", o.columnsUsingSet.length === 0 ? "No column reads this set, so nothing can be tagged with it." : "");
      let usage: number | null = o.columnsUsingSet.length === 0 ? 0 : null;
      useBtn.disabled = o.columnsUsingSet.length === 0 || o.listIds.length === 0;
      useBtn.addEventListener("click", () => {
        void (async () => {
          useBtn.disabled = true;
          useText.textContent = "Searching…";
          const r = await searchPage(o.site, "", { listIds: o.listIds, rowLimit: 1, termFilters: [{ properties: o.columnsUsingSet.map(taxonomySearchProperty), termIds: [node.id] }] });
          useBtn.disabled = false;
          if (r.error !== "") {
            useText.textContent = `The search failed: ${r.error.slice(0, 160)}`;
            return;
          }
          usage = r.total;
          useText.textContent = r.total === 0 ? "No document is tagged with this term (as far as the search index knows)." : `${r.total} document${r.total === 1 ? "" : "s"} tagged with this term.`;
          paintDelete();
        })();
      });
      useRow.append(useBtn, useText);
      right.appendChild(useRow);
      // ---- actions --------------------------------------------------------
      const bar = el("div", "app-tm-bar");
      const saveBtn = btn("Save term", "app-btn app-btn-primary");
      saveBtn.disabled = true;
      saveBtn.addEventListener("click", () => {
        void (async () => {
          const next = new Map<string, LanguageLabels>();
          for (const [tag, inp] of inputsByLang) next.set(tag, { name: inp.name.value, synonyms: inp.synonyms });
          const labels = composeLabels(next);
          if (labels.length === 0) {
            status.textContent = "A term needs a default label in at least one language.";
            return;
          }
          const descs = [...descriptions.entries()].filter(([tag]) => tag !== defaultLang).map(([languageTag, description]) => ({ languageTag, description }));
          if (desc.value.trim() !== "") descs.push({ languageTag: defaultLang, description: desc.value.trim() });
          saveBtn.disabled = true;
          status.textContent = "Saving…";
          const r = await patchTerm(o.site, o.setId, node.id, { labels, descriptions: descs });
          if (!r.ok) {
            status.textContent = `The save was refused: ${spErrorText(r.status)}`;
            saveBtn.disabled = false;
            return;
          }
          dirty = false;
          invalidateTermPaths();
          // the tree shows the default label of the store's language
          const newName = labels.find((l) => l.isDefault && l.languageTag === defaultLang)?.name ?? labels.find((l) => l.isDefault)?.name ?? nodeLabel(node);
          if (newName !== nodeLabel(node)) {
            const oldPath = node.path;
            for (const n of tree.nodes) {
              if (n.id === node.id || (n.path.length > oldPath.length && oldPath.every((s, i) => n.path[i] === s) && n.path.slice(0, oldPath.length).join("¦") === oldPath.join("¦"))) {
                n.path = [...oldPath.slice(0, -1), newName, ...n.path.slice(oldPath.length)];
              }
            }
            title.textContent = newName;
            paintTree();
          }
          status.textContent = "Saved.";
          o.onChanged?.();
        })();
      });
      bar.appendChild(saveBtn);
      if (!o.structureLocked) {
        const addChild = btn("＋ Add child");
        addChild.addEventListener("click", () => void addTerm(node.id, node.path));
        bar.appendChild(addChild);
      }
      const del = btn("Delete…", "app-btn app-btn-danger");
      const paintDelete = () => {
        const kids = (tree.childrenOf.get(node.id) ?? []).length;
        const may = !o.structureLocked && kids === 0 && usage === 0;
        del.disabled = !may;
        del.title = o.structureLocked ? "Structure is managed by the Organisation sync" : kids > 0 ? "Delete its children first" : usage === null ? "Count usage first — only an unused term can be deleted" : usage > 0 ? "Documents are tagged with this term" : "Delete this term";
      };
      paintDelete();
      del.addEventListener("click", () => {
        void (async () => {
          const ok = await promptConfirm({ title: `Delete "${nodeLabel(node)}"?`, note: "The search index said no document carries it. A tag applied since the index last crawled would lose its term; a palette colour keyed to it is dropped.", confirmLabel: "Delete", danger: true });
          if (!ok) return;
          const r = await deleteTerm(o.site, o.setId, node.id);
          if (!r.ok) {
            status.textContent = `The delete was refused: ${spErrorText(r.status)}`;
            return;
          }
          invalidateTermPaths();
          tree = buildTree(tree.nodes.filter((n) => n.id !== node.id).map((n) => ({ id: n.id, labels: n.path })));
          selectedId = "";
          dirty = false;
          paintMeta();
          paintTree();
          clear(right);
          right.appendChild(el("div", "app-field-hint", `"${nodeLabel(node)}" was deleted.`));
          o.onChanged?.();
        })();
      });
      if (!o.structureLocked) bar.appendChild(del);
      right.append(bar, status);
      if (o.structureLocked) right.appendChild(el("div", "app-field-hint", "This set mirrors the organisation: names, new terms and deletions come from Settings → Organisation and the sync. Synonyms, translations and the description are yours to edit here."));
    };

    // ---- add a term -------------------------------------------------------
    const addTerm = async (parentId: string, parentPath: string[]) => {
      const name = await promptText({ title: parentId === "" ? "New top-level term" : `New term under "${parentPath[parentPath.length - 1]}"`, placeholder: "Name", required: "A name is needed.", confirmLabel: "Add" });
      if (name === null || dead) return;
      const r = await createTerm(o.site, o.setId, parentId, name.trim(), defaultLang);
      if (!r.ok) {
        meta.textContent = `The term could not be created: ${spErrorText(r.status)}`;
        return;
      }
      const id = String((r.data as { id?: unknown } | null)?.id ?? "");
      invalidateTermPaths();
      tree = buildTree([...tree.nodes.map((n) => ({ id: n.id, labels: n.path })), { id: id || `new-${Date.now()}`, labels: [...parentPath, name.trim()] }]);
      if (parentId !== "") expanded.add(parentId);
      paintMeta();
      paintTree();
      o.onChanged?.();
      if (id !== "") void select(id);
    };
    addTop.addEventListener("click", () => void addTerm("", []));
  })().catch((e) => {
    meta.textContent = `Could not open the set: ${e instanceof Error ? e.message : String(e)}`;
  });
  return close;
}
