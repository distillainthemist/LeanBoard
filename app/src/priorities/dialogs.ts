// Cascaded priorities — the dialogs (design spec §9 add/edit priority,
// §2.1 org picker, §2.2 edit vision). Centred app modals; the reason
// dialogs and the cascade review list arrive with P2.

import { el, clear } from "../../../shared/ui/dom";
import type { PersonRef } from "../store/config";
import type { RosterPerson } from "../store/mappers";
import {
  OrgRef,
  Pillar,
  Priority,
  orgKey,
  orgLevel,
  orgName,
  orgParent,
  orgPath,
  orgRef,
  strategyChips,
  comparePeriods,
  lastSetUpYear,
  PeriodSettings,
  picksOf,
  pillarIdIn,
  pillarsLiveIn,
  placementsFromRows,
  SubPillarRow,
  subPillarPlan,
} from "./model";

/** The org tree as the screen sees it (from the site-settings rows). */
export interface OrgTree {
  companies: { name: string; sites: { name: string; departments: { name: string; areas: string[] }[] }[] }[];
}

/** Is this organisation still in the tree? A remembered or linked org
 *  is checked before a screen opens on it (a site renamed or archived
 *  since must fall back to home). Company level: the company exists. */
export function orgInTree(tree: OrgTree, o: { company: string; site: string; department: string; area: string }): boolean {
  const co = tree.companies.find((c) => c.name === o.company);
  if (!co) return false;
  if (o.site === "") return true;
  const site = co.sites.find((x) => x.name === o.site);
  if (!site) return false;
  if (o.department === "") return true;
  const dept = site.departments.find((d) => d.name === o.department);
  if (!dept) return false;
  return o.area === "" || dept.areas.includes(o.area);
}

export interface OrgSiteRow {
  site: string;
  departments?: { department?: string; name?: string; areas?: string[] }[];
}

/** The org tree from the site-settings rows + site→company map. */
export function buildTree(raw: string, siteCo: Record<string, string>, companyList: string[]): OrgTree {
  let rows: OrgSiteRow[] = [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) rows = arr as OrgSiteRow[];
  } catch {
    rows = [];
  }
  const companies = new Map<string, OrgTree["companies"][number]>();
  for (const c of companyList) companies.set(c, { name: c, sites: [] });
  for (const r of rows) {
    if (!r || typeof r.site !== "string" || r.site === "") continue;
    const co = siteCo[r.site] ?? "";
    if (!companies.has(co)) companies.set(co, { name: co, sites: [] });
    companies.get(co)!.sites.push({
      name: r.site,
      departments: (r.departments ?? [])
        .map((d) => ({
          name: typeof d.department === "string" ? d.department : (d.name ?? ""),
          areas: Array.isArray(d.areas) ? d.areas.filter((a) => typeof a === "string") : [],
        }))
        .filter((d) => d.name !== ""),
    });
  }
  return { companies: [...companies.values()].filter((c) => c.name !== "" || c.sites.length > 0) };
}


export function orgTreeNodes(tree: OrgTree): OrgRef[] {
  const out: OrgRef[] = [];
  for (const c of tree.companies) {
    out.push(orgRef(c.name));
    for (const s of c.sites) {
      out.push(orgRef(c.name, s.name));
      for (const d of s.departments) {
        out.push(orgRef(c.name, s.name, d.name));
        for (const a of d.areas) out.push(orgRef(c.name, s.name, d.name, a));
      }
    }
  }
  return out;
}

/** The phone's org select (mobile review M3): every node in tree
 *  order, the leaf label indented by its depth so the hierarchy reads
 *  inside a native select (which takes no markup). Pure. */
export function orgSelectOptions(tree: OrgTree): { key: string; label: string; depth: number }[] {
  const INDENT = "\u00a0\u00a0\u00a0";
  return orgTreeNodes(tree).map((o) => {
    const depth = orgPath(o).length - 1;
    return { key: orgKey(o), label: `${INDENT.repeat(depth)}${orgName(o)}`, depth };
  });
}

/** Children of a node in the tree. */
export function childOrgs(tree: OrgTree, o: OrgRef): OrgRef[] {
  const co = tree.companies.find((c) => c.name === o.company);
  if (!co) return [];
  switch (orgLevel(o)) {
    case "company":
      return co.sites.map((s) => orgRef(o.company, s.name));
    case "site": {
      const s = co.sites.find((x) => x.name === o.site);
      return (s?.departments ?? []).map((d) => orgRef(o.company, o.site, d.name));
    }
    case "department": {
      const s = co.sites.find((x) => x.name === o.site);
      const d = s?.departments.find((x) => x.name === o.department);
      return (d?.areas ?? []).map((a) => orgRef(o.company, o.site, o.department, a));
    }
    default:
      return [];
  }
}

/** Siblings of a node (including itself), for the breadcrumb dropdowns. */
export function siblingOrgs(tree: OrgTree, o: OrgRef): OrgRef[] {
  const level = orgLevel(o);
  if (level === "company") return tree.companies.map((c) => orgRef(c.name));
  const parent =
    level === "site"
      ? orgRef(o.company)
      : level === "department"
        ? orgRef(o.company, o.site)
        : orgRef(o.company, o.site, o.department);
  return childOrgs(tree, parent);
}

// ---- generic modal plumbing -----------------------------------------------

export interface ModalHandle {
  overlay: HTMLElement;
  box: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
  close: () => void;
}

export function modal(host: HTMLElement, title: string, note?: string, wide = false): ModalHandle {
  const overlay = el("div", "app-modal-overlay");
  // pinned footer: the body scrolls, the buttons stay (Ben, 2026-10-12)
  const box = el("div", "app-modal app-modal-pinned" + (wide ? " app-modal-wide" : ""));
  box.appendChild(el("div", "app-modal-title", title));
  if (note) box.appendChild(el("div", "app-modal-note", note));
  const body = el("div", "app-cp-modal-body");
  const footer = el("div", "app-modal-footer");
  box.append(body, footer);
  overlay.appendChild(box);
  host.appendChild(overlay);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  };
  document.addEventListener("keydown", onKey, true);
  // every modal built here is a form — a click outside never closes it
  // (Ben, 2026-10-07); Escape and the buttons do
  return { overlay, box, body, footer, close };
}

/** The mark of a field that must be filled: a quiet red superscript
 *  asterisk after its label (Ben, 2026-11-18 — the standing way; the
 *  primary button stays disabled until such fields are filled). */
export function requiredStar(): HTMLElement {
  const star = el("sup", "app-req-star", "*");
  star.title = "Required";
  star.setAttribute("aria-label", "required");
  return star;
}

export function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const f = el("div", "app-field");
  f.append(el("span", "app-field-label", label), control);
  if (hint) f.appendChild(el("span", "app-field-hint", hint));
  return f;
}

// ---- org picker (design spec §2.1: the DMS-style tree, for far jumps) --------

export function pickOrg(host: HTMLElement, tree: OrgTree, current: OrgRef): Promise<OrgRef | null> {
  return new Promise((resolve) => {
    const m = modal(host, "Go to an organisation", "Company › site › department › area — any level.");
    const done = (o: OrgRef | null) => {
      m.close();
      resolve(o);
    };
    // the cascade, never a flat list (Ben, 2026-10-12)
    const host2 = el("div", "app-cp-orgcascade");
    void import("./orgCascade").then(({ mountOrgCascade }) => {
      const cascade = mountOrgCascade(host2, { tree, value: current, selectClass: "app-input", hideSingleCompany: false, onChange: () => undefined });
      go.addEventListener("click", () => done(cascade.value()));
    });
    m.body.appendChild(host2);
    const go = el("button", "app-btn app-btn-primary", "Go") as HTMLButtonElement;
    go.type = "button";
    const cancel = el("button", "app-link", "Cancel") as HTMLButtonElement;
    cancel.type = "button";
    cancel.addEventListener("click", () => done(null));
    m.footer.append(cancel, go);
  });
}

// ---- edit vision ---------------------------------------------------------------

export function editVision(host: HTMLElement, org: OrgRef, current: string): Promise<string | null> {
  return new Promise((resolve) => {
    const m = modal(host, `Vision — ${orgName(org)}`, "Shown as the band across the top of this org's priorities.");
    const ta = el("textarea", "app-input app-cp-vision-ta") as HTMLTextAreaElement;
    ta.rows = 3;
    ta.value = current;
    m.body.appendChild(ta);
    const done = (v: string | null) => {
      m.close();
      resolve(v);
    };
    const cancel = el("button", "app-link", "Cancel") as HTMLButtonElement;
    cancel.type = "button";
    cancel.addEventListener("click", () => done(null));
    const save = el("button", "app-btn app-btn-primary", "Save") as HTMLButtonElement;
    save.type = "button";
    save.addEventListener("click", () => done(ta.value.trim()));
    m.footer.append(cancel, save);
    ta.focus();
  });
}

// ---- pick a person (owner) ---------------------------------------------------

/** What the owner picker offers beyond the roster (Ben, 2026-10-02). */
export interface OwnerPickerExtras {
  /** Shown first, before any search: the org's owner and the owners of
   *  its immediate children. */
  suggested?: PersonRef[];
  /** When set, a name not on the roster can be found in the directory
   *  and added to the app from here. */
  directory?: {
    search: (q: string) => Promise<{ objectId: string; displayName: string; mail: string }[]>;
    add: (hit: { objectId: string; displayName: string; mail: string }) => Promise<PersonRef>;
  };
}

/** How many letters before the directory is asked, and the pause in
 *  typing that sets the question off. */
const DIRECTORY_MIN = 3;
const DIRECTORY_PAUSE_MS = 350;

/** The directory half of a people picker, as a type-ahead (Ben,
 *  2026-11-16: typing a name, pressing "Search the directory for …",
 *  then picking was clunky — the action dialog searches by itself, and
 *  so do these). `typed` is told every keystroke; one call goes out for
 *  what is in the box once the typing pauses, and a stale answer is
 *  dropped. `render` appends the section to the picker's list. */
function directoryLookup(road: NonNullable<OwnerPickerExtras["directory"]>, repaint: () => void) {
  type Hit = { objectId: string; displayName: string; mail: string };
  let state: { q: string; status: "idle" | "busy" | "done" | "failed"; hits: Hit[]; err: string } = { q: "", status: "idle", hits: [], err: "" };
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let addErr = "";
  return {
    typed(q: string): void {
      if (timer !== null) clearTimeout(timer);
      addErr = "";
      if (q.length < DIRECTORY_MIN) {
        seq++;
        state = { q: "", status: "idle", hits: [], err: "" };
        return;
      }
      if (state.q === q && state.status !== "idle") return;
      const mine = ++seq;
      state = { q, status: "busy", hits: [], err: "" };
      timer = setTimeout(() => {
        void road.search(q).then(
          (found) => {
            if (mine !== seq) return;
            state = { q, status: "done", hits: found, err: "" };
            repaint();
          },
          (err) => {
            if (mine !== seq) return;
            state = { q, status: "failed", hits: [], err: err instanceof Error ? err.message : String(err) };
            repaint();
          }
        );
      }, DIRECTORY_PAUSE_MS);
    },
    /** `known` = who is already on the roster; `words` say what a click
     *  does; `added` receives the person once they are in the app. */
    render(list: HTMLElement, q: string, known: Set<string>, words: string, added: (p: PersonRef) => void): void {
      if (q.length < DIRECTORY_MIN) return;
      if (state.q !== q || state.status === "busy" || state.status === "idle") {
        list.appendChild(el("div", "app-settings-note", "Searching the directory…"));
        return;
      }
      if (state.status === "failed") {
        list.appendChild(el("div", "app-cp-err", `Directory search failed: ${state.err}`));
        return;
      }
      const fresh = state.hits.filter((h) => !known.has(h.objectId));
      list.appendChild(el("div", "app-cp-menu-h", "In the directory — not yet in the app"));
      if (fresh.length === 0) list.appendChild(el("div", "app-settings-note", "No one else in the directory matches."));
      for (const h of fresh) {
        const b = el("button", "app-cp-person") as HTMLButtonElement;
        b.type = "button";
        b.textContent = h.displayName;
        b.appendChild(el("span", "app-cp-person-note", `${h.mail || "no email"} · ${words}`));
        b.addEventListener("click", () => {
          b.disabled = true;
          b.textContent = `Adding ${h.displayName}…`;
          void road.add(h).then(added, (err) => {
            addErr = `Could not add them: ${err instanceof Error ? err.message : String(err)}`;
            repaint();
          });
        });
        list.appendChild(b);
      }
      if (addErr !== "") list.appendChild(el("div", "app-cp-err", addErr));
    },
  };
}

export function pickOwner(
  host: HTMLElement,
  roster: RosterPerson[],
  current: PersonRef | null,
  roleLabel = "owner",
  extra: OwnerPickerExtras = {}
): Promise<PersonRef | null | "clear"> {
  return new Promise((resolve) => {
    const m = modal(host, `Choose the ${roleLabel.toLowerCase()}`, roleLabel === "owner" ? "The person accountable for this priority." : `The person holding the ${roleLabel} role.`);
    const filter = el("input", "app-input") as HTMLInputElement;
    filter.type = "search";
    filter.placeholder = extra.directory ? "Search the app and the directory…" : extra.suggested && extra.suggested.length > 0 ? "Search the app roster…" : "Filter people…";
    const list = el("div", "app-cp-people");
    const done = (v: PersonRef | null | "clear") => {
      m.close();
      resolve(v);
    };
    const personBtn = (p: PersonRef, note = ""): HTMLButtonElement => {
      const b = el("button", "app-cp-person" + (current?.whoId === p.whoId ? " app-cp-person-on" : "")) as HTMLButtonElement;
      b.type = "button";
      b.textContent = p.who;
      if (note !== "") b.appendChild(el("span", "app-cp-person-note", note));
      b.addEventListener("click", () => done({ whoId: p.whoId, who: p.who }));
      return b;
    };
    // the suggested set shows until the person searches or asks for everyone
    let browsing = false;
    const lookup = extra.directory ? directoryLookup(extra.directory, () => paint()) : null;
    const suggested = (extra.suggested ?? []).filter((p, i, all) => p.whoId !== "" && all.findIndex((x) => x.whoId === p.whoId) === i);
    const paint = () => {
      clear(list);
      const q = filter.value.trim().toLowerCase();
      if (q === "" && !browsing && suggested.length > 0) {
        list.appendChild(el("div", "app-cp-menu-h", "Suggested — the org's owner and its teams' owners"));
        for (const p of suggested) list.appendChild(personBtn(p));
        const all = el("button", "app-link app-cp-person-more", "Search everyone on the roster") as HTMLButtonElement;
        all.type = "button";
        all.addEventListener("click", () => {
          browsing = true;
          paint();
          filter.focus();
        });
        list.appendChild(all);
        return;
      }
      const hits = roster
        .filter((p) => p.active !== false && (q === "" || p.who.toLowerCase().includes(q)))
        .slice(0, 40);
      for (const p of hits) list.appendChild(personBtn({ whoId: p.whoId, who: p.who }));
      if (hits.length === 0) list.appendChild(el("div", "app-settings-note", q === "" ? "No one on the roster yet." : "No one on the roster matches."));
      // the directory, searched by itself as the name is typed: a person
      // found there is added to the app and chosen in one click
      lookup?.render(list, filter.value.trim(), new Set(roster.map((p) => p.whoId)), "＋ add to the app and choose", (p) => done(p));
    };
    filter.addEventListener("input", () => {
      lookup?.typed(filter.value.trim());
      paint();
    });
    paint();
    m.body.append(filter, list);
    const cancel = el("button", "app-link", "Cancel") as HTMLButtonElement;
    cancel.type = "button";
    cancel.addEventListener("click", () => done(null));
    m.footer.appendChild(cancel);
    if (current) {
      const clr = el("button", "app-btn", `Clear ${roleLabel.toLowerCase()}`) as HTMLButtonElement;
      clr.type = "button";
      clr.addEventListener("click", () => done("clear"));
      m.footer.appendChild(clr);
    }
    filter.focus();
  });
}

/** Several people for a role (a charter's bound multi-person role,
 *  2026-09-15): tick from the roster, Done. */
export function pickPeople(host: HTMLElement, roster: RosterPerson[], current: PersonRef[], roleLabel: string, extra: Pick<OwnerPickerExtras, "directory"> = {}): Promise<PersonRef[] | null> {
  return new Promise((resolve) => {
    // the directory road, as in pickOwner: someone not on the roster is
    // found, added to the app and ticked (issue 12, 2026-11-16)
    const lookup = extra.directory ? directoryLookup(extra.directory, () => paint()) : null;
    const m = modal(host, `Choose the ${roleLabel.toLowerCase()}`, "Tick everyone holding this role.");
    const chosen = new Map(current.map((p) => [p.whoId, p]));
    const filter = el("input", "app-input") as HTMLInputElement;
    filter.type = "search";
    filter.placeholder = extra.directory ? "Search the app and the directory…" : "Filter people…";
    const list = el("div", "app-cp-people");
    const paint = () => {
      clear(list);
      const q = filter.value.trim().toLowerCase();
      const hits = roster.filter((p) => p.active !== false && (q === "" || p.who.toLowerCase().includes(q))).slice(0, 60);
      for (const p of hits) {
        const b = el("button", "app-cp-person" + (chosen.has(p.whoId) ? " app-cp-person-on" : "")) as HTMLButtonElement;
        b.type = "button";
        b.textContent = (chosen.has(p.whoId) ? "✓ " : "") + p.who;
        b.addEventListener("click", () => {
          if (chosen.has(p.whoId)) chosen.delete(p.whoId);
          else chosen.set(p.whoId, { whoId: p.whoId, who: p.who });
          paint();
        });
        list.appendChild(b);
      }
      if (hits.length === 0) list.appendChild(el("div", "app-settings-note", extra.directory ? "No one in the app matches." : "No one matches."));
      lookup?.render(list, filter.value.trim(), new Set(roster.map((p) => p.whoId)), "＋ add to the app and tick", (p) => {
        chosen.set(p.whoId, p);
        filter.value = "";
        lookup?.typed("");
        paint();
      });
    };
    filter.addEventListener("input", () => {
      lookup?.typed(filter.value.trim());
      paint();
    });
    paint();
    m.body.append(filter, list);
    const cancel = el("button", "app-link", "Cancel") as HTMLButtonElement;
    cancel.type = "button";
    cancel.addEventListener("click", () => {
      m.close();
      resolve(null);
    });
    const done = el("button", "app-btn app-btn-primary", "Done") as HTMLButtonElement;
    done.type = "button";
    done.addEventListener("click", () => {
      m.close();
      resolve([...chosen.values()]);
    });
    m.footer.append(cancel, done);
    filter.focus();
  });
}

// ---- add / edit priority (design spec §9) -----------------------------------

/** A cascade target: a child of the priority's org, or a peer beside it. */
export interface CascadeTarget {
  org: OrgRef;
  ownerName: string;
  kind: "child" | "peer";
}

/** Renders cascade targets as two clearly separated groups — children
 *  first, then peers — each row a checkbox; returns the picked-set. */
export function cascadeTargetList(
  targets: CascadeTarget[],
  already: Map<string, { status: string; reason: string }>,
  from: OrgRef,
  onChange: (picked: Set<string>) => void
): { box: HTMLElement; picked: Set<string> } {
  const box = el("div", "app-cp-cascade");
  const picked = new Set<string>();
  const parent = orgParent(from);
  const group = (kind: "child" | "peer") => {
    const rows = targets.filter((t) => t.kind === kind);
    if (rows.length === 0) return;
    const h = el("div", "app-cp-cascade-h");
    h.appendChild(
      el("span", undefined, kind === "child" ? `↓ Children of ${orgName(from)}` : `↔ Peers of ${orgName(from)}${parent ? ` (under ${orgName(parent)})` : ""}`)
    );
    h.appendChild(el("span", "app-cp-muted", kind === "child" ? " — cascade down" : " — share sideways"));
    box.appendChild(h);
    for (const t of rows) {
      const key = orgKey(t.org);
      const lab = el("label", "app-cp-cascade-row" + (kind === "peer" ? " app-cp-cascade-peer" : "")) as HTMLLabelElement;
      const cb = el("input") as HTMLInputElement;
      cb.type = "checkbox";
      const prior = already.get(key);
      // sent and live (proposed / accepted / completed) → ticked and locked;
      // declined or parked → unticked, re-tickable = re-send (Ben, 2026-08-19)
      const resendable = prior !== undefined && (prior.status === "rejected" || prior.status === "onhold");
      if (prior && !resendable) {
        cb.checked = true;
        cb.disabled = true;
      }
      cb.addEventListener("change", () => {
        if (cb.checked) picked.add(key);
        else picked.delete(key);
        onChange(picked);
      });
      lab.append(
        cb,
        el("span", "app-cp-cascade-org", orgName(t.org)),
        el("span", "app-cp-muted", t.ownerName !== "" ? ` · ${t.ownerName}` : " · no owner")
      );
      if (resendable) {
        lab.appendChild(
          el(
            "span",
            prior.status === "rejected" ? "app-cp-flag-red app-cp-cascade-prior" : "app-cp-muted app-cp-cascade-prior",
            prior.status === "rejected" ? ` · declined${prior.reason !== "" ? ` — “${prior.reason}”` : ""} · tick to re-send` : ` · parked${prior.reason !== "" ? ` — “${prior.reason}”` : ""} · tick to re-send`
          )
        );
      }
      box.appendChild(lab);
    }
  };
  group("child");
  group("peer");
  if (targets.length === 0) box.appendChild(el("div", "app-cp-muted", "No child or peer orgs to cascade to from here."));
  return { box, picked };
}

export interface PriorityDialogOpts {
  host: HTMLElement;
  title: string;
  priority: Priority; // a copy the dialog mutates
  /** EVERY pillar row of the company, every year's: the form asks for
   *  the sub-pillar of each year the priority runs through that needs
   *  asking (2026-11-18) — it used to be handed one year's set. */
  pillars: Pillar[];
  /** The period rules the years are stepped and compared by. */
  periodSettings: PeriodSettings;
  /** The year in view: a move "from this year" is offered for it. */
  viewYear: string;
  /** Pre-select this sub-pillar (the column last interacted with). */
  preselectPillarId?: string;
  periods: string[]; // current + neighbours, for the select
  roster: RosterPerson[];
  /** Cascade targets on offer: children of the org + peers, each with its
   *  owner's name for the row ("Warehouse · K. Lowe"). */
  cascadeTargets: CascadeTarget[];
  /** Existing assignments of this priority: live ones show ticked and
   *  locked; declined / parked ones can be ticked again to re-send. */
  alreadyCascaded: { org: OrgRef; status: string; reason: string }[];
  /** The owner picker's suggested people and directory road. */
  ownerPicker?: OwnerPickerExtras;
  /** Add priority below the company (Ben, 2026-11-06): the dialog opens
   *  with a Pull from above / New priority toggle; choosing Pull closes
   *  this form (resolving null) and hands over. */
  onPull?: () => void;
}

/** The Pull / New toggle at the head of Add priority (both faces). */
export function addModeToggle(mode: "pull" | "new", onChange: (m: "pull" | "new") => void): HTMLElement {
  // one joined segmented control, the Documents tab's List | Tiles shape
  // (accent fill on the chosen side), not two separate chips (Ben,
  // 2026-11-06)
  const row = el("div", "app-docs-seg app-cp-addmode");
  const mk = (label: string, m: "pull" | "new") => {
    const b = el("button", "app-docs-segbtn" + (mode === m ? " app-docs-segbtn-on" : ""), label) as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("aria-pressed", mode === m ? "true" : "false");
    b.addEventListener("click", () => {
      if (mode !== m) onChange(m);
    });
    return b;
  };
  row.append(mk("Pull from above", "pull"), mk("New priority", "new"));
  return row;
}

export interface PriorityDialogResult {
  priority: Priority;
  cascadeTo: OrgRef[];
}

export function priorityDialog(o: PriorityDialogOpts): Promise<PriorityDialogResult | null> {
  return new Promise((resolve) => {
    const m = modal(o.host, o.title, undefined, false);
    if (o.onPull) {
      const onPull = o.onPull;
      m.body.appendChild(
        addModeToggle("new", () => {
          m.close();
          resolve(null);
          onPull();
        })
      );
    }
    const p = o.priority;

    const statement = el("textarea", "app-input app-cp-statement") as HTMLTextAreaElement;
    statement.rows = 3;
    statement.placeholder = "What must this org achieve? One short statement.";
    statement.value = p.statement;
    statement.spellcheck = true;

    // owner
    let owner: PersonRef | null = p.ownerId !== "" ? { whoId: p.ownerId, who: p.ownerName } : null;
    const ownerRow = el("div", "app-cp-ownerrow");
    const ownerName = el("span", "app-cp-ownername", "");
    const ownerBtn = el("button", "app-btn", "Choose…") as HTMLButtonElement;
    ownerBtn.type = "button";
    const paintOwner = () => {
      ownerName.textContent = owner ? owner.who : "No owner";
      ownerName.classList.toggle("app-cp-muted", !owner);
    };
    ownerBtn.addEventListener("click", () => {
      void pickOwner(o.host, o.roster, owner, "owner", o.ownerPicker).then((r) => {
        if (r === null) return;
        owner = r === "clear" ? null : r;
        paintOwner();
      });
    });
    paintOwner();
    ownerRow.append(ownerName, ownerBtn);

    // the span (2026-10-02): a START period, an optional PLANNED end; the
    // real end is stamped when the priority closes, never typed
    const period = el("select", "app-input") as HTMLSelectElement;
    const periods = o.periods.includes(p.period) || p.period === "" ? o.periods : [p.period, ...o.periods];
    for (const per of periods) {
      const opt = el("option", "", per) as HTMLOptionElement;
      opt.value = per;
      if (per === p.period) opt.selected = true;
      period.appendChild(opt);
    }
    const planned = el("select", "app-input") as HTMLSelectElement;
    const noPlanned = el("option", "", "No planned end") as HTMLOptionElement;
    noPlanned.value = "";
    planned.appendChild(noPlanned);
    for (const per of periods.includes(p.plannedEnd) || p.plannedEnd === "" ? periods : [...periods, p.plannedEnd]) {
      const opt = el("option", "", per) as HTMLOptionElement;
      opt.value = per;
      if (per === p.plannedEnd) opt.selected = true;
      planned.appendChild(opt);
    }

    // (no read-only "Primary initiative" line: it is set, shown and
    // cleared on the priority's Initiatives tab — here it only took a row;
    // Ben, 2026-11-16)

    // cascade to — children and peers, clearly separated (Ben, 2026-08-19)
    const already = new Map(o.alreadyCascaded.map((a) => [orgKey(a.org), { status: a.status, reason: a.reason }]));
    const { box: cascadeBox, picked } = cascadeTargetList(o.cascadeTargets, already, p.org, () => paintConfirm());
    const confirm = el("div", "app-cp-confirm", "");
    const paintConfirm = () => {
      const n = picked.size;
      confirm.textContent = n > 0 ? `This will send the priority to ${n} org${n === 1 ? "" : "s"} for acceptance.` : "";
    };

    const notes = el("textarea", "app-input") as HTMLTextAreaElement;
    notes.rows = 2;
    notes.value = p.notes;
    notes.placeholder = "Optional notes";

    // ---- the sub-pillar, year by year (2026-11-18) -----------------------
    // It sits AFTER the years, because it depends on them: one select for
    // the start year, and another only for a later year in which that
    // choice cannot carry (its sub-pillar ended and nothing follows it).
    // `picks`: year → the sub-pillar chosen from that year on.
    const ps = o.periodSettings;
    let picks: Record<string, string> = picksOf(ps, p, o.pillars);
    let startWas = period.value;
    if (picks[startWas] === undefined && (o.preselectPillarId ?? "") !== "") picks[startWas] = o.preselectPillarId ?? "";
    const subBox = el("div", "app-cp-subpillars");
    /** How far ahead the form looks: the pillars' own last change — and
     *  the year in view, where a move may be made — but never past the
     *  planned end. */
    const until = (): string => {
      let far = lastSetUpYear(ps, o.pillars);
      for (const y of [o.viewYear, ...Object.keys(picks)]) if (y !== "" && (far === "" || comparePeriods(ps, y, far) > 0)) far = y;
      if (planned.value !== "" && (far === "" || comparePeriods(ps, planned.value, far) < 0)) far = planned.value;
      return far === "" || comparePeriods(ps, far, period.value) < 0 ? period.value : far;
    };
    const planNow = () => subPillarPlan(ps, o.pillars, period.value, until(), picks);
    const subSelect = (row: SubPillarRow): HTMLSelectElement => {
      const sel = el("select", "app-input") as HTMLSelectElement;
      const none = el("option", "", "Choose a sub-pillar…") as HTMLOptionElement;
      none.value = "";
      sel.appendChild(none);
      const live = pillarsLiveIn(ps, o.pillars, row.year);
      for (const l1 of strategyChips(live)) {
        const subs = row.options.filter((x) => x.parentId === l1.id);
        if (subs.length === 0) continue;
        const group = el("optgroup") as HTMLOptGroupElement;
        group.label = l1.name;
        for (const sub of subs) {
          const opt = el("option", "", sub.name) as HTMLOptionElement;
          opt.value = sub.id;
          if (sub.id === row.pillarId) opt.selected = true;
          group.appendChild(opt);
        }
        sel.appendChild(group);
      }
      sel.addEventListener("change", () => {
        picks = { ...picks, [row.year]: sel.value };
        paintSubs();
      });
      return sel;
    };
    const paintSubs = () => {
      clear(subBox);
      const plan = planNow();
      plan.rows.forEach((row, n) => {
        // a year with nothing to choose says so — never an empty
        // required field that holds Save without a word (report 23)
        if (row.options.length === 0) {
          const f = field(n === 0 ? "Sub-pillar" : `Sub-pillar from ${row.year}`, el("div", "app-cp-nosubs", `No sub-pillars are set for ${row.year} yet. A super admin sets them in Settings → Priorities.`));
          f.querySelector(".app-field-label")?.appendChild(requiredStar());
          subBox.appendChild(f);
          return;
        }
        const f = field(n === 0 ? "Sub-pillar" : `Sub-pillar from ${row.year}`, subSelect(row));
        f.querySelector(".app-field-label")?.appendChild(requiredStar());
        // a move the person chose to make can be taken back; one the
        // years force cannot
        if (n > 0 && !row.forced) {
          const undo = el("button", "app-link app-cp-subundo", "Remove") as HTMLButtonElement;
          undo.type = "button";
          undo.title = `Keep the earlier sub-pillar from ${row.year} on`;
          undo.addEventListener("click", () => {
            const next = { ...picks };
            delete next[row.year];
            picks = next;
            paintSubs();
          });
          f.appendChild(undo);
        }
        subBox.appendChild(f);
      });
      // a move from the year in view (it was a question after Save:
      // "from 2027, or for every year?")
      const view = o.viewYear;
      if (plan.complete && view !== "" && comparePeriods(ps, view, period.value) > 0 && (planned.value === "" || comparePeriods(ps, view, planned.value) <= 0) && !plan.rows.some((r) => r.year === view)) {
        const move = el("button", "app-link app-cp-submove", `＋ Change from ${view}`) as HTMLButtonElement;
        move.type = "button";
        move.title = `Put it under a different sub-pillar from ${view} on; the earlier years stay as they are`;
        move.addEventListener("click", () => {
          // opens on the sub-pillar it would sit under that year anyway
          const rows = planNow().rows;
          const home = placementsFromRows(ps, rows);
          picks = { ...picks, [view]: pillarIdIn(ps, { pillarId: home.pillarId, placements: home.placements }, view, o.pillars) };
          paintSubs();
        });
        subBox.appendChild(move);
      }
      sync();
    };
    // a changed start takes the first choice with it; later years' picks
    // that fall before it go
    period.addEventListener("change", () => {
      const next: Record<string, string> = {};
      // the VERSION of that sub-pillar in force in the new start year: a
      // sub-pillar that was followed by another is still the choice
      // (report 23, 2026-11-25 — the raw id was carried, was not in force
      // that year, and the field went blank)
      if (picks[startWas] !== undefined) next[period.value] = pillarIdIn(ps, { pillarId: picks[startWas], placements: [] }, period.value, o.pillars);
      for (const [y, id] of Object.entries(picks)) if (comparePeriods(ps, y, period.value) > 0) next[y] = id;
      picks = next;
      startWas = period.value;
      paintSubs();
    });
    planned.addEventListener("change", () => paintSubs());

    const labelled = (label: string, control: HTMLElement, opts: { required?: boolean; title?: string } = {}): HTMLElement => {
      const f = field(label, control);
      const lab = f.querySelector<HTMLElement>(".app-field-label");
      if (lab && opts.required) lab.appendChild(requiredStar());
      // what a helper sentence used to say under the field is the label's
      // tooltip (lean dialogs: no sentences under fields)
      if (lab && opts.title) lab.title = opts.title;
      return f;
    };
    m.body.append(
      labelled("Statement", statement, { required: true }),
      labelled("Owner", ownerRow),
      labelled("Start period", period, { required: true }),
      labelled("Planned end", planned, { title: "Optional. Still open past it, the priority asks for a review — it never closes on its own." }),
      subBox,
      labelled("Cascade to", cascadeBox, { title: "Child orgs and peers. Each receives it as a request to accept." }),
      confirm,
      labelled("Notes", notes)
    );

    const done = (r: PriorityDialogResult | null) => {
      m.close();
      resolve(r);
    };
    const cancel = el("button", "app-link", "Cancel") as HTMLButtonElement;
    cancel.type = "button";
    cancel.addEventListener("click", () => done(null));
    const save = el("button", "app-btn app-btn-primary", "Save") as HTMLButtonElement;
    save.type = "button";
    // Save waits for what is required: the statement, and a sub-pillar
    // for every year that asks for one (no message on a press — the
    // button is simply not there to press)
    function sync(): void {
      const missing = [statement.value.trim() === "" ? "Statement" : "", planNow().complete ? "" : "Sub-pillar"].filter((x) => x !== "");
      save.disabled = missing.length > 0;
      save.title = missing.length > 0 ? `Still needed: ${missing.join(", ")}` : "";
    }
    statement.addEventListener("input", sync);
    save.addEventListener("click", () => {
      const st = statement.value.trim();
      const plan = planNow();
      if (st === "" || !plan.complete) return;
      const home = placementsFromRows(ps, plan.rows);
      p.statement = st;
      p.pillarId = home.pillarId;
      p.placements = home.placements;
      p.ownerId = owner?.whoId ?? "";
      p.ownerName = owner?.who ?? "";
      p.period = period.value;
      p.plannedEnd = planned.value;
      p.notes = notes.value.trim();
      done({
        priority: p,
        cascadeTo: o.cascadeTargets.map((t) => t.org).filter((org) => picked.has(orgKey(org))),
      });
    });
    m.footer.append(cancel, save);
    paintSubs();
    statement.focus();
  });
}
