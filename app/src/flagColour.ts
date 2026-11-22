// The "Support needed" colour, handed to the toolkit (2026-11-22). The
// state's colour is chosen in Settings → Priorities → Status and every
// priority and initiative surface resolves it there — but the action
// dialog's "⚑ Flag for support" button and the ⚑ beside a flagged
// action are drawn by the shared toolkit, which has no road to the
// app's settings: they painted a fixed purple and the accent colour.
// The toolkit reads `--ltk-flag`; this sets it on the document root.
// Loaded on demand at boot and after a save — never on the boot path.

import { paletteMap } from "../../shared/palette";
import { statusColour } from "./improvement/status";
import { parsePrioritySettings } from "./priorities/model";
import { appPalettes, prioritySettingsJson } from "./store/config";

/** Read the chosen colour and set it. A failed read leaves the
 *  toolkit's own default in place. */
export async function applyFlagColour(): Promise<void> {
  try {
    const [raw, palettes] = await Promise.all([prioritySettingsJson(), appPalettes()]);
    const colour = statusColour("flagged", parsePrioritySettings(raw).status, paletteMap(palettes.states));
    if (colour !== "") document.documentElement.style.setProperty("--ltk-flag", colour);
  } catch {
    /* the default stands */
  }
}
