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
import { LEVEL_LABELS, ProcessLevel, ProcessNode, ProcessTree, buildProcessTree, liveChildren, newNodeId, nextOrder, processLabelWithGeneral, reorder } from "./model";

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

  // ---- the tree ----------------------------------------------------------------
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
    const rename = btn("Rename", "app-link");
    rename.addEventListener("click", () => void renameNode(type));
    const archive = btn("Archive type", "app-link");
    archive.addEventListener("click", () => void archiveNode(type));
    head.append(rename, archive);
    treeHost.appendChild(head);
    const list = el("div", "app-org-tree");
    treeHost.appendChild(list);
    const paintLevel = (parent: ProcessNode, host: HTMLElement) => {
      for (const n of liveChildren(tree, parent.nodeId)) host.appendChild(nodeRow(n));
      if (parent.level < 3) {
        const add = btn(`＋ Add ${LEVEL_LABELS[(parent.level + 1) as ProcessLevel].toLowerCase()}`, "app-link app-proc-add");
        add.addEventListener("click", () => void addUnder(parent));
        host.appendChild(add);
      }
    };
    const nodeRow = (n: ProcessNode): HTMLElement => {
      const wrap = el("div", "app-proc-node");
      const row = el("div", "app-org-row app-proc-row");
      row.style.paddingLeft = `${(n.level - 1) * 22}px`;
      const kids = liveChildren(tree, n.nodeId);
      const open = expanded.has(n.nodeId);
      const toggle = btn(n.level < 3 ? (open ? "▾" : "▸") : "", "app-org-toggle");
      toggle.disabled = n.level === 3;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.addEventListener("click", () => {
        if (expanded.has(n.nodeId)) expanded.delete(n.nodeId);
        else expanded.add(n.nodeId);
        paintTree();
      });
      const name = el("span", "app-proc-name", n.name);
      name.title = LEVEL_LABELS[n.level];
      const localCount = Object.keys(n.aliases).length;
      const summary = el("span", "app-org-summary", [n.level < 3 && !open && kids.length > 0 ? `${kids.length} ${LEVEL_LABELS[(n.level + 1) as ProcessLevel].toLowerCase()}${kids.length === 1 ? "" : "s"}` : "", localCount > 0 ? `${localCount} local name${localCount === 1 ? "" : "s"}` : ""].filter((s) => s !== "").join(" · "));
      const up = btn("↑", "app-link app-proc-move");
      up.title = "Move up";
      up.addEventListener("click", () => void write(async () => {
        const pair = reorder(tree, n.nodeId, true);
        if (pair) await saveProcessNodes(pair);
      }));
      const down = btn("↓", "app-link app-proc-move");
      down.title = "Move down";
      down.addEventListener("click", () => void write(async () => {
        const pair = reorder(tree, n.nodeId, false);
        if (pair) await saveProcessNodes(pair);
      }));
      const ren = btn("Rename", "app-link");
      ren.addEventListener("click", () => void renameNode(n));
      const local = btn("Local names…", "app-link");
      local.addEventListener("click", () => openLocalNames(n));
      const arch = btn("×", "app-org-x");
      arch.title = "Archive";
      arch.addEventListener("click", () => void archiveNode(n));
      row.append(toggle, name, summary, up, down, ren, local, arch);
      wrap.appendChild(row);
      if (n.level < 3 && open) {
        const sub = el("div", "app-proc-children");
        paintLevel(n, sub);
        wrap.appendChild(sub);
      }
      return wrap;
    };
    paintLevel(type, list);
  };

  const addUnder = async (parent: ProcessNode) => {
    const level = (parent.level + 1) as ProcessLevel;
    const name = await promptText({ title: `New ${LEVEL_LABELS[level].toLowerCase()} under "${parent.name}"`, placeholder: "Name", required: "A name is needed.", confirmLabel: "Add" });
    if (name === null) return;
    await write(async () => {
      await saveProcessNode({ rowId: "", nodeId: newNodeId(), parentId: parent.nodeId, level, name: name.trim(), order: nextOrder(tree, parent.nodeId), termId: "", aliases: {}, archived: false });
      expanded.add(parent.nodeId);
    });
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
