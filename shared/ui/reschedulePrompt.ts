// "Why is this moving?" — the one set of fields every surface asks with
// (the action dialog's inline bar, the Gantt's move dialog): the
// organisation's reasons, "Other", and a note. The host lays the two
// controls out in its own field rows; the answer rule (Other needs its
// note) lives in shared/schema/reschedule.ts.

import { composeReason, defaultRescheduleSettings, OTHER_REASON, RescheduleSettings } from "../schema/reschedule";
import { hostRescheduleSettings } from "./actionLinkProvider";
import { el } from "./dom";

/** The organisation's settings as the host knows them — the defaults
 *  (initiatives only, the four standing reasons) when there is no host
 *  or its read failed. Asked when a dialog opens and again at its save,
 *  so the host's own cache decides how fresh the answer is. */
export async function currentRescheduleSettings(): Promise<RescheduleSettings> {
  return (await hostRescheduleSettings()) ?? defaultRescheduleSettings();
}

export interface RescheduleFields {
  select: HTMLSelectElement;
  note: HTMLInputElement;
  /** Empty until an answer was refused. */
  err: HTMLElement;
  /** The history text, or null after saying what is missing. */
  read: () => string | null;
}

export function rescheduleFields(choices: string[], inputClass: string, errClass: string): RescheduleFields {
  const select = el("select", inputClass) as HTMLSelectElement;
  select.setAttribute("aria-label", "Why is this moving?");
  // nothing is chosen for the person: a reason picked by default is a
  // reason nobody gave
  const blank = el("option", undefined, "Choose a reason…") as HTMLOptionElement;
  blank.value = "";
  select.appendChild(blank);
  for (const c of choices) {
    const o = el("option", undefined, c) as HTMLOptionElement;
    o.value = c;
    select.appendChild(o);
  }
  const note = el("input", inputClass) as HTMLInputElement;
  note.type = "text";
  note.maxLength = 200;
  const paintNote = () => {
    note.placeholder = select.value === OTHER_REASON ? "What is the reason?" : "Optional note";
  };
  paintNote();
  const err = el("div", errClass, "");
  select.addEventListener("change", () => {
    paintNote();
    err.textContent = "";
    if (select.value === OTHER_REASON) note.focus();
  });
  note.addEventListener("input", () => {
    err.textContent = "";
  });
  return {
    select,
    note,
    err,
    read: () => {
      if (select.value === "") {
        err.textContent = "Choose a reason.";
        select.focus();
        return null;
      }
      const reason = composeReason(select.value, note.value);
      if (reason === null) {
        err.textContent = "Say what the reason is.";
        note.focus();
        return null;
      }
      return reason;
    },
  };
}
