// Settings → Processes (term-store-proposal-2026-10.md §6, built
// 2026-10-12; site trees 2026-10-29, features-plan-2026-10-29 §1). A
// strip of SITES and, for super admins, the CENTRAL hierarchy. A site's
// tree — the site at the root, then area › process › sub-process — is
// edited in the Organisation page's collapsible-row idiom: add, rename,
// reorder, archive at each level, writes at once (no save bar), archive
// never delete. A site admin edits their own site's tree; a super admin
// every tree, the central tree, and the LINKS — each site node points
// at one central node (inherited down the tree) so sites compare. A
// site with no tree yet starts empty or clones a central type (the
// migration: references follow). Local names are retired.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { settingsSection } from "../settingsSection";
import { confirmRemoval, promptText } from "../prompts";
import { listProcessNodes, saveProcessNode, saveProcessNodes } from "../store/processes";
import { archivedSites, orgJson } from "../store/config";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { draggableRow } from "../../../shared/ui/dragList";
import { mountCentralPicker } from "../../../shared/ui/processPicker";
import { ProcessLevel, ProcessNode, ProcessTree, buildProcessTree, centralOf, liveChildren, newNodeId, nextOrder, processPathLabel, siteRootOf } from "./model";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export interface ProcessesSettingsOpts {
  /** The viewer: a site admin sees and edits their own site's tree; a
   *  super admin every site, the central tree and the links. */
  me: { role: string; site: string };
}

type View = { kind: "site"; site: string } | { kind: "central" };

export async function renderProcessesSettings(body: HTMLElement, o: ProcessesSettingsOpts): Promise<void> {
  clear(body);
  const isSuper = o.me.role === "superadmin";
  const siteOnly = !isSuper && o.me.role === "siteadmin" ? o.me.site : "";
  body.appendChild(
    settingsSection(
      "Process",
      isSuper
        ? "Each site sets its own process hierarchy — the site at the root, then area › process › sub-process — and that tree is what its rituals, initiatives, value drivers and documents pick from. The central hierarchy (Mine, Refinery, Smelter…) is the comparison key: a site node links to one central node, and anything beneath it inherits the link, so initiatives and documents compare across sites."
        : `${siteOnly}'s process hierarchy — area › process › sub-process under the site. Its rituals, initiatives, value drivers and documents pick from this tree. A super admin links each node to the central hierarchy so sites compare.`
    )
  );
  const strip = el("div", "app-proc-types");
  const treeHost = el("div", "app-proc-tree");
  const status = el("div", "app-cp-err", "");
  body.append(strip, treeHost, status);

  let nodes: ProcessNode[] = [];
  let tree: ProcessTree = buildProcessTree([]);
  let sites: string[] = [];
  let view: View = siteOnly !== "" ? { kind: "site", site: siteOnly } : { kind: "central" };
  let typeId = "";
  const expanded = new Set<string>();
  const say = (e: unknown) => {
    status.textContent = e instanceof Error ? e.message : String(e);
  };
  const canEditTree = (): boolean => (view.kind === "central" ? isSuper : isSuper || view.site === siteOnly);

  const reload = async () => {
    const [list, orgRaw, archived] = await Promise.all([listProcessNodes(), orgJson(true), archivedSites()]);
    nodes = list;
    tree = buildProcessTree(nodes);
    const live = parseOrgTree(orgRaw).map((s) => s.site).filter((s) => s !== "" && !archived.includes(s));
    sites = siteOnly !== "" ? live.filter((s) => s === siteOnly) : live;
    if (view.kind === "site" && !sites.includes(view.site) && siteOnly === "") view = sites.length > 0 ? { kind: "site", site: sites[0] } : { kind: "central" };
    if (typeId === "" || !tree.byId.has(typeId)) typeId = tree.types.find((t) => !t.archived)?.nodeId ?? "";
    paintStrip();
    paintView();
  };

  const pushNote = el("div", "app-field-hint app-proc-termpush", "");
  body.appendChild(pushNote);
  /** Write-through (term-store-proposal §8): the Process area term set
   *  follows every save at once; `archived` names the nodes whose
   *  terms retire. The outcome reads under the tree. */
  const write = async (fn: () => Promise<void>, archived: ProcessNode[] = []) => {
    try {
      status.textContent = "";
      await fn();
      await reload();
      pushNote.textContent = "Updating the Process area term set…";
      const r = await import("../docs/termWrite").then((m) => m.pushProcessTerms({ archived })).catch((e) => ({ summary: `Term set: push failed — ${e instanceof Error ? e.message : String(e)}` }));
      pushNote.textContent = r.summary;
    } catch (e) {
      say(e);
    }
  };

  // ---- the strip: sites, then the central hierarchy --------------------------
  const paintStrip = () => {
    clear(strip);
    strip.appendChild(el("span", "app-site-tabs-label", "Site"));
    for (const s of sites) {
      const on = view.kind === "site" && view.site === s;
      const chip = btn(s, "app-site-tab" + (on ? " app-site-tab-on" : ""));
      const root = siteRootOf(tree, s);
      chip.title = root === "" ? `${s} has no process hierarchy yet` : `${liveChildren(tree, root).length} area${liveChildren(tree, root).length === 1 ? "" : "s"}`;
      if (root === "") chip.classList.add("app-proc-tab-empty");
      chip.addEventListener("click", () => {
        view = { kind: "site", site: s };
        paintStrip();
        paintView();
      });
      strip.appendChild(chip);
    }
    if (sites.length === 0) strip.appendChild(el("span", "app-field-hint", siteOnly !== "" ? `${siteOnly} is not on the Organisation page.` : "No sites yet (Settings → Organisation)."));
    if (isSuper) {
      const central = btn("Central hierarchy", "app-site-tab app-proc-tab-central" + (view.kind === "central" ? " app-site-tab-on" : ""));
      central.title = "The process types every site's tree links to";
      central.addEventListener("click", () => {
        view = { kind: "central" };
        paintStrip();
        paintView();
      });
      strip.appendChild(central);
    }
  };

  // ---- the tree editor: cards within cards, the Organisation page's idiom ----
  const persistOrder = (list: ProcessNode[]) => void write(() => saveProcessNodes(list.map((n, i) => ({ ...n, order: (i + 1) * 10 }))));
  const adder = (placeholder: string, onAdd: (v: string) => void): HTMLElement => {
    const r = el("div", "app-org-row app-proc-adder");
    const input = el("input", "app-input") as HTMLInputElement;
    input.placeholder = placeholder;
    const b = btn("＋");
    const go = () => {
      const v = input.value.trim();
      if (v === "") return;
      input.value = "";
      onAdd(v);
    };
    b.addEventListener("click", go);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        go();
      }
    });
    r.append(input, b);
    return r;
  };
  const addUnder = (parent: ProcessNode, name: string) =>
    void write(async () => {
      const level = (parent.level + 1) as ProcessLevel;
      await saveProcessNode({ rowId: "", nodeId: newNodeId(), parentId: parent.nodeId, level, name, order: nextOrder(tree, parent.nodeId), termId: "", aliases: {}, archived: false, site: parent.site, centralId: "" });
      expanded.add(parent.nodeId);
    });
  const toggleBtn = (open: boolean, what: string, onToggle: () => void): HTMLButtonElement => {
    const b = btn(open ? "▾" : "▸", "app-org-toggle");
    b.title = open ? `Collapse ${what}` : `Expand ${what}`;
    b.setAttribute("aria-expanded", String(open));
    b.addEventListener("click", onToggle);
    return b;
  };
  const editBtn = (title: string, onClick: () => void): HTMLButtonElement => {
    const b = btn("✎", "app-org-edit");
    b.title = title;
    b.addEventListener("click", onClick);
    return b;
  };
  /** Explicit links per central node — the central view's "↔ n" count. */
  const linkedCount = (): Map<string, number> => {
    const m = new Map<string, number>();
    for (const n of nodes) if (n.site !== "" && !n.archived && n.centralId !== "") m.set(n.centralId, (m.get(n.centralId) ?? 0) + 1);
    return m;
  };
  /** The actions every node row carries after its name. */
  const nodeActions = (n: ProcessNode, host: HTMLElement, counts: Map<string, number>) => {
    const editable = canEditTree();
    if (editable) host.appendChild(editBtn(`Rename ${n.name}`, () => void renameNode(n)));
    if (n.site !== "") {
      // the central link: its own, inherited, or none — super admins set it
      const own = n.centralId !== "";
      const effective = centralOf(tree, n.nodeId);
      const central = effective === "" ? null : tree.byId.get(effective);
      const text = central === null || central === undefined ? "↔ not linked" : `↔ ${processPathLabel(tree, central.nodeId, "") || central.name}${own ? "" : " (inherited)"}`;
      const link = btn(text, "app-link app-proc-link" + (central ? "" : " app-proc-link-none"));
      link.title = isSuper ? (central ? `Compares as ${central.name} across sites — click to change` : "Not linked to the central hierarchy — cross-site reports leave it out; click to link") : central ? `Compares as ${central.name} across sites (a super admin sets this)` : "Not linked to the central hierarchy yet (a super admin sets this)";
      link.disabled = !isSuper;
      link.addEventListener("click", () => openLink(n));
      host.appendChild(link);
    } else {
      const c = counts.get(n.nodeId) ?? 0;
      if (c > 0) {
        const tag = el("span", "app-field-hint app-proc-linkcount", `↔ ${c} site node${c === 1 ? "" : "s"}`);
        tag.title = "Site nodes linked here explicitly";
        host.appendChild(tag);
      }
    }
    if (editable) {
      const x = btn("×", "app-org-x");
      x.title = `Archive ${n.name}`;
      x.addEventListener("click", () => void archiveNode(n));
      host.appendChild(x);
    }
  };
  const paintTreeUnder = (root: ProcessNode) => {
    const editable = canEditTree();
    const counts = linkedCount();
    const areas = liveChildren(tree, root.nodeId);
    const areaList = el("div", "app-dept-list");
    areas.forEach((area, ai) => {
      // an AREA is a card (the department card)
      const card = el("div", "app-dept-card");
      const ch = el("div", "app-dept-head");
      if (editable) {
        const handle = el("span", "app-drag-handle", "⠿");
        handle.title = "Drag to reorder";
        ch.appendChild(handle);
        draggableRow(card, handle, `proc-area-${root.nodeId}`, ai, areas, () => persistOrder(areas));
      }
      const open = expanded.has(area.nodeId);
      ch.appendChild(toggleBtn(open, area.name, () => {
        if (open) expanded.delete(area.nodeId);
        else expanded.add(area.nodeId);
        paintView();
      }));
      ch.appendChild(el("span", "app-dept-name", area.name));
      const procs = liveChildren(tree, area.nodeId);
      if (!open) ch.appendChild(el("span", "app-org-summary", `${procs.length} process${procs.length === 1 ? "" : "es"}`));
      nodeActions(area, ch, counts);
      card.appendChild(ch);
      if (open) {
        const procList = el("div", "app-proc-sublist");
        procs.forEach((proc, pi) => {
          // a PROCESS is a sub-card inside the area
          const sub = el("div", "app-dept-card app-proc-subcard");
          const sh = el("div", "app-dept-head");
          if (editable) {
            const h2 = el("span", "app-drag-handle", "⠿");
            h2.title = "Drag to reorder";
            sh.appendChild(h2);
            draggableRow(sub, h2, `proc-proc-${area.nodeId}`, pi, procs, () => persistOrder(procs));
          }
          const popen = expanded.has(proc.nodeId);
          sh.appendChild(toggleBtn(popen, proc.name, () => {
            if (popen) expanded.delete(proc.nodeId);
            else expanded.add(proc.nodeId);
            paintView();
          }));
          sh.appendChild(el("span", "app-dept-name", proc.name));
          const subs = liveChildren(tree, proc.nodeId);
          if (!popen) sh.appendChild(el("span", "app-org-summary", `${subs.length} sub-process${subs.length === 1 ? "" : "es"}`));
          nodeActions(proc, sh, counts);
          sub.appendChild(sh);
          if (popen) {
            const subBox = el("div", "app-area-list");
            subs.forEach((sp, si) => {
              // a SUB-PROCESS is a row (the area row)
              const row = el("div", "app-area-row");
              if (editable) {
                const h3 = el("span", "app-drag-handle", "⠿");
                h3.title = "Drag to reorder";
                row.appendChild(h3);
                draggableRow(row, h3, `proc-sub-${proc.nodeId}`, si, subs, () => persistOrder(subs));
              }
              row.appendChild(el("span", "app-area-name", sp.name));
              nodeActions(sp, row, counts);
              subBox.appendChild(row);
            });
            if (subs.length === 0) subBox.appendChild(el("div", "app-org-empty", "No sub-processes"));
            if (editable) {
              const addSub = adder("Add sub-process", (v) => addUnder(proc, v));
              addSub.classList.add("app-area-adder");
              subBox.appendChild(addSub);
            }
            sub.appendChild(subBox);
          }
          procList.appendChild(sub);
        });
        if (procs.length === 0) procList.appendChild(el("div", "app-org-empty", "No processes"));
        if (editable) procList.appendChild(adder("Add process", (v) => addUnder(area, v)));
        card.appendChild(procList);
      }
      areaList.appendChild(card);
    });
    if (areas.length === 0) areaList.appendChild(el("div", "app-org-empty", "No areas yet"));
    if (editable) areaList.appendChild(adder("Add area", (v) => addUnder(root, v)));
    treeHost.appendChild(areaList);
  };

  // ---- the views ---------------------------------------------------------------
  const paintView = () => {
    clear(treeHost);
    if (view.kind === "central") paintCentral();
    else paintSite(view.site);
  };

  const paintSite = (site: string) => {
    const rootId = siteRootOf(tree, site);
    const root = rootId === "" ? null : tree.byId.get(rootId) ?? null;
    const head = el("div", "app-proc-typehead");
    head.appendChild(el("span", "app-proc-typename", site));
    if (root === null) {
      head.appendChild(el("span", "app-field-hint", "No process hierarchy yet."));
      treeHost.appendChild(head);
      if (!canEditTree()) {
        treeHost.appendChild(el("div", "app-settings-note", `${site} has no process hierarchy yet — a super admin or the site's admin starts one here.`));
        return;
      }
      paintStarter(site);
      return;
    }
    const areas = liveChildren(tree, rootId);
    const linked = nodes.filter((n) => n.site === root.site && !n.archived && n.level > 0 && centralOf(tree, n.nodeId) !== "").length;
    const total = nodes.filter((n) => n.site === root.site && !n.archived && n.level > 0).length;
    head.appendChild(el("span", "app-field-hint", `${areas.length} area${areas.length === 1 ? "" : "s"} · ${linked} of ${total} node${total === 1 ? "" : "s"} linked to the central hierarchy`));
    if (canEditTree()) {
      const archive = btn("Archive hierarchy", "app-link");
      archive.title = `Archive ${site}'s whole tree — nothing is deleted`;
      archive.addEventListener("click", () => void archiveNode(root));
      head.append(archive);
    }
    treeHost.appendChild(head);
    paintTreeUnder(root);
  };

  /** A site with no tree: start empty, or clone a central type — the
   *  migration road for a site that carried a retired type. */
  const paintStarter = (site: string) => {
    const box = el("div", "app-settings-note app-proc-starter");
    box.appendChild(el("div", "", `Start ${site}'s hierarchy:`));
    const row = el("div", "app-proc-starterrow");
    const empty = btn("Start empty");
    empty.title = "A root for the site with no areas yet";
    empty.addEventListener("click", () => {
      void write(async () => {
        await saveProcessNode({ rowId: "", nodeId: newNodeId(), parentId: "", level: 0, name: site, order: 10, termId: "", aliases: {}, archived: false, site, centralId: "" });
      });
    });
    row.appendChild(empty);
    const types = tree.types.filter((t) => !t.archived);
    if (types.length > 0) {
      row.appendChild(el("span", "app-field-hint", "or clone"));
      const sel = el("select", "app-input") as HTMLSelectElement;
      for (const t of types) {
        const opt = el("option", "", t.name) as HTMLOptionElement;
        opt.value = t.nodeId;
        sel.appendChild(opt);
      }
      const clone = btn("Clone this type", "app-btn app-btn-primary");
      clone.title = "Copy the type's areas, processes and sub-processes as the site's own, each linked to where it came from; rituals, initiatives and value drivers of this site that named the type's nodes follow";
      clone.addEventListener("click", () => {
        void (async () => {
          clone.disabled = true;
          empty.disabled = true;
          status.textContent = `Cloning ${sel.selectedOptions[0]?.textContent ?? "the type"} for ${site}…`;
          const { migrateSiteFromType } = await import("./migrate");
          const r = await migrateSiteFromType(site, sel.value);
          if (r.error !== "") {
            status.textContent = r.error;
            clone.disabled = false;
            empty.disabled = false;
            return;
          }
          await write(async () => undefined);
          status.textContent = r.lines.join(" ");
        })();
      });
      row.append(sel, clone);
      // a site that carried a type under the retired model has it preselected
      void import("./migrate").then(({ sitesAwaitingMigration }) => sitesAwaitingMigration()).then((waiting) => {
        const mine = waiting.find((w) => w.site.toLowerCase() === site.toLowerCase());
        if (mine && types.some((t) => t.nodeId === mine.typeId)) {
          sel.value = mine.typeId;
          box.appendChild(el("div", "app-field-hint", `${site} was assigned the ${mine.typeName} type under the old model — cloning it carries the site's rituals, initiatives and value drivers across.`));
        }
      }).catch(() => undefined);
    }
    box.appendChild(row);
    treeHost.appendChild(box);
  };

  const paintCentral = () => {
    const typeStrip = el("div", "app-proc-types app-proc-centraltypes");
    typeStrip.appendChild(el("span", "app-site-tabs-label", "Process types"));
    for (const t of tree.types.filter((x) => !x.archived)) {
      const chip = btn(t.name, "app-site-tab" + (t.nodeId === typeId ? " app-site-tab-on" : ""));
      const sitesOnType = new Set(nodes.filter((n) => n.site !== "" && !n.archived && n.centralId !== "" && (tree.byId.get(n.centralId)?.nodeId !== undefined) && processPathOfType(n.centralId) === t.nodeId).map((n) => n.site));
      chip.title = sitesOnType.size > 0 ? `Linked from: ${[...sitesOnType].join(", ")}` : "No site links here yet";
      chip.addEventListener("click", () => {
        typeId = t.nodeId;
        paintView();
      });
      typeStrip.appendChild(chip);
    }
    const add = btn("＋ New type…", "app-link");
    add.addEventListener("click", () => {
      void promptText({ title: "New process type", placeholder: "e.g. Smelter", required: "A name is needed.", confirmLabel: "Add" }).then((name) => {
        if (name === null) return;
        void write(async () => {
          const id = newNodeId();
          await saveProcessNode({ rowId: "", nodeId: id, parentId: "", level: 0, name: name.trim(), order: nextOrder(tree, ""), termId: "", aliases: {}, archived: false, site: "", centralId: "" });
          typeId = id;
        });
      });
    });
    typeStrip.appendChild(add);
    treeHost.appendChild(typeStrip);
    const type = tree.byId.get(typeId);
    if (!type) {
      treeHost.appendChild(el("div", "app-settings-note", "No process type yet — add one above. The central hierarchy does not sync to the term set; it is the key sites compare on."));
      return;
    }
    const head = el("div", "app-proc-typehead");
    head.appendChild(el("span", "app-proc-typename", type.name));
    head.appendChild(el("span", "app-field-hint", "Central — not synced to the term set; site nodes link here."));
    head.appendChild(editBtn("Rename type", () => void renameNode(type)));
    const archive = btn("Archive type", "app-link");
    archive.addEventListener("click", () => void archiveNode(type));
    head.append(archive);
    treeHost.appendChild(head);
    const owed = nodes.filter((n) => n.site === "" && n.termId !== "" && Object.keys(n.aliases).length > 0).length;
    if (owed > 0) treeHost.appendChild(el("div", "app-field-hint", `${owed} node${owed === 1 ? "" : "s"} still carr${owed === 1 ? "ies" : "y"} retired local names — the next Process area sync removes their synonyms from the term store.`));
    paintTreeUnder(type);
  };
  const processPathOfType = (nodeId: string): string => {
    let cur = tree.byId.get(nodeId);
    const seen = new Set<string>();
    while (cur && cur.level > 0 && !seen.has(cur.nodeId)) {
      seen.add(cur.nodeId);
      cur = tree.byId.get(cur.parentId);
    }
    return cur?.nodeId ?? "";
  };

  // ---- rename / archive -------------------------------------------------------
  const renameNode = async (n: ProcessNode) => {
    const name = await promptText({ title: `Rename "${n.name}"`, initial: n.name, required: "A name is needed.", confirmLabel: "Rename" });
    if (name === null || name.trim() === n.name) return;
    await write(() => saveProcessNode({ ...n, name: name.trim() }).then(() => undefined));
  };
  const archiveNode = async (n: ProcessNode) => {
    const kids = liveChildren(tree, n.nodeId).length;
    const ok = await confirmRemoval(`"${n.name}"`, `It is archived, not deleted: anything already naming it keeps the link, nothing new can pick it${kids > 0 ? `, and its ${kids} child${kids === 1 ? "" : "ren"} go with it` : ""}.`);
    if (!ok) return;
    const all: ProcessNode[] = [];
    const walk = (id: string) => {
      const node = tree.byId.get(id);
      if (!node) return;
      all.push({ ...node, archived: true });
      for (const k of tree.childrenOf.get(id) ?? []) walk(k.nodeId);
    };
    walk(n.nodeId);
    await write(() => saveProcessNodes(all), all);
  };

  // ---- the link dialog: a site node → one central node ---------------------------
  const openLink = (n: ProcessNode) => {
    if (!isSuper) return;
    let picked = n.centralId;
    const inherited = n.centralId === "" ? centralOf(tree, n.nodeId) : "";
    const dlg = openDialog({
      host: document.body,
      title: `Link "${n.name}" to the central hierarchy`,
      maxWidth: 560,
      buttons: [
        { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
        {
          label: "Inherit",
          kind: "secondary",
          onClick: () => {
            dlg.close();
            if (n.centralId === "") return;
            void write(() => saveProcessNode({ ...n, centralId: "" }).then(() => undefined));
          },
        },
        {
          label: "Link",
          kind: "primary",
          onClick: () => {
            dlg.close();
            if (picked === n.centralId) return;
            void write(() => saveProcessNode({ ...n, centralId: picked }).then(() => undefined));
          },
        },
      ],
    });
    dlg.body.appendChild(el("div", "app-settings-note", `Which central process ${n.site}'s "${n.name}" compares as. Anything beneath it inherits the link until linked itself. Levels need not match — an area here may link to a central process.`));
    if (inherited !== "") dlg.body.appendChild(el("div", "app-field-hint", `Inherits ${tree.byId.get(inherited)?.name ?? inherited} from its parent now.`));
    const host = el("div", "app-proc-linkpick");
    mountCentralPicker(host, { tree, value: picked, selectClass: "app-input", onChange: (v) => (picked = v) });
    dlg.body.appendChild(host);
    if (tree.types.filter((t) => !t.archived).length === 0) dlg.body.appendChild(el("div", "app-field-hint", "No central process type yet — add one under Central hierarchy first."));
  };

  await reload();
}
