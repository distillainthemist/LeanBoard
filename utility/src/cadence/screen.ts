// Cadence Current State — the screen: choose a period → scan → review
// (tick to include, flag confidential) → export JSON, or Excel.
// Rules live in model.ts / exportDoc.ts; this file only holds the
// person's choices and paints them.

import { getContext } from "@microsoft/power-apps/app";
import { writeXlsx } from "../../../shared/export/xlsx";
import { addMonths, groupMeetings, noticeText, normaliseAll, periodProblem, SHORT_NOTICE_HOURS, type Meeting, type MeetingGroup, type ExcludeReason } from "./model";
import { buildExport, exportJson, exportSheets } from "./exportDoc";
import { scanCalendar, ScanCancelled } from "./read";
import { download } from "../download";
import {
  recipientProblem,
  taskPeriod,
  taskPeriodText,
  resultSubject,
  taskLink,
  taskProblem,
  summaryHtml,
  toBase64,
  EMAIL_FILE_LINE,
  NOTE_MAX,
  type CadenceTask,
  type PlayerHost,
} from "./share";
import type { MailFile } from "./deliver";
import { el, clear } from "../dom";

interface Reviewed {
  groups: MeetingGroup[];
  excluded: Record<ExcludeReason, number>;
  included: Set<string>;
  confidential: Set<string>;
  expanded: Set<string>;
  road: "graph" | "typed";
  warnings: string[];
  period: { from: string; to: string };
}

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const localMidnight = (iso: string, plusDays = 0): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d + plusDays);
};
const hm = (wall: string): string => wall.slice(11, 16);
const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
const fmtHours = (min: number): string => {
  const h = min / 60;
  return h >= 10 ? `${Math.round(h)} h` : `${Math.round(h * 10) / 10} h`;
};
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** The harness (harness/cadence.html) hands in a stub scan and viewer;
 *  the app never passes these. */
export interface CadenceHooks {
  scan?: typeof scanCalendar;
  viewer?: { name: string; upn: string };
  /** Carriage stubs for the harness: "" = sent, else the reason. */
  mail?: (email: string, subject: string, html: string, files: MailFile[]) => Promise<string>;
  /** A task from a task link: scan at once, offer "Send to …" on the review. */
  task?: CadenceTask | null;
}

export function mountCadence(host: HTMLElement, back: () => void, hooks: CadenceHooks = {}): void {
  const scan = hooks.scan ?? scanCalendar;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let viewerName = "";
  let viewerEmail = "";
  let playerHost: PlayerHost | null = null;
  let internalDomains: string[] = [];
  const task = hooks.task ?? null;
  const mail = hooks.mail ?? (async (...a: [string, string, string, MailFile[]]) => (await import("./deliver")).sendByEmail(...a));
  const ready = (async () => {
    if (hooks.viewer) {
      viewerName = hooks.viewer.name;
      viewerEmail = hooks.viewer.upn.toLowerCase();
      internalDomains = [hooks.viewer.upn.split("@")[1]];
      return true;
    }
    try {
      const ctx = await Promise.race([getContext(), new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 2500))]);
      const upn = ctx.user?.userPrincipalName ?? "";
      viewerName = ctx.user?.fullName ?? upn;
      viewerEmail = upn.toLowerCase();
      playerHost = { appId: ctx.app?.appId ?? "", environmentId: ctx.app?.environmentId ?? "", tenantId: ctx.user?.tenantId ?? "" };
      const domain = upn.includes("@") ? upn.split("@")[1].toLowerCase() : "";
      internalDomains = domain ? [domain] : [];
      return true;
    } catch {
      return false;
    }
  })();

  let from = addMonths(todayIso(), -1);
  let to = todayIso();
  if (task) ({ from, to } = taskPeriod(task, todayIso()));
  let state: Reviewed | null = null;

  // ---- 1. period ----------------------------------------------------------
  function paintStart(): void {
    clear(host);
    const page = el("main", "u-page");
    const head = el("div", "u-head");
    const backBtn = el("button", "app-link", "‹ Tools");
    backBtn.addEventListener("click", back);
    head.append(backBtn);
    page.append(head, el("h1", "u-title", "Cadence Current State"));
    page.append(
      el(
        "p",
        "",
        "Reads the meetings in your own Outlook calendar for the period you choose, so you can review them and export a summary " +
          "for analysis. Nothing is stored by the app: the files you download, or email to a colleague, are the only copies."
      ),
      el(
        "p",
        "u-muted",
        "Cancelled meetings and ones you declined are left out. Meetings marked personal, private or confidential are flagged " +
          "confidential and export with their timing only. You can change any tick or flag before exporting."
      )
    );

    const card = el("section", "u-card");
    const presets = el("div", "u-bar");
    const preset = (label: string, months: number): void => {
      const b = el("button", "app-btn", label);
      b.addEventListener("click", () => {
        const t = todayIso();
        if (months < 0) {
          from = addMonths(t, months);
          to = t;
        } else {
          from = t;
          to = addMonths(t, months);
        }
        paintStart();
      });
      presets.append(b);
    };
    preset("Last month", -1);
    preset("Last 3 months", -3);
    preset("Last 6 months", -6);
    preset("Last 12 months", -12);
    preset("Next month", 1);
    preset("Next 3 months", 3);

    const fields = el("div", "u-fields");
    const fromIn = el("input", "u-input") as HTMLInputElement;
    fromIn.type = "date";
    fromIn.value = from;
    const toIn = el("input", "u-input") as HTMLInputElement;
    toIn.type = "date";
    toIn.value = to;
    const lab = (text: string, input: HTMLElement): HTMLElement => {
      const l = el("label", "u-field");
      l.append(el("span", "u-muted", text), input);
      return l;
    };
    fields.append(lab("From", fromIn), lab("To", toIn));
    const problem = el("p", "u-problem");
    const scan = el("button", "app-btn app-btn-primary", "Scan my calendar");
    const check = (): void => {
      from = fromIn.value;
      to = toIn.value;
      const p = periodProblem(from, to);
      problem.textContent = p ?? "";
      scan.disabled = p !== null;
    };
    fromIn.addEventListener("change", check);
    toIn.addEventListener("change", check);
    scan.addEventListener("click", () => void runScan());
    card.append(el("h2", "u-h2", "Period"), presets, fields, problem, el("p", "u-muted", `Times are shown in ${timeZone}. At most 12 months.`), scan);
    page.append(card, taskLinkCard());
    host.append(page);
    check();
  }

  // ---- task link ----------------------------------------------------------
  let linkMonths = -1; // 0 = fixed dates
  let linkFrom = addMonths(todayIso(), -1);
  let linkTo2 = todayIso();
  let linkTo = "";
  let linkNote = "";
  function taskLinkCard(): HTMLElement {
    const card = el("section", "u-card");
    card.append(
      el("h2", "u-h2", "Task link"),
      el(
        "p",
        "u-muted",
        "Make a link to hand to someone. It opens this tool, scans their calendar for the period you pick (a relative period counts from the day they open it; fixed dates stay as set), " +
          "and once they have reviewed the meetings, offers to send the result to the person you name: by email, with the JSON and Excel files attached."
      )
    );
    const fields = el("div", "u-fields");
    const sel = el("select", "u-input") as HTMLSelectElement;
    for (const [v, label] of [[-1, "Last month"], [-3, "Last 3 months"], [-6, "Last 6 months"], [-12, "Last 12 months"], [1, "Next month"], [3, "Next 3 months"]] as const) {
      const o = el("option", "", label) as HTMLOptionElement;
      o.value = String(v);
      o.selected = v === linkMonths;
      sel.append(o);
    }
    const fixedOpt = el("option", "", "Fixed dates…") as HTMLOptionElement;
    fixedOpt.value = "0";
    fixedOpt.selected = linkMonths === 0;
    sel.append(fixedOpt);
    const fromIn = el("input", "u-input") as HTMLInputElement;
    fromIn.type = "date";
    fromIn.value = linkFrom;
    const toDate = el("input", "u-input") as HTMLInputElement;
    toDate.type = "date";
    toDate.value = linkTo2;
    const toIn = el("input", "u-input") as HTMLInputElement;
    toIn.type = "email";
    toIn.placeholder = "name@company.com";
    toIn.value = linkTo;
    const noteIn = el("textarea", "u-input u-note") as HTMLTextAreaElement;
    noteIn.maxLength = NOTE_MAX;
    noteIn.rows = 2;
    noteIn.placeholder = "Optional: what the scan is for";
    noteIn.value = linkNote;
    const lab = (text: string, input: HTMLElement): HTMLElement => {
      const l = el("label", "u-field");
      l.append(el("span", "u-muted", text), input);
      return l;
    };
    const fromLab = lab("From", fromIn);
    const toLab = lab("To", toDate);
    const showDates = (): void => {
      fromLab.hidden = toLab.hidden = sel.value !== "0";
    };
    sel.addEventListener("change", showDates);
    showDates();
    fields.append(lab("Period", sel), fromLab, toLab, lab("Send the result to", toIn));
    const noteLab = lab("Note shown to them and in the message", noteIn);
    noteLab.classList.add("u-field-wide");
    fields.append(noteLab);
    const problem = el("p", "u-problem");
    const make = el("button", "app-btn app-btn-primary", "Create link");
    const out = el("div", "u-linkout");
    make.addEventListener("click", async () => {
      linkMonths = Number(sel.value);
      linkFrom = fromIn.value;
      linkTo2 = toDate.value;
      linkTo = toIn.value.trim();
      linkNote = noteIn.value;
      await ready;
      const t: CadenceTask =
        linkMonths === 0 ? { months: -1, from: linkFrom, to: linkTo2, sendTo: linkTo, note: linkNote } : { months: linkMonths, sendTo: linkTo, note: linkNote };
      const p = taskProblem(t, internalDomains);
      problem.textContent = p ?? "";
      clear(out);
      if (p) return;
      const url = taskLink(t, playerHost, window.location.href);
      const box = el("input", "u-input u-linkbox") as HTMLInputElement;
      box.readOnly = true;
      box.value = url;
      box.addEventListener("focus", () => box.select());
      const copy = el("button", "app-btn", "Copy link");
      const said = el("span", "u-muted");
      copy.addEventListener("click", () => {
        box.select();
        navigator.clipboard?.writeText(url).then(
          () => (said.textContent = "Copied."),
          () => (said.textContent = "The host refused the clipboard — copy it from the box.")
        ) ?? (said.textContent = "Copy it from the box.");
      });
      out.append(box, copy, said, el("p", "u-muted", `Whoever opens it scans their own calendar for ${taskPeriodText(t)}. Nothing is sent until they press Send.`));
    });
    card.append(fields, problem, make, out);
    return card;
  }

  // ---- 2. scan --------------------------------------------------------------
  async function runScan(): Promise<void> {
    clear(host);
    let cancelled = false;
    const page = el("main", "u-page");
    const status = el("p", "", "Reading your calendar…");
    const spinner = el("div", "u-spinner");
    const cancel = el("button", "app-btn", "Cancel");
    cancel.addEventListener("click", () => {
      cancelled = true;
      cancel.disabled = true;
      status.textContent = "Stopping…";
    });
    page.append(el("h1", "u-title", "Cadence Current State"), el("div", "u-row", ""), spinner, status, cancel);
    host.append(page);
    const hosted = await ready;
    if (!hosted) {
      status.textContent = "This tool runs inside the Power Apps player. Open it from Power Apps to read your calendar.";
      spinner.remove();
      cancel.textContent = "Back";
      cancel.disabled = false;
      cancel.addEventListener("click", paintStart);
      return;
    }
    try {
      const r = await scan({
        start: localMidnight(from),
        end: localMidnight(to, 1),
        timeZone,
        internalDomains,
        progress: (t) => (status.textContent = t),
        cancelled: () => cancelled,
      });
      const ctx = { internalDomains, timeZone };
      const { meetings, excluded } = normaliseAll(r.events, ctx);
      const groups = groupMeetings(meetings, r.masters, ctx);
      state = {
        groups,
        excluded,
        included: new Set(meetings.map((m) => m.key)),
        confidential: new Set(meetings.filter((m) => m.confidentialByDefault).map((m) => m.key)),
        expanded: new Set(),
        road: r.road,
        warnings: r.warnings,
        period: { from, to },
      };
      paintReview();
    } catch (e) {
      if (e instanceof ScanCancelled) {
        paintStart();
        return;
      }
      spinner.remove();
      status.textContent = `The calendar could not be read: ${String((e as Error)?.message ?? e).slice(0, 300)}`;
      cancel.textContent = "Back";
      cancel.disabled = false;
      cancel.addEventListener("click", paintStart);
    }
  }

  // ---- 3. review ------------------------------------------------------------
  let filter: "all" | "series" | "one-off" | "confidential" | "external" | "short" = "all";
  let search = "";

  function visible(g: MeetingGroup, s: Reviewed): boolean {
    if (filter === "series" && g.kind !== "series") return false;
    if (filter === "one-off" && g.kind !== "one-off") return false;
    if (filter === "confidential" && !g.meetings.some((m) => s.confidential.has(m.key))) return false;
    if (filter === "external" && !g.meetings.some((m) => m.attendees.some((a) => !a.internal && a.role !== "resource" && a.email !== ""))) return false;
    if (filter === "short" && !g.shortNotice && !g.meetings.some((m) => m.shortNotice)) return false;
    if (search !== "") {
      const q = search.toLowerCase();
      if (!g.subject.toLowerCase().includes(q) && !g.meetings.some((m) => m.location.toLowerCase().includes(q) || m.organizer.name.toLowerCase().includes(q))) return false;
    }
    return true;
  }

  function paintReview(): void {
    const s = state;
    if (!s) return paintStart();
    clear(host);
    const page = el("main", "u-page u-page-wide");
    const head = el("div", "u-head");
    const again = el("button", "app-link", "‹ Change period");
    again.addEventListener("click", paintStart);
    head.append(again);
    page.append(head, el("h1", "u-title", "Cadence Current State"));
    page.append(el("p", "u-muted", `${fmtDate(s.period.from)} to ${fmtDate(s.period.to)} · ${timeZone}`));
    for (const w of s.warnings) page.append(el("p", "u-warn", w));
    if (task) {
      const b = el("div", "u-task");
      if (task.note.trim() !== "") b.append(el("p", "", task.note.trim()));
      b.append(el("p", "u-muted", "Untick anything that should not be counted and flag anything confidential, then press Send at the bottom."));
      page.append(b);
    }

    const all = s.groups.flatMap((g) => g.meetings);
    const inc = all.filter((m) => s.included.has(m.key));
    const dropped = s.excluded.cancelled + s.excluded.declined;
    if (dropped > 0) page.append(el("p", "u-muted", `Left out: ${plural(s.excluded.cancelled, "cancelled meeting")} and ${plural(s.excluded.declined, "declined meeting")}.`));
    const nShort = s.groups.filter((g) => g.shortNotice).length + all.filter((m) => m.shortNotice && m.seriesKey !== "").length;
    if (nShort > 0) {
      page.append(
        el("p", "u-muted", `${plural(nShort, "meeting or series was", "meetings or series were")} issued with under ${SHORT_NOTICE_HOURS} h notice (a series counts from its creation to its first meeting; a moved occurrence from the move).`)
      );
    }

    // filters
    const tools = el("div", "u-bar");
    const searchIn = el("input", "u-input u-search") as HTMLInputElement;
    searchIn.type = "search";
    searchIn.placeholder = "Search subject, location, organizer";
    searchIn.value = search;
    searchIn.addEventListener("input", () => {
      search = searchIn.value;
      paintList();
    });
    tools.append(searchIn);
    const chips = el("div", "u-chips");
    const chip = (key: typeof filter, label: string): void => {
      const b = el("button", `app-btn u-chip${filter === key ? " is-on" : ""}`, label);
      b.setAttribute("aria-pressed", String(filter === key));
      b.addEventListener("click", () => {
        filter = key;
        paintReview();
      });
      chips.append(b);
    };
    chip("all", "All");
    chip("series", "Recurring");
    chip("one-off", "One-off");
    chip("confidential", "Confidential");
    chip("external", "With external people");
    chip("short", "Short notice");
    tools.append(chips);
    const tickAll = el("button", "app-link", "Tick all shown");
    const tickNone = el("button", "app-link", "Untick all shown");
    const setShown = (on: boolean): void => {
      for (const g of s.groups) if (visible(g, s)) for (const m of g.meetings) on ? s.included.add(m.key) : s.included.delete(m.key);
      paintReview();
    };
    tickAll.addEventListener("click", () => setShown(true));
    tickNone.addEventListener("click", () => setShown(false));
    tools.append(tickAll, tickNone);
    page.append(tools);

    const list = el("div", "u-list");
    page.append(list);

    function paintList(): void {
      clear(list);
      const shown = s!.groups.filter((g) => visible(g, s!));
      if (shown.length === 0) list.append(el("p", "u-muted", all.length === 0 ? "No meetings in this period." : "Nothing matches."));
      for (const g of shown) list.append(groupRow(g, s!));
    }
    paintList();

    // export
    const bar = el("div", "u-exportbar");
    const json = el("button", "app-btn app-btn-primary", "Export JSON");
    const xlsx = el("button", "app-btn", "Export Excel");
    json.disabled = xlsx.disabled = inc.length === 0;
    json.addEventListener("click", () => doExport("json"));
    xlsx.addEventListener("click", () => doExport("xlsx"));
    const sendBtn = el("button", task ? "app-btn app-btn-primary" : "app-btn", task ? `Send to ${task.sendTo}` : "Send to a colleague…");
    sendBtn.disabled = inc.length === 0;
    if (task) json.className = "app-btn";
    bar.append(el("span", "u-muted", `${plural(inc.length, "meeting")} will be exported`), json, xlsx, sendBtn);
    page.append(bar);
    const panel = el("div", "u-sharepanel");
    page.append(panel);
    sendBtn.addEventListener("click", () => paintShare(panel, task?.sendTo ?? ""));
    host.append(page);
  }

  // ---- send to a colleague --------------------------------------------------
  let lastSentTo = "";
  function paintShare(panel: HTMLElement, preset: string): void {
    clear(panel);
    const card = el("section", "u-card");
    card.append(
      el("h2", "u-h2", "Send the result"),
      el(
        "p",
        "u-muted",
        "Emails the JSON and Excel files from your mailbox (a copy stays in your Sent Items), with a summary: the period, the counts and the " +
          "recurring series by hours. Confidential meetings appear as Confidential, as in the files."
      )
    );
    const toIn = el("input", "u-input") as HTMLInputElement;
    toIn.type = "email";
    toIn.placeholder = "name@company.com";
    toIn.value = preset || lastSentTo;
    toIn.readOnly = task !== null;
    const problem = el("p", "u-problem");
    const go = el("button", "app-btn app-btn-primary", "Send");
    const cancel = el("button", "app-btn", "Close");
    cancel.addEventListener("click", () => clear(panel));
    go.addEventListener("click", async () => {
      const email = toIn.value.trim().toLowerCase();
      const p = recipientProblem(email, internalDomains, viewerEmail);
      problem.textContent = p ?? "";
      if (p) return;
      go.disabled = cancel.disabled = true;
      go.textContent = "Sending…";
      const doc = currentDoc();
      const name = fileBase();
      const files: MailFile[] = [
        { name: `${name}.json`, content: toBase64(new TextEncoder().encode(exportJson(doc))) },
        { name: `${name}.xlsx`, content: toBase64(writeXlsx(exportSheets(doc))) },
      ];
      const subject = resultSubject(doc);
      const mailWhy = await mail(email, subject, summaryHtml(doc, { note: task?.note, fileLine: EMAIL_FILE_LINE }), files);
      go.disabled = cancel.disabled = false;
      go.textContent = "Send";
      if (mailWhy !== "") {
        problem.textContent = `The email was not sent: ${mailWhy}`;
        return;
      }
      lastSentTo = email;
      clear(card);
      card.append(el("h2", "u-h2", "Sent"), el("p", "", `Emailed to ${email} with the JSON and Excel files. A copy is in your Sent Items.`));
      const close = el("button", "app-btn", "Close");
      close.addEventListener("click", () => clear(panel));
      card.append(close);
    });
    const l = el("label", "u-field");
    l.append(el("span", "u-muted", "To"), toIn);
    const bar = el("div", "u-bar");
    bar.append(go, cancel);
    card.append(l, problem, bar);
    panel.append(card);
    panel.scrollIntoView?.({ block: "nearest" });
  }

  function groupRow(g: MeetingGroup, s: Reviewed): HTMLElement {
    const row = el("div", `u-group${g.kind === "series" ? " is-series" : ""}`);
    const line = el("div", "u-line");
    const keys = g.meetings.map((m) => m.key);
    const nIn = keys.filter((k) => s.included.has(k)).length;
    const nConf = keys.filter((k) => s.confidential.has(k)).length;
    const box = el("input") as HTMLInputElement;
    box.type = "checkbox";
    box.checked = nIn === keys.length;
    box.indeterminate = nIn > 0 && nIn < keys.length;
    box.setAttribute("aria-label", `Include ${g.subject || "meeting"}`);
    box.addEventListener("change", () => {
      for (const k of keys) box.checked ? s.included.add(k) : s.included.delete(k);
      paintReview();
    });
    const m0 = g.meetings[0];
    const minutes = g.meetings.reduce((a, m) => a + m.durationMinutes, 0);
    const main = el("div", "u-main");
    main.append(el("div", "u-subject", g.subject || "(no subject)"));
    main.append(
      el(
        "div",
        "u-muted",
        g.kind === "series"
          ? `${g.recurrence} · ${plural(g.meetings.length, "occurrence")} in period · ${fmtHours(minutes)}`
          : `${fmtDate(m0.date)} · ${m0.isAllDay ? "all day" : `${hm(m0.start)}–${hm(m0.end)}`} · ${m0.location || (m0.onlineProvider ? "Online" : "No location")} · ${plural(m0.attendees.filter((a) => a.role !== "resource").length, "person", "people")}`
      )
    );
    const conf = el("button", `app-btn u-chip u-conf${nConf > 0 ? " is-on" : ""}`, nConf === 0 ? "Mark confidential" : nConf < keys.length ? `Confidential (${nConf} of ${keys.length})` : "Confidential");
    conf.setAttribute("aria-pressed", String(nConf === keys.length));
    conf.title = nConf > 0 ? "Exported with timing only. Click to export in full." : "Click to export with timing only.";
    conf.addEventListener("click", () => {
      const on = nConf < keys.length;
      for (const k of keys) on ? s.confidential.add(k) : s.confidential.delete(k);
      paintReview();
    });
    line.append(box, main);
    const badge = noticeBadge(g.noticeHours, g.shortNotice, g.kind === "series" ? `Series created ${g.created || "(unknown)"} for its first meeting ${g.firstStart || "(unknown)"}` : `Invite received ${g.created || "(unknown)"}`);
    if (badge) line.append(badge);
    line.append(conf);
    if (g.kind === "series") {
      const open = s.expanded.has(g.key);
      const exp = el("button", "app-link", open ? "Hide" : "Show all");
      exp.setAttribute("aria-expanded", String(open));
      exp.addEventListener("click", () => {
        open ? s.expanded.delete(g.key) : s.expanded.add(g.key);
        paintReview();
      });
      line.append(exp);
    }
    row.append(line);
    if (g.kind === "series" && s.expanded.has(g.key)) {
      const occ = el("div", "u-occ");
      for (const m of g.meetings) occ.append(occurrenceRow(m, s));
      row.append(occ);
    }
    return row;
  }

  function occurrenceRow(m: Meeting, s: Reviewed): HTMLElement {
    const line = el("div", "u-line u-line-occ");
    const box = el("input") as HTMLInputElement;
    box.type = "checkbox";
    box.checked = s.included.has(m.key);
    box.setAttribute("aria-label", `Include ${m.date}`);
    box.addEventListener("change", () => {
      box.checked ? s.included.add(m.key) : s.included.delete(m.key);
      paintReview();
    });
    const text = el(
      "div",
      "u-main",
      `${fmtDate(m.date)} · ${m.isAllDay ? "all day" : `${hm(m.start)}–${hm(m.end)}`} · ${plural(m.attendees.filter((a) => a.role !== "resource").length, "person", "people")}`
    );
    const isConf = s.confidential.has(m.key);
    const conf = el("button", `app-btn u-chip u-conf${isConf ? " is-on" : ""}`, isConf ? "Confidential" : "Mark confidential");
    conf.setAttribute("aria-pressed", String(isConf));
    conf.addEventListener("click", () => {
      isConf ? s.confidential.delete(m.key) : s.confidential.add(m.key);
      paintReview();
    });
    line.append(box, text);
    // only a moved occurrence carries its own notice (from the move)
    const badge = noticeBadge(m.noticeHours, m.shortNotice, `Moved ${m.lastModified || "(unknown)"}`, "moved, ");
    if (badge) line.append(badge);
    line.append(conf);
    return line;
  }

  /** "3 d notice" / "Short notice: 5 h notice" with the times in the tooltip; null when unknown. */
  function noticeBadge(hours: number | null, short: boolean, title: string, prefix = ""): HTMLElement | null {
    const text = noticeText(hours);
    if (text === "") return null;
    const b = el("span", `u-badge${short ? " u-badge-short" : ""}`, `${prefix}${text}`);
    b.title = title;
    return b;
  }

  function currentDoc(): ReturnType<typeof buildExport> {
    const s = state!;
    return buildExport({
      groups: s.groups,
      included: s.included,
      confidential: s.confidential,
      excluded: s.excluded,
      period: s.period,
      timeZone,
      internalDomains,
      generatedAt: new Date().toISOString(),
      generatedBy: viewerName,
      appVersion: __APP_VERSION__,
      road: s.road,
    });
  }

  function fileBase(): string {
    return `cadence-current-state-${state!.period.from}-to-${state!.period.to}`;
  }

  function doExport(kind: "json" | "xlsx"): void {
    const s = state;
    if (!s) return;
    const doc = currentDoc();
    const name = fileBase();
    if (kind === "json") download(new TextEncoder().encode(exportJson(doc)), `${name}.json`, "application/json");
    else download(writeXlsx(exportSheets(doc)), `${name}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  if (task) void runScan();
  else paintStart();
}
