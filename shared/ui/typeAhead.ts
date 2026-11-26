// The standing search-picker (docs/ui-standard.md §2.x), as ONE builder
// (backlog programme tranche 5, 2026-11-27). Anything a person searches
// in order to PICK is built with this: the list floats under the box
// with its own scroll, results follow each keystroke, a slow source
// (the directory, a connector) is asked by itself after a pause and
// shows under its own heading, ↑ ↓ move, Enter picks and never submits
// the form around it, Escape closes.
//
// Until now the pattern was copied by hand: the action dialog's people
// search and "Linked to", the capture card's person column and the
// document search each carry their own copy, and a dozen older searches
// drew their results in the form itself. Those older ones move here;
// the four that already follow the pattern stay as they are.

import { LTK_BASE_CSS } from "./baseCss";
import { el, ensureStylesheet, onEscape } from "./dom";

export interface TypeAheadOption {
  label: string;
  /** A second line: an email, a site, a status. */
  sub?: string;
  /** A small mark after the name ("new to the app", "on the roster"). */
  tag?: string;
  /** What a pick does. A promise holds the option as busy until it
   *  settles; a rejection is said under the option and nothing closes. */
  run: () => void | Promise<void>;
  /** Shown, and not pickable ("already listed"). */
  disabled?: boolean;
}

export interface TypeAheadRemote {
  /** One call for what is in the box. */
  search: (q: string) => Promise<TypeAheadOption[]>;
  /** The heading its matches stand under ("In the directory"). */
  heading?: string;
  /** Letters before it is asked (default 3) and the pause in typing that
   *  sets the question off (default 350 ms). */
  minChars?: number;
  pauseMs?: number;
  searching?: string;
  failed?: string;
}

export interface TypeAheadOpts {
  placeholder: string;
  /** The accessible name (default: the placeholder). */
  label?: string;
  /** What the app already holds, for the lower-cased query — shown at
   *  once. Called with "" only when `listOnFocus` is set. */
  local?: (ql: string) => TypeAheadOption[];
  /** The heading over the held matches, when a remote follows them. */
  localHeading?: string;
  /** The slow source — or a function read at every keystroke, for a box
   *  whose source can change under it (a role tick, a road that arrives
   *  late). */
  remote?: TypeAheadRemote | null | (() => TypeAheadRemote | null);
  /** A short, KNOWN list (the owners & approvers group): clicking into
   *  the empty box lists it. Otherwise nothing shows until a letter. */
  listOnFocus?: boolean;
  /** "No one matches." */
  noneWords?: string;
  /** The input's class ("ltk-input" by default; a host passes its own). */
  inputClass?: string;
  /** At most this many options from each source (default 8 remote, 12
   *  held; the unasked list of `listOnFocus` shows up to 50). */
  maxLocal?: number;
  maxRemote?: number;
  /** A pick leaves the box's text alone (the caller writes the picked
   *  name into it). Default: a pick empties the box for the next one. */
  keepText?: boolean;
}

export interface TypeAhead {
  el: HTMLElement;
  input: HTMLInputElement;
  close: () => void;
  /** Draw again for what is in the box, when the cursor is in it (a
   *  source that has just loaded). */
  refresh: () => void;
}

export type RemotePhase = "off" | "short" | "waiting" | "busy" | "done" | "failed";

/** Where the slow source stands for what is in the box. Pure. */
export function remotePhase(q: string, hasRemote: boolean, minChars: number, asked: { q: string; state: "idle" | "busy" | "done" | "failed" }): RemotePhase {
  if (!hasRemote) return "off";
  if (q.length < minChars) return "short";
  if (asked.q !== q || asked.state === "idle") return "waiting";
  return asked.state;
}

/** The line under the options, "" for none. `cut` is how many held
 *  matches the cap left out. Pure. */
export function typeAheadNote(phase: RemotePhase, shown: number, o: { minChars: number; noneWords: string; searching: string; failed: string; cut?: number }): string {
  if (phase === "waiting" || phase === "busy") return o.searching;
  if (phase === "failed") return o.failed;
  if ((o.cut ?? 0) > 0) return `${o.cut} more. Type more of the name.`;
  if (phase === "short") return shown === 0 ? `Keep typing to search further (${o.minChars} letters).` : "";
  return shown === 0 ? o.noneWords : "";
}

export function buildTypeAhead(o: TypeAheadOpts): TypeAhead {
  ensureStylesheet("ltk-base-css", LTK_BASE_CSS);
  const input = el("input", o.inputClass ?? "ltk-input") as HTMLInputElement;
  input.type = "text";
  input.placeholder = o.placeholder;
  input.setAttribute("aria-label", o.label ?? o.placeholder);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.autocomplete = "off";
  const pop = el("div", "ltk-who-pop");
  pop.setAttribute("role", "listbox");
  pop.style.display = "none";
  // a press on the list's own scrollbar must not take the focus away
  pop.addEventListener("mousedown", (e) => e.preventDefault());
  const box = el("div", "ltk-who-box ltk-ta-box");
  box.append(input, pop);

  const remoteNow = (): TypeAheadRemote | null => (typeof o.remote === "function" ? o.remote() : (o.remote ?? null));
  let asked: { q: string; state: "idle" | "busy" | "done" | "failed"; hits: TypeAheadOption[] } = { q: "", state: "idle", hits: [] };
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = 0;
  let options: { el: HTMLButtonElement; run: () => void }[] = [];
  const minChars = (r: TypeAheadRemote | null) => r?.minChars ?? 3;

  /** Where the list goes. It is laid over the page (position: fixed)
   *  from the box's own place, so a short dialog or a scrolling pane
   *  cannot cut it off; it opens upward when there is no room below.
   *  A scaled card or a contained dialog body traps a fixed box — the
   *  list would land somewhere else — so the placement is MEASURED, and
   *  such a host falls back to the stylesheet's place under the box. */
  const place = () => {
    if (pop.style.display === "none") return;
    // the host took the box away with its list open
    if (!input.isConnected) return close();
    const r = input.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 170 && above > below;
    pop.style.position = "fixed";
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 328))}px`;
    pop.style.width = `${Math.max(r.width, 320)}px`;
    pop.style.maxHeight = `${Math.max(110, Math.min(290, up ? above : below))}px`;
    pop.style.top = up ? "auto" : `${r.bottom + 4}px`;
    pop.style.bottom = up ? `${window.innerHeight - r.top + 4}px` : "auto";
    const got = pop.getBoundingClientRect();
    const want = up ? r.top - 4 - got.height : r.bottom + 4;
    if (Math.abs(got.top - want) > 3) {
      for (const k of ["position", "left", "width", "maxHeight", "top", "bottom"] as const) pop.style[k] = "";
    }
  };
  let placing = false;
  const follow = (on: boolean) => {
    if (on === placing) return;
    placing = on;
    // capture: a scroll of ANY ancestor moves the box the list hangs from
    if (on) {
      window.addEventListener("scroll", onMove, true);
      window.addEventListener("resize", place);
    } else {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", place);
    }
  };
  const onMove = (e: Event) => {
    // the list's own scroll is not a move
    if (e.target === pop) return;
    place();
  };
  const close = () => {
    pop.style.display = "none";
    input.setAttribute("aria-expanded", "false");
    options = [];
    follow(false);
  };
  const paintActive = () => {
    options.forEach((x, n) => {
      x.el.classList.toggle("ltk-who-opt-on", n === active);
      x.el.setAttribute("aria-selected", String(n === active));
    });
    options[active]?.el.scrollIntoView?.({ block: "nearest" });
  };
  const picked = () => {
    if (o.keepText !== true) input.value = "";
    asked = { q: "", state: "idle", hits: [] };
    close();
    // the cursor stays for the next pick
    if (document.activeElement !== input) input.focus();
  };
  const option = (opt: TypeAheadOption): HTMLButtonElement => {
    const b = el("button", "ltk-who-opt") as HTMLButtonElement;
    b.type = "button";
    b.setAttribute("role", "option");
    const name = el("span", "ltk-who-opt-name", opt.label);
    if ((opt.tag ?? "") !== "") name.appendChild(el("span", "ltk-ta-tag", opt.tag));
    b.appendChild(name);
    if ((opt.sub ?? "") !== "") b.appendChild(el("span", "ltk-who-opt-sub", opt.sub));
    // mousedown, not click: the box keeps its focus and the list its place
    b.addEventListener("mousedown", (e) => e.preventDefault());
    if (opt.disabled === true) {
      b.disabled = true;
      b.classList.add("ltk-ta-off");
      return b;
    }
    const run = () => {
      if (b.disabled) return;
      let r: void | Promise<void>;
      try {
        r = opt.run();
      } catch (err) {
        r = Promise.reject(err);
      }
      if (r instanceof Promise) {
        b.disabled = true;
        r.then(picked, (err: unknown) => {
          b.disabled = false;
          const sub = b.querySelector(".ltk-who-opt-sub") ?? b.appendChild(el("span", "ltk-who-opt-sub", ""));
          sub.textContent = err instanceof Error ? err.message : "That did not work.";
          sub.classList.add("ltk-who-opt-err");
        });
      } else picked();
    };
    b.addEventListener("click", run);
    options.push({ el: b, run });
    return b;
  };

  const render = () => {
    while (pop.firstChild) pop.removeChild(pop.firstChild);
    options = [];
    const q = input.value.trim();
    if (q === "" && o.listOnFocus !== true) return close();
    const all = o.local?.(q.toLowerCase()) ?? [];
    // nothing typed and nothing known to list: the box stays plain
    if (q === "" && all.length === 0) return close();
    const held = all.slice(0, q === "" ? 50 : (o.maxLocal ?? 12));
    const remote = remoteNow();
    const phase = q === "" ? "off" : remotePhase(q, remote !== null, minChars(remote), asked);
    const far = phase === "done" ? asked.hits.slice(0, o.maxRemote ?? 8) : [];
    if (held.length > 0 && remote !== null && (o.localHeading ?? "") !== "" && far.length > 0) pop.appendChild(el("div", "ltk-who-pop-h", o.localHeading));
    for (const h of held) pop.appendChild(option(h));
    if (far.length > 0 && (remote?.heading ?? "") !== "") pop.appendChild(el("div", "ltk-who-pop-h", remote?.heading));
    for (const h of far) pop.appendChild(option(h));
    const note = typeAheadNote(phase, held.length + far.length, {
      minChars: minChars(remote),
      noneWords: o.noneWords ?? "Nothing matches.",
      searching: remote?.searching ?? "Searching…",
      failed: remote?.failed ?? "The search failed. Check the connection and type again.",
      cut: all.length - held.length,
    });
    if (note !== "") pop.appendChild(el("div", "ltk-who-pop-note", note));
    if (pop.childElementCount === 0) return close();
    active = Math.min(active, Math.max(0, options.length - 1));
    pop.style.display = "";
    input.setAttribute("aria-expanded", "true");
    place();
    follow(true);
    paintActive();
  };

  const ask = () => {
    if (timer !== null) clearTimeout(timer);
    const q = input.value.trim();
    const from = remoteNow();
    if (from === null || q.length < minChars(from)) return;
    if (asked.q === q && asked.state !== "idle") return;
    asked = { q, state: "busy", hits: [] };
    // a pause in the typing, then ONE call for what is in the box; a
    // stale answer is dropped by its sequence number
    timer = setTimeout(() => {
      const mine = ++seq;
      void from.search(q).then(
        (hits) => {
          if (mine !== seq) return;
          asked = { q, state: "done", hits };
          if (input.value.trim() === q && document.activeElement === input) render();
        },
        () => {
          if (mine !== seq) return;
          asked = { q, state: "failed", hits: [] };
          if (input.value.trim() === q && document.activeElement === input) render();
        }
      );
    }, from.pauseMs ?? 350);
  };

  input.addEventListener("input", () => {
    active = 0;
    render();
    ask();
  });
  input.addEventListener("focus", () => {
    if (options.length === 0 && (input.value.trim() !== "" || o.listOnFocus === true)) {
      render();
      ask();
    }
  });
  input.addEventListener("blur", () =>
    setTimeout(() => {
      if (document.activeElement !== input) close();
    }, 150)
  );
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (pop.style.display === "none") {
        if (e.key === "ArrowDown" && (input.value.trim() !== "" || o.listOnFocus === true)) {
          e.preventDefault();
          render();
          ask();
        }
        return;
      }
      if (options.length === 0) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length;
      paintActive();
    } else if (e.key === "Enter") {
      // Enter picks; it NEVER submits the form around the box
      if (pop.style.display === "none") return;
      e.preventDefault();
      e.stopPropagation();
      options[active]?.run();
    }
  });
  onEscape(input, () => {
    if (pop.style.display === "none") return false;
    close();
    return true;
  });

  return {
    el: box,
    input,
    close,
    refresh: () => {
      if (document.activeElement !== input) return;
      render();
      ask();
    },
  };
}

/** ↑ ↓ and Enter for a search whose list the HOST draws (a menu with
 *  its own groups and "more" line): the keys walk the buttons `items`
 *  gives, Enter presses the lit one — or the only one — and never
 *  submits the form around the box. `reset` after each redraw. */
export function listKeys(input: HTMLInputElement, items: () => HTMLButtonElement[], onClass: string): { reset: () => void } {
  let active = -1;
  const paint = () => {
    const all = items();
    all.forEach((b, n) => b.classList.toggle(onClass, n === active));
    all[active]?.scrollIntoView?.({ block: "nearest" });
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const all = items();
      if (all.length === 0) return;
      e.preventDefault();
      active = nextActive(active, all.length, e.key === "ArrowDown" ? 1 : -1);
      paint();
    } else if (e.key === "Enter") {
      const all = items();
      const hit = all[active] ?? (all.length === 1 ? all[0] : undefined);
      e.preventDefault();
      e.stopPropagation();
      hit?.click();
    }
  });
  return {
    reset: () => {
      active = -1;
      paint();
    },
  };
}

/** The lit row after an arrow key: from "none lit" (-1) ↓ goes to the
 *  first and ↑ to the last; the ends wrap. Pure. */
export function nextActive(active: number, count: number, step: 1 | -1): number {
  if (count <= 0) return -1;
  if (active < 0) return step === 1 ? 0 : count - 1;
  return (active + step + count) % count;
}
