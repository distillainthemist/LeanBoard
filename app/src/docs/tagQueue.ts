// The tag proposals queue for DOCUMENT CONTROLLERS (issue 2, 2026-10-18
// round): the Settings → Documents → Tags block is super-admin only,
// so a controller could never approve. This dialog opens from the
// register's kebab: pending proposals with their proposer, note and
// the document they were raised on; Approve mints the term, puts it on
// that document when one is named, and tells the proposer; Decline
// asks for the reason and sends it.

import { clear, el } from "../../../shared/ui/dom";
import { openDialog } from "../../../shared/ui/dialog";
import { promptText } from "../prompts";
import { TagProposal, applyWaitingProposal, approveProposal, declineProposal, listProposals, markProposalTagged } from "./tagProposals";

export function openTagQueue(opts: {
  host: HTMLElement;
  site: string;
  setId: string;
  /** The tags column's internal name ("" = approvals mint only). */
  tagsInternal: string;
  /** Is the proposal's document in revision — may the tag be written
   *  now? (Ben, 2026-10-19: never on an approved document.) */
  inRevision: (p: TagProposal) => Promise<boolean>;
  onChanged: () => void;
}): void {
  const dlg = openDialog({
    host: opts.host,
    title: "Tag proposals",
    maxWidth: 620,
    buttons: [{ label: "Close", kind: "primary", onClick: () => dlg.close() }],
  });
  const body = dlg.body;
  const status = el("div", "app-docs-addstatus");
  const list = el("div", "app-docs-tagqueue");
  body.append(el("div", "app-field-hint", "Approving mints the tag in the term set, puts it on the document the proposal names when that document is in revision, and tells the proposer. An approved document is never written to — its tag waits for the next revision. Declining asks for your reason and sends it."), list, status);
  const paint = async () => {
    clear(list);
    list.appendChild(el("div", "app-loading-line", "Reading proposals…"));
    const [pending, waiting] = await Promise.all([listProposals("pending").catch(() => [] as TagProposal[]), listProposals("minted").catch(() => [] as TagProposal[])]);
    clear(list);
    if (pending.length === 0 && waiting.length === 0) {
      list.appendChild(el("div", "app-settings-note", "No tags are waiting for a decision."));
      return;
    }
    if (pending.length > 0) list.appendChild(el("div", "app-docs-tasksgroup", `Proposed (${pending.length})`));
    for (const p of pending) {
      const row = el("div", "app-docs-tagprop");
      row.appendChild(el("div", "app-docs-tagproplabel", `#${p.label}`));
      const meta = [p.proposerName || p.proposerEmail, p.docName !== "" ? `on “${p.docName}”` : "", p.note].filter((x) => x !== "").join(" — ");
      if (meta !== "") row.appendChild(el("div", "app-field-hint", meta));
      const acts = el("div", "app-docs-tagpropacts");
      const ok = el("button", "app-btn", "Approve") as HTMLButtonElement;
      ok.addEventListener("click", () => {
        void (async () => {
          ok.disabled = true;
          status.textContent = `Approving “${p.label}”…`;
          const r = await approveProposal(p, opts.site, opts.setId, opts.tagsInternal, () => opts.inRevision(p));
          if (r.error !== "") {
            status.textContent = `Could not approve “${p.label}”: ${r.error}`;
            ok.disabled = false;
            return;
          }
          status.textContent = `“${p.label}” approved${r.applied ? ` and added to “${p.docName}”` : ""}${r.warn !== "" ? ` — ${r.warn}` : ""}.`;
          opts.onChanged();
          await paint();
        })();
      });
      const no = el("button", "app-btn", "Decline…") as HTMLButtonElement;
      no.addEventListener("click", () => {
        void (async () => {
          const msg = await promptText({ title: `Decline “${p.label}”`, note: "Your reason goes to the proposer as a Teams message.", required: "A reason is needed.", confirmLabel: "Decline" });
          if (msg === null) return;
          no.disabled = true;
          const r = await declineProposal(p, msg);
          status.textContent = r.error !== "" ? `Could not decline: ${r.error}` : `“${p.label}” declined${r.warn !== "" ? ` — the Teams message did not go: ${r.warn}` : " — the proposer has been told"}.`;
          opts.onChanged();
          await paint();
        })();
      });
      acts.append(ok, no);
      row.appendChild(acts);
      list.appendChild(row);
    }
    // approved while the document was approved: the tag waits
    if (waiting.length > 0) {
      list.appendChild(el("div", "app-docs-tasksgroup", `To tag at next revision (${waiting.length})`));
      for (const p of waiting) {
        const row = el("div", "app-docs-tagprop");
        row.appendChild(el("div", "app-docs-tagproplabel", `#${p.label}`));
        row.appendChild(el("div", "app-field-hint", `on “${p.docName}” — the tag exists; it goes on the document once it is in revision`));
        const acts = el("div", "app-docs-tagpropacts");
        const now = el("button", "app-btn", "Tag now") as HTMLButtonElement;
        now.title = "Write the tag — works once the document is in revision";
        now.addEventListener("click", () => {
          void (async () => {
            now.disabled = true;
            status.textContent = `Tagging “${p.docName}”…`;
            const r = await applyWaitingProposal(p, opts.tagsInternal, () => opts.inRevision(p));
            status.textContent = r.error !== "" ? `Not tagged: ${r.error}` : `“${p.label}” is on “${p.docName}”.`;
            now.disabled = false;
            if (r.applied) {
              opts.onChanged();
              await paint();
            }
          })();
        });
        const done = el("button", "app-btn", "Done — tagged by hand") as HTMLButtonElement;
        done.title = "An editor already put the tag on at the revision";
        done.addEventListener("click", () => {
          void (async () => {
            done.disabled = true;
            const err = await markProposalTagged(p);
            status.textContent = err !== "" ? `Could not record it: ${err}` : `“${p.label}” recorded as tagged.`;
            await paint();
          })();
        });
        acts.append(now, done);
        row.appendChild(acts);
        list.appendChild(row);
      }
    }
  };
  void paint();
}
