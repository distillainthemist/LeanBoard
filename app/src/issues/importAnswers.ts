// "Import answers…" — the Issues desk's bulk answer (2026-11-26, R3 —
// N1 of the 2026-11-25 round). A CSV in the layout of
// issue-review-prompt.md §4.5 is read into a PREVIEW; nothing is
// written before Apply. Apply runs row by row through the desk's own
// actions (handed in as `deps`), then tells each person ONCE, on one
// Teams card listing their answers.
//
// The judging is answersCsv.ts and the stepping is answersApply.ts,
// both pure and tested; this file is the dialog and the reads.

import { el, clear } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { Ben_ltkissuesService } from "../generated/services/Ben_ltkissuesService";
import { Ben_ltkissuemessagesService } from "../generated/services/Ben_ltkissuemessagesService";
import type { Ben_ltkissues } from "../generated/models/Ben_ltkissuesModel";
import { AnswerRow, Judged, KnownIssue, MESSAGE_MAX, RowState, dateWords, decodeCsv, fromElsewhere, judgeRows, looksLikeId, normId, readAnswers, resolutionLine, tallyLine } from "./answersCsv";
import { Answered, ApplyIo, PersonCard, applyRow, cardsFor } from "./answersApply";
import { STATUS_WORDS, statusWord } from "./status";

type Issue = Ben_ltkissues;

export interface ImportDeps {
  /** Where the dialog's overlay goes. */
  host: HTMLElement;
  writeMessage(issueId: string, text: string, audience: "reporter" | "internal"): Promise<void>;
  mergeInto(child: Issue, parent: Issue): Promise<void>;
  /** Who hears about an issue as it stands NOW (after a merge): the
   *  reporter, merged-in reporters and followers, the sender left out. */
  audience(issue: Issue): Promise<{ email: string; name: string }[]>;
  /** One Teams card to one person; "" or the honest reason it did not go. */
  sendCard(card: PersonCard): Promise<string>;
  /** The list behind the dialog re-reads. */
  refresh(): void;
}

const STATE_WORDS: Record<RowState, string> = {
  ready: "Ready",
  fault: "Fault",
  none: "No answer",
  applied: "Already applied",
  withdrawn: "Withdrawn",
};

const say = (e: unknown): string => String(e instanceof Error ? e.message : e).slice(0, 240);

/** Run `work` over `items`, a few at a time. */
async function pooled<T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, lane));
}

export function openImportAnswers(deps: ImportDeps): void {
  const dlgHost = el("div", "app-dlghost");
  deps.host.appendChild(dlgHost);
  let running = false;
  let stop = false;
  let rows: AnswerRow[] = [];
  let judged: Judged[] = [];
  const known = new Map<string, KnownIssue>();
  const issueRows = new Map<string, Issue>();
  /** Ticked rows, by the file's line. */
  const ticked = new Set<number>();
  /** Rows a tick was taken off by hand — a re-judge does not put it back. */
  const unticked = new Set<number>();
  const results = new Map<number, { ok: boolean; text: string }>();
  const rowEls = new Map<number, { paint: () => void }>();

  const dlg = openDialog({
    host: dlgHost,
    title: "Import answers",
    maxWidth: 1040,
    onClose: () => dlgHost.remove(),
    buttons: [
      {
        label: "Close",
        kind: "secondary",
        onClick: () => {
          if (running) {
            stop = true;
            status.textContent = "Stopping after this row…";
          } else dlg.close();
        },
      },
      { label: "Apply", kind: "primary", onClick: () => void apply() },
    ],
  });
  dlg.body.classList.add("app-isimp-body");
  const applyBtn = dlg.root.querySelector(".ltk-btn-primary") as HTMLButtonElement;
  const closeBtn = dlg.root.querySelector(".ltk-btn-secondary") as HTMLButtonElement;

  // ---- the file ------------------------------------------------------------
  const bar = el("div", "app-isimp-bar");
  const pick = el("input", "") as HTMLInputElement;
  pick.type = "file";
  pick.accept = ".csv,text/csv";
  pick.style.display = "none";
  const pickBtn = el("button", "app-btn", "Choose a file…") as HTMLButtonElement;
  pickBtn.type = "button";
  pickBtn.addEventListener("click", () => {
    if (!running) pick.click();
  });
  const fileName = el("span", "app-isimp-file", "A CSV of answers: one row per issue, keyed by IssueID. Export to CSV gives the layout.");
  const tellLabel = el("label", "app-isimp-tell");
  const tell = el("input", "") as HTMLInputElement;
  tell.type = "checkbox";
  tell.checked = true;
  tellLabel.append(tell, document.createTextNode(" Tell people on Teams"));
  tellLabel.title = "One card per person listing their answers. Unticked, statuses and threads are written and nobody is told.";
  bar.append(pickBtn, pick, fileName, el("span", "app-bar-gap"), tellLabel);
  const tally = el("div", "app-isimp-tally");
  const table = el("div", "app-isimp-table");
  const status = el("div", "app-docs-addstatus");
  const told = el("div", "app-isimp-told");
  dlg.body.append(bar, tally, table, status, told);

  const warn = (text: string) => {
    status.textContent = text;
    status.classList.toggle("app-docs-addstatus-warn", text !== "");
  };
  const info = (text: string) => {
    status.textContent = text;
    status.classList.remove("app-docs-addstatus-warn");
  };

  const paintFoot = () => {
    const n = judged.filter((j) => ticked.has(j.row.line)).length;
    applyBtn.textContent = n > 0 ? `Apply ${n}` : "Apply";
    applyBtn.disabled = running || n === 0;
    closeBtn.textContent = running ? "Stop" : "Close";
    tally.textContent = judged.length > 0 ? tallyLine(judged) : "";
    pickBtn.disabled = running;
    tell.disabled = running;
  };

  /** Judge again and bring the ticks in line: a row that became ready
   *  is ticked (unless a hand unticked it); one that is no longer
   *  applicable loses its tick. */
  const rejudge = () => {
    judged = judgeRows(rows, known);
    for (const j of judged) {
      const can = j.state === "ready" || j.state === "withdrawn";
      if (!can) ticked.delete(j.row.line);
      else if (j.state === "ready" && !unticked.has(j.row.line)) ticked.add(j.row.line);
    }
    for (const r of rowEls.values()) r.paint();
    paintFoot();
  };

  pick.addEventListener("change", () => {
    const file = pick.files?.[0];
    pick.value = "";
    if (file === undefined) return;
    void load(file);
  });

  const load = async (file: File) => {
    clear(table);
    clear(told);
    rowEls.clear();
    ticked.clear();
    unticked.clear();
    results.clear();
    known.clear();
    issueRows.clear();
    rows = [];
    judged = [];
    paintFoot();
    fileName.textContent = file.name;
    try {
      const text = decodeCsv(new Uint8Array(await file.arrayBuffer()));
      const read = readAnswers(text);
      if (read.error !== "") {
        warn(read.error);
        return;
      }
      rows = read.rows;
      const ids = [...new Set(rows.flatMap((r) => [r.id, r.parentId]).filter((id) => looksLikeId(id)))];
      let done = 0;
      info(`Reading ${ids.length} issue${ids.length === 1 ? "" : "s"}…`);
      await pooled(ids, 6, async (id) => {
        try {
          const r = await Ben_ltkissuesService.get(id);
          if (r.success !== false && r.data !== undefined && r.data !== null && (r.data.ben_ltkissueid ?? "") !== "") {
            const issue = r.data;
            const m = await Ben_ltkissuemessagesService.getAll({ filter: `_ben_issue_value eq '${id}'`, select: ["ben_body", "ben_audience"] });
            const msgs = m.success === false ? [] : (m.data ?? []);
            const bodies = (aud: string) => msgs.filter((x) => (x.ben_audience ?? "") === aud).map((x) => (x.ben_body ?? "").replace(/\s+/g, " ").trim());
            issueRows.set(id, issue);
            known.set(id, {
              id,
              title: issue.ben_name ?? "",
              reporter: issue.ben_reportername || issue.ben_reporteremail || "",
              status: issue.ben_status ?? "new",
              resolution: issue.ben_resolution ?? "",
              parentId: normId(issue._ben_duplicateof_value ?? ""),
              reporterMessages: bodies("reporter"),
              internalMessages: bodies("internal"),
            });
          }
        } catch {
          /* not here — the row says so */
        }
        info(`Reading issues… ${++done} of ${ids.length}`);
      });
      judged = judgeRows(rows, known);
      for (const j of judged) table.appendChild(rowEl(j.row));
      rejudge();
      if (fromElsewhere(judged)) warn("None of these ids is an issue here. The file looks like it came from another environment.");
      else info("");
    } catch (e) {
      warn(`The file could not be read: ${say(e)}`);
    }
  };

  // ---- one row of the preview ------------------------------------------------
  const rowEl = (row: AnswerRow): HTMLElement => {
    const wrap = el("div", "app-isimp-row");
    const check = el("input", "app-isimp-check") as HTMLInputElement;
    check.type = "checkbox";
    check.addEventListener("change", () => {
      if (check.checked) {
        ticked.add(row.line);
        unticked.delete(row.line);
      } else {
        ticked.delete(row.line);
        unticked.add(row.line);
      }
      paintFoot();
    });
    const what = el("div", "app-isimp-what");
    const title = el("div", "app-isimp-title", "");
    const meta = el("div", "app-isimp-meta", "");
    what.append(title, meta);
    const change = el("div", "app-isimp-change");
    const body = el("div", "app-isimp-msg");
    const box = el("textarea", "app-input app-isimp-box") as HTMLTextAreaElement;
    box.rows = 3;
    box.value = row.message;
    box.placeholder = "The message to the reporter";
    const count = el("span", "app-isimp-count", "");
    const line = el("div", "app-isimp-line", "");
    const notes = el("div", "app-isimp-notes");
    body.append(box, count, line, notes);
    const result = el("div", "app-isimp-result", "");
    wrap.append(check, what, change, body, result);

    box.addEventListener("input", () => {
      row.message = box.value.replace(/\s*[\r\n]+\s*/g, " ").replace(/\s+/g, " ").trim();
      rejudge();
    });

    const paint = () => {
      const j = judged.find((x) => x.row === row);
      if (j === undefined) return;
      const can = j.state === "ready" || j.state === "withdrawn";
      check.disabled = running || !can;
      check.checked = ticked.has(row.line);
      wrap.className = `app-isimp-row app-isimp-row-${j.state}`;
      title.textContent = j.issue !== null ? j.issue.title : row.id !== "" ? row.id : `Line ${row.line}`;
      meta.textContent = j.issue !== null ? [j.issue.reporter, `line ${row.line}`].filter((s) => s !== "").join(" · ") : `line ${row.line}`;
      clear(change);
      const from = j.issue !== null ? statusWord(j.issue.status) : "";
      const to = row.status !== "" ? (row.status === "merged" ? `Merged into “${known.get(row.parentId)?.title ?? row.parentId}”` : (STATUS_WORDS[row.status] ?? row.status)) : row.statusWord;
      if (j.state !== "none") {
        if (from !== "") change.appendChild(el("span", "app-isimp-from", from));
        // a status that does not change is said once
        if (to !== "" && !(to === from && row.status !== "merged")) change.appendChild(el("span", "app-isimp-to", `${from !== "" ? "→ " : ""}${to}`));
      }
      change.appendChild(el("span", `app-isimp-state app-isimp-state-${j.state}`, STATE_WORDS[j.state]));
      // only a row whose message could matter keeps its box
      const editable = !running && (j.state === "ready" || j.state === "withdrawn" || (j.state === "fault" && j.issue !== null));
      box.style.display = j.state === "none" ? "none" : "";
      box.disabled = !editable;
      count.style.display = j.state === "none" ? "none" : "";
      count.textContent = `${row.message.length}/${MESSAGE_MAX}`;
      count.classList.toggle("app-isimp-count-over", row.message.length > MESSAGE_MAX);
      const reso = j.state === "none" ? "" : resolutionLine(row);
      // a date the file had in another form is said in words when the
      // line itself does not carry it, so a wrong reading is seen
      const dated = (row.date ?? "") !== "" && row.dateText !== row.date && !reso.includes(dateWords(row.date ?? "")) ? `ResolvedDate read as ${dateWords(row.date ?? "")}.` : "";
      line.textContent = [reso !== "" ? `Resolution: ${reso}` : "", dated].filter((x) => x !== "").join(" ");
      clear(notes);
      for (const f of j.faults) notes.appendChild(el("div", "app-isimp-fault", f));
      for (const n of j.notes) notes.appendChild(el("div", "app-isimp-note", n));
      if (row.note !== "" && j.state !== "none") notes.appendChild(el("div", "app-isimp-note", `Internal note: ${row.note}`));
      const res = results.get(row.line);
      result.textContent = res?.text ?? "";
      result.className = `app-isimp-result${res === undefined ? "" : res.ok ? " app-isimp-result-ok" : " app-isimp-result-bad"}`;
    };
    rowEls.set(row.line, { paint });
    return wrap;
  };

  // ---- apply -----------------------------------------------------------------
  /** Answers written in this dialog and not yet told. */
  let untold: Answered[] = [];

  const io: ApplyIo = {
    setStatus: async (id, to) => {
      const r = await Ben_ltkissuesService.update(id, { ben_status: to });
      if (r.success === false) throw new Error(r.error?.message ?? "refused");
      await deps.writeMessage(id, `Status → ${STATUS_WORDS[to] ?? to}`, "reporter");
      const row = issueRows.get(id);
      if (row !== undefined) row.ben_status = to;
    },
    merge: async (childId, parentId) => {
      const child = issueRows.get(childId);
      const parent = issueRows.get(parentId);
      if (child === undefined || parent === undefined) throw new Error("the issue or its parent could not be read");
      await deps.mergeInto(child, parent);
      child.ben_status = "merged";
    },
    setResolution: async (id, line) => {
      const r = await Ben_ltkissuesService.update(id, { ben_resolution: line });
      if (r.success === false) throw new Error(r.error?.message ?? "refused");
    },
    message: (id, text, audience) => deps.writeMessage(id, text, audience),
  };

  const apply = async () => {
    if (running) return;
    const todo = judged.filter((j) => ticked.has(j.row.line) && (j.state === "ready" || j.state === "withdrawn"));
    if (todo.length === 0) return;
    running = true;
    stop = false;
    rejudge();
    let ok = 0;
    let bad = 0;
    let n = 0;
    for (const j of todo) {
      if (stop) break;
      n++;
      info(`Applying ${n} of ${todo.length}…`);
      const r = await applyRow(j, io);
      const row = j.row;
      if (r.messageWritten && j.issue !== null) {
        untold.push({ issueId: j.issue.id, title: j.issue.title, outcome: statusWord(row.status), message: row.message, parentId: row.status === "merged" ? row.parentId : "", audience: [] });
      }
      if (r.ok) {
        ok++;
        results.set(row.line, { ok: true, text: "Applied ✓" });
        ticked.delete(row.line);
      } else {
        bad++;
        results.set(row.line, { ok: false, text: r.error });
      }
      rowEls.get(row.line)?.paint();
    }
    const stopped = stop && n < todo.length;
    const summary = `${ok} applied${bad > 0 ? `, ${bad} failed and still ticked` : ""}${stopped ? `, stopped with ${todo.length - n} to go` : ""}.`;
    if (tell.checked && untold.length > 0) {
      info(`${summary} Working out who to tell…`);
      await tellPeople();
    } else if (untold.length > 0) {
      told.appendChild(el("div", "app-isimp-note", `Nobody was told: “Tell people on Teams” was off. The ${untold.length === 1 ? "answer is" : `${untold.length} answers are`} on the thread${untold.length === 1 ? "" : "s"}.`));
      untold = [];
    }
    running = false;
    stop = false;
    rejudge();
    if (bad > 0) warn(`${summary} Apply again to run the failed rows: steps already done are skipped.`);
    else info(summary);
    deps.refresh();
  };

  // ---- one card per person ------------------------------------------------------
  const tellPeople = async () => {
    const batch = untold;
    untold = [];
    for (const a of batch) {
      const issue = issueRows.get(a.issueId);
      try {
        a.audience = issue === undefined ? [] : await deps.audience(issue);
      } catch {
        a.audience = [];
      }
    }
    const alone = batch.filter((a) => a.audience.length === 0).length;
    const cards = cardsFor(batch);
    if (alone > 0) told.appendChild(el("div", "app-isimp-note", `${alone} answer${alone === 1 ? " is on a report" : "s are on reports"} only you are on: no card (Teams refuses a chat with yourself). ${alone === 1 ? "It is" : "They are"} on the thread${alone === 1 ? "" : "s"}.`));
    status.textContent = `Telling ${cards.length} ${cards.length === 1 ? "person" : "people"} on Teams…`;
    for (const card of cards) told.appendChild(cardLine(card));
    await Promise.all(pending.splice(0));
  };

  const pending: Promise<void>[] = [];
  const cardLine = (card: PersonCard): HTMLElement => {
    const line = el("div", "app-isimp-card");
    const who = el("span", "app-isimp-cardwho", `${card.name} — ${card.count} answer${card.count === 1 ? "" : "s"}${card.subject.includes(" of ") ? ` ${card.subject.slice(card.subject.lastIndexOf("("))}` : ""}`);
    const how = el("span", "app-isimp-cardhow", "sending…");
    const again = el("button", "app-link", "Send again") as HTMLButtonElement;
    again.type = "button";
    again.style.display = "none";
    line.append(who, how, again);
    const send = async () => {
      again.style.display = "none";
      how.textContent = "sending…";
      how.className = "app-isimp-cardhow";
      let why: string;
      try {
        why = await deps.sendCard(card);
      } catch (e) {
        why = say(e);
      }
      if (why === "") {
        how.textContent = "sent ✓";
        how.classList.add("app-isimp-cardhow-ok");
      } else {
        how.textContent = `did not go: ${why}`;
        how.classList.add("app-isimp-cardhow-bad");
        again.style.display = "";
      }
    };
    again.addEventListener("click", () => void send());
    // one after another — Teams throttles a burst of new chats
    const prev = pending[pending.length - 1] ?? Promise.resolve();
    pending.push(prev.then(send));
    return line;
  };

  paintFoot();
}
