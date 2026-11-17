// Settings → Documents: a filter column's FEATURED terms (issue 7,
// 2026-11-17). An admin sets, per scope — everyone, a site, a
// department of a site — the terms that lead the column's pills in the
// register's Filters pane, in order. Each person sees their own
// department's list, else their site's, else everyone's, else the
// vocabulary's top two levels as before (docs/filterModel.ts).
//
// The editor works on a copy; Done hands the result back and the
// settings' own Save bar persists it.

import { el, clear } from "../../../shared/ui/dom";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { orgJson } from "../store/config";
import { FEATURED_ALL, FeaturedMap, featuredScopeKey, featuredScopeLabel, parseFeatured } from "./filterModel";
import { cachedTermPaths, TermNode } from "./sp";

export interface FeaturedEditorOpts {
  columnLabel: string;
  siteUrl: string;
  termSetId: string;
  featured: FeaturedMap | undefined;
  onDone: (next: FeaturedMap | undefined) => void;
}

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export function openFeaturedEditor(o: FeaturedEditorOpts): void {
  const draft: FeaturedMap = {};
  for (const [k, v] of Object.entries(o.featured ?? {})) draft[k] = [...v];
  let scope = FEATURED_ALL;
  let nodes: TermNode[] = [];
  let loaded = false;
  let failed = "";

  const overlay = el("div", "app-modal-overlay");
  const box = el("div", "app-modal");
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  // a form never closes on a click outside it (Ben, 2026-10-07)

  box.appendChild(el("div", "app-modal-title", `Featured terms — ${o.columnLabel}`));
  box.appendChild(
    el(
      "div",
      "app-modal-note",
      "The terms that lead this filter's pills in the register, in this order. Set a list for everyone, for one site, or for one department: each person sees their own department's list, else their site's, else everyone's. With no list, the top two levels of the vocabulary lead."
    )
  );

  const scopeSel = el("select", "app-input") as HTMLSelectElement;
  const scopeField = el("div", "app-field");
  scopeField.append(el("span", "app-field-label", "For"), scopeSel);
  box.appendChild(scopeField);
  const paintScopes = (keys: string[]) => {
    clear(scopeSel);
    for (const k of keys) {
      const n = draft[k]?.length ?? 0;
      const opt = el("option", "", `${featuredScopeLabel(k)}${n > 0 ? ` · ${n}` : ""}`) as HTMLOptionElement;
      opt.value = k;
      if (k === scope) opt.selected = true;
      scopeSel.appendChild(opt);
    }
  };
  let scopeKeys: string[] = [FEATURED_ALL, ...Object.keys(draft).filter((k) => k !== FEATURED_ALL)];
  paintScopes(scopeKeys);
  scopeSel.addEventListener("change", () => {
    scope = scopeSel.value;
    paint();
  });

  const rows = el("div", "app-feat-rows");
  box.appendChild(rows);

  // add a term: a type-ahead over the WHOLE vocabulary, any depth (the
  // standing search-picker pattern)
  const add = el("input", "app-input") as HTMLInputElement;
  add.type = "search";
  add.placeholder = "Add a term — type part of its name…";
  add.setAttribute("aria-label", "Add a featured term");
  add.setAttribute("role", "combobox");
  add.autocomplete = "off";
  const pop = el("div", "app-ta-pop");
  pop.setAttribute("role", "listbox");
  pop.style.display = "none";
  const addBox = el("div", "app-ta-box");
  addBox.append(add, pop);
  box.appendChild(addBox);
  let options: { el: HTMLButtonElement; run: () => void }[] = [];
  let active = 0;
  const closePop = () => {
    pop.style.display = "none";
    add.setAttribute("aria-expanded", "false");
    options = [];
  };
  const paintActive = () => {
    options.forEach((x, n) => {
      x.el.classList.toggle("app-ta-opt-on", n === active);
      x.el.setAttribute("aria-selected", String(n === active));
    });
    options[active]?.el.scrollIntoView({ block: "nearest" });
  };
  const renderPop = () => {
    clear(pop);
    options = [];
    const q = add.value.trim().toLowerCase();
    if (q === "") return closePop();
    if (!loaded) {
      pop.appendChild(el("div", "app-ta-note", failed !== "" ? failed : "Reading the vocabulary…"));
    } else {
      const taken = new Set((draft[scope] ?? []).map((id) => id.toLowerCase()));
      const hits = nodes.filter((n) => !taken.has(n.id.toLowerCase()) && n.labels[n.labels.length - 1].toLowerCase().includes(q)).slice(0, 12);
      for (const n of hits) {
        const b = btn("", "app-ta-opt");
        b.setAttribute("role", "option");
        b.appendChild(el("span", "app-ta-opt-name", n.labels[n.labels.length - 1]));
        if (n.labels.length > 1) b.appendChild(el("span", "app-ta-opt-sub", n.labels.slice(0, -1).join(" › ")));
        const run = () => {
          draft[scope] = [...(draft[scope] ?? []), n.id];
          add.value = "";
          closePop();
          paint();
          add.focus();
        };
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", run);
        options.push({ el: b, run });
        pop.appendChild(b);
      }
      if (hits.length === 0) pop.appendChild(el("div", "app-ta-note", "No term matches."));
    }
    active = 0;
    pop.style.display = "";
    add.setAttribute("aria-expanded", "true");
    paintActive();
  };
  add.addEventListener("input", renderPop);
  add.addEventListener("blur", () => setTimeout(() => {
    if (document.activeElement !== add) closePop();
  }, 150));
  add.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
      paintActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      options[active]?.run();
    } else if (e.key === "Escape" && pop.style.display !== "none") {
      e.preventDefault();
      add.value = "";
      closePop();
    }
  });

  const paint = () => {
    clear(rows);
    const ids = draft[scope] ?? [];
    if (ids.length === 0) {
      rows.appendChild(
        el("div", "app-field-hint", scope === FEATURED_ALL ? "No list for everyone — the top two levels lead unless a site or a department has its own list." : `No list for ${featuredScopeLabel(scope)} — they see the list of the level above.`)
      );
    }
    ids.forEach((id, i) => {
      const node = nodes.find((n) => n.id.toLowerCase() === id.toLowerCase());
      const row = el("div", "app-feat-row");
      const label = el("div", "app-feat-row-label");
      label.appendChild(el("div", undefined, node ? node.labels[node.labels.length - 1] : loaded ? "A term that is no longer in the vocabulary" : "…"));
      if (node && node.labels.length > 1) label.appendChild(el("div", "app-feat-row-path", node.labels.slice(0, -1).join(" › ")));
      row.appendChild(label);
      const move = (dir: -1 | 1, glyph: string) => {
        const b = btn(glyph, "app-docs-movebtn");
        b.disabled = dir === -1 ? i === 0 : i === ids.length - 1;
        b.setAttribute("aria-label", `Move ${dir === -1 ? "up" : "down"}`);
        b.addEventListener("click", () => {
          const list = [...ids];
          const [it] = list.splice(i, 1);
          list.splice(i + dir, 0, it);
          draft[scope] = list;
          paint();
        });
        return b;
      };
      const x = btn("✕", "app-link");
      x.title = "Take it off the list";
      x.setAttribute("aria-label", x.title);
      x.addEventListener("click", () => {
        draft[scope] = ids.filter((_, n) => n !== i);
        paint();
      });
      row.append(move(-1, "↑"), move(1, "↓"), x);
      rows.appendChild(row);
    });
    paintScopes(scopeKeys);
  };

  const footer = el("div", "app-modal-footer");
  const cancel = btn("Cancel", "app-link");
  cancel.addEventListener("click", () => overlay.remove());
  const done = btn("Done", "app-btn app-btn-primary");
  done.title = "Keep these lists — Save in the settings bar writes them";
  done.addEventListener("click", () => {
    overlay.remove();
    o.onDone(parseFeatured(draft));
  });
  footer.append(cancel, done);
  box.appendChild(footer);
  paint();

  // the scopes on offer: every site and department of the organisation
  void orgJson()
    .then((raw) => {
      const keys = [FEATURED_ALL];
      for (const s of parseOrgTree(raw)) {
        keys.push(featuredScopeKey(s.site));
        for (const d of s.departments) keys.push(featuredScopeKey(s.site, d.department));
      }
      // a list kept for a scope the organisation no longer names stays editable
      for (const k of Object.keys(draft)) if (!keys.some((x) => x.toLowerCase() === k.toLowerCase())) keys.push(k);
      scopeKeys = keys;
      if (overlay.isConnected) paintScopes(scopeKeys);
    })
    .catch(() => undefined);
  void cachedTermPaths(o.siteUrl, o.termSetId, 6, 6000).then(
    (walk) => {
      nodes = walk.nodes;
      loaded = true;
      if (walk.error !== "" && nodes.length === 0) failed = "The vocabulary could not be read. Close this and try again in a minute.";
      if (overlay.isConnected) paint();
    },
    () => {
      loaded = true;
      failed = "The vocabulary could not be read. Close this and try again in a minute.";
      if (overlay.isConnected) paint();
    }
  );
}
