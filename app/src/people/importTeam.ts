// "Import a site's team…" (docs/team-import-proposal-2026-10-31.md): a
// super admin picks a site, the walk follows the site owner's reporting
// tree through the Office 365 Users connector, the planner proposes
// placement and flags, the table is reviewed, and one write pass adds
// (or moves) the ticked people, then reconciles the access group ONCE.
// Decisions 1–5 recorded in the proposal.
import { openDialog } from "../../../shared/ui/dialog";
import { clear, el } from "../../../shared/ui/dom";
import { FLAG_LABEL, ImportRow, planImport, summarize } from "../../../shared/schema/teamImport";
import type { OrgSite } from "../../../shared/schema/meeting";
import { accessGroup, syncAllAccess } from "../store/accessGroup";
import { siteOwners } from "../store/config";
import { walkReports, WALK_MAX_DEPTH, WALK_MAX_PEOPLE, WalkProgress } from "../store/directoryWalk";
import { RosterPerson } from "../store/mappers";
import { listPeople, searchEntra, upsertPerson } from "../store/people";

export interface TeamImportOptions {
  host: HTMLElement;
  me: RosterPerson;
  orgTree: OrgSite[];
  /** the site preselected (the roster's site filter, when one is set) */
  site?: string;
  /** called after a write pass so the roster repaints */
  onDone: () => void;
}

interface Root {
  whoId: string;
  name: string;
  why: string;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function openTeamImport(o: TeamImportOptions): void {
  const sites = o.orgTree.map((s) => s.site);
  const dlg = openDialog({
    host: o.host,
    title: "Import a site's team",
    maxWidth: 1040,
    buttons: [{ label: "Close", kind: "secondary", onClick: () => dlg.close() }],
  });
  dlg.root.classList.add("app-ti-dialog");
  const body = dlg.body;

  // ---- step 1: the site and the roots ----
  let site = o.site && sites.includes(o.site) ? o.site : sites[0] ?? "";
  let roots: Root[] = [];
  const stepRoots = async () => {
    clear(body);
    body.appendChild(el("div", "app-settings-note", "The walk follows the reporting lines down from each starting person through the directory. People under a department or area owner are proposed into that department; everyone arrives as a user of this site. Nothing is written until you confirm the list."));
    const siteSel = el("select", "app-input") as HTMLSelectElement;
    for (const s of sites) {
      const opt = el("option", "", s) as HTMLOptionElement;
      opt.value = s;
      opt.selected = s === site;
      siteSel.appendChild(opt);
    }
    body.appendChild(fieldBlock("Site", siteSel));
    const chips = el("div", "app-ti-chips");
    const rootsNote = el("div", "app-field-hint", "");
    const paintChips = () => {
      clear(chips);
      for (const r of roots) {
        const chip = el("span", "app-ti-chip");
        chip.append(el("span", "", r.name), el("span", "app-field-hint", r.why));
        const x = el("button", "app-btn app-ti-chip-x", "×") as HTMLButtonElement;
        x.type = "button";
        x.title = "Remove this starting person";
        x.addEventListener("click", () => {
          roots = roots.filter((q) => q.whoId !== r.whoId);
          paintChips();
        });
        chip.appendChild(x);
        chips.appendChild(chip);
      }
      rootsNote.textContent = roots.length === 0 ? "No starting person yet — set the site's owner in Settings → Organisation, or search for one below." : "";
      walk.disabled = roots.length === 0;
    };
    const loadOwner = async () => {
      roots = [];
      try {
        const own = await siteOwners(site);
        if (own.site) roots.push({ whoId: own.site.whoId, name: own.site.who || "Site owner", why: "site owner" });
      } catch {
        /* no owner readable — search below */
      }
      paintChips();
    };
    siteSel.addEventListener("change", () => {
      site = siteSel.value;
      void loadOwner();
    });
    body.appendChild(fieldBlock("Start from", chips, rootsNote));
    // another root: a GM whose peers' teams the owner misses
    const search = el("input", "app-input") as HTMLInputElement;
    search.placeholder = "Add another starting person — name or email";
    const hits = el("div", "app-ti-hits");
    let seq = 0;
    search.addEventListener("input", () => {
      const q = search.value.trim();
      const my = ++seq;
      clear(hits);
      if (q.length < 2) return;
      void searchEntra(q).then((found) => {
        if (my !== seq) return;
        clear(hits);
        for (const h of found.slice(0, 8)) {
          const row = el("div", "app-ti-hit");
          row.append(el("span", "", h.displayName), el("span", "app-field-hint", [h.mail, h.department].filter((x) => x !== "").join(" · ")));
          const add = el("button", "app-btn", "＋ Start here") as HTMLButtonElement;
          add.type = "button";
          add.disabled = roots.some((r) => r.whoId === h.objectId);
          add.addEventListener("click", () => {
            roots.push({ whoId: h.objectId, name: h.displayName, why: "added" });
            paintChips();
            search.value = "";
            clear(hits);
          });
          row.appendChild(add);
          hits.appendChild(row);
        }
        if (found.length === 0) hits.appendChild(el("div", "app-field-hint", "No one in the directory matches."));
      }).catch((e) => {
        clear(hits);
        hits.appendChild(el("div", "app-field-hint", `Directory search failed: ${errText(e)}`));
      });
    });
    body.append(search, hits);
    const walk = el("button", "app-btn app-btn-primary", "Walk the directory") as HTMLButtonElement;
    walk.type = "button";
    walk.addEventListener("click", () => void stepWalk());
    const actions1 = el("div", "app-ti-actions");
    actions1.appendChild(walk);
    body.appendChild(actions1);
    await loadOwner();
  };

  // ---- step 2: the walk ----
  const stepWalk = async () => {
    clear(body);
    const line = el("div", "app-ti-progress", "Reading the directory…");
    body.appendChild(line);
    const paint = (p: WalkProgress) => {
      line.textContent = `${p.people} ${p.people === 1 ? "person" : "people"} · ${p.managers} manager${p.managers === 1 ? "" : "s"} read · level ${p.level}${p.failed.length > 0 ? ` · ${p.failed.length} could not be read` : ""}`;
    };
    try {
      const walk = await walkReports(roots.map((r) => r.whoId), paint);
      const people = await listPeople(true);
      const shape = o.orgTree.find((s) => s.site === site) ?? { site, departments: [] };
      const owners = await siteOwners(site).catch(() => ({ departments: {}, areas: {} }));
      const rows = planImport(walk, people.map((p) => ({ whoId: p.whoId, site: p.site, active: p.active })), shape, owners, sites);
      stepReview(rows, people, shape, { truncated: walk.truncated, failed: walk.failed });
    } catch (e) {
      clear(body);
      body.appendChild(el("div", "app-settings-note", `The walk failed: ${errText(e)}`));
      const back = el("button", "app-btn", "‹ Back") as HTMLButtonElement;
      back.type = "button";
      back.addEventListener("click", () => void stepRoots());
      const actions2 = el("div", "app-ti-actions");
      actions2.appendChild(back);
      body.appendChild(actions2);
    }
  };

  // ---- step 3: the review ----
  const stepReview = (rows: ImportRow[], people: RosterPerson[], shape: OrgSite, walkNote: { truncated: boolean; failed: string[] }) => {
    clear(body);
    if (walkNote.truncated) body.appendChild(el("div", "app-settings-note app-ti-warn", `The walk stopped at its cap (${WALK_MAX_PEOPLE} people or ${WALK_MAX_DEPTH} levels) — this list is not the whole tree. Start lower, or import in parts.`));
    if (walkNote.failed.length > 0) body.appendChild(el("div", "app-settings-note app-ti-warn", `Reports could not be read for: ${walkNote.failed.join(", ")} — their teams are missing from this list.`));
    const summary = el("div", "app-ti-summary", "");
    const showSkipped = el("input") as HTMLInputElement;
    showSkipped.type = "checkbox";
    const skippedLabel = el("label", "app-ti-toggle");
    skippedLabel.append(showSkipped, el("span", "", "Show skipped and already here"));
    const top = el("div", "app-ti-top");
    top.append(summary, skippedLabel);
    body.appendChild(top);
    const table = el("div", "app-ti-table");
    body.appendChild(table);
    const go = el("button", "app-btn app-btn-primary", "") as HTMLButtonElement;
    go.type = "button";
    const back = el("button", "app-btn", "‹ Back") as HTMLButtonElement;
    back.type = "button";
    back.addEventListener("click", () => void stepRoots());
    const paintSummary = () => {
      const s = summarize(rows);
      const bits = [`${s.toAdd} to add`];
      if (s.toMove > 0) bits.push(`${s.toMove} to move here`);
      if (s.alreadyHere > 0) bits.push(`${s.alreadyHere} already here`);
      if (s.otherSite > 0) bits.push(`${s.otherSite} on another site`);
      if (s.skipped > 0) bits.push(`${s.skipped} skipped`);
      summary.textContent = `${s.total} found · ${bits.join(" · ")}`;
      go.textContent = s.toMove > 0 ? `Add ${s.toAdd} and move ${s.toMove}` : `Add ${s.toAdd} ${s.toAdd === 1 ? "person" : "people"}`;
      go.disabled = s.toAdd + s.toMove === 0;
    };
    const draw = () => {
      clear(table);
      const head = el("div", "app-ti-row app-ti-head");
      head.append(el("span", ""), el("span", "", "Person"), el("span", "", "Directory"), el("span", "", "Department"), el("span", "", "Area"), el("span", "", "Notes"));
      table.appendChild(head);
      for (const r of rows) {
        const quiet = r.flags.includes("onRoster") || (!r.include && !r.flags.includes("otherSite"));
        if (quiet && !showSkipped.checked) continue;
        const row = el("div", "app-ti-row" + (r.include ? "" : " app-ti-row-off"));
        const tick = el("input") as HTMLInputElement;
        tick.type = "checkbox";
        tick.checked = r.include;
        // an inactive row here is never resurrected; already-here needs nothing
        tick.disabled = r.flags.includes("revoked") || r.flags.includes("onRoster");
        tick.title = r.flags.includes("otherSite") ? `Tick to move them from ${r.rosterSite} to ${site}` : "";
        tick.addEventListener("change", () => {
          r.include = tick.checked;
          row.classList.toggle("app-ti-row-off", !r.include);
          paintSummary();
        });
        const who = el("div", "app-ti-who");
        who.append(el("div", "app-ti-name", r.name), el("div", "app-field-hint", [r.jobTitle, r.mail].filter((x) => x !== "").join(" · ")));
        const dir = el("div", "app-ti-dir");
        dir.append(el("div", "", r.entraDepartment || "—"), el("div", "app-field-hint", r.officeLocation));
        if (r.via.length > 0) dir.title = `via ${r.via.join(" › ")}`;
        const dept = el("select", "app-input app-ti-select") as HTMLSelectElement;
        const area = el("select", "app-input app-ti-select") as HTMLSelectElement;
        const fill = (sel: HTMLSelectElement, values: string[], value: string) => {
          clear(sel);
          const none = el("option", "", "—") as HTMLOptionElement;
          none.value = "";
          sel.appendChild(none);
          for (const v of values) {
            const opt = el("option", "", v) as HTMLOptionElement;
            opt.value = v;
            opt.selected = v === value;
            sel.appendChild(opt);
          }
          sel.disabled = values.length === 0;
        };
        fill(dept, shape.departments.map((d) => d.department), r.proposedDepartment);
        const areasOf = (d: string) => shape.departments.find((x) => x.department === d)?.areas ?? [];
        fill(area, areasOf(r.proposedDepartment), r.proposedArea);
        dept.addEventListener("change", () => {
          r.proposedDepartment = dept.value;
          r.proposedArea = "";
          fill(area, areasOf(dept.value), "");
        });
        area.addEventListener("change", () => {
          r.proposedArea = area.value;
        });
        if (r.placedBy === "owner") dept.title = `From ${r.via[r.via.length - 1] ?? "their"}'s ownership of the department`;
        else if (r.placedBy === "label") dept.title = "Matched the directory's department name";
        const notes = el("div", "app-ti-flags");
        for (const f of r.flags) {
          const chip = el("span", `app-ti-flag app-ti-flag-${f}`, f === "otherSite" ? `on ${r.rosterSite}` : FLAG_LABEL[f]);
          notes.appendChild(chip);
        }
        if (r.depth > 0) notes.appendChild(el("span", "app-field-hint", `level ${r.depth}`));
        row.append(tick, who, dir, dept, area, notes);
        table.appendChild(row);
      }
      paintSummary();
    };
    showSkipped.addEventListener("change", draw);
    draw();
    go.addEventListener("click", () => void stepWrite(rows, people));
    const actions3 = el("div", "app-ti-actions");
    actions3.append(back, go);
    body.appendChild(actions3);
  };

  // ---- step 4: the write pass ----
  const stepWrite = async (rows: ImportRow[], people: RosterPerson[]) => {
    clear(body);
    const picked = rows.filter((r) => r.include);
    const line = el("div", "app-ti-progress", `Adding 0 of ${picked.length}…`);
    body.appendChild(line);
    const byId = new Map(people.map((p) => [p.whoId, p]));
    const failed: string[] = [];
    let added = 0;
    let moved = 0;
    for (const r of picked) {
      const existing = byId.get(r.whoId);
      const person: RosterPerson = existing
        ? { ...existing, site, department: r.proposedDepartment, area: r.proposedArea }
        : { whoId: r.whoId, who: r.name, email: r.mail, site, department: r.proposedDepartment, area: r.proposedArea, role: "user", active: true };
      try {
        await upsertPerson(person, undefined, { skipAccessSync: true });
        if (existing) moved++;
        else added++;
      } catch (e) {
        failed.push(`${r.name} (${errText(e)})`);
      }
      line.textContent = `Adding ${added + moved + failed.length} of ${picked.length}…`;
    }
    const result = el("div", "app-ti-result");
    result.appendChild(el("div", "", `${added} added${moved > 0 ? `, ${moved} moved to ${site}` : ""}${failed.length > 0 ? `, ${failed.length} failed` : ""}.`));
    if (failed.length > 0) result.appendChild(el("div", "app-settings-note app-ti-warn", `Not written: ${failed.join("; ")}`));
    // the access group, once, for the whole roster
    try {
      const group = await accessGroup();
      if (group && added + moved > 0) {
        line.textContent = `Syncing ${group.name || "the access group"}…`;
        const fresh = await listPeople(true);
        const rep = await syncAllAccess(fresh, o.me.whoId);
        result.appendChild(el("div", "", `${group.name || "Access group"}: ${rep.membersAdded} member${rep.membersAdded === 1 ? "" : "s"} added${rep.newcomers.length > 0 ? ` · ${rep.newcomers.length} group member${rep.newcomers.length === 1 ? "" : "s"} not on the roster — Access control → Sync now brings them on` : ""}.`));
      } else if (!group) {
        result.appendChild(el("div", "app-field-hint", "No access group is configured — nothing to sync."));
      }
    } catch (e) {
      result.appendChild(el("div", "app-settings-note app-ti-warn", `The access group sync failed: ${errText(e)} — a group owner can run Sync now under Access control.`));
    }
    line.textContent = "Done.";
    body.appendChild(result);
    const again = el("button", "app-btn", "Import another site") as HTMLButtonElement;
    again.type = "button";
    again.addEventListener("click", () => void stepRoots());
    const actions4 = el("div", "app-ti-actions");
    actions4.appendChild(again);
    body.appendChild(actions4);
    o.onDone();
  };

  void stepRoots();
}

function fieldBlock(label: string, control: HTMLElement, hint?: HTMLElement): HTMLElement {
  const f = el("div", "app-field");
  f.append(el("span", "app-field-label", label), control);
  if (hint) f.appendChild(hint);
  return f;
}
