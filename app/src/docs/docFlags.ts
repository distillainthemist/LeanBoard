// Document flags (issue 23) — the Dataverse side: ben_ltkdocflag rows,
// the screenshot on the row's file column, and the re-pointing an
// ingestion run does when a flagged file lands in its destination.
// Pure helpers live in docFlagsModel.ts. Docs-only module.

import { Ben_ltkdocflagsService } from "../generated/services/Ben_ltkdocflagsService";
import type { Ben_ltkdocflags } from "../generated/models/Ben_ltkdocflagsModel";
import { currentViewer } from "../runtime";
import { nowIso } from "../../../shared/schema/id";
import { DocFlag, flagTitle } from "./docFlagsModel";

/** The document a flag points at. */
export interface FlagDoc {
  site: string;
  listId: string;
  itemId: number;
  uid: string;
  name: string;
  version: string;
}

const q = (s: string) => s.replace(/'/g, "''");

function shape(r: Ben_ltkdocflags): DocFlag {
  return {
    id: r.ben_ltkdocflagid,
    site: r.ben_docsite ?? "",
    listId: (r.ben_doclistid ?? "").toLowerCase(),
    itemId: Number(r.ben_docitemid ?? 0) || 0,
    uid: (r.ben_docuid ?? "").toLowerCase(),
    docName: r.ben_docname ?? "",
    docVersion: r.ben_docversion ?? "",
    level: r.ben_level ?? "",
    comment: r.ben_comment ?? "",
    status: r.ben_status === "closed" ? "closed" : "open",
    source: r.ben_source === "ingestion" ? "ingestion" : "register",
    flaggerEmail: (r.ben_flaggeremail ?? "").toLowerCase(),
    flaggerName: r.ben_flaggername ?? "",
    flaggedAt: r.ben_flaggedat ?? "",
    closedByName: r.ben_closedbyname ?? "",
    closedAt: r.ben_closedat ?? "",
    resolution: r.ben_resolution ?? "",
    hasScreenshot: (r.ben_screenshot_name ?? "") !== "",
  };
}

const say = (e: unknown) => (e as { message?: string })?.message ?? String(e);

/** Every OPEN flag on a site (500 cap — a site with more has a bigger
 *  problem than this list). */
export async function listOpenFlags(site: string): Promise<DocFlag[]> {
  const r = await Ben_ltkdocflagsService.getAll({ filter: `ben_status eq 'open' and ben_docsite eq '${q(site)}'`, top: 500 });
  if (r.success === false) throw new Error(r.error?.message ?? "the flags could not be read");
  return (r.data ?? []).map(shape);
}

/** Every flag on one document, open and closed, newest first. */
export async function listFlagsForDoc(site: string, listId: string, itemId: number): Promise<DocFlag[]> {
  const r = await Ben_ltkdocflagsService.getAll({
    filter: `ben_docsite eq '${q(site)}' and ben_doclistid eq '${q(listId.toLowerCase())}' and ben_docitemid eq '${itemId}'`,
    top: 200,
  });
  if (r.success === false) throw new Error(r.error?.message ?? "the flags could not be read");
  return (r.data ?? []).map(shape).sort((a, b) => (a.flaggedAt < b.flaggedAt ? 1 : -1));
}

/** Raise a flag; the screenshot (already shrunk) rides the row's file
 *  column. Returns the row id, or the error. */
export async function raiseFlag(
  doc: FlagDoc,
  level: string,
  comment: string,
  source: "register" | "ingestion",
  screenshot: File | null
): Promise<{ id: string; error: string; warn: string }> {
  const me = currentViewer();
  try {
    const r = await Ben_ltkdocflagsService.create({
      ben_name: flagTitle(level, doc.name),
      ben_docsite: doc.site,
      ben_doclistid: doc.listId.toLowerCase(),
      ben_docitemid: String(doc.itemId),
      ben_docuid: doc.uid.toLowerCase(),
      ben_docname: doc.name.slice(0, 255),
      ben_docversion: doc.version,
      ben_level: level.trim(),
      ben_comment: comment.trim(),
      ben_status: "open",
      ben_source: source,
      ben_flaggeremail: (me?.email ?? "").toLowerCase(),
      ben_flaggername: me?.name ?? "",
      ben_flaggedat: nowIso(),
    } as Parameters<typeof Ben_ltkdocflagsService.create>[0]);
    if (r.success === false) return { id: "", error: r.error?.message ?? "the flag was refused", warn: "" };
    const id = String((r.data as { ben_ltkdocflagid?: unknown } | undefined)?.ben_ltkdocflagid ?? "");
    if (id === "") return { id: "", error: "the flag was created but its id did not come back", warn: "" };
    let warn = "";
    if (screenshot !== null) {
      const up = await Ben_ltkdocflagsService.upload(id, "ben_screenshot", screenshot, screenshot.name);
      if (up.success === false) warn = `the screenshot did not upload: ${up.error?.message ?? "refused"}`;
    }
    return { id, error: "", warn };
  } catch (e) {
    return { id: "", error: say(e), warn: "" };
  }
}

/** Close a flag with a note; "" = done, else the error. */
export async function closeFlag(id: string, note: string): Promise<string> {
  const me = currentViewer();
  try {
    const r = await Ben_ltkdocflagsService.update(id, {
      ben_status: "closed",
      ben_closedbyemail: (me?.email ?? "").toLowerCase(),
      ben_closedbyname: me?.name ?? "",
      ben_closedat: nowIso(),
      ben_resolution: note.trim(),
    } as Parameters<typeof Ben_ltkdocflagsService.update>[1]);
    return r.success === false ? (r.error?.message ?? "the close was refused") : "";
  } catch (e) {
    return say(e);
  }
}

/** A flagged file landed in its destination (ingestion): the open flags
 *  on the source item now point at the destination item. Returns how
 *  many moved. */
export async function repointFlags(
  site: string,
  from: { listId: string; itemId: number },
  to: { listId: string; itemId: number; uid: string; name: string }
): Promise<number> {
  const r = await Ben_ltkdocflagsService.getAll({
    filter: `ben_status eq 'open' and ben_docsite eq '${q(site)}' and ben_doclistid eq '${q(from.listId.toLowerCase())}' and ben_docitemid eq '${from.itemId}'`,
    top: 50,
  });
  if (r.success === false) return 0;
  let n = 0;
  for (const row of r.data ?? []) {
    const u = await Ben_ltkdocflagsService.update(row.ben_ltkdocflagid, {
      ben_doclistid: to.listId.toLowerCase(),
      ben_docitemid: String(to.itemId),
      ben_docuid: to.uid.toLowerCase(),
      ben_docname: to.name.slice(0, 255),
    } as Parameters<typeof Ben_ltkdocflagsService.update>[1]);
    if (u.success !== false) n++;
  }
  return n;
}

/** Chunked base64 — String.fromCharCode over a whole screenshot would
 *  blow the argument limit. */
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  return btoa(bin);
}

/** The flag's screenshot as a DATA url ("" = none / unreadable) — the
 *  player's CSP blocks blob: images. */
export async function flagScreenshotUrl(id: string): Promise<string> {
  try {
    const { getClient } = await import("@microsoft/power-apps/data");
    const { dataSourcesInfo } = await import("../../.power/schemas/appschemas/dataSourcesInfo");
    const down = await getClient(dataSourcesInfo).downloadFileFromRecord("ben_ltkdocflags", id, "ben_screenshot");
    if (down.success === false || !(down.data instanceof Uint8Array)) return "";
    const head = down.data.subarray(0, 4);
    const png = head[0] === 0x89 && head[1] === 0x50;
    return `data:${png ? "image/png" : "image/jpeg"};base64,${bytesToBase64(down.data)}`;
  } catch {
    return "";
  }
}
