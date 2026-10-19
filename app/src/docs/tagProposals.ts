// Governed hashtags (relationships plan H1, 2026-08-13) — the proposal
// ledger. Anyone proposes from the tagging editor; DOCUMENT CONTROLLERS
// decide in Settings → Documents. Approval CREATES the term (the 5F
// road) so the term store never holds an unvetted label; declining
// carries a message to the proposer (the issues pattern — never
// silent). Proposals are never deleted: the decision is the record.

import { currentViewer } from "../runtime";
import { Ben_ltktagproposalsService } from "../generated/services/Ben_ltktagproposalsService";
import { LifecycleStage, SiteDictionary, stageOfTerm, tagLabelProblems } from "./model";
import { createTerm, fetchTermStoreLanguage, fetchTermsInSet, invalidateTermPaths, spRequest } from "./sp";

/** Proposal statuses: pending → approved | declined; "minted" = approved
 *  and the term exists, but the document named was APPROVED at the
 *  time (Ben, 2026-10-19: a metadata write would knock it out of the
 *  approved state), so the tag waits for its next revision. */
export type ProposalStatus = "pending" | "approved" | "declined" | "minted";

/** Is the document a proposal names in revision — draft, in review or
 *  awaiting approval — so a tag may be written on it? No lifecycle
 *  (no status column, no value) = yes; unreadable = no (never a write
 *  the app cannot vouch for). */
export async function docInRevision(p: { docSite: string; docUid: string }, statusInternal: string, stageOf: (statusLabel: string) => LifecycleStage | ""): Promise<boolean> {
  if (statusInternal === "" || p.docUid === "") return true;
  const r = await spRequest(p.docSite, "GET", `_api/web/GetFileById('${p.docUid}')/ListItemAllFields?$select=Id,${statusInternal}`);
  if (!r.ok) return false;
  const raw = ((r.data ?? {}) as Record<string, unknown>)[statusInternal];
  const label = typeof raw === "string" ? raw : raw && typeof raw === "object" ? String((raw as { Label?: unknown }).Label ?? "") : "";
  const stage = stageOf(label.split(";")[0].trim());
  return stage === "" || stage === "draft" || stage === "inReview" || stage === "inApproval" || stage === "inOwnerApproval";
}

/** A stage reader from the site's status vocabulary (Settings has no
 *  live label → id map of its own). */
export async function statusStageReader(site: string, dict: SiteDictionary): Promise<{ statusInternal: string; stageOf: (label: string) => LifecycleStage | "" }> {
  const col = dict.columns.find((c) => c.role === "status" && c.termSetId !== "");
  if (col === undefined) return { statusInternal: "", stageOf: () => "" };
  const byLabel = new Map<string, string>();
  const r = await fetchTermsInSet(site, col.termSetId);
  const rows = Array.isArray((r.data as { value?: unknown[] })?.value) ? ((r.data as { value: unknown[] }).value as Record<string, unknown>[]) : [];
  for (const t of rows) {
    const names = t.labels as { name?: string; isDefault?: boolean }[] | undefined;
    const def = Array.isArray(names) ? (names.find((l) => l.isDefault) ?? names[0]) : undefined;
    const name = (def?.name ?? "").trim();
    if (name !== "" && typeof t.id === "string") byLabel.set(name.toLowerCase(), t.id);
  }
  return {
    statusInternal: col.internal,
    stageOf: (label) => {
      const id = byLabel.get(label.trim().toLowerCase());
      return id === undefined ? "" : stageOfTerm(dict, id);
    },
  };
}

export interface TagProposal {
  id: string;
  label: string;
  note: string;
  status: string;
  proposerEmail: string;
  proposerName: string;
  decision: string;
  termId: string;
  when: string;
  /** The document it was raised on (issue 2): approval tags it. "" =
   *  raised without one (the field editor before 2026-10-19). */
  docSite: string;
  docListId: string;
  docUid: string;
  docName: string;
}

/** The document a proposal is raised on. */
export interface ProposalDoc {
  site: string;
  listId: string;
  uid: string;
  name: string;
}

type Row = Awaited<ReturnType<typeof Ben_ltktagproposalsService.getAll>> extends {
  data?: (infer T)[] | undefined;
}
  ? T
  : never;

const shape = (r: Row): TagProposal => {
  const x = r as Row & { ben_docsite?: string; ben_doclistid?: string; ben_docuid?: string; ben_docname?: string };
  return {
    id: (r as { ben_ltktagproposalid?: string }).ben_ltktagproposalid ?? "",
    label: r.ben_name ?? "",
    note: r.ben_note ?? "",
    status: r.ben_status ?? "",
    proposerEmail: r.ben_proposeremail ?? "",
    proposerName: r.ben_proposername ?? "",
    decision: r.ben_decision ?? "",
    termId: r.ben_termid ?? "",
    when: (r as { createdon?: string }).createdon ?? "",
    docSite: x.ben_docsite ?? "",
    docListId: (x.ben_doclistid ?? "").toLowerCase(),
    docUid: (x.ben_docuid ?? "").toLowerCase(),
    docName: x.ben_docname ?? "",
  };
};

/** File a proposal. "" = filed; otherwise the plain-words refusal.
 *  `doc` names the document it was raised on, so approval can tag it. */
export async function submitTagProposal(label: string, note: string, doc?: ProposalDoc): Promise<string> {
  const t = label.trim().replace(/^#/, "");
  const problems = tagLabelProblems(t);
  if (problems.length > 0) return `this tag cannot be minted: ${problems.join("; ")}`;
  const dupe = await Ben_ltktagproposalsService.getAll({
    filter: `ben_name eq '${t.replace(/'/g, "''")}' and (ben_status eq 'pending' or ben_status eq 'approved')`,
    top: 1,
  });
  if (dupe.success !== false && (dupe.data ?? []).length > 0) {
    const st = (dupe.data ?? [])[0].ben_status;
    return st === "approved"
      ? "this tag was already approved — it should be in the picker"
      : "this tag is already proposed and awaiting review";
  }
  const me = currentViewer();
  const r = await Ben_ltktagproposalsService.create({
    ben_name: t,
    ben_note: note.trim(),
    ben_status: "pending",
    ben_proposeremail: (me?.email ?? "").toLowerCase(),
    ben_proposername: me?.name ?? "",
    ...(doc
      ? { ben_docsite: doc.site, ben_doclistid: doc.listId.toLowerCase(), ben_docuid: doc.uid.toLowerCase(), ben_docname: doc.name.slice(0, 255) }
      : {}),
  } as Parameters<typeof Ben_ltktagproposalsService.create>[0]);
  return r.success === false ? (r.error?.message ?? "the proposal was refused").slice(0, 200) : "";
}

export async function listProposals(status: string): Promise<TagProposal[]> {
  const r = await Ben_ltktagproposalsService.getAll({
    ...(status !== "" ? { filter: `ben_status eq '${status}'` } : {}),
    top: 200,
  });
  const rows = (r.success === false ? [] : (r.data ?? [])).map(shape);
  rows.sort((a, b) => Date.parse(a.when) - Date.parse(b.when)); // oldest first — the queue
  return rows;
}

/** Approve: mint the term at the set root, record the decision.
 *  "" = done; otherwise the refusal (the proposal stays pending). */
/** Mint a tag term directly (C3, feedback round 1): document controllers
 *  do this from Settings → Documents → Tags and from the tag editor;
 *  approving a proposal rides the same road. */
export async function mintTag(site: string, setId: string, label: string): Promise<{ error: string; termId: string }> {
  const t = label.trim().replace(/^#/, "");
  const problems = tagLabelProblems(t);
  if (problems.length > 0) return { error: `cannot mint: ${problems.join("; ")}`, termId: "" };
  const langRes = await fetchTermStoreLanguage(site);
  const lang =
    ((langRes.data ?? {}) as { defaultLanguageTag?: string }).defaultLanguageTag ?? "en-US";
  const made = await createTerm(site, setId, "", t, lang);
  if (!made.ok) return { error: `the term store refused it: ${made.status.slice(0, 200)}`, termId: "" };
  const termId = String(((made.data ?? {}) as { id?: unknown }).id ?? "");
  invalidateTermPaths(); // pickers must see the new term without a reload
  return { error: "", termId };
}

/** Put a minted tag on the document a proposal named (issue 2): the
 *  current tags plus the new one, through the connector's typed item
 *  surface; a library that demands check-out gets the bracket. */
async function applyTagToDocument(p: TagProposal, tagsInternal: string, term: { label: string; termId: string }): Promise<string> {
  if (tagsInternal === "" || p.docUid === "" || p.docListId === "") return "";
  const site = p.docSite;
  const { fetchListItem, connectorPatchItem, checkOutFile, checkInFile, fetchFileItemId } = await import("./sp");
  const { spErrorText } = await import("./model");
  const { spRequest } = await import("./sp");
  // the item by its unique id: id, server-relative url, current tags
  const r = await spRequest(site, "GET", `_api/web/GetFileById('${p.docUid}')/ListItemAllFields?$select=Id,FileRef,${tagsInternal}`);
  if (!r.ok) return `the document could not be read: ${spErrorText(r.status).slice(0, 120)}`;
  const item = (r.data ?? {}) as Record<string, unknown>;
  const itemId = Number(item.Id ?? 0);
  const fileRef = String(item.FileRef ?? "");
  if (itemId === 0) return "the document's item could not be read";
  const current = Array.isArray(item[tagsInternal]) ? (item[tagsInternal] as { Label?: string; TermGuid?: string }[]) : [];
  const kept = current.filter((t) => typeof t.TermGuid === "string" && t.TermGuid.toLowerCase() !== term.termId.toLowerCase()).map((t) => ({ Value: t.Label ?? "", TermGuid: t.TermGuid ?? "", WssId: -1 }));
  const value = [...kept, { Value: term.label, TermGuid: term.termId, WssId: -1 }];
  let w = await connectorPatchItem(site, p.docListId, itemId, { [tagsInternal]: value });
  if (!w.ok && /check(ed)? ?out/i.test(spErrorText(w.status)) && fileRef !== "") {
    // the bracket: check-out → write → minor check-in
    const out = await checkOutFile(site, fileRef);
    if (!out.ok && !/already checked out/i.test(spErrorText(out.status))) return `check-out refused: ${spErrorText(out.status).slice(0, 120)}`;
    w = await connectorPatchItem(site, p.docListId, itemId, { [tagsInternal]: value });
    const ci = await checkInFile(site, fileRef, `Tag "${term.label}" added (proposal approved)`, false);
    if (!ci.ok) return `the tag was written but the check-in was refused: ${spErrorText(ci.status).slice(0, 120)}`;
  }
  void fetchListItem;
  void fetchFileItemId;
  return w.ok ? "" : `the tag could not be put on the document: ${spErrorText(w.status).slice(0, 120)}`;
}

/** Approve: mint the term, record the decision, tag the document the
 *  proposal named, tell the proposer (issue 2). error = the proposal
 *  stays pending; warn = approved, but a later step did not land. */
export async function approveProposal(
  p: TagProposal,
  site: string,
  setId: string,
  tagsInternal = "",
  /** May the tag be written on the document now (it is in revision)?
   *  Absent = yes. */
  mayApply?: () => Promise<boolean>
): Promise<{ error: string; warn: string; applied: boolean; waiting: boolean }> {
  const minted = await mintTag(site, setId, p.label);
  if (minted.error !== "") return { error: minted.error, warn: "", applied: false, waiting: false };
  const termId = minted.termId;
  const named = p.docUid !== "" && tagsInternal !== "";
  // the document named is approved → the term exists, the tag waits
  const waiting = named && mayApply !== undefined && !(await mayApply().catch(() => false));
  const upd = await Ben_ltktagproposalsService.update(p.id, {
    ben_status: waiting ? "minted" : "approved",
    ben_termid: termId,
    ben_decision: waiting ? `Approved — “${p.docName}” is approved, so the tag waits for its next revision` : "Approved",
  });
  if (upd.success === false) return { error: `the term was created but the ledger update was refused: ${upd.error?.message ?? ""}`, warn: "", applied: false, waiting: false };
  const warns: string[] = [];
  let applied = false;
  if (named && !waiting) {
    const applyErr = await applyTagToDocument(p, tagsInternal, { label: p.label, termId }).catch((e) => (e instanceof Error ? e.message : String(e)));
    if (applyErr === "") applied = true;
    else warns.push(`not added to “${p.docName}”: ${applyErr}`);
  }
  if (waiting) warns.push(`“${p.docName}” is approved — the tag waits for its next revision (listed under “To tag at next revision”)`);
  // the proposer hears, as they do on a decline
  const me = currentViewer();
  if (p.proposerEmail !== "" && p.proposerEmail !== (me?.email ?? "").toLowerCase()) {
    try {
      const { sendNotifyTeams } = await import("./notify");
      const { appLinkUrl } = await import("../links");
      const r = await sendNotifyTeams(
        [{ email: p.proposerEmail, name: p.proposerName || p.proposerEmail }],
        `Your tag proposal was approved: ${p.label}`,
        applied ? `“${p.label}” is now a tag and is on “${p.docName}”.` : waiting ? `“${p.label}” is now a tag — it goes on “${p.docName}” at its next revision.` : `“${p.label}” is now a tag — you can add it from the document's properties.`,
        appLinkUrl()
      );
      if (r.error !== "") warns.push(`the Teams message did not go: ${r.error}`);
    } catch (e) {
      warns.push(`the Teams message did not go: ${String(e instanceof Error ? e.message : e).slice(0, 120)}`);
    }
  }
  return { error: "", warn: warns.join("; "), applied, waiting };
}

/** A waiting ("minted") proposal: write the tag now that the document
 *  is in revision; still approved = it keeps waiting. */
export async function applyWaitingProposal(p: TagProposal, tagsInternal: string, mayApply: () => Promise<boolean>): Promise<{ error: string; applied: boolean }> {
  if (p.termId === "" || tagsInternal === "" || p.docUid === "") return { error: "the proposal names no document or term", applied: false };
  if (!(await mayApply().catch(() => false))) return { error: `“${p.docName}” is still approved — the tag keeps waiting`, applied: false };
  const applyErr = await applyTagToDocument(p, tagsInternal, { label: p.label, termId: p.termId }).catch((e) => (e instanceof Error ? e.message : String(e)));
  if (applyErr !== "") return { error: applyErr, applied: false };
  const upd = await Ben_ltktagproposalsService.update(p.id, { ben_status: "approved", ben_decision: "Approved — tagged at the next revision" });
  return { error: upd.success === false ? (upd.error?.message ?? "the ledger update was refused") : "", applied: true };
}

/** An editor put the tag on by hand — the waiting proposal is done. */
export async function markProposalTagged(p: TagProposal): Promise<string> {
  const upd = await Ben_ltktagproposalsService.update(p.id, { ben_status: "approved", ben_decision: "Approved — tagged by hand" });
  return upd.success === false ? (upd.error?.message ?? "the ledger update was refused") : "";
}

/** Decline with the controller's message (required — never silent).
 *  Returns {error, warn}: warn = the ledger updated but the Teams
 *  message did not go. */
export async function declineProposal(
  p: TagProposal,
  message: string
): Promise<{ error: string; warn: string }> {
  const upd = await Ben_ltktagproposalsService.update(p.id, {
    ben_status: "declined",
    ben_decision: message.trim(),
  });
  if (upd.success === false) {
    return { error: (upd.error?.message ?? "the decline was refused").slice(0, 200), warn: "" };
  }
  const me = currentViewer();
  const myEmail = (me?.email ?? "").toLowerCase();
  if (p.proposerEmail === "" || p.proposerEmail === myEmail) {
    return { error: "", warn: "" }; // nothing to deliver, or self
  }
  try {
    const { sendNotifyTeams } = await import("./notify");
    const { appLinkUrl } = await import("../links");
    const r = await sendNotifyTeams(
      [{ email: p.proposerEmail, name: p.proposerName || p.proposerEmail }],
      `About your tag proposal: ${p.label}`,
      message.trim(),
      appLinkUrl()
    );
    return { error: "", warn: r.error };
  } catch (e) {
    return { error: "", warn: String(e instanceof Error ? e.message : e).slice(0, 200) };
  }
}
