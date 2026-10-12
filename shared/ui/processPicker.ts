// The ONE process picker (term-store-proposal §6): area › process ›
// sub-process as cascading selects under the site's type, any level a
// valid leaf, "—" clears. Rebuilt in place on change (no outer
// re-render). Used by the app's forms and by the MeetingWizard control,
// so the select class is the caller's (app-input / ltk-mw-input).

import { el } from "./dom";
import { ProcessLevel, ProcessTree, liveChildren, processLabel, processPath, typeOf } from "../schema/process";

export interface ProcessPickerOpts {
  tree: ProcessTree;
  /** site → type node id */
  siteTypes: Record<string, string>;
  site: string;
  /** The chosen node id ("" = none). */
  value: string;
  selectClass: string;
  disabled?: boolean;
  onChange: (nodeId: string) => void;
}

export interface ProcessPicker {
  root: HTMLElement;
  value: () => string;
  /** The site changed: a new type, the value kept only when it fits. */
  setSite: (site: string) => void;
}

const LEVEL_PLACEHOLDER: Record<ProcessLevel, string> = { 0: "", 1: "— any area —", 2: "— any process —", 3: "— any sub-process —" };

export function mountProcessPicker(host: HTMLElement, o: ProcessPickerOpts): ProcessPicker {
  const root = el("div", "ltk-procpick");
  host.appendChild(root);
  let site = o.site;
  let value = o.value;
  const typeId = () => o.siteTypes[site] ?? "";
  const paint = () => {
    root.replaceChildren();
    const t = typeId();
    if (t === "" || !o.tree.byId.has(t)) {
      root.appendChild(el("span", "ltk-procpick-none", site === "" ? "Pick a site first." : "This site has no process type (Settings → Organisation)."));
      return;
    }
    if (value !== "" && typeOf(o.tree, value) !== t) value = "";
    const path = value === "" ? [] : processPath(o.tree, value).filter((n) => n.level > 0);
    let parentId = t;
    for (let level = 1 as ProcessLevel; level <= 3; level = (level + 1) as ProcessLevel) {
      const options = liveChildren(o.tree, parentId);
      const chosen = path.find((n) => n.level === level);
      // a chosen node that is archived still shows, so the picker never hides what is set
      if (chosen && !options.some((x) => x.nodeId === chosen.nodeId)) options.push(chosen);
      if (options.length === 0) break;
      const sel = el("select", o.selectClass) as HTMLSelectElement;
      const ph = el("option", undefined, LEVEL_PLACEHOLDER[level]) as HTMLOptionElement;
      ph.value = "";
      sel.appendChild(ph);
      for (const n of options) {
        const opt = el("option", undefined, processLabel(n, site) + (n.archived ? " (archived)" : "")) as HTMLOptionElement;
        opt.value = n.nodeId;
        sel.appendChild(opt);
      }
      sel.value = chosen?.nodeId ?? "";
      sel.disabled = o.disabled === true;
      const parentForThis = parentId;
      sel.addEventListener("change", () => {
        // the deepest non-empty select is the value; a cleared level
        // falls back to its parent (the parent is a valid leaf)
        value = sel.value !== "" ? sel.value : parentForThis === t ? "" : parentForThis;
        paint();
        o.onChange(value);
      });
      root.appendChild(sel);
      if (!chosen) break;
      parentId = chosen.nodeId;
    }
  };
  paint();
  return {
    root,
    value: () => value,
    setSite: (s) => {
      site = s;
      const before = value;
      paint();
      if (value !== before) o.onChange(value);
    },
  };
}
