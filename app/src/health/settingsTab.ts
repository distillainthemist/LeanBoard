// Settings → Health checks (health-checks-proposal-2026-10.md, decision
// 6): one section per type — the site's "Enabled" switch, the STANDARD
// criteria (super admins edit; site admins read), the SITE criteria
// (site / super admins add), one criterion editor for both, saves
// through the Save bar — and "Recent checks" per section (a site
// admin's site; a super admin every site through a picker).

import { clear, el } from "../../../shared/ui/dom";
import { settingsSection } from "../settingsSection";
import { statusChip } from "../../../shared/ui/format";
import { promptConfirm } from "../prompts";
import { showLoading } from "../loading";
import { draggableRow } from "../../../shared/ui/dragList";
import type { RosterPerson } from "../store/mappers";
import { orgJson } from "../store/config";
import { parseOrgTree } from "../../../shared/schema/meeting";
import { HEALTH_TYPES, HealthCheck, HealthCriterion, HealthQuestion, HealthSiteConfig, HealthStandard, HealthType, PRESETS, criteriaProblems, keyFor, presetOptions, scoreText } from "./model";
import { listChecks, loadDefinitions, saveSiteConfig, saveStandard } from "./store";

interface Ctx {
  markDirty: () => void;
  markClean: () => void;
  registerSave: (fn: () => Promise<void>) => void;
  isDirty: () => boolean;
  saveCurrent: () => Promise<void>;
}

const note = (text: string) => el("div", "app-settings-note", text);
const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};
const dayLabel = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export async function renderHealthSettings(body: HTMLElement, me: RosterPerson, ctx: Ctx): Promise<void> {
  clear(body);
  const stopLoading = showLoading(body);
  const isSuper = me.role === "superadmin";
  const tree = parseOrgTree(await orgJson());
  const sites = tree.map((s) => s.site);
  let site = isSuper ? (sites.includes(me.site) ? me.site : (sites[0] ?? "")) : me.site;
  let standard: HealthStandard;
  let siteCfg: HealthSiteConfig;
  try {
    const d = await loadDefinitions(site);
    standard = d.standard;
    siteCfg = d.site;
  } catch (e) {
    stopLoading();
    clear(body);
    body.appendChild(note(`Health checks need the hosted app: ${String(e).slice(0, 160)}`));
    return;
  }
  stopLoading();
  clear(body);
  let standardDirty = false;
  let siteDirty = false;

  // the save: standard criteria (super admins) and the site's own config
  ctx.registerSave(async () => {
    for (const t of HEALTH_TYPES) {
      const problems = criteriaProblems([...standard.standard[t.key], ...siteCfg.criteria[t.key]]);
      if (problems.length > 0) throw new Error(`${t.label}: ${problems[0]}`);
    }
    if (standardDirty && isSuper) await saveStandard(standard);
    await saveSiteConfig(site, siteCfg);
    standardDirty = false;
    siteDirty = false;
    ctx.markClean();
  });

  // the site picker (super admins) rides above the sections
  if (isSuper && sites.length > 1) {
    const bar = el("div", "app-settings-row app-settings-striptool");
    bar.appendChild(el("span", "app-field-label", "Site"));
    const sel = el("select", "app-input") as HTMLSelectElement;
    for (const s of sites) sel.appendChild(new Option(s, s));
    sel.value = site;
    sel.addEventListener("change", () => {
      void (async () => {
        if (ctx.isDirty()) {
          const ok = await promptConfirm({ title: "Unsaved changes", note: "Save them before switching site, or they are lost.", confirmLabel: "Save and switch" });
          if (!ok) {
            sel.value = site;
            return;
          }
          await ctx.saveCurrent();
        }
        site = sel.value;
        const d = await loadDefinitions(site);
        standard = d.standard;
        siteCfg = d.site;
        paintAll();
      })();
    });
    bar.appendChild(sel);
    body.appendChild(bar);
  }
  // the four sections sit DIRECTLY on the body: the settings strip
  // cards a section head with its siblings, and a container that holds
  // heads two levels down would be carded, taken apart and carded
  // again on every repaint (the strip's pass runs on each mutation)
  const sectionHosts: HTMLElement[] = [];

  const touchStandard = () => {
    standardDirty = true;
    ctx.markDirty();
  };
  const touchSite = () => {
    siteDirty = true;
    ctx.markDirty();
  };

  /** One criterion's editor (or its read-only view). */
  const criterionCard = (c: HealthCriterion, list: HealthCriterion[], editableHere: boolean, touch: () => void, repaint: () => void): HTMLElement => {
    const card = el("div", "app-hc-def");
    const head = el("div", "app-hc-defhead");
    if (editableHere) {
      // drag by the handle to reorder (the column chooser's road), or ▲▼
      const handle = el("span", "app-drag-handle", "⠿");
      handle.title = "Drag to reorder the criteria";
      head.appendChild(handle);
      draggableRow(card, handle, `hc-crit-${c.site || "std"}`, list.indexOf(c), list, () => {
        touch();
        repaint();
      });
      const title = el("input", "app-input app-hc-deftitle") as HTMLInputElement;
      title.value = c.title;
      title.placeholder = "Criterion title, e.g. Ritual attendance";
      title.addEventListener("input", () => {
        c.title = title.value;
        touch();
      });
      head.appendChild(title);
      const up = btn("▲", "app-pr-arrow");
      up.title = "Move up";
      up.disabled = list.indexOf(c) === 0;
      up.addEventListener("click", () => {
        const i = list.indexOf(c);
        list.splice(i, 1);
        list.splice(i - 1, 0, c);
        touch();
        repaint();
      });
      const down = btn("▼", "app-pr-arrow");
      down.title = "Move down";
      down.disabled = list.indexOf(c) === list.length - 1;
      down.addEventListener("click", () => {
        const i = list.indexOf(c);
        list.splice(i, 1);
        list.splice(i + 1, 0, c);
        touch();
        repaint();
      });
      const x = btn("×", "app-org-x");
      x.title = "Remove this criterion";
      x.addEventListener("click", () => {
        list.splice(list.indexOf(c), 1);
        touch();
        repaint();
      });
      head.append(up, down, x);
    } else {
      head.appendChild(el("span", "app-hc-deftitle-ro", c.title));
      head.appendChild(el("span", "app-hc-sitetag", "standard"));
    }
    card.appendChild(head);
    if (editableHere) {
      const desc = el("textarea", "app-input") as HTMLTextAreaElement;
      desc.rows = 2;
      desc.value = c.description;
      desc.placeholder = "What this criterion is about — shown as a hint on the check";
      desc.addEventListener("input", () => {
        c.description = desc.value;
        touch();
      });
      card.appendChild(desc);
    } else if (c.description !== "") card.appendChild(el("div", "app-field-hint", c.description));
    const qs = el("div", "app-hc-defqs");
    for (const q of c.questions) qs.appendChild(questionRow(q, c, editableHere, touch, repaint));
    card.appendChild(qs);
    if (editableHere) {
      const addRow = el("div", "app-org-row app-hc-addq");
      const input = el("input", "app-input") as HTMLInputElement;
      input.placeholder = "New question, e.g. Did the ritual start on time?";
      const preset = el("select", "app-input app-hc-presetsel") as HTMLSelectElement;
      preset.title = "The answers the new question starts with";
      for (const p of PRESETS) preset.appendChild(new Option(`answers: ${p.label}`, p.key));
      const commit = () => {
        const v = input.value.trim();
        if (v === "") return;
        const po = presetOptions(preset.value);
        c.questions.push({ key: keyFor(v, c.questions.map((x) => x.key)), text: v, multi: po.multi, allowNa: false, options: po.options });
        input.value = "";
        touch();
        repaint();
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      });
      const add = btn("＋");
      add.addEventListener("click", commit);
      addRow.append(input, preset, add);
      card.appendChild(addRow);
    }
    return card;
  };

  const questionRow = (q: HealthQuestion, c: HealthCriterion, editableHere: boolean, touch: () => void, repaint: () => void): HTMLElement => {
    const row = el("div", "app-hc-defq");
    const top = el("div", "app-hc-defqtop");
    if (editableHere) {
      const qi = c.questions.indexOf(q);
      const handle = el("span", "app-drag-handle", "⠿");
      handle.title = "Drag to reorder the questions";
      top.appendChild(handle);
      draggableRow(row, handle, `hc-q-${c.key}`, qi, c.questions, () => {
        touch();
        repaint();
      });
      const text = el("input", "app-input") as HTMLInputElement;
      text.value = q.text;
      text.addEventListener("input", () => {
        q.text = text.value;
        touch();
      });
      text.placeholder = "The question, as the assessor reads it";
      top.appendChild(text);
      const up = btn("▲", "app-pr-arrow");
      up.title = "Move up";
      up.disabled = qi === 0;
      up.addEventListener("click", () => {
        c.questions.splice(qi, 1);
        c.questions.splice(qi - 1, 0, q);
        touch();
        repaint();
      });
      const down = btn("▼", "app-pr-arrow");
      down.title = "Move down";
      down.disabled = qi === c.questions.length - 1;
      down.addEventListener("click", () => {
        c.questions.splice(qi, 1);
        c.questions.splice(qi + 1, 0, q);
        touch();
        repaint();
      });
      const x = btn("×", "app-org-x");
      x.title = "Remove this question";
      x.addEventListener("click", () => {
        c.questions.splice(c.questions.indexOf(q), 1);
        touch();
        repaint();
      });
      top.append(up, down, x);
      // the question's settings, each named (Ben, 2026-10-21: bare
      // pills read as nothing)
      const settings = el("div", "app-hc-qsettings");
      const labelled = (label: string, control: HTMLElement, hint: string) => {
        const w = el("label", "app-hc-qsetting");
        w.title = hint;
        w.append(el("span", "app-hc-qsettinglabel", label), control);
        settings.appendChild(w);
      };
      const mode = el("select", "app-input app-hc-presetsel") as HTMLSelectElement;
      mode.appendChild(new Option("one option", "single"));
      mode.appendChild(new Option("several options", "multi"));
      mode.value = q.multi ? "multi" : "single";
      mode.addEventListener("change", () => {
        q.multi = mode.value === "multi";
        touch();
        repaint();
      });
      labelled("The assessor picks", mode, "One option (a single select, yes/no, all/some/no) or several at once (the weights add up)");
      const na = el("input", "app-docs-libcheck") as HTMLInputElement;
      na.type = "checkbox";
      na.checked = q.allowNa;
      na.addEventListener("change", () => {
        q.allowNa = na.checked;
        touch();
      });
      labelled("Allow “not applicable”", na, "The assessor may mark the question N/A — it then counts in neither the score nor the possible score");
      const preset = el("select", "app-input app-hc-presetsel") as HTMLSelectElement;
      preset.appendChild(new Option("keep as they are", ""));
      for (const p of PRESETS) preset.appendChild(new Option(p.label, p.key));
      preset.addEventListener("change", () => {
        if (preset.value === "") return;
        const po = presetOptions(preset.value);
        q.options = po.options;
        q.multi = po.multi;
        touch();
        repaint();
      });
      labelled("Replace the options with", preset, "A preset rewrites the options and their weights; edit them afterwards");
      row.appendChild(top);
      row.appendChild(settings);
      const optsHead = el("div", "app-hc-defopt app-hc-defopthead");
      optsHead.append(el("span", "app-hc-optlabel", "Option"), el("span", "app-hc-optguide", "Guidance shown when it is chosen (optional)"), el("span", "app-hc-optweight", "Weight"), el("span", undefined, ""));
      row.appendChild(optsHead);
    } else {
      top.appendChild(el("span", "app-hc-defqtext", q.text));
      top.appendChild(el("span", "app-field-hint", `${q.multi ? "several options" : "one option"}${q.allowNa ? " · N/A allowed" : ""}`));
      row.appendChild(top);
    }
    const opts = el("div", "app-hc-defopts");
    for (const o of q.options) {
      const line = el("div", "app-hc-defopt");
      if (editableHere) {
        const label = el("input", "app-input app-hc-optlabel") as HTMLInputElement;
        label.value = o.label;
        label.placeholder = "Option";
        label.addEventListener("input", () => {
          o.label = label.value;
          touch();
        });
        const guidance = el("input", "app-input app-hc-optguide") as HTMLInputElement;
        guidance.value = o.guidance;
        guidance.placeholder = "Guidance (optional), e.g. <30% unassigned";
        guidance.addEventListener("input", () => {
          o.guidance = guidance.value;
          touch();
        });
        const weight = el("input", "app-input app-hc-optweight") as HTMLInputElement;
        weight.type = "number";
        weight.min = "0";
        weight.step = "1";
        weight.value = String(o.weight);
        weight.placeholder = "weight";
        weight.title = "Weight — what choosing this option scores; never shown to the assessor";
        weight.addEventListener("input", () => {
          o.weight = Math.max(0, Math.round(Number(weight.value) || 0));
          touch();
        });
        const x = btn("×", "app-org-x");
        x.addEventListener("click", () => {
          q.options.splice(q.options.indexOf(o), 1);
          touch();
          repaint();
        });
        line.append(label, guidance, weight, x);
      } else {
        line.appendChild(el("span", undefined, o.label));
        if (o.guidance !== "") line.appendChild(el("span", "app-field-hint", o.guidance));
        line.appendChild(el("span", "app-field-hint", `weight ${o.weight}`));
      }
      opts.appendChild(line);
    }
    if (editableHere) {
      const addOpt = btn("＋ option", "app-link");
      addOpt.addEventListener("click", () => {
        q.options.push({ key: keyFor(`option ${q.options.length + 1}`, q.options.map((x) => x.key)), label: "", guidance: "", weight: 0 });
        touch();
        repaint();
      });
      opts.appendChild(addOpt);
    }
    row.appendChild(opts);
    return row;
  };

  const paintSection = (host: HTMLElement, type: HealthType) => {
    clear(host);
    const t = HEALTH_TYPES.find((x) => x.key === type)!;
    host.appendChild(settingsSection(`${t.label} health check`));
    // the site switch
    const sw = el("label", "app-hc-switch");
    const box = el("input", "app-docs-libcheck") as HTMLInputElement;
    box.type = "checkbox";
    box.checked = siteCfg.enabled[type];
    box.addEventListener("change", () => {
      siteCfg.enabled[type] = box.checked;
      touchSite();
    });
    sw.append(box, el("span", undefined, `Enabled for ${site}`));
    host.appendChild(sw);
    host.appendChild(note(`Each ${t.scopeWord} is checked against the standard criteria plus ${site}'s own. Weights are not shown to the assessor; the score is chosen ÷ possible, 0–5.`));
    // standard
    const stdBox = el("div", "app-hc-deflist");
    host.appendChild(el("div", "app-field-label", isSuper ? "Standard criteria (every site)" : "Standard criteria"));
    const repaintStd = () => {
      clear(stdBox);
      if (standard.standard[type].length === 0) stdBox.appendChild(note(isSuper ? "No standard criteria yet — add one below." : "No standard criteria yet."));
      for (const c of standard.standard[type]) stdBox.appendChild(criterionCard(c, standard.standard[type], isSuper, touchStandard, repaintStd));
      if (isSuper) {
        const add = btn("＋ Add standard criterion");
        add.addEventListener("click", () => {
          standard.standard[type].push({ key: keyFor(`criterion ${standard.standard[type].length + 1}`, standard.standard[type].map((x) => x.key)), title: "", description: "", questions: [], site: "" });
          touchStandard();
          repaintStd();
        });
        stdBox.appendChild(add);
      }
    };
    repaintStd();
    host.appendChild(stdBox);
    // the site's own
    host.appendChild(el("div", "app-field-label", `${site}'s criteria`));
    const siteBox = el("div", "app-hc-deflist");
    const repaintSite = () => {
      clear(siteBox);
      if (siteCfg.criteria[type].length === 0) siteBox.appendChild(note("None yet."));
      for (const c of siteCfg.criteria[type]) siteBox.appendChild(criterionCard(c, siteCfg.criteria[type], true, touchSite, repaintSite));
      const add = btn(`＋ Add ${site} criterion`);
      add.addEventListener("click", () => {
        siteCfg.criteria[type].push({ key: keyFor(`${site} criterion ${siteCfg.criteria[type].length + 1}`, siteCfg.criteria[type].map((x) => x.key)), title: "", description: "", questions: [], site });
        touchSite();
        repaintSite();
      });
      siteBox.appendChild(add);
    };
    repaintSite();
    host.appendChild(siteBox);
    // recent checks
    host.appendChild(el("div", "app-field-label", "Recent checks"));
    const recent = el("div", "app-hc-recent");
    const stopRecent = showLoading(recent, false, true);
    host.appendChild(recent);
    void listChecks({ site, type }).then(
      (checks: HealthCheck[]) => {
        stopRecent();
        clear(recent);
        if (checks.length === 0) {
          recent.appendChild(note("No checks yet."));
          return;
        }
        for (const c of checks.slice(0, 30)) {
          const row = el("div", "app-hc-recentrow");
          row.appendChild(statusChip(c.status === "submitted" ? "✓ Submitted" : c.status === "draft" ? "● Draft" : "⊘ Void", c.status === "submitted" ? "green" : c.status === "draft" ? "amber" : "neutral"));
          row.appendChild(el("span", "app-hc-recentscope", c.scope.label));
          row.appendChild(el("span", "app-hc-recentscore", scoreText(c.score)));
          row.appendChild(el("span", "app-field-hint", `${dayLabel(c.date)} · ${c.assessorName || c.assessorEmail}`));
          const open = btn("Open", "app-link");
          open.addEventListener("click", () => {
            void import("./checkDialog").then(({ openHealthCheck }) =>
              openHealthCheck({ host: body, scope: c.scope, mayRun: false, isAdmin: true, onChanged: () => paintSection(host, type) })
            );
          });
          row.appendChild(open);
          recent.appendChild(row);
        }
      },
      (e: unknown) => {
        stopRecent();
        clear(recent);
        recent.appendChild(note(`Checks could not be read: ${(e as Error).message}`));
      }
    );
  };

  const paintAll = () => {
    for (const h of sectionHosts.splice(0)) h.remove();
    for (const t of HEALTH_TYPES) {
      const host = el("div", "app-hc-section");
      body.appendChild(host);
      sectionHosts.push(host);
      paintSection(host, t.key);
    }
  };
  paintAll();
}
