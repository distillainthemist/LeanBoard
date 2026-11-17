// The status rule's inputs for a surface that holds only initiatives and
// actions (the Gantt ritual card): the metric states and the settings,
// read the way the Priorities and Improvement screens read them, so the
// card paints an initiative with the SAME status they do. Loaded behind
// a dynamic import — the metric reader is not on the board path.

import type { Initiative } from "./initiativeModel";
import { buildMetricState, InitiativeMetricState, loadMetricLasts } from "./metricValues";
import { StatusSettings, statusSettingsFromJson } from "./status";

export interface StatusInputs {
  metricState: Map<string, InitiativeMetricState>;
  settings: StatusSettings;
}

export async function loadStatusInputs(initiatives: Initiative[]): Promise<StatusInputs> {
  const [boards, rows, settingsRaw] = await Promise.all([
    import("../store/boards").then((m) => m.listBoards()).catch(() => []),
    import("../store/cards").then((m) => m.rowsForInitiativeBoards()).catch(() => []),
    import("../store/config").then((m) => m.prioritySettingsJson()).catch(() => ""),
  ]);
  const lasts = await loadMetricLasts(initiatives, boards).catch(() => new Map());
  return { metricState: buildMetricState(initiatives, boards, rows, lasts), settings: statusSettingsFromJson(settingsRaw) };
}
