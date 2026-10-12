// The organisation as CASCADING selects over the priorities' OrgTree
// (Ben, 2026-10-12): company › site › department › area, each level
// optional ("Whole company / site / department"), rebuilt in place. The
// one picker for every scope and far-jump that showed a flat list.

import { el } from "../../../shared/ui/dom";
import { OrgRef, OrgLevel, orgKey, orgLevel, orgRef } from "./model";
import { OrgTree, childOrgs } from "./dialogs";

export interface OrgCascadeOpts {
  tree: OrgTree;
  value: OrgRef;
  selectClass: string;
  /** Hide the company select when there is one company. */
  hideSingleCompany?: boolean;
  /** Which nodes may be CHOSEN (every node when absent); ancestors of a
   *  choosable node always show so it can be reached. */
  allowed?: (o: OrgRef) => boolean;
  onChange: (o: OrgRef) => void;
}

export interface OrgCascade {
  root: HTMLElement;
  value: () => OrgRef;
  setValue: (o: OrgRef) => void;
}

const WHOLE: Record<OrgLevel, string> = { company: "All companies", site: "Whole company", department: "Whole site", area: "Whole department" };

export function mountOrgCascade(host: HTMLElement, o: OrgCascadeOpts): OrgCascade {
  const root = el("div", "ltk-procpick app-orgcascade");
  host.appendChild(root);
  let value = { ...o.value };
  const reachable = (n: OrgRef): boolean => {
    if (!o.allowed) return true;
    if (o.allowed(n)) return true;
    return childOrgs(o.tree, n).some(reachable);
  };
  const paint = () => {
    root.replaceChildren();
    // the company level
    const companies = o.tree.companies.map((c) => orgRef(c.name)).filter(reachable);
    const single = o.hideSingleCompany !== false && companies.length === 1;
    if (single && value.company === "") value = { ...value, company: companies[0].company };
    const levels: { level: OrgLevel; options: OrgRef[]; current: OrgRef | null }[] = [];
    if (!single) levels.push({ level: "company", options: companies, current: value.company !== "" ? orgRef(value.company) : null });
    if (value.company !== "") {
      const sites = childOrgs(o.tree, orgRef(value.company)).filter(reachable);
      levels.push({ level: "site", options: sites, current: value.site !== "" ? orgRef(value.company, value.site) : null });
      if (value.site !== "") {
        const depts = childOrgs(o.tree, orgRef(value.company, value.site)).filter(reachable);
        if (depts.length > 0) levels.push({ level: "department", options: depts, current: value.department !== "" ? orgRef(value.company, value.site, value.department) : null });
        if (value.department !== "") {
          const areas = childOrgs(o.tree, orgRef(value.company, value.site, value.department)).filter(reachable);
          if (areas.length > 0) levels.push({ level: "area", options: areas, current: value.area !== "" ? value : null });
        }
      }
    }
    for (const lv of levels) {
      if (lv.options.length === 0) continue;
      const sel = el("select", o.selectClass) as HTMLSelectElement;
      const ph = el("option", undefined, WHOLE[lv.level]) as HTMLOptionElement;
      ph.value = "";
      sel.appendChild(ph);
      for (const n of lv.options) {
        const opt = el("option", undefined, lv.level === "company" ? n.company : lv.level === "site" ? n.site : lv.level === "department" ? n.department : n.area) as HTMLOptionElement;
        opt.value = orgKey(n);
        if (o.allowed && !o.allowed(n)) opt.textContent += " ›"; // reachable, not choosable: a step down
        sel.appendChild(opt);
      }
      sel.value = lv.current ? orgKey(lv.current) : "";
      sel.addEventListener("change", () => {
        if (sel.value === "") {
          // cleared: back to the parent level
          value = lv.level === "company" ? orgRef() : lv.level === "site" ? orgRef(value.company) : lv.level === "department" ? orgRef(value.company, value.site) : orgRef(value.company, value.site, value.department);
        } else {
          const [company = "", site = "", department = "", area = ""] = sel.value.split("|");
          value = { company, site, department, area };
        }
        paint();
        o.onChange({ ...value });
      });
      root.appendChild(sel);
    }
  };
  paint();
  return { root, value: () => ({ ...value }), setValue: (v) => { value = { ...v }; paint(); } };
}

export const orgCascadeLevel = orgLevel;
