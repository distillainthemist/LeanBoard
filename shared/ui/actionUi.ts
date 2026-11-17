// Shared action UI: the form (what / who / due), the list row with a
// complete/not-complete circle, and the raise/edit dialog. Every
// action-capable control uses these, so raising, editing, completing and
// cancelling an action looks and behaves identically toolkit-wide.
//
// Conventions carried here: one assignee or several (several = ONE shared
// action with a part each, 2026-11-17); actions are never hard-deleted (the danger button cancels); Done/Due/
// Overdue are capitalised; circle colours are set inline (Safari rule).

import { ActionComment, ActionPdca, ACTION_PDCA, assigneesLabel, canEditComment, cleanSupporters, COMMENT_EDIT_HOURS, duplicateAction, editComment, isOverdue, LtkAction, MAX_ASSIGNEES, mergeAssignees, newAction, newComment, partsLabel, partsTitle, settleFromParts, Supporter, supportLabel, PDCA_LABELS, PDCA_QUARTERS, pdcaOf } from "../schema/actions";
import { ActionLink, applyLink, boardOnlyTarget, currentLink, isCardKeyed, linkChanges, linkLabel, LinkTarget, searchLinkTargets } from "../schema/actionLinks";
import { ACTION_MOVED_EVENT, actionAttachments, actionDirectory, ActionDirectoryRoad, ActionLinkContext, actionLinkProvider, actionMessenger, actionTeam, ActionTeamRoad, actionViewer, endorsementFor } from "./actionLinkProvider";
import { dueMove, dueMoves, isLaterMove, reasonChoices, recordDueMove, slipCount } from "../schema/reschedule";
import { currentRescheduleSettings, rescheduleFields } from "./reschedulePrompt";
import { applyEndorsementRule, awaitingEndorsement, endorse, sendBack } from "../schema/actionEndorsement";
import { Person, splitWho } from "../schema/people";
import { textOn } from "../tokens";
import { el } from "./dom";
import {
  checkItem,
  checklist,
  fieldRow,
  openDialog,
  sectionLabel,
  textArea,
  textInput,
  selectInput,
} from "./dialog";

export interface ActionForm {
  el: HTMLElement;
  focus: () => void;
  hasContent: () => boolean;
  /** The due date as the form holds it now (yyyy-mm-dd, "" = none). */
  due: () => string;
  /** The Start / Due row — the dialog sets its two flags beside the dates. */
  dates: HTMLElement;
  apply: (action: LtkAction) => void;
}

/** A small type-ahead over a list of people (the standing search-picker
 *  pattern, docs/ui-standard.md §2.x): the list floats under the box with
 *  its own scroll, ↑ ↓ move, Enter picks (never the dialog's Save),
 *  Escape closes. */
function personTypeAhead(placeholder: string, find: (q: string) => Person[], onPick: (p: Person) => void): { el: HTMLElement; input: HTMLInputElement } {
  const input = textInput("", { placeholder });
  input.setAttribute("aria-label", placeholder);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.autocomplete = "off";
  const pop = el("div", "ltk-who-pop");
  pop.setAttribute("role", "listbox");
  pop.style.display = "none";
  const box = el("div", "ltk-who-box");
  box.append(input, pop);
  let options: { el: HTMLButtonElement; run: () => void }[] = [];
  let active = 0;
  const close = () => {
    pop.style.display = "none";
    input.setAttribute("aria-expanded", "false");
    options = [];
  };
  const paintActive = () => {
    options.forEach((o, n) => {
      o.el.classList.toggle("ltk-who-opt-on", n === active);
      o.el.setAttribute("aria-selected", String(n === active));
    });
    options[active]?.el.scrollIntoView({ block: "nearest" });
  };
  const render = () => {
    while (pop.firstChild) pop.removeChild(pop.firstChild);
    options = [];
    const q = input.value.trim().toLowerCase();
    if (q === "") return close();
    for (const person of find(q)) {
      const b = el("button", "ltk-who-opt") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("role", "option");
      b.appendChild(el("span", "ltk-who-opt-name", person.who));
      const run = () => {
        onPick(person);
        close();
      };
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", run);
      options.push({ el: b, run });
      pop.appendChild(b);
    }
    if (options.length === 0) pop.appendChild(el("div", "ltk-who-pop-note", "No one matches."));
    active = 0;
    pop.style.display = "";
    input.setAttribute("aria-expanded", "true");
    paintActive();
  };
  input.addEventListener("input", render);
  input.addEventListener("focus", () => {
    if (input.value.trim() !== "" && options.length === 0) render();
  });
  input.addEventListener("blur", () => setTimeout(() => {
    if (document.activeElement !== input) close();
  }, 150));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
      paintActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      options[active]?.run();
    } else if (e.key === "Escape" && pop.style.display !== "none") {
      e.preventDefault();
      close();
    }
  });
  return { el: box, input };
}

/** The action fields: description, who (one person or several — a
 *  shared action, a part each), support, the dates. */
export function buildActionForm(
  people: Person[],
  initial?: LtkAction,
  /** `initial` fills a NEW action (a duplicate): nothing has a part yet. */
  fresh = false
): ActionForm {
  const wrap = el("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "12px";

  const desc = textArea(initial?.description ?? "", {
    placeholder: "What will be done?",
    rows: 2,
  });
  const start = textInput(initial?.start ?? "", { type: "date" });
  const due = textInput(initial?.due ?? "", { type: "date" });
  const currentWho = initial?.assignees[0];
  const initialAssignees = initial?.assignees ?? [];
  // closed when the dialog opened: closing closes every part, reopening
  // reopens every part (mergeAssignees)
  const initialClosed = initial !== undefined && (initial.status === "done" || initial.status === "verify");
  const keyOf = (p: { whoId: string; who: string }): string => (p.whoId !== "" ? p.whoId : `name:${p.who.toLowerCase()}`);
  /** People assigned who are NOT a tick box in the grid (a team added in
   *  one go, assignees from outside the meeting): removable chips under
   *  it — a hundred tick boxes would bury the form. */
  let extras: { whoId: string; who: string }[] = [];
  /** Parts ticked or unticked here, by person (issue 10). */
  const staged = new Map<string, boolean>();
  let refreshShared: () => void = () => undefined;

  // WHO (issue 10, 2026-11-17): tick one person or several. Several make
  // ONE shared action — each records their own part and it closes when
  // all have. (Until then the ticks were a radio group and a save kept
  // one person, dropping the rest.) One free-text name where no people
  // list is supplied. People flagged `secondary`
  // (the wider roster behind a meeting's own participants) stay off the
  // chip grid until found through the search box below it. A large
  // primary set is CAPPED (Ben, 2026-09-01: a 500-person site must not
  // become a wall of chips) — the overflow joins the search, which
  // covers everyone not already a chip. Hosts order `people` by
  // closeness (self · crew · site …), so the cap keeps the near circle.
  const { upFront: primary, behindSearch: secondary } = splitWho(people);
  const whoWrap = people.length > 0 ? checklist() : el("div");
  const checks: { box: HTMLInputElement; wrap: HTMLElement; person: Person; part: HTMLButtonElement }[] = [];
  /** A person's PART, as a small circle on their own box (Ben,
   *  2026-11-17 — it was a second list of the same names under the
   *  first): empty = still to do, ticked = done. Shown only on a shared
   *  action that exists and is open (`paintPart`). */
  const partButton = (person: { whoId: string; who: string }): HTMLButtonElement => {
    const b = el("button", "ltk-part") as HTMLButtonElement;
    b.type = "button";
    b.style.display = "none";
    b.addEventListener("click", (e) => {
      // inside the person's label: the click is the part's, not the tick's
      e.preventDefault();
      e.stopPropagation();
      staged.set(keyOf(person), !partDone(person));
      refreshShared();
    });
    return b;
  };
  let freeWho: HTMLInputElement | null = null;
  const isCurrent = (person: { whoId: string; who: string }) =>
    initialAssignees.some((x) => (x.whoId !== "" && x.whoId === person.whoId) || x.who === person.who);
  const addChip = (person: Person, checked: boolean) => {
    const item = checkItem(person.who);
    if (checked) {
      item.box.checked = true;
      item.wrap.classList.add("ltk-check-on");
    }
    item.box.addEventListener("change", () => refreshShared());
    const part = partButton(person);
    item.wrap.appendChild(part);
    whoWrap.appendChild(item.wrap);
    checks.push({ box: item.box, wrap: item.wrap, person, part });
  };
  if (people.length > 0) {
    for (const person of primary) addChip(person, isCurrent(person));
    // assignees who are not among the chips: one alone is pinned as a
    // ticked chip (as before); several sit as removable chips below
    const outside = initialAssignees.filter((x) => !checks.some((c) => c.box.checked && ((x.whoId !== "" && c.person.whoId === x.whoId) || c.person.who === x.who)));
    if (outside.length === 1) addChip({ whoId: outside[0].whoId, who: outside[0].who, initials: "" }, true);
    else extras = outside.map((x) => ({ whoId: x.whoId, who: x.who }));
  } else {
    freeWho = textInput(currentWho?.who ?? "", { placeholder: "Who" });
    whoWrap.appendChild(freeWho);
  }

  // "Search everyone…" — a type-ahead (Ben, 2026-11-16: typing, then
  // pressing "Search the directory", then picking, was clunky). One list
  // opens under the box as you type: the people of the app first — the
  // chips above included, so a name is found wherever it sits — then,
  // where the host offers it (admins), the directory, searched by itself
  // after a short pause. ↑ ↓ move, Enter picks, Escape closes.
  let whoBox: HTMLElement | null = null;
  if (people.length > 0) {
    const query = textInput("", { placeholder: "Search everyone…" });
    query.setAttribute("aria-label", "Search everyone");
    query.setAttribute("role", "combobox");
    query.setAttribute("aria-autocomplete", "list");
    query.autocomplete = "off";
    const pop = el("div", "ltk-who-pop");
    pop.setAttribute("role", "listbox");
    pop.style.display = "none";
    // the box is the FIRST cell of the people grid (Ben, 2026-11-16) —
    // "find someone" sits where the people are, the same size as one of
    // them; its list opens under it, over the grid
    const box = el("div", "ltk-who-box");
    box.append(query, pop);
    whoBox = box;
    let road: ActionDirectoryRoad | null = null;
    let dir: { q: string; state: "idle" | "busy" | "done" | "failed"; hits: { objectId: string; displayName: string; mail: string }[] } = { q: "", state: "idle", hits: [] };
    let dirSeq = 0;
    let dirTimer: ReturnType<typeof setTimeout> | null = null;
    let active = 0;
    let options: { el: HTMLButtonElement; run: () => void }[] = [];
    const DIR_MIN = 3;
    // a pick ADDS (several people may share the action); the box clears
    const selectOnly = (pick: () => void) => {
      pick();
      query.value = "";
      close();
      refreshShared();
    };
    const close = () => {
      pop.style.display = "none";
      query.setAttribute("aria-expanded", "false");
      options = [];
    };
    const paintActive = () => {
      options.forEach((o, n) => {
        o.el.classList.toggle("ltk-who-opt-on", n === active);
        o.el.setAttribute("aria-selected", String(n === active));
      });
      options[active]?.el.scrollIntoView({ block: "nearest" });
    };
    const option = (label: string, sub: string, run: () => void): HTMLButtonElement => {
      const b = el("button", "ltk-who-opt") as HTMLButtonElement;
      b.type = "button";
      b.setAttribute("role", "option");
      b.appendChild(el("span", "ltk-who-opt-name", label));
      if (sub !== "") b.appendChild(el("span", "ltk-who-opt-sub", sub));
      // mousedown, not click: the box keeps its focus and the list its place
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", run);
      options.push({ el: b, run });
      return b;
    };
    const render = () => {
      while (pop.firstChild) pop.removeChild(pop.firstChild);
      options = [];
      const q = query.value.trim();
      if (q === "") return close();
      const ql = q.toLowerCase();
      // the app's people: the chips already shown, then the wider roster
      const shownIds = new Set(checks.map((c) => c.person.whoId));
      const among = checks.filter((c) => c.person.who.toLowerCase().includes(ql)).slice(0, 6);
      const behind = secondary.filter((x) => !shownIds.has(x.whoId) && x.who.toLowerCase().includes(ql)).slice(0, 8);
      for (const c of among) {
        pop.appendChild(
          option(c.person.who, c.box.checked ? "assigned" : "", () =>
            selectOnly(() => {
              c.box.checked = true;
              c.wrap.classList.add("ltk-check-on");
            })
          )
        );
      }
      for (const person of behind) pop.appendChild(option(person.who, "", () => selectOnly(() => addChip(person, true))));
      const known = new Set([...shownIds, ...secondary.map((x) => x.whoId)]);
      if (road !== null) {
        if (q.length < DIR_MIN) {
          if (among.length + behind.length === 0) pop.appendChild(el("div", "ltk-who-pop-note", `Keep typing to search the directory (${DIR_MIN} letters).`));
        } else if (dir.q === q && dir.state === "done") {
          const fresh = dir.hits.filter((h) => !known.has(h.objectId)).slice(0, 8);
          if (fresh.length > 0) pop.appendChild(el("div", "ltk-who-pop-h", "In the directory — adds them to the app"));
          for (const h of fresh) {
            const b = option(h.displayName, h.mail, () => {
              b.disabled = true;
              b.firstElementChild!.textContent = `Adding ${h.displayName}…`;
              void road!.add(h).then(
                (added) => selectOnly(() => addChip({ whoId: added.whoId, who: added.who, initials: "" }, true)),
                (err) => {
                  b.disabled = false;
                  b.firstElementChild!.textContent = h.displayName;
                  const sub = b.querySelector(".ltk-who-opt-sub") ?? b.appendChild(el("span", "ltk-who-opt-sub", ""));
                  sub.textContent = err instanceof Error ? err.message : "Could not add them";
                  sub.classList.add("ltk-who-opt-err");
                }
              );
            });
            pop.appendChild(b);
          }
          if (fresh.length === 0 && among.length + behind.length === 0) pop.appendChild(el("div", "ltk-who-pop-note", "No one matches, in the app or the directory."));
        } else if (dir.q === q && dir.state === "failed") {
          pop.appendChild(el("div", "ltk-who-pop-note", "The directory search failed. Check the connection and type again."));
        } else {
          pop.appendChild(el("div", "ltk-who-pop-note", "Searching the directory…"));
        }
      } else if (among.length + behind.length === 0) {
        pop.appendChild(el("div", "ltk-who-pop-note", "No one matches."));
      }
      active = Math.min(active, Math.max(0, options.length - 1));
      pop.style.display = "";
      query.setAttribute("aria-expanded", "true");
      paintActive();
    };
    const searchDirectory = () => {
      if (dirTimer !== null) clearTimeout(dirTimer);
      const q = query.value.trim();
      if (road === null || q.length < DIR_MIN) return;
      if (dir.q === q && dir.state !== "idle") return;
      dir = { q, state: "busy", hits: [] };
      // a pause in the typing, then ONE call for what is in the box
      dirTimer = setTimeout(() => {
        const seq = ++dirSeq;
        void road!.search(q).then(
          (found) => {
            if (seq !== dirSeq) return;
            dir = { q, state: "done", hits: found };
            if (query.value.trim() === q) render();
          },
          () => {
            if (seq !== dirSeq) return;
            dir = { q, state: "failed", hits: [] };
            if (query.value.trim() === q) render();
          }
        );
      }, 350);
    };
    query.addEventListener("input", () => {
      active = 0;
      searchDirectory();
      render();
    });
    query.addEventListener("focus", () => {
      if (query.value.trim() !== "") render();
    });
    query.addEventListener("blur", () => setTimeout(() => {
      if (document.activeElement !== query) close();
    }, 150));
    query.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (options.length === 0) return;
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
        paintActive();
      } else if (e.key === "Enter") {
        // never the dialog's Save: Enter picks the highlighted person
        e.preventDefault();
        options[active]?.run();
      } else if (e.key === "Escape" && pop.style.display !== "none") {
        e.preventDefault();
        query.value = "";
        close();
      }
    });
    // with nobody behind the chips and no directory, there is nothing to
    // search: the box shows only once one of the two exists
    box.style.display = secondary.length > 0 ? "" : "none";
    void actionDirectory().then((r) => {
      road = r;
      if (r !== null) box.style.display = "";
    });
  }

  // support (issue 7, 2026-11-16): people who help without owing a part.
  // Chosen through a search, shown as removable chips — never a second
  // wall of tick boxes under the first.
  let supporters: Supporter[] = (initial?.supporters ?? []).map((x) => ({ ...x }));
  const supWrap = el("div", "ltk-sup");
  const supChips = el("div", "ltk-sup-chips");
  const supSearch = el("div", "ltk-who-search");
  const supQuery = textInput("", { placeholder: people.length > 0 ? "Add someone in support…" : "Name, then Enter" });
  supQuery.setAttribute("aria-label", "Add someone in support");
  const supResults = el("div", "ltk-who-results");
  const sameWho = (a: { whoId: string; who: string }, b: { whoId: string; who: string }) =>
    a.whoId !== "" && b.whoId !== "" ? a.whoId === b.whoId : a.who.toLowerCase() === b.who.toLowerCase();
  const paintSupport = () => {
    while (supChips.firstChild) supChips.removeChild(supChips.firstChild);
    for (const p of supporters) {
      const chip = el("span", "ltk-sup-chip", p.who);
      const x = el("button", "ltk-sup-x", "✕") as HTMLButtonElement;
      x.type = "button";
      x.title = `Remove ${p.who} from support`;
      x.setAttribute("aria-label", x.title);
      x.addEventListener("click", () => {
        supporters = supporters.filter((y) => y !== p);
        paintSupport();
      });
      chip.appendChild(x);
      supChips.appendChild(chip);
    }
    supChips.style.display = supporters.length > 0 ? "" : "none";
    layoutSupport();
  };
  const addSupporter = (p: Supporter) => {
    if (!supporters.some((y) => sameWho(y, p))) supporters = [...supporters, p];
    supSearching = false;
    supQuery.value = "";
    paintSupportResults();
    paintSupport();
  };
  const paintSupportResults = () => {
    while (supResults.firstChild) supResults.removeChild(supResults.firstChild);
    const q = supQuery.value.trim().toLowerCase();
    if (q === "" || people.length === 0) return;
    const matches = people.filter((p) => p.who.toLowerCase().includes(q) && !supporters.some((y) => sameWho(y, p))).slice(0, 8);
    for (const person of matches) {
      const hit = el("button", "ltk-check ltk-who-hit", person.who) as HTMLButtonElement;
      hit.type = "button";
      hit.addEventListener("click", () => addSupporter({ whoId: person.whoId, who: person.who }));
      supResults.appendChild(hit);
    }
  };
  supQuery.addEventListener("input", paintSupportResults);
  supQuery.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    // no roster (a standalone control): a typed name stands
    const typed = supQuery.value.trim();
    if (people.length === 0 && typed !== "") addSupporter({ whoId: "", who: typed });
    else (supResults.firstChild as HTMLButtonElement | null)?.click();
  });
  supSearch.append(supQuery, supResults);
  // one line until it is used (2026-11-16 layout): "＋ Add support" opens
  // the search; with supporters, their chips and a "＋ Add" beside them
  const supOpen = el("button", "ltk-sup-open", "＋ Add support") as HTMLButtonElement;
  supOpen.type = "button";
  supOpen.title = "People helping with the action. It shows among their actions under Supporting; completing it stays with whoever it is assigned to.";
  let supSearching = false;
  const supHead = el("div", "ltk-sup-head");
  const supLabel = el("span", "ltk-field-label", "Support");
  const layoutSupport = () => {
    const any = supporters.length > 0;
    supLabel.style.display = any ? "" : "none";
    supOpen.textContent = any ? "＋ Add" : "＋ Add support";
    supOpen.style.display = supSearching ? "none" : "";
    supSearch.style.display = supSearching ? "" : "none";
  };
  supOpen.addEventListener("click", () => {
    supSearching = true;
    layoutSupport();
    supQuery.focus();
  });
  supHead.append(supLabel, supChips, supOpen);
  supWrap.append(supHead, supSearch);
  paintSupport();
  layoutSupport();

  wrap.classList.add("ltk-act-form");
  wrap.appendChild(fieldRow("Action", desc));
  // Who: a label like any other field's, then the grid — the search box
  // its first cell, the people of the meeting or initiative after it
  const whoBlock = el("div", "ltk-who");
  whoBlock.appendChild(el("div", "ltk-field-label", "Who"));
  if (whoBox) whoWrap.insertBefore(whoBox, whoWrap.firstChild);
  whoBlock.appendChild(whoWrap);
  wrap.appendChild(whoBlock);

  // ---- several people: the shared action (issue 10) -----------------------
  /** A part as the dialog holds it: ticked here, else as it arrived. */
  const partDone = (person: { whoId: string; who: string }): boolean => {
    const st = staged.get(keyOf(person));
    if (st !== undefined) return st;
    return initialAssignees.find((x) => (x.whoId !== "" && x.whoId === person.whoId) || x.who === person.who)?.done ?? false;
  };
  /** Parts are recorded on a SHARED action that exists and is still
   *  open: a new one has none yet, and Closed closes them all. */
  const partsShown = (): boolean => initial !== undefined && !fresh && !initialClosed && picked().length >= 2;
  const paintPart = (b: HTMLButtonElement, person: { whoId: string; who: string }, on: boolean): void => {
    const show = on && partsShown();
    b.style.display = show ? "" : "none";
    if (!show) return;
    const done = partDone(person);
    b.classList.toggle("ltk-part-done", done);
    b.textContent = done ? "✓" : "";
    b.setAttribute("aria-pressed", String(done));
    b.title = done ? `${person.who} has done their part — click to undo` : `Mark ${person.who}'s part done`;
    b.setAttribute("aria-label", b.title);
  };
  const picked = (): { whoId: string; who: string }[] => [...checks.filter((c) => c.box.checked).map((c) => ({ whoId: c.person.whoId, who: c.person.who })), ...extras];
  const sharedBox = el("div", "ltk-shared");
  const extraChips = el("div", "ltk-sup-chips ltk-shared-extras");
  const sharedNote = el("div", "ltk-shared-note");
  let extrasOpen = false;
  const EXTRAS_SHOWN = 12;
  const paintExtras = () => {
    while (extraChips.firstChild) extraChips.removeChild(extraChips.firstChild);
    const list = extrasOpen ? extras : extras.slice(0, EXTRAS_SHOWN);
    for (const person of list) {
      const chip = el("span", "ltk-sup-chip", person.who);
      // their part, on their chip — the same circle the boxes above carry
      const part = partButton(person);
      paintPart(part, person, true);
      chip.appendChild(part);
      const x = el("button", "ltk-sup-x", "✕") as HTMLButtonElement;
      x.type = "button";
      x.title = `Take ${person.who} off this action`;
      x.setAttribute("aria-label", x.title);
      x.addEventListener("click", () => {
        extras = extras.filter((y) => y !== person);
        refreshShared();
      });
      chip.appendChild(x);
      extraChips.appendChild(chip);
    }
    if (extras.length > EXTRAS_SHOWN) {
      const more = el("button", "ltk-sup-open", extrasOpen ? "Show fewer" : `+${extras.length - EXTRAS_SHOWN} more`) as HTMLButtonElement;
      more.type = "button";
      more.addEventListener("click", () => {
        extrasOpen = !extrasOpen;
        paintExtras();
      });
      extraChips.appendChild(more);
    }
    if (extras.length > 1) {
      const none = el("button", "ltk-sup-open", "Remove all") as HTMLButtonElement;
      none.type = "button";
      none.addEventListener("click", () => {
        extras = [];
        refreshShared();
      });
      extraChips.appendChild(none);
    }
    extraChips.style.display = extras.length > 0 ? "" : "none";
  };
  refreshShared = () => {
    paintExtras();
    const all = picked();
    const n = all.length;
    for (const c of checks) paintPart(c.part, c.person, c.box.checked);
    if (n > MAX_ASSIGNEES) {
      sharedNote.textContent = `${n} people — more than one action can carry (${MAX_ASSIGNEES}). The first ${MAX_ASSIGNEES} are kept.`;
    } else if (n >= 2 && partsShown()) {
      const done = all.filter(partDone).length;
      sharedNote.textContent = `${n} people share this action — ${done} of ${n} parts done. Tick the circle beside a name when that person has done theirs; it closes when all have.`;
    } else if (n >= 2) {
      sharedNote.textContent = `${n} people share this action. Each records their own part, and it closes when all have.`;
    } else {
      sharedNote.textContent = "";
    }
    sharedNote.style.display = n >= 2 ? "" : "none";
  };

  // "＋ Add a team…" (issue 10): a leader's reports, direct or all the
  // way down, read from the directory. People already in the app are
  // added; the rest are named — adding them stays an admin's act.
  const teamOpen = el("button", "ltk-sup-open", "＋ Add a team…") as HTMLButtonElement;
  teamOpen.type = "button";
  teamOpen.title = "Assign the action to everyone who reports to a leader";
  teamOpen.style.display = "none";
  const teamPanel = el("div", "ltk-team");
  teamPanel.style.display = "none";
  if (people.length > 0) {
    let road: ActionTeamRoad | null = null;
    let leader: Person | null = null;
    const leaderBox = personTypeAhead("Leader — type a name…", (q) => people.filter((x) => x.who.toLowerCase().includes(q)).slice(0, 10), (person) => {
      leader = person;
      leaderBox.input.value = person.who;
      teamNote.textContent = "";
    });
    const deepSel = selectInput("direct", [
      { value: "direct", label: "Direct reports" },
      { value: "all", label: "Everyone below" },
    ]);
    deepSel.setAttribute("aria-label", "Which reports");
    const incl = checkItem("Include the leader");
    const teamNote = el("div", "ltk-team-note");
    const add = el("button", "ltk-btn ltk-btn-secondary", "Add them") as HTMLButtonElement;
    add.type = "button";
    const done = el("button", "ltk-sup-open", "Close") as HTMLButtonElement;
    done.type = "button";
    done.addEventListener("click", () => {
      teamPanel.style.display = "none";
      teamOpen.style.display = "";
    });
    add.addEventListener("click", () => {
      if (road === null) return;
      if (leader === null || leaderBox.input.value.trim() !== leader.who) {
        teamNote.textContent = "Pick the leader from the list first.";
        leaderBox.input.focus();
        return;
      }
      const who = leader;
      add.disabled = true;
      teamNote.textContent = `Reading ${who.who}'s reporting line…`;
      void road.reports(who.whoId, deepSel.value === "all").then(
        (r) => {
          add.disabled = false;
          const list = incl.box.checked ? [{ whoId: who.whoId, who: who.who }, ...r.people] : r.people;
          let added = 0;
          for (const person of list) {
            if (picked().some((x) => keyOf(x) === keyOf(person))) continue;
            const chip = checks.find((c) => c.person.whoId === person.whoId);
            if (chip) {
              chip.box.checked = true;
              chip.wrap.classList.add("ltk-check-on");
            } else {
              extras = [...extras, person];
            }
            added++;
          }
          const parts = [added === 0 ? (list.length === 0 ? "Nobody in the app reports to them." : "They are all on the action already.") : `Added ${added} ${added === 1 ? "person" : "people"}.`];
          if (r.skipped.length > 0) {
            const names = r.skipped.length > 8 ? `${r.skipped.slice(0, 8).join("; ")}; +${r.skipped.length - 8} more` : r.skipped.join("; ");
            parts.push(`Not in the app, so not added (ask an admin to add them): ${names}.`);
          }
          if (r.partial) parts.push("The directory answered only in part — some reports may be missing.");
          teamNote.textContent = parts.join(" ");
          refreshShared();
        },
        () => {
          add.disabled = false;
          teamNote.textContent = "The directory could not be read. Check the connection and try again.";
        }
      );
    });
    const row = el("div", "ltk-team-row");
    row.append(leaderBox.el, deepSel, incl.wrap, add, done);
    teamPanel.append(el("div", "ltk-field-label", "Add a team"), row, teamNote);
    teamOpen.addEventListener("click", () => {
      teamPanel.style.display = "";
      teamOpen.style.display = "none";
      leaderBox.input.focus();
    });
    void actionTeam().then((r) => {
      road = r;
      if (r !== null) teamOpen.style.display = "";
    });
  }
  sharedBox.append(extraChips, sharedNote, teamOpen, teamPanel);
  wrap.appendChild(sharedBox);
  refreshShared();
  wrap.appendChild(supWrap);
  const dates = el("div", "ltk-act-when");
  const startRow = fieldRow("Start (optional)", start);
  startRow.classList.add("ltk-act-date");
  const dueRow = fieldRow("Due", due);
  dueRow.classList.add("ltk-act-date");
  dates.append(startRow, dueRow);
  wrap.appendChild(dates);

  return {
    el: wrap,
    focus: () => desc.focus(),
    hasContent: () => desc.value.trim() !== "",
    due: () => due.value,
    dates,
    apply: (action) => {
      action.description = desc.value.trim();
      action.start = start.value;
      action.due = due.value;
      // waiting for an endorser = the work IS done (every part stays
      // ticked). Everyone picked stays on the action with the part they
      // had; a part ticked here is taken; closing closes them all.
      const closed = action.status === "done" || action.status === "verify";
      const who = freeWho ? (freeWho.value.trim() !== "" ? [{ whoId: "", who: freeWho.value.trim() }] : []) : picked();
      action.assignees = mergeAssignees(initialAssignees, who, { closed, wasClosed: initialClosed, staged: (p) => staged.get(keyOf(p)) });
      // assigned wins: nobody is both (cleanSupporters drops the overlap)
      const sup = cleanSupporters(supporters, action.assignees);
      if (sup.length > 0) action.supporters = sup;
      else delete action.supporters;
    },
  };
}

/**
 * A collapsed "＋ Add action" affordance for add dialogs: tapping it reveals
 * the action fields right there, so an action can be captured in the same
 * breath as the entry it belongs to — but it is never auto-prompted.
 */
export function addActionSection(
  people: Person[],
  label = "Action"
): { el: HTMLElement; form: ActionForm } {
  const form = buildActionForm(people);
  const wrap = el("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "12px";

  const btn = el("button", "ltk-btn ltk-btn-secondary", "＋ Add action");
  btn.type = "button";
  const section = el("div");
  section.style.display = "none";
  section.style.flexDirection = "column";
  section.style.gap = "12px";
  section.appendChild(sectionLabel(label));
  section.appendChild(form.el);
  btn.addEventListener("click", () => {
    btn.style.display = "none";
    section.style.display = "flex";
    form.focus();
  });

  wrap.append(btn, section);
  return { el: wrap, form };
}

export interface ActionRowOptions {
  doneColor: string;
  /** Show the issue as a small tag above the description (board views). */
  showIssue?: boolean;
  /** Show the PDCA quadrant disc beside the description (action cards). */
  showPdca?: boolean;
  readOnly?: boolean;
  /** Fired after the complete circle toggles (commit actions here). */
  onChanged: () => void;
  onEdit: (a: LtkAction) => void;
}

/**
 * The shared complete/not-complete circle. Toggling flips the action between
 * done and open, syncs the assignee done flags, then fires onToggled (commit +
 * re-render there). Colours are inline (Safari rule). Used by the list row and
 * by the kanban / gantt board views so completing an action looks identical
 * everywhere.
 */
/** Quadrant wedges of the PDCA disc, counter-clockwise from top-left. */
const DISC_R = 8.6;
const QUADS: [number, number, number, number][] = [
  [0, -DISC_R, -DISC_R, 0], // top-left
  [-DISC_R, 0, 0, DISC_R], // bottom-left
  [0, DISC_R, DISC_R, 0], // bottom-right
  [DISC_R, 0, 0, -DISC_R], // top-right
];
const discShell = (size: number, fill: string): SVGSVGElement => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "-10 -10 20 20");
  svg.classList.add("ltk-pdca-disc");
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute("r", String(DISC_R));
  ring.style.fill = "none";
  ring.style.stroke = fill;
  ring.style.strokeWidth = "1.6";
  svg.appendChild(ring);
  return svg;
};
const wedge = (i: number, fill: string): SVGPathElement => {
  const [x1, y1, x2, y2] = QUADS[i];
  const w = document.createElementNS("http://www.w3.org/2000/svg", "path");
  w.setAttribute("d", `M 0 0 L ${x1} ${y1} A ${DISC_R} ${DISC_R} 0 0 0 ${x2} ${y2} Z`);
  w.style.fill = fill;
  return w;
};

/** ONE quadrant of the disc lit — a stage's place in the cycle (plan 0,
 *  do 1, check 2, act 3), never progress: the cumulative disc below
 *  would read as how far an action has gone (2026-10-01). */
export function pdcaQuadrant(index: number, size = 14, fill = "currentColor", label = ""): SVGSVGElement {
  const svg = discShell(size, fill);
  svg.appendChild(wedge(Math.max(0, Math.min(3, index)), fill));
  if (label !== "") {
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = label;
    svg.appendChild(title);
  }
  return svg;
}

/** The four-quadrant PDCA disc: quarters fill top-left → bottom-left →
 *  bottom-right → top-right (plan 0 … closed 4). */
export function pdcaDisc(state: ActionPdca, size = 16, fill = "#26241f"): SVGSVGElement {
  const svg = discShell(size, fill);
  if (state === "hold") {
    // on hold: a pause glyph inside the ring — beside the cycle, not on it
    for (const x of [-3.6, 1.2]) {
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", String(x));
      bar.setAttribute("y", "-4.2");
      bar.setAttribute("width", "2.4");
      bar.setAttribute("height", "8.4");
      bar.setAttribute("rx", "0.6");
      bar.style.fill = fill;
      svg.appendChild(bar);
    }
  }
  for (let i = 0; i < PDCA_QUARTERS[state]; i++) svg.appendChild(wedge(i, fill));
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = PDCA_LABELS[state];
  svg.appendChild(title);
  return svg;
}

export function completeCircle(
  a: LtkAction,
  doneColor: string,
  onToggled: () => void,
  readOnly = false
): HTMLButtonElement {
  const circle = el("button", "ltk-action-circle") as HTMLButtonElement;
  circle.type = "button";
  const paint = () => {
    const waiting = a.status === "verify";
    const done = a.status === "done" || waiting;
    circle.textContent = waiting ? "◐" : done ? "✓" : "";
    circle.title = waiting ? "Awaiting endorsement — tick to reopen" : done ? "Mark not complete" : "Mark complete";
    circle.style.background = done ? doneColor : "";
    circle.style.borderColor = done ? doneColor : "";
    circle.style.color = done ? textOn(doneColor) : "transparent";
  };
  paint();
  if (!readOnly) {
    circle.addEventListener("click", (e) => {
      e.stopPropagation();
      const prior = a.status;
      // a tick on a WAITING action reopens it (its work was ticked done;
      // only an endorser closes it — through the dialog)
      const nowDone = a.status !== "done" && a.status !== "verify";
      a.status = nowDone ? "done" : "open";
      a.pdca = nowDone ? "closed" : "do"; // the PDCA disc follows completion
      for (const x of a.assignees) x.done = nowDone;
      const who = actionViewer();
      if (who !== null) applyEndorsementRule(a, prior, endorsementFor(a), who, new Date().toISOString());
      paint();
      onToggled();
    });
  }
  return circle;
}

/**
 * One action as a row: complete/not-complete circle (toggles live), the
 * description with who/due underneath, and an edit affordance.
 */
export function actionRow(a: LtkAction, opts: ActionRowOptions): HTMLElement {
  const row = el("div", "ltk-action-row");

  const descEl = el("div", "ltk-action-desc", a.description || a.issue);
  const strike = () => {
    descEl.style.textDecoration = a.status === "done" ? "line-through" : "";
  };
  strike();
  const circle = completeCircle(
    a,
    opts.doneColor,
    () => {
      strike();
      opts.onChanged();
    },
    opts.readOnly
  );

  // left: issue (caps) stacked over the description
  const main = el("div", "ltk-action-main");
  if (opts.showIssue && a.issue.trim() !== "") {
    main.appendChild(el("div", "ltk-action-issue", a.issue));
  }
  if (opts.showPdca) {
    const line = el("div", "ltk-action-descline");
    line.append(pdcaDisc(pdcaOf(a), 15), descEl);
    main.appendChild(line);
  } else main.appendChild(descEl);

  // right: who + date, prominent and right-aligned; the escalation flag
  // trails the date line
  const right = el("div", "ltk-action-right");
  const whoEl = el("div", "ltk-action-who");
  // one name, or the first and how many more share it (issue 10)
  whoEl.appendChild(document.createTextNode(assigneesLabel(a, "Unassigned")));
  right.appendChild(whoEl);
  const parts = partsChip(a);
  if (parts) right.appendChild(parts);
  const dateText =
    a.due !== "" ? `Due ${a.due}` : a.start !== "" ? `From ${a.start}` : "";
  if (dateText !== "") {
    const dueEl = el("div", "ltk-action-due", dateText);
    if (a.due !== "" && isOverdue(a)) dueEl.classList.add("ltk-action-overdue");
    if (a.escalated) dueEl.appendChild(supportFlag());
    right.appendChild(dueEl);
  } else if (a.escalated) {
    whoEl.appendChild(supportFlag());
  }
  const support = supportLabel(a);
  if (support !== "") right.appendChild(el("div", "ltk-action-support", support));
  const moved = movedGlyph(a);
  if (moved) right.appendChild(moved);
  const said = commentGlyph(a);
  if (said) right.appendChild(said);
  const waits = endorseGlyph(a);
  if (waits) right.appendChild(waits);

  if (!opts.readOnly) {
    main.addEventListener("click", () => opts.onEdit(a));
    right.addEventListener("click", () => opts.onEdit(a));
    right.style.cursor = "pointer";
    const edit = el("button", "ltk-action-edit", "✎");
    edit.type = "button";
    edit.title = "Edit action";
    edit.addEventListener("click", () => opts.onEdit(a));
    row.append(circle, main, right, edit);
  } else {
    row.append(circle, main, right);
  }
  return row;
}

export interface ActionDialogOptions {
  host: HTMLElement;
  /** Mutated in place on save. For a new action, push it in onCommit. */
  action: LtkAction;
  people: Person[];
  isNew: boolean;
  onCommit: () => void;
  /** Board cards the action may link to instead (Ben, 2026-08-31: the
   *  discussion often reveals an action belongs to another card). Keys
   *  are instance keys ("board:card"); shown as a "Linked card" select. */
  linkTargets?: { key: string; label: string }[];
  /** What the targets ARE, for the select's caption — "Linked card" on a
   *  board, "Initiative" where they are initiatives (the priority popup). */
  linkLabel?: string;
  /** No "Linked to" field: the host's targets are the whole choice (a new
   *  action raised under a priority lands on one of ITS initiatives). */
  noLinkField?: boolean;
  /** The origin card's instance key — the select's initial value. */
  linkTarget?: string;
  /** What the action may be linked to — a ritual or an initiative, one
   *  at most (2026-09-29). Omitted: the host's registered provider
   *  answers; neither: no "Linked to" field. */
  links?: ActionLinkContext;
  /** A NEW action starts linked to the board on screen (quick add). */
  linkToOpenBoard?: boolean;
  /** The board on screen, known to the HOST before the link list loads:
   *  a new action with `linkToOpenBoard` links to it at save even if the
   *  list has not arrived or does not carry it (action-link-review-
   *  2026-10-30, findings 1–4). */
  openBoardId?: string;
  /** Who is commenting. Omitted: the host's registered viewer answers;
   *  neither: comments show, and none can be added. */
  viewer?: { whoId: string; who: string };
  /** A NEW action that arrives already filled (a duplicate): the form
   *  shows what it carries instead of starting empty. */
  prefill?: boolean;
  /** Offer "Duplicate…" (issue 11, 2026-11-17): the host opens a Raise
   *  dialog on the copy (`prefill`) and adds it where it adds any new
   *  action. Omitted: not offered. */
  onDuplicate?: (copy: LtkAction) => void;
}

/** "⚑" on an action that needs support (issue 4, 2026-11-17 — the mark
 *  that read "escalated"), wherever a row or card shows one. */
export function supportFlag(): HTMLElement {
  const f = el("span", "ltk-action-flag", " ⚑");
  f.title = "Support required";
  f.setAttribute("aria-label", "Support required");
  return f;
}

/** "3 / 12 done" on a shared action (issue 10), who is still to do it on
 *  hover; null on an action one person owns. */
export function partsChip(a: Pick<LtkAction, "assignees">): HTMLElement | null {
  const label = partsLabel(a);
  if (label === "") return null;
  const chip = el("span", "ltk-action-parts", label);
  chip.title = partsTitle(a);
  return chip;
}

/** "◐ Awaiting endorsement" for an action whose work is done and waits
 *  for its endorser, wherever a row shows one. */
export function endorseGlyph(a: Pick<LtkAction, "status">): HTMLElement | null {
  if (!awaitingEndorsement(a)) return null;
  const g = el("span", "ltk-endorse-glyph", "◐ Awaiting endorsement");
  g.title = "The work is done — it closes when the owner, the sponsor or an admin endorses it.";
  return g;
}

/** An inline bar that asks for a REASON before a step (one at a time). */
function reasonBar(body: HTMLElement, message: string, placeholder: string, yes: string, onYes: (reason: string) => void): void {
  body.querySelector(".ltk-confirm")?.remove();
  const bar = el("div", "ltk-confirm");
  bar.appendChild(el("div", "ltk-confirm-msg", message));
  const box = el("textarea", "ltk-input ltk-textarea") as HTMLTextAreaElement;
  box.rows = 2;
  box.placeholder = placeholder;
  box.setAttribute("aria-label", message);
  bar.appendChild(box);
  const err = el("div", "ltk-confirm-err", "");
  bar.appendChild(err);
  const row = el("div", "ltk-confirm-btns");
  const keep = el("button", "ltk-btn ltk-btn-secondary", "Cancel") as HTMLButtonElement;
  keep.type = "button";
  keep.addEventListener("click", () => bar.remove());
  const go = el("button", "ltk-btn ltk-btn-danger", yes) as HTMLButtonElement;
  go.type = "button";
  go.addEventListener("click", () => {
    if (box.value.trim() === "") {
      err.textContent = "A reason is needed.";
      box.focus();
      return;
    }
    bar.remove();
    onYes(box.value.trim());
  });
  row.append(keep, go);
  bar.appendChild(row);
  body.appendChild(bar);
  bar.scrollIntoView({ block: "nearest" });
  box.focus();
}

/** "Why is this moving?" inside the action dialog: the organisation's
 *  reasons and a note. Cancel leaves the dialog open with nothing saved,
 *  so the date can be put back or the edit abandoned. */
function rescheduleBar(body: HTMLElement, from: string, to: string, choices: string[], onYes: (reason: string) => void): void {
  body.querySelector(".ltk-confirm")?.remove();
  const bar = el("div", "ltk-confirm ltk-resched");
  bar.setAttribute("role", "alertdialog");
  bar.appendChild(el("div", "ltk-confirm-msg", "Why is this moving?"));
  bar.appendChild(el("div", "ltk-resched-dates", to !== "" ? `Due ${from} → ${to}` : `Due ${from} → no due date`));
  const f = rescheduleFields(choices, "ltk-input", "ltk-confirm-err");
  bar.append(f.select, f.note, f.err);
  const row = el("div", "ltk-confirm-btns");
  const keep = el("button", "ltk-btn ltk-btn-secondary", "Cancel") as HTMLButtonElement;
  keep.type = "button";
  keep.addEventListener("click", () => bar.remove());
  const go = el("button", "ltk-btn ltk-btn-primary", "Move date") as HTMLButtonElement;
  go.type = "button";
  go.addEventListener("click", () => {
    const reason = f.read();
    if (reason === null) return;
    bar.remove();
    onYes(reason);
  });
  row.append(keep, go);
  bar.appendChild(row);
  body.appendChild(bar);
  bar.scrollIntoView({ block: "nearest" });
  f.select.focus();
}

/** "↷ 2" for an action whose due date has moved later, wherever a row
 *  shows one — the tooltip carries the latest move and its reason. */
export function movedGlyph(a: Pick<LtkAction, "history">): HTMLElement | null {
  const n = slipCount(a);
  if (n === 0) return null;
  const g = el("span", "ltk-moved-glyph", `↷ ${n}`);
  const later = dueMoves(a).filter((h) => isLaterMove(h.from ?? "", h.to ?? ""));
  const last = later[later.length - 1];
  const why = last.reason !== "" ? ` (${last.reason})` : "";
  g.title = `Due date moved later ${n === 1 ? "once" : `${n} times`} — latest: ${last.from ?? ""} → ${last.to || "no due date"}${why}`;
  return g;
}

/** The due-date moves, latest first: dates, reason, who and when. */
function dueMoveList(a: Pick<LtkAction, "history">): HTMLElement {
  const list = el("div", "ltk-resched-list");
  for (const h of [...dueMoves(a)].reverse()) {
    const row = el("div", "ltk-resched-row");
    row.appendChild(el("div", "ltk-resched-move", `${h.from ?? ""} → ${h.to || "no due date"}`));
    const why = h.reason !== "" ? h.reason : isLaterMove(h.from ?? "", h.to ?? "") ? "No reason recorded" : "Brought forward";
    row.appendChild(el("div", "ltk-resched-why", why));
    const by = [h.who, h.when.slice(0, 10)].filter((x) => x !== "").join(" · ");
    if (by !== "") row.appendChild(el("div", "ltk-resched-by", by));
    list.appendChild(row);
  }
  return list;
}

/** The due-date record as ONE line — how often it moved later, and the
 *  latest move — opening to the full list (2026-11-16 layout: the list
 *  sat open above the comments and pushed them down). */
function dueMoveSummary(a: Pick<LtkAction, "history">): HTMLElement {
  const wrap = el("div", "ltk-resched-sum");
  const moves = dueMoves(a);
  const last = moves[moves.length - 1];
  const later = slipCount(a);
  const head = el("button", "ltk-resched-sumbtn") as HTMLButtonElement;
  head.type = "button";
  const caret = el("span", "ltk-resched-caret", "▸");
  const text = el("span", "ltk-resched-sumtext");
  const title = later > 0 ? `Due date moved later ${later === 1 ? "once" : later === 2 ? "twice" : `${later} times`}` : `Due date changed ${moves.length === 1 ? "once" : `${moves.length} times`}`;
  text.appendChild(el("b", undefined, title));
  text.appendChild(el("span", "ltk-resched-sumdetail", `Latest: ${last.from ?? ""} → ${last.to || "no due date"}${last.reason !== "" ? ` · ${last.reason}` : ""}`));
  head.append(caret, text);
  const list = dueMoveList(a);
  list.style.display = "none";
  head.setAttribute("aria-expanded", "false");
  head.addEventListener("click", () => {
    const open = list.style.display === "none";
    list.style.display = open ? "" : "none";
    caret.textContent = open ? "▾" : "▸";
    head.setAttribute("aria-expanded", String(open));
  });
  wrap.append(head, list);
  return wrap;
}

/** "💬 3" for an action that carries comments, wherever a row shows one. */
export function commentGlyph(a: Pick<LtkAction, "comments">): HTMLElement | null {
  if (a.comments.length === 0) return null;
  const g = el("span", "ltk-cmt-glyph", `💬 ${a.comments.length}`);
  const last = a.comments[a.comments.length - 1];
  g.title = `${a.comments.length} comment${a.comments.length === 1 ? "" : "s"} — latest: ${last.who ?? "someone"}, ${last.when}`;
  return g;
}

interface CommentField {
  el: HTMLElement;
  /** Write the comments as the dialog leaves them — what was added (the
   *  box's text included), and the author's edits and deletions — onto
   *  the action. */
  apply: (action: LtkAction) => void;
  /** Something written or changed that a plain Close would lose. */
  unsaved: () => boolean;
  /** A comment the HOST has already saved on the action (a message sent
   *  from the title row): it joins the saved ones, so this dialog's Save
   *  keeps it. */
  adopt: (c: ActionComment) => void;
}

/** Comments on an action (2026-09-30): everything said so far, newest
 *  last, and a box to add to it. What is written here is saved with the
 *  dialog's own Save — Close asks before it is lost. */
function buildCommentField(o: ActionDialogOptions): CommentField {
  const viewer = o.viewer ?? actionViewer();
  const viewerId = viewer?.whoId ?? "";
  const wrap = el("div", "ltk-cmt");
  const list = el("div", "ltk-cmt-list");
  // the saved comments as this dialog will leave them: an edit replaces
  // the entry, a delete drops it — applied with the dialog's Save, like
  // the comments added here
  let saved: ActionComment[] = [...o.action.comments];
  const touched = new Set<ActionComment>();
  let changed = false;
  const staged: ActionComment[] = [];
  let editing: ActionComment | null = null;
  const tool = (glyph: string, title: string, run: () => void): HTMLButtonElement => {
    const b = el("button", "ltk-cmt-tool", glyph) as HTMLButtonElement;
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", run);
    return b;
  };
  const paint = () => {
    while (list.firstChild) list.removeChild(list.firstChild);
    const all = [...saved.map((c) => ({ c, fresh: false })), ...staged.map((c) => ({ c, fresh: true }))];
    if (all.length === 0) list.appendChild(el("div", "ltk-cmt-none", "No comments yet."));
    for (const { c, fresh } of all) {
      const row = el("div", "ltk-cmt-row" + (fresh || touched.has(c) ? " ltk-cmt-fresh" : ""));
      const head = el("div", "ltk-cmt-head");
      const meta = el("div", "ltk-cmt-meta", `${c.who ?? "Someone"} · ${c.when}`);
      if (c.editedAt) {
        const mark = el("span", "ltk-cmt-edited", " · edited");
        mark.title = `Edited ${c.editedAt.slice(0, 10)}`;
        meta.appendChild(mark);
      }
      if (fresh || touched.has(c)) meta.appendChild(document.createTextNode(" · not saved yet"));
      head.appendChild(meta);
      // its author, for a day (a staged comment is simply still theirs)
      const mine = fresh || canEditComment(c, viewerId);
      if (mine && editing === null) {
        head.appendChild(
          tool("✎", fresh ? "Edit this comment" : `Edit this comment — its author can for ${COMMENT_EDIT_HOURS} hours`, () => {
            editing = c;
            paint();
          })
        );
        head.appendChild(
          tool("✕", "Delete this comment", () => {
            const drop = () => {
              if (fresh) staged.splice(staged.indexOf(c), 1);
              else {
                saved = saved.filter((x) => x !== c);
                changed = true;
              }
              paint();
            };
            if (fresh) drop();
            else confirmBar(wrap, "Delete this comment? It goes when the action is saved.", "Delete it", "Keep it", drop);
          })
        );
      }
      row.appendChild(head);
      if (editing === c) {
        const area = el("textarea", "ltk-input ltk-textarea ltk-cmt-box") as HTMLTextAreaElement;
        area.rows = 3;
        area.value = c.text;
        area.setAttribute("aria-label", "Edit the comment");
        const btns = el("div", "ltk-confirm-btns");
        const cancel = el("button", "ltk-btn ltk-btn-secondary", "Cancel") as HTMLButtonElement;
        cancel.type = "button";
        cancel.addEventListener("click", () => {
          editing = null;
          paint();
        });
        const keep = el("button", "ltk-btn ltk-btn-primary", "Done") as HTMLButtonElement;
        keep.type = "button";
        keep.title = "Keep the new wording — it is saved with the action";
        keep.addEventListener("click", () => {
          const text = area.value.trim();
          editing = null;
          if (text !== "" && text !== c.text) {
            if (fresh) c.text = text;
            else {
              const next = editComment(c, text);
              saved = saved.map((x) => (x === c ? next : x));
              touched.add(next);
              changed = true;
            }
          }
          paint();
        });
        btns.append(cancel, keep);
        row.append(area, btns);
        list.appendChild(row);
        setTimeout(() => area.focus(), 0);
        continue;
      }
      row.appendChild(el("div", "ltk-cmt-text", c.text));
      list.appendChild(row);
    }
    if (editing === null) list.scrollTop = list.scrollHeight;
  };
  wrap.appendChild(list);
  let box: HTMLTextAreaElement | null = null;
  if (viewer !== null && viewer.whoId !== "") {
    const entry = el("div", "ltk-cmt-entry");
    box = el("textarea", "ltk-input ltk-textarea ltk-cmt-box") as HTMLTextAreaElement;
    box.rows = 2;
    box.placeholder = "Add a comment…";
    box.setAttribute("aria-label", "Add a comment");
    const add = el("button", "ltk-btn ltk-btn-secondary ltk-cmt-add", "Add") as HTMLButtonElement;
    add.type = "button";
    add.title = "Add the comment to the list — it is saved with the action";
    const push = () => {
      const text = box!.value.trim();
      if (text === "") return;
      staged.push(newComment(viewer, text));
      box!.value = "";
      paint();
      box!.focus();
    };
    add.addEventListener("click", push);
    // Ctrl/⌘ + Enter adds; a bare Enter is a new line
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        push();
      }
    });
    entry.append(box, add);
    wrap.appendChild(entry);
  }
  paint();
  return {
    el: wrap,
    apply: (action) => {
      const typed = box !== null && viewer !== null && box.value.trim() !== "" ? [newComment(viewer, box.value)] : [];
      if (!changed && staged.length === 0 && typed.length === 0) return;
      action.comments = [...saved, ...staged, ...typed];
    },
    unsaved: () => changed || staged.length > 0 || (box !== null && box.value.trim() !== ""),
    adopt: (c) => {
      if (!saved.includes(c)) saved = [...saved, c];
      paint();
    },
  };
}

/** An inline confirmation inside a dialog's body (one dialog at a time per
 *  host — a second dialog would replace the first). One bar at a time. */
function confirmBar(body: HTMLElement, message: string, yes: string, no: string, onYes: () => void): void {
  body.querySelector(".ltk-confirm")?.remove();
  const bar = el("div", "ltk-confirm");
  bar.setAttribute("role", "alertdialog");
  bar.appendChild(el("div", "ltk-confirm-msg", message));
  const row = el("div", "ltk-confirm-btns");
  const keep = el("button", "ltk-btn ltk-btn-secondary", no) as HTMLButtonElement;
  keep.type = "button";
  keep.addEventListener("click", () => bar.remove());
  const go = el("button", "ltk-btn ltk-btn-danger", yes) as HTMLButtonElement;
  go.type = "button";
  go.addEventListener("click", () => {
    bar.remove();
    onYes();
  });
  row.append(keep, go);
  bar.appendChild(row);
  body.appendChild(bar);
  bar.scrollIntoView({ block: "nearest" });
  keep.focus();
}

interface LinkField {
  el: HTMLElement;
  /** The user's choice: undefined = untouched; null = personal. */
  chosen: () => LinkTarget | null | undefined;
  origin: () => ActionLink | null;
  personalWho: () => string;
  /** The list has arrived (origin and the open-board default are known). */
  loaded: () => boolean;
}

/** "Linked to": a chip naming the ritual or initiative the action belongs
 *  to (✕ unlinks), or a search over both. Taking an existing action off
 *  the card it hangs from is confirmed first. */
function buildLinkField(o: ActionDialogOptions, body: () => HTMLElement, onTouched: () => void): LinkField | null {
  const source = o.links ? () => Promise.resolve(o.links!) : actionLinkProvider();
  if (source === null) return null;
  const wrap = el("div", "ltk-link");
  let ctx: ActionLinkContext | null = null;
  let origin: ActionLink | null = null;
  let chosen: LinkTarget | null | undefined = undefined;

  const shown = (): ActionLink | null =>
    chosen === undefined ? origin : chosen === null ? { kind: "personal", target: null, cardId: "", cardLabel: "" } : { kind: chosen.kind, target: chosen, cardId: "", cardLabel: "" };

  const choose = (t: LinkTarget | null) => {
    chosen = t;
    onTouched();
    paint();
  };

  const hit = (t: LinkTarget): HTMLElement => {
    const b = el("button", "ltk-link-hit") as HTMLButtonElement;
    b.type = "button";
    b.appendChild(el("span", "ltk-link-hit-title", t.title));
    if (t.detail !== "") b.appendChild(el("span", "ltk-link-hit-detail", t.detail));
    // mousedown, not click: the search box keeps its focus until the pick
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => choose(t));
    return b;
  };

  const paint = () => {
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    const link = shown();
    if (ctx === null || link === null) {
      wrap.appendChild(el("div", "ltk-link-note", "Loading…"));
      return;
    }
    if (link.kind !== "personal") {
      const words = linkLabel(link);
      const chip = el("div", "ltk-link-chip");
      chip.appendChild(el("span", "ltk-link-kind", words.kind));
      chip.appendChild(el("span", "ltk-link-text", words.text));
      const x = el("button", "ltk-link-x", "✕") as HTMLButtonElement;
      x.type = "button";
      x.title = "Unlink";
      x.setAttribute("aria-label", `Unlink from ${words.text}`);
      x.addEventListener("click", () => {
        // an existing action leaves the card it hangs off — say so first
        const offCard = !o.isNew && chosen === undefined && isCardKeyed(o.action.instanceId);
        if (!offCard) return choose(null);
        confirmBar(body(), `Take this action off "${words.text}"? It will no longer show on that card.`, "Take it off", "Keep it there", () => choose(null));
      });
      chip.appendChild(x);
      wrap.appendChild(chip);
      return;
    }
    // no "Personal — not linked…" line (Ben, 2026-11-16): the field is
    // optional and an empty search already says nothing is linked
    const query = textInput("", { placeholder: "Search rituals and initiatives…" });
    query.setAttribute("aria-label", "Link to a ritual or an initiative");
    query.title = "Optional. Left empty, the action is a personal one.";
    query.setAttribute("role", "combobox");
    query.setAttribute("aria-autocomplete", "list");
    query.autocomplete = "off";
    // what the search finds opens UNDER the box, over the column, and
    // scrolls there (Ben, 2026-11-16: listed in the column it stretched
    // the dialog and pushed the comments out of sight) — the same
    // type-ahead as "Search everyone…": ↑ ↓ move, Enter picks, Escape clears
    const box = el("div", "ltk-link-box");
    const results = el("div", "ltk-link-pop");
    results.setAttribute("role", "listbox");
    results.style.display = "none";
    let hits: HTMLElement[] = [];
    let active = 0;
    const close = () => {
      results.style.display = "none";
      query.setAttribute("aria-expanded", "false");
      hits = [];
    };
    const paintActive = () => {
      hits.forEach((h, n) => {
        h.classList.toggle("ltk-link-hit-on", n === active);
        h.setAttribute("aria-selected", String(n === active));
      });
      hits[active]?.scrollIntoView({ block: "nearest" });
    };
    const group = (label: string, list: LinkTarget[]) => {
      if (list.length === 0) return;
      results.appendChild(el("div", "ltk-link-group", label));
      for (const t of list) {
        const b = hit(t);
        b.setAttribute("role", "option");
        hits.push(b);
        results.appendChild(b);
      }
    };
    const renderResults = () => {
      while (results.firstChild) results.removeChild(results.firstChild);
      hits = [];
      // nothing until something is typed (Ben, 2026-09-29: a suggested
      // list cost the dialog too much height)
      if (ctx === null || query.value.trim() === "") return close();
      const found = searchLinkTargets(ctx.targets, query.value);
      group("Rituals", found.rituals);
      group("Initiatives", found.initiatives);
      if (hits.length === 0) results.appendChild(el("div", "ltk-link-note", "Nothing matches."));
      active = Math.min(active, Math.max(0, hits.length - 1));
      results.style.display = "";
      query.setAttribute("aria-expanded", "true");
      paintActive();
      // in one column the field sits low in the dialog: bring the list
      // into view rather than leave it under the fold
      if (hits.length === 0 || active === 0) results.scrollIntoView({ block: "nearest" });
    };
    query.addEventListener("input", () => {
      active = 0;
      renderResults();
    });
    query.addEventListener("focus", () => {
      if (query.value.trim() !== "") renderResults();
    });
    query.addEventListener("blur", () => setTimeout(() => {
      if (document.activeElement !== query) close();
    }, 150));
    query.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (hits.length === 0) return;
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length;
        paintActive();
      } else if (e.key === "Enter") {
        // never the dialog's Save: Enter picks the highlighted target
        e.preventDefault();
        (hits[active] as HTMLButtonElement | undefined)?.click();
      } else if (e.key === "Escape" && results.style.display !== "none") {
        e.preventDefault();
        query.value = "";
        close();
      }
    });
    box.append(query, results);
    wrap.appendChild(box);
  };

  paint();
  void source()
    .then((c) => {
      ctx = c;
      origin = currentLink(o.action, c.targets, o.linkTarget ?? c.openHome);
      // a link the viewer's list cannot name (a completed or confidential
      // initiative, a stale list) is still named when it is the OPEN board
      if (origin.kind !== "personal" && origin.target === null) {
        const home = (o.action.instanceId !== "" ? o.action.instanceId : (o.linkTarget ?? c.openHome)).split(":")[0];
        if (home !== "" && home === (c.openBoardId ?? o.openBoardId ?? "")) origin = { ...origin, target: boardOnlyTarget(home, c.openBoardTitle ?? "") };
      }
      if (o.isNew && o.linkToOpenBoard === true) {
        // the open board, whether or not the list carries it (findings 1–3)
        const openId = c.openBoardId ?? o.openBoardId ?? null;
        if (openId !== null) chosen = c.targets.find((t) => t.boardId === openId) ?? boardOnlyTarget(openId, c.openBoardTitle ?? "");
      }
      paint();
    })
    .catch(() => {
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      wrap.appendChild(el("div", "ltk-link-note", "Links could not be loaded — the action keeps its current one."));
    });
  return { el: wrap, chosen: () => chosen, origin: () => origin, personalWho: () => ctx?.personalWho ?? "", loaded: () => ctx !== null };
}

/** The raise/edit action dialog (with escalation, completion and cancel). */
/** A small lock for confidential actions, wherever a row or card shows one. */
export function confidentialGlyph(a: LtkAction): HTMLElement | null {
  if (a.confidential !== true) return null;
  const g = el("span", "ltk-conf-glyph", "🔒");
  g.title = "Confidential — seen only by whoever raised it, the people assigned, their leaders and super admins.";
  return g;
}

export function openActionDialog(o: ActionDialogOptions): void {
  const action = o.action;
  const issue = textInput(action.issue, { placeholder: "Issue" });
  const form = buildActionForm(o.people, o.isNew && o.prefill !== true ? undefined : action, o.isNew);

  // "Support required" (issue 4, 2026-11-17 — the tick read "Escalated"):
  // the same flag and the same road to the escalation viewer of the board
  // above; the words say what it is for
  const escChk = checkItem("⚑ Support required");
  escChk.box.checked = action.escalated;
  escChk.wrap.classList.toggle("ltk-check-on", action.escalated);
  escChk.wrap.title = "This action needs support. It is flagged ⚑ wherever it is listed and raised to the board above.";
  // confidential (2026-09-16): creator, assignees, their leaders and super
  // admins only — the row helps say who
  const confChk = checkItem("Confidential");
  confChk.box.checked = action.confidential === true;
  confChk.wrap.classList.toggle("ltk-check-on", action.confidential === true);
  confChk.wrap.title = "Seen only by whoever raised it, the people assigned, their leaders and super admins.";

  const comments = buildCommentField(o);

  // the status the action arrived with — what "closing" and "reopening"
  // are measured against, and what the endorsement rule calls prior
  const prior = o.isNew ? null : action.status;
  const wasClosed = action.status === "done" || action.status === "verify";
  // the due date the action arrived with — a move from it is recorded,
  // and a move later may ask why (shared/schema/reschedule.ts). The
  // settings are asked for now so the save does not wait on them.
  const prevDue = o.isNew ? "" : action.due;
  if (prevDue !== "") void currentRescheduleSettings();
  // PDCA toggle (Ben, 2026-08-31): disc + label each — replaces the old
  // Completed checkbox (Closed IS completion). On hold (2026-09-30)
  // pauses: the action stays open and is not overdue while held.
  let pdca: ActionPdca = o.isNew ? (action.pdca ?? "do") : pdcaOf(action);
  const pdcaWrap = el("div", "ltk-pdca-seg");
  const pdcaBtns = new Map<ActionPdca, HTMLButtonElement>();
  const paintPdca = () => {
    for (const [k, b] of pdcaBtns) b.classList.toggle("ltk-pdca-on", k === pdca);
  };
  for (const state of ACTION_PDCA) {
    const b = el("button", "ltk-pdca-btn") as HTMLButtonElement;
    b.type = "button";
    b.append(pdcaDisc(state, 18, "currentColor"), el("span", undefined, PDCA_LABELS[state]));
    b.addEventListener("click", () => {
      pdca = state;
      paintPdca();
    });
    pdcaBtns.set(state, b);
    pdcaWrap.appendChild(b);
  }
  paintPdca();

  // linked card: which card this action hangs off — re-linkable when the
  // host offers targets (the board's ＋ Action road)
  let linkSel: HTMLSelectElement | null = null;
  const origin = o.linkTarget ?? "";
  if (o.linkTargets !== undefined && o.linkTargets.length > 1) {
    // an origin the list doesn't know (a removed card, another board's
    // channel) stays selectable — otherwise an untouched save would
    // silently re-link to the first option
    const targets =
      origin !== "" && !o.linkTargets.some((t) => t.key === origin)
        ? [{ key: origin, label: "(current link)" }, ...o.linkTargets]
        : o.linkTargets;
    linkSel = selectInput(
      origin !== "" ? origin : targets[0].key,
      targets.map((t) => ({ value: t.key, label: t.label }))
    );
  }

  // linked to (2026-09-29): one ritual or one initiative, or nothing.
  // A changed link MOVES the action; the within-board card select then
  // has nothing to say and hides.
  let linkRow: HTMLElement | null = null;
  const linkField: LinkField | null = o.noLinkField === true ? null : buildLinkField(
    o,
    () => dlg.body,
    () => {
      if (linkRow !== null) linkRow.style.display = "none";
    }
  );

  let asking = false;
  const save = () => {
    if (o.isNew && !form.hasContent() && issue.value.trim() === "") return;
    const nextDue = form.due();
    if (prevDue === "" || nextDue === prevDue) return commit(null);
    if (asking) return;
    asking = true;
    void currentRescheduleSettings().then((s) => {
      asking = false;
      if (dueMove(prevDue, nextDue, action, s.policy) !== "ask") return commit("");
      rescheduleBar(dlg.body, prevDue, nextDue, reasonChoices(s), (reason) => commit(reason));
    });
  };
  /** `moved`: null = the due date did not move; otherwise the reason
   *  given ("" when none was asked for). */
  const commit = (moved: string | null) => {
    action.issue = issue.value.trim();
    action.pdca = pdca;
    // Closed IS completion; leaving Closed reopens. An untouched state
    // keeps the status (awaiting endorsement / in-progress survive).
    if (pdca === "closed" && !wasClosed && action.status !== "cancelled") action.status = "done";
    else if (pdca !== "closed" && wasClosed) action.status = "open";
    action.escalated = escChk.box.checked;
    action.confidential = confChk.box.checked ? true : undefined;
    form.apply(action); // after status, so assignee done flags match
    // parts ticked here that complete a shared action close it (the one
    // rule, settleFromParts — before the endorsement rule reads the status)
    if (!o.isNew && action.status !== "cancelled") settleFromParts(action, { reopen: false });
    // what was written here, the box's text included
    comments.apply(action);
    // endorsement: closing on an initiative that asks for it waits for
    // its endorser — unless an endorser is the one closing
    const who = o.viewer ?? actionViewer();
    if (who !== null) applyEndorsementRule(action, prior, endorsementFor(action), who, new Date().toISOString());
    if (moved !== null) recordDueMove(action, prevDue, who, moved, new Date().toISOString());
    const linkedNow = linkField?.origin() ?? null;
    let picked = linkField?.chosen();
    // the list has not arrived but the host knows the open board: a new
    // action still links to it (finding 4 — a fast save landed personal)
    if (o.isNew && o.linkToOpenBoard === true && picked === undefined && linkField !== null && !linkField.loaded() && (o.openBoardId ?? "") !== "") {
      picked = boardOnlyTarget(o.openBoardId ?? "", "");
    }
    const moves = picked !== undefined && (linkedNow === null ? picked !== null : linkChanges(linkedNow, picked));
    if (moves && picked !== undefined) {
      applyLink(action, picked, linkField!.personalWho());
    } else if (linkSel !== null) {
      action.instanceId = linkSel.value;
      // moved to another card: drop the origin's element context so it
      // reads as a card-level action of its new home
      if (linkSel.value !== origin) action.context = { source: "card", sourceId: "" };
    }
    dlg.close();
    o.onCommit();
    // an existing action that left its home: the list it left refreshes
    if (moves && !o.isNew) window.dispatchEvent(new CustomEvent(ACTION_MOVED_EVENT, { detail: { id: action.id } }));
  };

  const buttons = [];
  if (!o.isNew) {
    buttons.push({
      // worded apart from the "Cancel" a new action's dialog carries
      label: "Cancel this action…",
      kind: "danger" as const,
      // confirmed first (Ben, 2026-09-29) — one stray click used to
      // cancel the action outright
      onClick: () =>
        confirmBar(dlg.body, "Cancel this action? It is marked cancelled and leaves the open lists.", "Yes, cancel it", "Keep the action", () => {
          action.status = "cancelled";
          dlg.close();
          o.onCommit();
        }),
    });
  }
  if (!o.isNew && o.onDuplicate !== undefined) {
    const dup = o.onDuplicate;
    buttons.push({
      label: "Duplicate…",
      kind: "secondary" as const,
      // the copy is of the action AS SAVED; what is typed here and not
      // saved stays here — asked about, like Close
      onClick: () => {
        const go = () => {
          dlg.close();
          dup(duplicateAction(action));
        };
        if (!comments.unsaved()) return go();
        confirmBar(dlg.body, "A comment you wrote or changed has not been saved. Duplicate without it?", "Duplicate anyway", "Keep editing", go);
      },
    });
  }
  buttons.push({
    label: o.isNew ? "Cancel" : "Close",
    kind: "secondary" as const,
    // a comment written and not saved is asked about, never lost quietly
    onClick: () => {
      if (!comments.unsaved()) return dlg.close();
      confirmBar(dlg.body, "A comment you wrote or changed has not been saved. Leave without it?", "Leave without saving", "Keep editing", () => dlg.close());
    },
  });
  buttons.push({
    label: o.isNew ? "Raise" : "Save",
    kind: "primary" as const,
    onClick: save,
  });

  // the layout (Ben, 2026-11-16: the dialog had grown past two screens):
  // wide enough for two columns — the action on the left, its
  // conversation and record on the right — and one column on a phone.
  // The split follows the dialog's OWN width (a container query on the
  // body), so it is right wherever the dialog is hosted.
  const dlg = openDialog({
    host: o.host,
    title: o.isNew ? "Raise action" : "Edit action",
    buttons,
    // wide enough for Start, Due and the two flags to share a row
    maxWidth: 940,
  });
  dlg.body.classList.add("ltk-act-body");
  // "Message" in the title row (issue 6, 2026-11-17): tell someone about
  // this action by Teams or email — the host's own notify panel
  const messenger = o.isNew ? null : actionMessenger();
  if (messenger !== null) {
    const titleEl = dlg.root.querySelector<HTMLElement>(".ltk-dialog-title");
    if (titleEl) {
      const text = titleEl.textContent ?? "";
      titleEl.textContent = "";
      titleEl.classList.add("ltk-dialog-title-row");
      titleEl.appendChild(el("span", undefined, text));
      const msg = el("button", "ltk-btn ltk-btn-secondary ltk-act-msgbtn", "✉ Message") as HTMLButtonElement;
      msg.type = "button";
      msg.title = "Message someone about this action by Teams or email";
      msg.addEventListener("click", () => messenger({ host: o.host, action, onSent: (c) => comments.adopt(c) }));
      titleEl.appendChild(msg);
    }
  }
  const grid = el("div", "ltk-act-grid");
  const main = el("div", "ltk-act-main");
  const side = el("div", "ltk-act-side");
  grid.append(main, side);
  dlg.body.appendChild(grid);
  // LEFT — the action itself: what, who, when, its state
  main.appendChild(fieldRow("Issue", issue));
  main.appendChild(form.el);
  // the two flags share the dates' row (Ben, 2026-11-16): each as wide
  // as its words, and onto a line of their own if the row is too tight —
  // squeezed to equal shares they clipped "Confidential"
  const flags = el("div", "ltk-act-flags");
  flags.append(escChk.wrap, confChk.wrap);
  form.dates.appendChild(flags);
  // RIGHT — where it is linked, then the conversation (Ben, 2026-11-16:
  // "Linked to" beside Issue threw the top row out of line; it is
  // optional and sits here). One column: it follows the action.
  if (linkField !== null) {
    const linked = fieldRow("Linked to (optional)", linkField.el);
    linked.classList.add("ltk-act-linked");
    side.appendChild(linked);
  }
  if (linkSel !== null) {
    linkRow = fieldRow(o.linkLabel ?? "Linked card", linkSel);
    side.appendChild(linkRow);
  }
  const state = el("div", "ltk-field");
  state.append(el("div", "ltk-field-label", "PDCA state"), pdcaWrap);
  pdcaWrap.classList.add("ltk-act-pdca");
  main.appendChild(state);
  if (!o.isNew && awaitingEndorsement(action)) {
    // the work is done and waits: say so, and hand the endorser their
    // two steps (off an endorsing initiative anyone may verify, as the
    // board's Verify column always allowed)
    const ctx = endorsementFor(action);
    const who = o.viewer ?? actionViewer();
    const may = who !== null && (ctx === null || !ctx.on || ctx.mine);
    const wait = el("div", "ltk-endorse");
    wait.appendChild(el("div", "ltk-endorse-msg", "◐ Awaiting endorsement — the work is done."));
    if (may) {
      const row = el("div", "ltk-confirm-btns");
      const back = el("button", "ltk-btn ltk-btn-secondary", "Send back…") as HTMLButtonElement;
      back.type = "button";
      back.addEventListener("click", () =>
        reasonBar(dlg.body, "Send this action back? It reopens for the people assigned.", "What still needs doing", "Send back", (reason) => {
          sendBack(action, who!, new Date().toISOString(), reason);
          comments.apply(action);
          dlg.close();
          o.onCommit();
        })
      );
      const ok = el("button", "ltk-btn ltk-btn-primary", "Endorse") as HTMLButtonElement;
      ok.type = "button";
      ok.addEventListener("click", () => {
        endorse(action, who!, new Date().toISOString());
        comments.apply(action);
        dlg.close();
        o.onCommit();
      });
      row.append(back, ok);
      wait.appendChild(row);
    } else {
      wait.appendChild(el("div", "ltk-endorse-note", "It closes when the initiative's owner, its sponsor or an admin endorses it."));
    }
    main.appendChild(wait);
  } else if (!o.isNew && action.status === "done" && action.verified) {
    main.appendChild(el("div", "ltk-endorse-note", `✓ Endorsed${action.verified.who !== "" ? ` by ${action.verified.who}` : ""} · ${action.verified.when.slice(0, 10)}`));
  }
  // the side: the conversation, then the record of its due date
  const count = action.comments.length;
  side.appendChild(el("div", "ltk-field-label", count > 0 ? `Comments · ${count}` : "Comments"));
  side.appendChild(comments.el);
  if (!o.isNew && dueMoves(action).length > 0) side.appendChild(dueMoveSummary(action));
  // attachments & links (issue 5, 2026-11-17): evidence on the action —
  // the host's list, on an action that exists (it hangs off its id)
  const attach = o.isNew ? null : actionAttachments();
  if (attach !== null) {
    const slot = el("div", "ltk-act-attach");
    side.appendChild(slot);
    const stop = attach(slot, action);
    // the list goes when the dialog does, however it is closed
    const gone = new MutationObserver(() => {
      if (dlg.root.isConnected) return;
      gone.disconnect();
      stop();
    });
    if (dlg.root.parentNode) gone.observe(dlg.root.parentNode, { childList: true });
  }
  form.focus();
}

export interface ActionManagerOptions {
  host: HTMLElement;
  /** Optional re-link targets, handed to the raise/edit dialogs. */
  linkTargets?: { key: string; label: string }[];
  linkTarget?: string;
  /** The card's action set — mutated in place (new pushed, edits applied). */
  actions: LtkAction[];
  /** Component kind stamped on new actions ("fishbone", "kpitrend"…). */
  source: string;
  /** The element the actions hang off — a cause / node id, "" for card-level. */
  sourceId: string;
  /** Prefill for a new action's issue (e.g. the cause text / node label). */
  seedIssue?: string;
  hint?: string;
  people: Person[];
  doneColor: string;
  readOnly?: boolean;
  /** The card's "Disable actions" setting: existing actions stay listed,
   *  completable and editable, but nothing new can be raised. */
  canRaise?: boolean;
  title?: string;
  /** Persist + refresh after any change (raise / edit / complete / cancel). */
  onChanged: () => void;
}

/**
 * The shared "actions for X" surface: lists this source's live actions with a
 * complete circle and edit, plus a Raise button. When there are none (and the
 * card is editable) it goes straight to the raise dialog. Used for per-element
 * actions (Fishbone causes, Process-map nodes) and card-level ones (KPI trend,
 * Pareto) alike — sourceId "" is the card bucket.
 */
export function openActionManager(o: ActionManagerOptions): void {
  const canRaise = (o.canRaise ?? true) && !o.readOnly;
  const live = o.actions.filter(
    (a) => a.context.sourceId === o.sourceId && a.status !== "cancelled"
  );
  const raise = () => {
    const action = newAction({ source: o.source, sourceId: o.sourceId, hint: o.hint });
    if (o.seedIssue) action.issue = o.seedIssue;
    openActionDialog({
      host: o.host,
      action,
      people: o.people,
      isNew: true,
      linkTargets: o.linkTargets,
      linkTarget: o.linkTarget,
      onCommit: () => {
        o.actions.push(action);
        o.onChanged();
      },
    });
  };
  if (live.length === 0 && canRaise) {
    raise();
    return;
  }
  const dlg = openDialog({
    host: o.host,
    title: o.title ?? "Actions",
    buttons: !canRaise
      ? [{ label: "Close", kind: "secondary", onClick: () => dlg.close() }]
      : [
          { label: "Close", kind: "secondary", onClick: () => dlg.close() },
          {
            label: "＋ Raise action",
            kind: "primary",
            onClick: () => {
              dlg.close();
              raise();
            },
          },
        ],
  });
  dlg.body.appendChild(sectionLabel(`Actions (${live.length})`));
  for (const a of live) {
    dlg.body.appendChild(
      actionRow(a, {
        doneColor: o.doneColor,
        readOnly: o.readOnly,
        onChanged: () => o.onChanged(),
        onEdit: (act) =>
          openActionDialog({
            host: o.host,
            action: act,
            people: o.people,
            isNew: false,
            linkTargets: o.linkTargets,
            linkTarget: act.instanceId !== "" ? act.instanceId : o.linkTarget,
            onCommit: () => o.onChanged(),
          }),
      })
    );
  }
}
