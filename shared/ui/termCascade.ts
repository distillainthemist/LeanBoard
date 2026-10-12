// A term-set walk as CASCADING selects (Ben, 2026-10-12: "always show the
// hierarchy through cascading selectors"): one select per level, the
// children of the chosen term in the next, any level a valid leaf, the
// placeholder clears back to the parent. Rebuilt in place. Used by the
// taxonomy field editors (the Organisation unit, the Process area) and
// the phone register's organisation filter.

import { el } from "./dom";

export interface TermWalkNode {
  id: string;
  /** Full label path from the set root. */
  labels: string[];
}

export interface TermCascadeOpts {
  nodes: TermWalkNode[];
  /** The chosen term id ("" = none). */
  value: string;
  selectClass: string;
  /** The placeholder per depth (0 = the top level). */
  placeholder: (depth: number) => string;
  disabled?: boolean;
  onChange: (node: TermWalkNode | null) => void;
}

export interface TermCascade {
  root: HTMLElement;
  value: () => string;
  setNodes: (nodes: TermWalkNode[]) => void;
  setValue: (termId: string) => void;
}

const key = (p: string[]) => p.map((s) => s.trim().toLowerCase()).join("¦");

export function mountTermCascade(host: HTMLElement, o: TermCascadeOpts): TermCascade {
  const root = el("div", "ltk-procpick ltk-termcascade");
  host.appendChild(root);
  let nodes = o.nodes;
  let value = o.value;
  const byId = () => new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = (prefix: string[]) => nodes.filter((n) => n.labels.length === prefix.length + 1 && key(n.labels.slice(0, -1)) === key(prefix)).sort((a, b) => a.labels[a.labels.length - 1].localeCompare(b.labels[b.labels.length - 1], undefined, { numeric: true, sensitivity: "base" }));
  const paint = () => {
    root.replaceChildren();
    const chosen = value === "" ? undefined : byId().get(value);
    const path = chosen ? chosen.labels : [];
    let prefix: string[] = [];
    for (let depth = 0; depth < 6; depth++) {
      const options = childrenOf(prefix);
      if (options.length === 0) break;
      const sel = el("select", o.selectClass) as HTMLSelectElement;
      const ph = el("option", undefined, o.placeholder(depth)) as HTMLOptionElement;
      ph.value = "";
      sel.appendChild(ph);
      const at = path.length > depth ? options.find((n) => key(n.labels) === key(path.slice(0, depth + 1))) : undefined;
      for (const n of options) {
        const opt = el("option", undefined, n.labels[n.labels.length - 1]) as HTMLOptionElement;
        opt.value = n.id;
        sel.appendChild(opt);
      }
      sel.value = at?.id ?? "";
      sel.disabled = o.disabled === true;
      const parentPrefix = prefix;
      sel.addEventListener("change", () => {
        if (sel.value !== "") value = sel.value;
        else {
          // cleared: the parent is the value (a valid leaf), or nothing at the top
          const parent = parentPrefix.length === 0 ? undefined : nodes.find((n) => key(n.labels) === key(parentPrefix));
          value = parent?.id ?? "";
        }
        paint();
        o.onChange(value === "" ? null : (byId().get(value) ?? null));
      });
      root.appendChild(sel);
      if (!at) break;
      prefix = at.labels;
    }
    if (nodes.length === 0) root.appendChild(el("span", "ltk-procpick-none", "Loading…"));
  };
  paint();
  return {
    root,
    value: () => value,
    setNodes: (n) => {
      nodes = n;
      paint();
    },
    setValue: (id) => {
      value = id;
      paint();
    },
  };
}
