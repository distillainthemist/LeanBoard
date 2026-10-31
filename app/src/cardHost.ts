// CardHost — how a card gets onto a screen. Screens instantiate an editor
// class into a host div, call its setters with real objects, and wire
// callbacks straight to the store. This module carries the shared bits:
// the app theme and the screen container.

import { defaultTheme, Theme } from "../../shared/tokens";
import { el } from "../../shared/ui/dom";
import { applyHostTier } from "../../shared/ui/tier";

/** One observer for every focused host: it stamps the host's tier
 *  (`data-ltk-tier`, `--ltk-host-w`) from the width the card lays out
 *  at, and lets go of a host once it has left the document. */
let hostTierObserver: ResizeObserver | null = null;
function watchHostTier(host: HTMLElement): void {
  applyHostTier(host, host.clientWidth);
  if (typeof ResizeObserver === "undefined") return;
  hostTierObserver ??= new ResizeObserver((entries) => {
    for (const e of entries) {
      const target = e.target as HTMLElement;
      if (!target.isConnected) {
        hostTierObserver?.unobserve(target);
        continue;
      }
      applyHostTier(target, e.contentRect.width);
    }
  });
  hostTierObserver.observe(host);
}

/** The LeanBoard app theme — follows the live --app-accent variable
 * (branding/site settings override it; #2563eb is the default). */
export function appTheme(): Theme {
  const theme = defaultTheme();
  const accent =
    getComputedStyle(document.documentElement).getPropertyValue("--app-accent").trim() ||
    "#2563eb";
  theme.accent = accent;
  theme.titleBar = accent;
  return theme;
}

/**
 * A full-height host div for one editor instance. Editors size to their
 * container; the shell gives them the viewport below the app bar.
 * `capped` is the FOCUSED card's readability cap (R0: 1600 px, centred) —
 * the hub, the wizards and the card studio fill the window (Ben,
 * 2026-11-01: the whole app had narrowed on a wide monitor).
 */
export function editorHost(parent: HTMLElement, opts: { capped?: boolean } = {}): HTMLDivElement {
  const host = el("div", "app-editor-host" + (opts.capped ? " app-editor-host-capped" : ""));
  parent.appendChild(host);
  watchHostTier(host);
  return host;
}
