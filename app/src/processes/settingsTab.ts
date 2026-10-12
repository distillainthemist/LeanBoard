// Settings → Processes (term-store-proposal-2026-10.md §6, built
// 2026-10-12, super admins): the process TYPES as a strip, the selected
// type's tree — area › process › sub-process — in the Organisation page's
// collapsible-row idiom: add, rename, reorder, archive at each level, and
// "Local names…" per node (a text box per site assigned to this type).
// Every change writes at once (no save bar); archive, never delete, so
// a referenced node keeps its id.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { settingsSection } from "../settingsSection";
import { confirmRemoval, promptText } from "../prompts";
import { listProcessNodes, saveProcessNode, saveProcessNodes, allSiteProcessTypes } from "../store/processes";
import { orgJson } from "../store/config";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { draggableRow } from "../../../shared/ui/dragList";
import { ProcessLevel, ProcessNode, ProcessTree, buildProcessTree, liveChildren, newNodeId, nextOrder, processLabelWithGeneral } from "./model";

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};

export async function renderProcessesSettings(body: HTMLElement): Promise<void> {
  clear(body);
  body.appendChild(settingsSection("Processes", "A process type (Mine, Refinery, Smelter…) is a hierarchy of area › process › sub-process. A site is assigned a type on the Organisation page; rituals, initiatives, value drivers and documents may then name a process, always optionally. A node's local names say what one site calls it — \"Casthouse\" for \"Casting\"."));
  const strip = el("div", "app-proc-types");
  const treeHost = el("div", "app-proc-tree");
  const status = el("div", "app-cp-err", "");
  body.append(strip, treeHost, status);

  let nodes: ProcessNode[] = [];
  let tree: ProcessTree = buildProcessTree([]);
  let typeId = "";
  const expanded = new Set<string>();
  let sites: string[] = [];
  let siteTypes: Record<string, string> = {};
  const say = (e: unknown) => {
    status.textContent = e instanceof Error ? e.message : String(e);
  };

  const reload = async () => {
    [nodes, siteTypes] = await Promise.all([listProcessNodes(), allSiteProcessTypes()]);
    tree = buildProcessTree(nodes);
    if (typeId === "" || !tree.byId.has(typeId)) typeId = tree.types.find((t) => !t.archived)?.nodeId ?? "";
    paintStrip();
    paintTree();
  };

  const write = async (fn: () => Promise<void>) => {
    try {
      status.textContent = "";
      await fn();
      await reload();
    } catch (e) {
      say(e);
    }
  };

  // ---- the type strip ------------------------------------------------------
  const paintStrip = () => {
    clear(strip);
    strip.appendChild(el("span", "app-site-tabs-label", "Process types"));
    for (const t of tree.types.filter((x) => !x.archived)) {
      const chip = btn(t.name, "app-site-tab" + (t.nodeId === typeId ? " app-site-tab-on" : ""));
      chip.title = `${Object.entries(siteTypes).filter(([, v]) => v === t.nodeId).map(([s]) => s).join(", ") || "no site assigned"}`;
      chip.addEventListener("click", () => {
        typeId = t.nodeId;
        paintStrip();
        paintTree();
      });
      strip.appendChild(chip);
    }
    const add = btn("＋ New type…", "app-link");
    add.addEventListener("click", () => {
      void promptText({ title: "New process type", placeholder: "e.g. Smelter", required: "A name is needed.", confirmLabel: "Add" }).then((name) => {
        if (name === null) return;
        void write(async () => {
          const id = newNodeId();
          await saveProcessNode({ rowId: "", nodeId: id, parentId: "", level: 0, name: name.trim(), order: nextOrder(tree, ""), termId: "", aliases: {}, archived: false });
          typeId = id;
        });
      });
    });
    strip.appendChild(add);
  };

  // ---- the tree: cards within cards, the Organisation page's idiom ------
  // (Ben, 2026-10-12: "a card / sub card like the Organisation hierarchy,
  // drag and drop to re-order, the + embedded at each level")
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
      await saveProcessNode({ rowId: "", nodeId: newNodeId(), parentId: parent.nodeId, level, name, order: nextOrder(tree, parent.nodeId), termId: "", aliases: {}, archived: false });
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
  /** The actions every node row carries after its name. */
  const nodeActions = (n: ProcessNode, host: HTMLElement) => {
    host.appendChild(editBtn(`Rename ${n.name}`, () => void renameNode(n)));
    const local = btn("Local names…", "app-link app-proc-local");
    const count = Object.keys(n.aliases).length;
    if (count > 0) local.textContent = `Local names (${count})`;
    local.addEventListener("click", () => openLocalNames(n));
    host.appendChild(local);
    const x = btn("×", "app-org-x");
    x.title = `Archive ${n.name}`;
    x.addEventListener("click", () => void archiveNode(n));
    host.appendChild(x);
  };
  const paintTree = () => {
    clear(treeHost);
    const type = tree.byId.get(typeId);
    if (!type) {
      treeHost.appendChild(el("div", "app-settings-note", "No process type yet — add one above."));
      return;
    }
    const head = el("div", "app-proc-typehead");
    head.appendChild(el("span", "app-proc-typename", type.name));
    const assigned = Object.entries(siteTypes).filter(([, v]) => v === type.nodeId).map(([s]) => s);
    head.appendChild(el("span", "app-field-hint", assigned.length > 0 ? `Sites: ${assigned.join(", ")}` : "No site is assigned this type yet (Organisation → site card → Process type)."));
    head.appendChild(editBtn("Rename type", () => void renameNode(type)));
    const archive = btn("Archive type", "app-link");
    archive.addEventListener("click", () => void archiveNode(type));
    head.append(archive);
    treeHost.appendChild(head);

    const areas = liveChildren(tree, type.nodeId);
    const areaList = el("div", "app-dept-list");
    areas.forEach((area, ai) => {
      // an AREA is a card (the department card)
      const card = el("div", "app-dept-card");
      const ch = el("div", "app-dept-head");
      const handle = el("span", "app-drag-handle", "⠿");
      handle.title = "Drag to reorder";
      ch.appendChild(handle);
      draggableRow(card, handle, `proc-area-${type.nodeId}`, ai, areas, () => persistOrder(areas));
      const open = expanded.has(area.nodeId);
      ch.appendChild(toggleBtn(open, area.name, () => {
        if (open) expanded.delete(area.nodeId);
        else expanded.add(area.nodeId);
        paintTree();
      }));
      ch.appendChild(el("span", "app-dept-name", area.name));
      const procs = liveChildren(tree, area.nodeId);
      if (!open) ch.appendChild(el("span", "app-org-summary", `${procs.length} process${procs.length === 1 ? "" : "es"}`));
      nodeActions(area, ch);
      card.appendChild(ch);
      if (open) {
        const procList = el("div", "app-proc-sublist");
        procs.forEach((proc, pi) => {
          // a PROCESS is a sub-card inside the area
          const sub = el("div", "app-dept-card app-proc-subcard");
          const sh = el("div", "app-dept-head");
          const h2 = el("span", "app-drag-handle", "⠿");
          h2.title = "Drag to reorder";
          sh.appendChild(h2);
          draggableRow(sub, h2, `proc-proc-${area.nodeId}`, pi, procs, () => persistOrder(procs));
          const popen = expanded.has(proc.nodeId);
          sh.appendChild(toggleBtn(popen, proc.name, () => {
            if (popen) expanded.delete(proc.nodeId);
            else expanded.add(proc.nodeId);
            paintTree();
          }));
          sh.appendChild(el("span", "app-dept-name", proc.name));
          const subs = liveChildren(tree, proc.nodeId);
          if (!popen) sh.appendChild(el("span", "app-org-summary", `${subs.length} sub-process${subs.length === 1 ? "" : "es"}`));
          nodeActions(proc, sh);
          sub.appendChild(sh);
          if (popen) {
            const subBox = el("div", "app-area-list");
            subs.forEach((sp, si) => {
              // a SUB-PROCESS is a row (the area row)
              const row = el("div", "app-area-row");
              const h3 = el("span", "app-drag-handle", "⠿");
              h3.title = "Drag to reorder";
              row.appendChild(h3);
              draggableRow(row, h3, `proc-sub-${proc.nodeId}`, si, subs, () => persistOrder(subs));
              row.appendChild(el("span", "app-area-name", sp.name));
              nodeActions(sp, row);
              subBox.appendChild(row);
            });
            if (subs.length === 0) subBox.appendChild(el("div", "app-org-empty", "No sub-processes"));
            const addSub = adder("Add sub-process", (v) => addUnder(proc, v));
            addSub.classList.add("app-area-adder");
            subBox.appendChild(addSub);
            sub.appendChild(subBox);
          }
          procList.appendChild(sub);
        });
        if (procs.length === 0) procList.appendChild(el("div", "app-org-empty", "No processes"));
        procList.appendChild(adder("Add process", (v) => addUnder(area, v)));
        card.appendChild(procList);
      }
      areaList.appendChild(card);
    });
    if (areas.length === 0) areaList.appendChild(el("div", "app-org-empty", "No areas yet"));
    areaList.appendChild(adder("Add area", (v) => addUnder(type, v)));
    treeHost.appendChild(areaList);
  };

  const renameNode = async (n: ProcessNode) => {
    const name = await promptText({ title: `Rename "${n.name}"`, initial: n.name, required: "A name is needed.", confirmLabel: "Rename" });
    if (name === null || name.trim() === n.name) return;
    await write(() => saveProcessNode({ ...n, name: name.trim() }).then(() => undefined));
  };
  const archiveNode = async (n: ProcessNode) => {
    const kids = liveChildren(tree, n.nodeId).length;
    const ok = await confirmRemoval(`"${n.name}"`, `It is archived, not deleted: anything already naming it keeps the link, nothing new can pick it${kids > 0 ? `, and its ${kids} child${kids === 1 ? "" : "ren"} go with it` : ""}.`);
    if (!ok) return;
    await write(async () => {
      const all: ProcessNode[] = [];
      const walk = (id: string) => {
        const node = tree.byId.get(id);
        if (!node) return;
        all.push({ ...node, archived: true });
        for (const k of tree.childrenOf.get(id) ?? []) walk(k.nodeId);
      };
      walk(n.nodeId);
      await saveProcessNodes(all);
    });
  };

  // ---- local names: a text box per site assigned to this type -----------------
  const openLocalNames = (n: ProcessNode) => {
    const assigned = Object.entries(siteTypes).filter(([, v]) => v === typeId).map(([s]) => s);
    const pool = assigned.length > 0 ? assigned : sites;
    const draft: Record<string, string> = { ...n.aliases };
    const dlg = openDialog({
      host: document.body,
      title: `Local names for "${n.name}"`,
      maxWidth: 520,
      buttons: [
        { label: "Cancel", kind: "secondary", onClick: () => dlg.close() },
        {
          label: "Save",
          kind: "primary",
          onClick: () => {
            const aliases: Record<string, string> = {};
            for (const [k, v] of Object.entries(draft)) if (v.trim() !== "" && v.trim() !== n.name) aliases[k] = v.trim();
            dlg.close();
            void write(() => saveProcessNode({ ...n, aliases }).then(() => undefined));
          },
        },
      ],
    });
    dlg.body.appendChild(el("div", "app-settings-note", assigned.length > 0 ? `What each site assigned to this type calls "${n.name}". Blank = the general name.` : `No site is assigned this type yet — every site is listed. Blank = the general name.`));
    for (const site of pool) {
      const row = el("div", "app-proc-localrow");
      row.appendChild(el("span", "app-proc-localsite", site));
      const inp = el("input", "app-input") as HTMLInputElement;
      inp.placeholder = n.name;
      inp.value = draft[site.toLowerCase()] ?? "";
      inp.addEventListener("input", () => (draft[site.toLowerCase()] = inp.value));
      row.appendChild(inp);
      dlg.body.appendChild(row);
    }
    if (pool.length === 0) dlg.body.appendChild(el("div", "app-field-hint", "No sites are defined yet."));
    dlg.body.appendChild(el("div", "app-field-hint", `Reads as ${processLabelWithGeneral(n, pool[0] ?? "")} on a surface with that site in scope.`));
  };

  sites = parseOrgTree(await orgJson()).map((s) => s.site);
  await reload();
}
