// Due-date moves — what the app knows (2026-11-16): the organisation's
// policy and reasons, read from the app-level improvement settings and
// kept for a minute. Every action dialog and the Gantt ask through the
// provider main.ts registers; Settings drops the copy when it saves.
// Reads the raw JSON itself so the shell's first dialog does not pull
// the template model in.

import { parseRescheduleSettings, RescheduleSettings } from "../../../shared/schema/reschedule";
import { improvementSettingsJson } from "../store/config";

let cache: { at: number; value: Promise<RescheduleSettings> } | null = null;

export function loadRescheduleSettings(): Promise<RescheduleSettings> {
  if (cache !== null && Date.now() - cache.at < 60_000) return cache.value;
  const value = improvementSettingsJson().then((raw) => {
    let o: unknown = {};
    try {
      o = JSON.parse(raw || "{}");
    } catch {
      o = {};
    }
    return parseRescheduleSettings(o && typeof o === "object" ? (o as { reschedule?: unknown }).reschedule : undefined);
  });
  const mine = { at: Date.now(), value };
  cache = mine;
  // a failed read is not kept: the next ask tries again (the provider's
  // caller falls back to the defaults for this one)
  value.catch(() => {
    if (cache === mine) cache = null;
  });
  return value;
}

/** Settings saved a change: the next ask reads it fresh. */
export function dropRescheduleSettings(): void {
  cache = null;
}
