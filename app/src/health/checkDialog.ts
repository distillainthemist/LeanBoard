// The health check popup (health-checks-proposal-2026-10.md, decision 7):
// one dialog, one scroller, the footer pinned with the live score;
// criteria as cards with pills; the two comments; the check's actions;
// the trend strip; drafts kept; Reset; edit for seven days, then
// read-only; admins void. Opened by the four entry points with a SCOPE.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { promptConfirm, promptText } from "../prompts";
import { showLoading } from "../loading";
import { currentViewer } from "../runtime";
import { nowIso, todayIso } from "../../../shared/schema/id";
import { boardChannelKey, LtkAction, newAction } from "../../../shared/schema/actions";
import { HEALTH_TYPES, HealthAnswers, HealthCheck, HealthScope, answer, criteriaFor, editable, scoreFor, scoreText, todaysCheck, trendFor } from "./model";
import { createDraft, discardDraft, getCheck, listChecks, loadDefinitions, saveCheck, unvoidCheck, voidCheck } from "./store";

export interface HealthCheckOpts {
  host: HTMLElement;
  scope: HealthScope;
  /** May this person run (create / edit) a check on the scope? */
  mayRun: boolean;
  /** Site or super admin — may void. */
  isAdmin: boolean;
  /** Where a captured action lands: a board's channel, else the
   *  assessor's personal list (decision 8). */
  actionBoardId?: string;
  /** After a write (the entry button re-reads its score). */
  onChanged?: () => void;
}

const btn = (label: string, cls = "app-btn"): HTMLButtonElement => {
  const b = el("button", cls, label) as HTMLButtonElement;
  b.type = "button";
  return b;
};
const dayLabel = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/** The number and the quiet five-segment bar (decision 3). */
export function scoreBar(value: number | null, big = false): HTMLElement {
  const wrap = el("span", "app-hc-score" + (big ? " app-hc-score-big" : ""));
  wrap.appendChild(el("span", "app-hc-scorenum", scoreText({ value })));
  const bar = el("span", "app-hc-bar");
  for (let i = 0; i < 5; i++) {
    const seg = el("span", "app-hc-seg");
    if (value !== null) {
      const fill = Math.max(0, Math.min(1, value - i));
      if (fill > 0) {
        const f = el("span", "app-hc-segfill");
        f.style.width = `${Math.round(fill * 100)}%`;
        seg.appendChild(f);
      }
    }
    bar.appendChild(seg);
  }
  wrap.appendChild(bar);
  wrap.title = value === null ? "No score yet" : `${value.toFixed(1)} of 5`;
  return wrap;
}

export function openHealthCheck(o: HealthCheckOpts): void {
  const me = currentViewer();
  const myEmail = (me?.email ?? "").toLowerCase();
  const typeLabel = HEALTH_TYPES.find((t) => t.key === o.scope.type)?.label ?? o.scope.type;
  const titleWord = HEALTH_TYPES.find((t) => t.key === o.scope.type)?.titleWord ?? typeLabel;
  const dlg = openDialog({
    host: o.host,
    // "<Type> health check — <scope>" (Ben, 2026-10-21): the title carries
    // the type and the scope, so the header strip does not repeat them
    title: `${titleWord} health check — ${o.scope.label}`,
    maxWidth: 1080,
    buttons: [{ label: "Close", kind: "secondary", onClick: () => void close() }],
  });
  dlg.root.querySelector(".ltk-dialog")?.classList.add("app-hc-dialog");
  const footer = dlg.root.querySelector(".ltk-dialog-footer") as HTMLElement;
  const body = dlg.body;
  body.classList.add("app-hc-body");
  // the app's spinner and quote while the criteria and checks are read
  let stopLoading: (() => void) | null = showLoading(body);

  let check: HealthCheck | null = null;
  let all: HealthCheck[] = [];
  let answers: HealthAnswers = {};
  let wentWell = "";
  let betterIf = "";
  let date = todayIso();
  let viewing: HealthCheck | null = null; // a past check opened from the trend
  let dirty = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saving: Promise<unknown> = Promise.resolve();
  const status = el("div", "app-docs-addstatus app-hc-status");

  const close = async () => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
      await flush();
    }
    await saving;
    dlg.close();
    o.onChanged?.();
  };

  const canEdit = (): boolean => check !== null && viewing === null && o.mayRun && editable(check, nowIso());

  /** Write the draft / the edit (debounced on answer; at once on submit). */
  const flush = async (submit = false) => {
    if (check === null || !canEdit()) return;
    const c = check;
    saving = saving.then(async () => {
      try {
        check = await saveCheck(c, { answers, wentWell, betterIf, date, submit });
        dirty = false;
        all = all.map((x) => (x.rowId === check!.rowId ? check! : x));
      } catch (e) {
        status.textContent = `Could not save: ${(e as Error).message}`;
        status.classList.add("app-docs-addstatus-warn");
      }
    });
    await saving;
  };
  const scheduleSave = () => {
    dirty = true;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void flush();
    }, 800);
  };

  const load = async () => {
    try {
      if (stopLoading === null) stopLoading = showLoading(body);
      const defs = await loadDefinitions(o.scope.site);
      stopLoading();
      stopLoading = null;
      if (!defs.site.enabled[o.scope.type]) {
        clear(body);
        body.appendChild(el("div", "app-settings-note", `${typeLabel} health checks are not enabled for ${o.scope.site} — Settings → Health checks.`));
        return;
      }
      const key = (await import("./model")).scopeKey(o.scope);
      all = await listChecks({ scopeKey: key });
      const today = todaysCheck(all, key, todayIso());
      // the list is light (no criteria, no answers) — the open check is read in full
      if (today !== null) check = (await getCheck(today.rowId)) ?? today;
      else if (o.mayRun) {
        const criteria = criteriaFor(o.scope.type, defs.standard, defs.site);
        if (criteria.length === 0) {
          clear(body);
          body.appendChild(el("div", "app-settings-note", `No criteria are defined for ${typeLabel} yet — Settings → Health checks.`));
          return;
        }
        check = await createDraft(o.scope, criteria);
        all = [check, ...all];
      }
      if (check !== null) {
        answers = { ...check.answers };
        wentWell = check.wentWell;
        betterIf = check.betterIf;
        date = check.date;
      }
      paint();
    } catch (e) {
      stopLoading?.();
      stopLoading = null;
      clear(body);
      body.appendChild(el("div", "app-settings-note", `The health check could not load: ${(e as Error).message}`));
    }
  };

  const paintFooter = () => {
    footer.querySelectorAll(".app-hc-foot").forEach((x) => x.remove());
    const left = el("div", "app-hc-foot");
    const shown = viewing ?? check;
    if (shown !== null) {
      const s = viewing !== null ? viewing.score : scoreFor(shown.criteria, answers);
      left.appendChild(scoreBar(s.value, true));
      if (viewing === null && canEdit()) {
        left.appendChild(el("span", "app-field-hint", s.remaining === 0 ? "Every question answered" : `${s.remaining} question${s.remaining === 1 ? "" : "s"} to answer`));
      }
    }
    footer.prepend(left);
    // the buttons
    footer.querySelectorAll(".app-hc-footbtn").forEach((x) => x.remove());
    const closeBtn = footer.querySelector(".ltk-btn-secondary") as HTMLButtonElement | null;
    const addBtn = (b: HTMLButtonElement) => {
      b.classList.add("app-hc-footbtn");
      if (closeBtn !== null) footer.insertBefore(b, closeBtn);
      else footer.appendChild(b);
    };
    if (viewing !== null) {
      const back = btn("← Back to today's check", "app-link");
      back.addEventListener("click", () => {
        viewing = null;
        paint();
      });
      addBtn(back);
      if (o.isAdmin && viewing.status === "submitted") {
        const v = btn("Void…");
        v.addEventListener("click", () => void doVoid(viewing!));
        addBtn(v);
      }
      if (o.isAdmin && viewing.status === "void") {
        const u = btn("Restore");
        u.addEventListener("click", () => {
          void unvoidCheck(viewing!).then(() => load());
        });
        addBtn(u);
      }
      return;
    }
    if (check === null) return;
    if (canEdit()) {
      if (check.status === "draft") {
        const discard = btn("Discard draft", "app-link");
        discard.addEventListener("click", () => {
          void promptConfirm({ title: "Discard this draft?", note: "The answers typed so far go; nothing is recorded.", confirmLabel: "Discard" }).then(async (ok) => {
            if (!ok || check === null) return;
            if (saveTimer !== null) clearTimeout(saveTimer);
            saveTimer = null;
            await saving;
            await discardDraft(check);
            dlg.close();
            o.onChanged?.();
          });
        });
        addBtn(discard);
      }
      const reset = btn("Reset");
      reset.addEventListener("click", () => {
        void promptConfirm({ title: "Clear every answer?", note: "The comments and actions stay.", confirmLabel: "Clear" }).then((ok) => {
          if (!ok) return;
          answers = {};
          scheduleSave();
          paint();
        });
      });
      addBtn(reset);
      const s = scoreFor(check.criteria, answers);
      const submit = btn(check.status === "draft" ? "Submit" : "Save changes", "app-btn app-btn-primary");
      submit.disabled = s.remaining > 0 || (check.status === "submitted" && !dirty);
      submit.title = s.remaining > 0 ? `${s.remaining} question${s.remaining === 1 ? "" : "s"} still to answer` : "";
      submit.addEventListener("click", () => {
        void (async () => {
          if (saveTimer !== null) clearTimeout(saveTimer);
          saveTimer = null;
          await flush(true);
          status.textContent = check?.status === "submitted" ? `Submitted — ${scoreText(scoreFor(check.criteria, answers))} of 5.` : "";
          paint();
        })();
      });
      addBtn(submit);
    } else if (o.isAdmin && check.status === "submitted") {
      const v = btn("Void…");
      v.addEventListener("click", () => void doVoid(check!));
      addBtn(v);
    }
  };

  const doVoid = async (c: HealthCheck) => {
    const reason = await promptText({ title: `Void the check of ${dayLabel(c.date)}?`, note: "It stays on record, marked void, and leaves the trend. Why?", required: "A reason is needed.", confirmLabel: "Void" });
    if (reason === null) return;
    await voidCheck(c, reason);
    viewing = null;
    check = null;
    await load();
  };

  const paint = () => {
    clear(body);
    const shown = viewing ?? check;
    const ro = viewing !== null || !canEdit();
    // header strip
    const head = el("div", "app-hc-head");
    if (shown !== null) {
      if (!ro && shown.status === "draft") {
        const d = el("input", "app-input app-hc-date") as HTMLInputElement;
        d.type = "date";
        d.value = date;
        d.max = todayIso();
        d.addEventListener("change", () => {
          if (d.value !== "" && d.value <= todayIso()) {
            date = d.value;
            scheduleSave();
          } else d.value = date;
        });
        head.appendChild(d);
      } else head.appendChild(el("span", "app-hc-when", dayLabel(shown.date)));
      head.appendChild(el("span", "app-field-hint", `${shown.assessorName || shown.assessorEmail}${shown.editedByName !== "" ? ` · edited by ${shown.editedByName}` : ""}${shown.status === "void" ? ` · VOID — ${shown.voidReason}` : shown.status === "draft" ? " · draft" : ""}`));
      if (viewing === null && check !== null && check.status === "submitted") {
        head.appendChild(el("span", "app-field-hint", canEdit() ? "editable for 7 days after submission" : "locked"));
      }
    }
    body.appendChild(head);
    body.appendChild(status);
    if (shown === null) {
      body.appendChild(el("div", "app-settings-note", o.mayRun ? "Nothing to show." : "No check today on this scope, and you are not able to run one here."));
      paintTrend();
      paintFooter();
      return;
    }
    paintTrend();
    // criteria cards
    const grid = el("div", "app-hc-grid");
    const liveScore = viewing !== null ? viewing.score : scoreFor(shown.criteria, answers);
    const a = viewing !== null ? viewing.answers : answers;
    for (const c of shown.criteria) {
      const card = el("div", "app-hc-card");
      const ch = el("div", "app-hc-cardhead");
      ch.appendChild(el("span", "app-hc-cardtitle", c.title));
      const cs = liveScore.perCriterion.find((p) => p.key === c.key);
      ch.appendChild(scoreBar(cs?.value ?? null));
      card.appendChild(ch);
      if (c.description !== "") card.appendChild(el("div", "app-field-hint app-hc-carddesc", c.description));
      if (c.site !== "") card.appendChild(el("div", "app-hc-sitetag", `${c.site} criterion`));
      // the questions as CHECKBOX rows (Ben, 2026-10-21): consecutive
      // yes/no (or all/some/no) statements share one column strip of
      // labels; a list question lists its choices, one tick among them
      const check = (on: boolean, onPick: () => void, label: string): HTMLInputElement => {
        const box = el("input", "app-docs-libcheck app-hc-check") as HTMLInputElement;
        box.type = "checkbox";
        box.checked = on;
        box.disabled = ro;
        box.setAttribute("aria-label", label);
        box.addEventListener("change", () => onPick());
        return box;
      };
      let group: HTMLElement | null = null;
      let groupKind = "";
      const anyNa = c.questions.some((x) => x.allowNa);
      for (const qn of c.questions) {
        const chosen = a[qn.key];
        const picked = Array.isArray(chosen) ? chosen[0] ?? "" : "";
        const pick = (key: string | "na") => {
          answers = answer(answers, qn, key);
          scheduleSave();
          paint();
        };
        if (qn.kind !== "list") {
          if (group === null || groupKind !== qn.kind) {
            group = el("div", "app-hc-fixedgroup");
            groupKind = qn.kind;
            const head = el("div", "app-hc-fixedhead");
            head.appendChild(el("span", "app-hc-fixedq", ""));
            for (const opt of qn.options) head.appendChild(el("span", "app-hc-fixedcol", opt.label));
            if (anyNa) head.appendChild(el("span", "app-hc-fixedcol app-hc-nacol", "N/A"));
            group.appendChild(head);
            card.appendChild(group);
          }
          const row = el("div", "app-hc-fixedrow");
          row.appendChild(el("span", "app-hc-fixedq", qn.text));
          for (const opt of qn.options) {
            const cell = el("span", "app-hc-fixedcol");
            cell.appendChild(check(picked === opt.key, () => pick(opt.key), `${qn.text} — ${opt.label}`));
            row.appendChild(cell);
          }
          if (anyNa) {
            const cell = el("span", "app-hc-fixedcol app-hc-nacol");
            if (qn.allowNa) cell.appendChild(check(chosen === "na", () => pick("na"), `${qn.text} — not applicable`));
            row.appendChild(cell);
          }
          group.appendChild(row);
          continue;
        }
        group = null;
        groupKind = "";
        const row = el("div", "app-hc-q");
        const qt = el("div", "app-hc-qtext", qn.text);
        if (qn.allowNa) {
          const naWrap = el("label", "app-hc-nalabel");
          naWrap.append(check(chosen === "na", () => pick("na"), `${qn.text} — not applicable`), el("span", undefined, "N/A"));
          qt.appendChild(naWrap);
        }
        row.appendChild(qt);
        const list = el("div", "app-hc-choices");
        for (const opt of qn.options) {
          const line = el("label", "app-hc-choice" + (picked === opt.key ? " app-hc-choice-on" : ""));
          line.appendChild(check(picked === opt.key, () => pick(opt.key), `${qn.text} — ${opt.label}`));
          line.appendChild(el("span", "app-hc-choicelabel", opt.label));
          if (opt.guidance !== "") line.appendChild(el("span", "app-hc-choiceguide", opt.guidance));
          list.appendChild(line);
        }
        row.appendChild(list);
        card.appendChild(row);
      }
      grid.appendChild(card);
    }
    body.appendChild(grid);
    // comments
    const comments = el("div", "app-hc-comments");
    const area = (label: string, value: string, set: (v: string) => void) => {
      const box = el("div", "app-hc-comment");
      box.appendChild(el("div", "app-field-label", label));
      const ta = el("textarea", "app-input") as HTMLTextAreaElement;
      ta.rows = 3;
      ta.value = value;
      ta.disabled = ro;
      ta.addEventListener("input", () => {
        set(ta.value);
        scheduleSave();
        paintFooter();
      });
      box.appendChild(ta);
      comments.appendChild(box);
    };
    area("What went well", viewing !== null ? viewing.wentWell : wentWell, (v) => (wentWell = v));
    area("Even better if", viewing !== null ? viewing.betterIf : betterIf, (v) => (betterIf = v));
    body.appendChild(comments);
    paintActions(shown, ro);
    paintFooter();
  };

  const paintTrend = () => {
    const key = check?.scopeKey ?? viewing?.scopeKey ?? "";
    const trend = trendFor(all, key, 6);
    const strip = el("div", "app-hc-trend");
    strip.appendChild(el("span", "app-field-label", "Trend"));
    if (trend.length === 0) strip.appendChild(el("span", "app-field-hint", "First check on this scope"));
    for (const t of trend) {
      const chip = btn(`${dayLabel(t.date)} · ${scoreText(t.score)}`, "app-hc-trendchip" + ((viewing ?? check)?.rowId === t.rowId ? " app-hc-trendchip-on" : ""));
      chip.title = `${t.assessorName || t.assessorEmail} — open`;
      chip.addEventListener("click", () => {
        if (check !== null && t.rowId === check.rowId) {
          viewing = null;
          paint();
          return;
        }
        chip.textContent = "…";
        void getCheck(t.rowId).then((full) => {
          viewing = full ?? t;
          paint();
        });
      });
      strip.appendChild(chip);
    }
    const voids = all.filter((c) => c.status === "void").length;
    if (voids > 0 && o.isAdmin) {
      const v = btn(`${voids} void`, "app-link");
      v.addEventListener("click", () => {
        const first = all.find((c) => c.status === "void") ?? null;
        if (first === null) return;
        void getCheck(first.rowId).then((full) => {
          viewing = full ?? first;
          paint();
        });
      });
      strip.appendChild(v);
    }
    body.appendChild(strip);
  };

  const paintActions = (shown: HealthCheck, ro: boolean) => {
    const box = el("div", "app-hc-actions");
    box.appendChild(el("div", "app-field-label", "Actions"));
    const list = el("div", "app-hc-actionlist");
    box.appendChild(list);
    list.appendChild(el("span", "app-field-hint", "Reading…"));
    void (async () => {
      const { actionsForBoard, actionsForViewer } = await import("../store/actions");
      const pool = o.actionBoardId !== undefined ? await actionsForBoard(o.actionBoardId).catch(() => [] as LtkAction[]) : await actionsForViewer(me?.objectId ?? "").catch(() => [] as LtkAction[]);
      const mine = pool.filter((x) => x.context?.source === "healthcheck" && x.context?.sourceId === shown.rowId);
      clear(list);
      if (mine.length === 0) list.appendChild(el("span", "app-field-hint", "None yet."));
      for (const x of mine) {
        const row = el("div", "app-hc-actionrow");
        row.appendChild(el("span", "app-hc-actionstatus", x.status));
        row.appendChild(el("span", undefined, x.issue || x.description));
        row.appendChild(el("span", "app-field-hint", [x.assignees.map((p) => p.who).join(", "), x.due !== "" ? `due ${dayLabel(x.due)}` : ""].filter((s) => s !== "").join(" · ")));
        list.appendChild(row);
      }
    })();
    if (!ro) {
      const add = btn("＋ Add action");
      add.addEventListener("click", () => {
        void (async () => {
          const [{ openActionDialog }, { assigneePeople }, { listPeople, viewerPerson }, { upsertActions, ACTIONS_CHANGED_EVENT }] = await Promise.all([
            import("../../../shared/ui/actionUi"),
            import("../../../shared/schema/people"),
            import("../store/people"),
            import("../store/actions").then(async (m) => ({ upsertActions: m.upsertActions, ACTIONS_CHANGED_EVENT: (await import("../actions/quickAdd")).ACTIONS_CHANGED_EVENT })),
          ]);
          const whoId = me?.objectId ?? "";
          const [person, roster] = await Promise.all([whoId !== "" ? viewerPerson(whoId).catch(() => null) : Promise.resolve(null), listPeople().catch(() => [])]);
          const who = person?.who ?? me?.name ?? "";
          const people = assigneePeople(who !== "" ? [{ whoId, who }] : [], roster);
          const action = newAction({ source: "healthcheck", sourceId: shown.rowId, hint: `${typeLabel} health check — ${o.scope.label}` });
          action.instanceId = o.actionBoardId !== undefined ? boardChannelKey(o.actionBoardId) : `hub:${whoId}`;
          if (who !== "") action.assignees = [{ whoId, who, done: false }];
          const host = el("div", "app-dlghost ltk-root");
          document.body.appendChild(host);
          openActionDialog({
            host,
            action,
            people,
            isNew: true,
            onCommit: () => {
              void (async () => {
                await upsertActions([action], o.actionBoardId);
                window.dispatchEvent(new CustomEvent(ACTIONS_CHANGED_EVENT));
                host.remove();
                paint();
              })();
            },
          });
        })();
      });
      box.appendChild(add);
    }
    body.appendChild(box);
  };

  void load();
}
