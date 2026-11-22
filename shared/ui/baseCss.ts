// Base stylesheet for the shared UI kit (dialogs, fields, title bar, kebab,
// ghost states). Written once against the --ltk-* variables that
// applyThemeVars() sets on each card's root, and bundled into the JS so the
// styles travel with the card — snapshots inline this same string.

export const LTK_BASE_CSS = `
.ltk-root {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--ltk-bg);
  color: var(--ltk-fg);
  font-family: var(--ltk-font);
  font-size: 14px;
  overflow: hidden;
}
.ltk-root *, .ltk-root *::before, .ltk-root *::after { box-sizing: border-box; }

/* WCAG 2.2: a visible ring on every keyboard stop, never on mouse click
   (design review Phase 0.1). Offset 2 keeps rings outside the control;
   tiles that clip may override locally with offset -2. */
.ltk-root :where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--ltk-accent);
  outline-offset: 2px;
}

/* ---- title bar + prompts ---- */
.ltk-titlebar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 6px;
  position: relative;
  flex: 0 0 auto;
  /* optional strip fill (theme.titlebar) with auto-contrast text */
  background: var(--ltk-titlebar, transparent);
  color: var(--ltk-titlebar-fg, inherit);
}
.ltk-titlebar-text { font-size: 20px; font-weight: 600; line-height: 1.2; min-width: 0; }
.ltk-titlebar-textwrap { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ltk-titlebar-sub { font-size: 12.5px; font-weight: 400; opacity: 0.75; line-height: 1.25; }
.ltk-pdca-disc { display: inline-block; flex: none; }
.ltk-action-descline { display: flex; align-items: baseline; gap: 7px; }
.ltk-action-descline .ltk-pdca-disc { align-self: center; }
/* six states, three to a row: the cycle's four, then Closed and On hold
   (one row of six does not fit a dialog; a ragged wrap read as a fault).
   The 1px gaps over the grey ground draw the dividers. */
.ltk-pdca-seg {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px;
  background: #ddd; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; width: 100%; max-width: 420px;
}
.ltk-pdca-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: none; background: var(--ltk-bg, #fff); font: inherit; font-size: 12.5px;
  padding: 8px 10px; min-height: 40px; cursor: pointer; color: #444;
}
.ltk-pdca-on { background: var(--ltk-accent, #2563eb); color: #fff; font-weight: 600; }
/* the right-hand slot: app extras (＋ Action) then the kebab, flowed */
.ltk-titlebar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}
.ltk-kebab.ltk-kebab-inbar { position: relative; top: auto; right: auto; }
.ltk-conf-glyph { font-size: 12px; opacity: 0.8; margin-left: 4px; }
.ltk-titlebar-btn {
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
  background: none;
  color: var(--ltk-titlebar-fg, var(--ltk-fg));
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  padding: 5px 10px;
  min-height: 34px;
  cursor: pointer;
  white-space: nowrap;
}
.ltk-titlebar-btn:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
.ltk-info-btn {
  border: none; background: none; color: var(--ltk-muted);
  font-size: 14px; cursor: pointer; padding: 2px 6px; border-radius: 999px;
  min-width: 28px; min-height: 28px;
}
.ltk-info-btn:hover { color: var(--ltk-accent); }
.ltk-info-pop {
  position: absolute; top: calc(100% + 4px); left: 12px; z-index: 40;
  background: var(--ltk-bg); color: var(--ltk-fg);
  border: 1px solid var(--ltk-hairline); border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.14);
  padding: 10px 12px; max-width: 340px; font-size: 12px;
}
.ltk-info-line + .ltk-info-line { margin-top: 6px; }

/* ---- ghost / empty state ---- */
.ltk-ghost {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 6px; flex: 1; padding: 24px;
  color: var(--ltk-muted); text-align: center; cursor: pointer;
}
.ltk-ghost-line { font-size: 16px; }
.ltk-ghost-line:first-child { font-size: 20px; font-weight: 600; }

/* ---- kebab menu ---- */
.ltk-kebab { position: absolute; top: 6px; right: 6px; z-index: 30; }
.ltk-kebab-btn {
  border: none; background: none;
  /* the kebab overlays the title bar, so it takes the title's font colour
     (auto-contrasted against the strip fill) — a muted grey was nearly
     invisible there, especially in the focused view. No title strip means
     no --ltk-titlebar-fg, so it falls back to the card's foreground. */
  color: var(--ltk-titlebar-fg, var(--ltk-fg));
  font-size: 18px; line-height: 1; cursor: pointer;
  min-width: 44px; min-height: 44px; border-radius: 6px;
}
.ltk-kebab-btn:hover { background: var(--ltk-hairline); }
.ltk-kebab-menu {
  position: absolute; right: 0; top: calc(100% + 2px);
  background: var(--ltk-bg); border: 1px solid var(--ltk-hairline);
  border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.14);
  min-width: 160px; padding: 4px; z-index: 41;
}
.ltk-kebab-item {
  display: block; width: 100%; text-align: left; border: none;
  background: none; color: var(--ltk-fg); font: inherit; font-size: 14px;
  padding: 8px 10px; border-radius: 4px; cursor: pointer;
}
.ltk-kebab-item:hover { background: var(--ltk-hairline); }

/* ---- dialog ----
   Fixed to the viewport (not the card) so dialogs never clip inside a short
   or small control; explicit sides rather than inset for older Safari. */
.ltk-dialog-overlay {
  position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 10000;
  background: rgba(20,20,20,0.35);
  display: flex; align-items: center; justify-content: center;
}
.ltk-dialog {
  background: var(--ltk-bg); color: var(--ltk-fg);
  border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  width: min(420px, calc(100% - 32px));
  max-height: calc(100% - 32px); overflow: hidden;
  display: flex; flex-direction: column;
}
.ltk-dialog-title {
  font-size: 16px; font-weight: 600; padding: 14px 16px 10px;
  border-bottom: 1px solid var(--ltk-hairline);
  text-align: left;
}
/* the BODY scrolls, not the whole dialog — a long form or report must
   never push its own Close button off the screen */
.ltk-dialog-body {
  padding: 12px 16px; display: flex; flex-direction: column; gap: 12px;
  overflow-y: auto; min-height: 0;
}
/* MEASURED 2026-08-08: a flex child is normally protected from being
   squashed by min-height:auto — but that protection evaporates the
   moment the child sets overflow:hidden (as a rounded card does), and
   the column then compresses its content instead of scrolling it
   (Ben's control-health report: boxes crushed 312px -> 87px, the body
   never scrolled). Children keep their own height; the body scrolls. */
.ltk-dialog-body > * { flex-shrink: 0; }
.ltk-dialog-footer {
  display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px 14px;
}
/* a field that must be filled carries a quiet red asterisk on its label
   (the action form, 2026-11-18) */
.ltk-req-star { margin-left: 2px; font-size: 11px; line-height: 0; color: #c4314b; font-weight: 600; cursor: default; }
/* a button that waits (the action dialog's Raise / Save until the
   starred fields are filled) */
.ltk-btn:disabled, .ltk-btn:disabled:hover { opacity: 0.45; cursor: not-allowed; filter: none; }
.ltk-field-missing, .ltk-input.ltk-field-missing { border-color: #d13438 !important; box-shadow: 0 0 0 1px #d13438; }
.ltk-checklist.ltk-field-missing { border-radius: 8px; box-shadow: 0 0 0 2px #d13438; }
.ltk-act-missing { font-size: 13px; font-weight: 600; color: #a4262c; text-align: left; }
.ltk-act-missing:empty { display: none; }
/* destructive actions sit apart, far left, away from Cancel/Save */
.ltk-dialog-footer .ltk-btn-danger { margin-right: auto; }

/* ---- fields ---- */
.ltk-field { display: flex; flex-direction: column; gap: 4px; }
.ltk-field-label { font-size: 12px; color: var(--ltk-muted); text-align: left; }
.ltk-dialog-body { text-align: left; }
.ltk-field-half { max-width: 200px; }
.ltk-section {
  font-size: 12px; font-weight: 600; color: var(--ltk-muted);
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-top: 2px; padding-top: 12px; border-top: 1px solid var(--ltk-hairline);
}

/* ---- checklist (assignees etc) ---- */
.ltk-checklist {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;
}
.ltk-check {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid var(--ltk-hairline); border-radius: 6px;
  padding: 8px 10px; min-height: 44px; cursor: pointer; font-size: 14px;
  transition: border-color 150ms ease, background 150ms ease;
}
.ltk-check:hover { border-color: var(--ltk-accent); }
.ltk-check input {
  accent-color: var(--ltk-accent);
  width: 22px; height: 22px; margin: 0; flex: 0 0 auto; cursor: pointer;
}
.ltk-check-on { border-color: var(--ltk-accent); background: var(--ltk-hairline); }

/* wider-roster assignee search (under the participant chips) */
.ltk-who-search { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
/* support: chosen people as chips above the search that adds them */
.ltk-sup { display: flex; flex-direction: column; gap: 6px; }
.ltk-sup .ltk-who-search { margin-top: 0; }
.ltk-sup-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ltk-sup-chip {
  display: inline-flex; align-items: center; gap: 4px; font-size: 13px; padding: 4px 4px 4px 10px;
  border: 1px solid var(--ltk-hairline); border-radius: 999px; background: var(--ltk-bg); color: var(--ltk-fg);
}
.ltk-sup-x {
  border: none; background: none; color: var(--ltk-muted); font: inherit; font-size: 11px; line-height: 1;
  padding: 4px 6px; border-radius: 999px; cursor: pointer; min-width: 24px; min-height: 24px;
}
.ltk-sup-x:hover, .ltk-sup-x:focus-visible { color: var(--ltk-accent); background: rgba(0, 0, 0, 0.06); }
.ltk-action-support { font-size: 11.5px; color: var(--ltk-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
.ltk-who-results {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px;
}
.ltk-who-hit { font: inherit; background: var(--ltk-bg); color: var(--ltk-fg); text-align: left; }

/* "Linked to": the chip, the search and its grouped results */
.ltk-link { display: flex; flex-direction: column; gap: 6px; }
.ltk-link-note { font-size: 12.5px; color: var(--ltk-muted); }
.ltk-link-chip {
  display: flex; align-items: center; gap: 8px; min-height: 44px;
  border: 1px solid var(--ltk-hairline); border-radius: 6px;
  padding: 4px 4px 4px 10px; background: var(--ltk-bg);
}
.ltk-link-kind {
  flex: none; font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--ltk-muted);
  border: 1px solid var(--ltk-hairline); border-radius: 999px; padding: 2px 8px;
}
.ltk-link-text { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.ltk-link-x {
  flex: none; font: inherit; font-size: 14px; width: 36px; height: 36px;
  border: none; border-radius: 6px; background: none; color: var(--ltk-muted); cursor: pointer;
}
.ltk-link-x:hover { background: var(--ltk-hairline); color: var(--ltk-fg); }
.ltk-link-results { display: flex; flex-direction: column; gap: 4px; }
.ltk-link-group {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--ltk-muted); padding: 4px 2px 0;
}
.ltk-link-hit {
  font: inherit; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 1px;
  background: var(--ltk-bg); color: var(--ltk-fg);
  border: 1px solid var(--ltk-hairline); border-radius: 6px; padding: 7px 10px; min-height: 44px;
}
.ltk-link-hit:hover, .ltk-link-hit:focus-visible { border-color: var(--ltk-accent); }
.ltk-link-hit-title { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.ltk-link-hit-detail { font-size: 12px; color: var(--ltk-muted); overflow-wrap: anywhere; }

/* endorsement: the waiting banner in the dialog, the row marker */
.ltk-endorse {
  display: flex; flex-direction: column; gap: 8px; padding: 10px 12px;
  border: 1px solid #f0c36d; border-radius: 6px; background: #fff7e0;
}
.ltk-endorse-msg { font-size: 13.5px; font-weight: 600; color: #7a4d00; }
.ltk-endorse-note { font-size: 12.5px; color: var(--ltk-muted); }
.ltk-endorse-glyph {
  flex: none; font-size: 11.5px; font-weight: 600; color: #7a4d00; white-space: nowrap;
  background: #fff7e0; border: 1px solid #f0c36d; border-radius: 999px; padding: 1px 8px;
}
.ltk-confirm-err { font-size: 12.5px; color: #d13438; }
.ltk-confirm-err:empty { display: none; }

/* the action dialog's danger button sits WITH Close and Save (Ben,
   2026-11-16) — elsewhere a destructive action stays far left */
.ltk-act-body ~ .ltk-dialog-footer .ltk-btn-danger { margin-right: 0; }
/* ---- the add / edit action dialog (2026-11-16 layout) ----
   One column by default; two — the action, then its conversation and
   record — where the DIALOG is wide enough (a container query on its
   body, so the split is right wherever it is hosted). */
.ltk-dialog-body.ltk-act-body { container-type: inline-size; }
.ltk-act-grid { display: flex; flex-direction: column; gap: 12px; }
.ltk-act-main, .ltk-act-sidebody { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
/* the right side folds away: a round button on the divider hides it, a
   slim rail with the counts brings it back */
.ltk-act-side { position: relative; min-width: 0; border-top: 1px solid var(--ltk-hairline); padding-top: 14px; }
.ltk-act-sidehide {
  position: absolute; top: -13px; right: 0; width: 26px; height: 26px; padding: 0; border-radius: 50%;
  border: 1px solid var(--ltk-hairline); background: var(--ltk-bg); color: var(--ltk-muted);
  font: inherit; font-size: 15px; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transform: rotate(90deg);
}
.ltk-act-sidehide:hover, .ltk-act-sidehide:focus-visible, .ltk-act-rail:hover, .ltk-act-rail:focus-visible { border-color: var(--ltk-accent); color: var(--ltk-accent); outline: none; }
.ltk-act-rail {
  display: none; align-items: center; gap: 10px; width: 100%; min-height: 40px; padding: 6px 10px; cursor: pointer;
  border: 1px solid var(--ltk-hairline); border-radius: 8px; background: var(--ltk-bg); color: var(--ltk-muted); font: inherit; font-size: 12.5px;
}
.ltk-act-rail-chev { font-size: 16px; line-height: 1; transform: rotate(-90deg); }
.ltk-act-rail-badge { white-space: nowrap; font-weight: 600; }
.ltk-act-rail-label { white-space: nowrap; }
.ltk-act-grid-folded .ltk-act-sidebody, .ltk-act-grid-folded .ltk-act-sidehide { display: none; }
.ltk-act-grid-folded .ltk-act-rail { display: flex; }
.ltk-act-grid-folded .ltk-act-side { border-top: none; padding-top: 0; }
/* the three sections of the side read alike: one heading style */
.ltk-act-attach .app-att-title { font-size: 12px; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--ltk-muted); }
.ltk-act-attach .app-att { gap: 4px; }
.ltk-act-form { gap: 10px !important; }
.ltk-act-linked .ltk-link-chip { min-height: 44px; box-sizing: border-box; }
/* "Linked to" is a type-ahead too: what it finds opens under the box,
   over the column, and scrolls THERE — never stretching the dialog */
.ltk-link-box { position: relative; display: flex; min-width: 0; }
.ltk-link-box .ltk-input { width: 100%; min-width: 0; }
.ltk-link-pop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 5;
  display: flex; flex-direction: column; gap: 2px; padding: 6px;
  max-height: 300px; overflow-y: auto; scrollbar-width: thin;
  background: var(--ltk-bg); color: var(--ltk-fg);
  border: 1px solid var(--ltk-hairline); border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.ltk-link-pop .ltk-link-group { padding: 8px 10px 2px; margin: 0; }
.ltk-link-pop .ltk-link-hit { border: none; border-radius: 6px; padding: 8px 10px; min-height: 40px; flex: none; }
.ltk-link-pop .ltk-link-hit:hover, .ltk-link-pop .ltk-link-hit-on { background: var(--ltk-hairline); }
.ltk-link-pop .ltk-link-note { padding: 8px 10px; min-height: 0; }
.ltk-act-linked .ltk-link-note { min-height: 44px; display: flex; align-items: center; }
/* Who: a label, then the grid — "Search everyone…" its first cell, the
   size of a person's box, the people after it */
.ltk-who { display: flex; flex-direction: column; gap: 4px; }
/* "Search everyone…" is a type-ahead: its list opens under the box, over
   the grid, and never pushes the people down — wider than its cell, so a
   name and an email have room */
.ltk-who-box { position: relative; min-width: 0; display: flex; }
.ltk-who-box .ltk-input { width: 100%; min-width: 0; min-height: 44px; }
.ltk-who-pop {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 5;
  width: max(100%, 320px); max-width: min(420px, 88vw);
  display: flex; flex-direction: column; gap: 2px; padding: 6px;
  max-height: 290px; overflow-y: auto; scrollbar-width: thin;
  background: var(--ltk-bg); color: var(--ltk-fg);
  border: 1px solid var(--ltk-hairline); border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.ltk-who-opt {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px; text-align: left;
  border: none; background: none; color: var(--ltk-fg); font: inherit; font-size: 14px;
  padding: 8px 10px; border-radius: 6px; cursor: pointer; min-height: 40px; justify-content: center;
}
.ltk-who-opt:hover, .ltk-who-opt-on { background: var(--ltk-hairline); }
.ltk-who-opt:disabled { cursor: progress; opacity: 0.7; }
.ltk-who-opt-sub { font-size: 12px; color: var(--ltk-muted); overflow-wrap: anywhere; }
.ltk-who-opt-err { color: #d13438; }
.ltk-who-pop-h { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ltk-muted); padding: 8px 10px 2px; }
.ltk-who-pop-note { font-size: 12.5px; color: var(--ltk-muted); padding: 8px 10px; }
/* several people on one action (2026-11-17): the people who are not a
   tick box above sit as chips; one line says it is shared; the parts
   open on demand; a leader's team is added from a small panel */
.ltk-shared { display: flex; flex-direction: column; gap: 6px; }
.ltk-shared:empty { display: none; }
/* the fold over a cascaded team's boxes: "+n more", "Remove all" */
.ltk-shared-fold { display: flex; flex-wrap: wrap; gap: 4px 22px; align-items: center; }
.ltk-shared-note { font-size: 12.5px; color: var(--ltk-muted); }
/* "＋ Cascade to team…" and "＋ Add support" on one line; "x / y people
   completed" at its right end */
.ltk-act-links { display: flex; flex-wrap: wrap; gap: 4px 22px; align-items: center; }
.ltk-parts-count { margin-left: auto; font-size: 13px; font-weight: 600; color: var(--ltk-muted); white-space: nowrap; }
/* Closed is off on a shared action with parts still to do */
.ltk-pdca-btn:disabled { opacity: 0.4; cursor: not-allowed; }
/* a SAVED shared action's people are sign-off boxes: the whole box
   records the part; ✕ takes the person off (a tick box here unticked
   people by accident) */
.ltk-signoff { cursor: pointer; user-select: none; }
.ltk-signoff .ltk-part { margin-left: 0; }
.ltk-signoff-name { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.ltk-signoff-done { border-color: #107c10; }
.ltk-signoff-x { flex: 0 0 auto; width: 24px; height: 24px; padding: 0; border: none; border-radius: 4px; background: none; color: var(--ltk-muted); font: inherit; font-size: 12px; cursor: pointer; opacity: 0.55; }
.ltk-signoff-x:hover, .ltk-signoff-x:focus-visible { opacity: 1; background: var(--ltk-bg); color: #d13438; outline: none; }
/* the title row's tools, and "Flag for support": faint in the flag's
   colour until pressed, the full colour once flagged */
.ltk-act-titletools { display: inline-flex; align-items: center; gap: 8px; }
/* the dialog's ⋮: Message, Duplicate, Cancel this action */
.ltk-act-kebab { display: inline-flex; }
.ltk-act-kebab .ltk-kebab-btn { width: 36px; height: 36px; min-width: 36px; min-height: 36px; border: 1px solid var(--ltk-hairline); border-radius: 6px; color: var(--ltk-fg); }
.ltk-act-kebab .ltk-kebab-menu { right: 0; left: auto; top: calc(100% + 4px); min-width: 230px; font-weight: 400; font-size: 14px; }
.ltk-kebab-item-danger { color: #d13438; }
.ltk-btn.ltk-flagbtn {
  font-size: 13px; font-weight: 600; min-height: 36px; padding: 4px 12px;
  color: var(--ltk-flag, #7b3fa0);
  background: color-mix(in srgb, var(--ltk-flag, #7b3fa0) 10%, var(--ltk-bg));
  border: 1px solid color-mix(in srgb, var(--ltk-flag, #7b3fa0) 35%, var(--ltk-bg));
}
.ltk-btn.ltk-flagbtn:hover, .ltk-btn.ltk-flagbtn:focus-visible { border-color: var(--ltk-flag, #7b3fa0); outline: none; }
.ltk-btn.ltk-flagbtn-on { background: var(--ltk-flag, #7b3fa0); border-color: var(--ltk-flag, #7b3fa0); color: #fff; }
/* the complete circle on a shared action: my part done (outlined tick),
   or not mine to tick */
.ltk-action-circle-part { background: transparent !important; }
.ltk-action-circle-locked { cursor: default; opacity: 0.45; border-style: dashed; }
/* a person's part: a small circle on their own box (empty = still to
   do, ticked = done) — colours inline-safe, no theme dependency */
.ltk-part {
  margin-left: auto; flex: 0 0 auto; width: 24px; height: 24px; padding: 0; border-radius: 50%;
  border: 2px solid var(--ltk-muted); background: var(--ltk-bg); color: transparent;
  font: inherit; font-size: 13px; font-weight: 700; line-height: 1; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.ltk-part:hover, .ltk-part:focus-visible { border-color: #107c10; outline: none; }
.ltk-part-done { background: #107c10; border-color: #107c10; color: #fff; }
.ltk-team { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--ltk-hairline); border-radius: 8px; }
.ltk-team-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ltk-team-row .ltk-who-box { flex: 1 1 200px; min-width: 180px; }
.ltk-team-row .ltk-input { min-height: 40px; }
.ltk-team-row select.ltk-input { flex: 0 0 auto; width: auto; }
.ltk-team-row .ltk-check { flex: 0 0 auto; white-space: nowrap; }
.ltk-team-note { font-size: 12.5px; color: var(--ltk-muted); overflow-wrap: anywhere; }
.ltk-team-note:empty { display: none; }
/* "3 / 12 done" on a shared action */
.ltk-action-parts { display: inline-block; font-size: 11.5px; font-weight: 600; color: var(--ltk-muted); border: 1px solid var(--ltk-hairline); border-radius: 999px; padding: 0 7px; white-space: nowrap; }
/* the dialog's title row when it carries a tool (Message) */
.ltk-dialog-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ltk-act-msgbtn { font-size: 13px; font-weight: 400; min-height: 36px; padding: 4px 12px; }
/* support: one line until it is used */
.ltk-sup-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ltk-sup-open { border: none; background: none; font: inherit; font-size: 13px; color: var(--ltk-accent); cursor: pointer; padding: 4px 0; text-align: left; min-height: 28px; }
.ltk-sup-open:hover, .ltk-sup-open:focus-visible { text-decoration: underline; }
/* Start · Due, then Escalated · Confidential, on one row. The dates
   share what the flags leave; each flag is as wide as its words (equal
   shares clipped "Confidential"), and the pair drops to a line of its
   own where the row is too tight for all four */
.ltk-act-when { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.ltk-act-when > .ltk-act-date { flex: 1 1 128px; min-width: 128px; }
.ltk-act-flags { display: flex; gap: 8px; flex: 0 0 auto; }
.ltk-act-flags .ltk-check { flex: 0 0 auto; white-space: nowrap; padding: 8px 10px 8px 8px; gap: 6px; }
/* the due-date record, one line that opens */
.ltk-resched-sum { display: flex; flex-direction: column; gap: 6px; }
.ltk-resched-sumbtn {
  display: grid; grid-template-columns: auto 1fr; column-gap: 6px; text-align: left; width: 100%;
  font: inherit; font-size: 12.5px; color: var(--ltk-muted); background: var(--ltk-bg);
  border: 1px solid var(--ltk-hairline); border-radius: 6px; padding: 8px 10px; cursor: pointer;
}
.ltk-resched-sumbtn:hover, .ltk-resched-sumbtn:focus-visible { border-color: var(--ltk-accent); }
.ltk-resched-sumtext { display: flex; flex-direction: column; min-width: 0; }
.ltk-resched-sumtext b { color: var(--ltk-fg); font-weight: 600; }
.ltk-resched-sumdetail { overflow-wrap: anywhere; }
/* the dialog body is the ONE scroller: the comment list does not scroll
   inside it here */
.ltk-act-side .ltk-cmt-list { max-height: none; overflow: visible; }
@container (min-width: 720px) {
  .ltk-act-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; column-gap: 24px; align-items: start; padding: 4px 4px 0; }
  .ltk-act-side { border-top: none; padding-top: 0; border-left: 1px solid var(--ltk-hairline); padding-left: 24px; align-self: stretch; }
  .ltk-act-sidehide { top: 0; right: auto; left: -13px; transform: none; }
  /* folded: the side is a slim rail down the right edge */
  .ltk-act-grid.ltk-act-grid-folded { grid-template-columns: minmax(0, 1fr) 40px; column-gap: 16px; }
  .ltk-act-grid-folded .ltk-act-side { border-left: none; padding-left: 0; }
  .ltk-act-grid-folded .ltk-act-rail { flex-direction: column; justify-content: flex-start; width: 40px; height: 100%; min-height: 160px; padding: 10px 0; gap: 12px; }
  .ltk-act-grid-folded .ltk-act-rail-chev { transform: none; }
  .ltk-act-grid-folded .ltk-act-rail-badge { font-size: 11.5px; display: flex; flex-direction: column; align-items: center; line-height: 1.2; }
  .ltk-act-grid-folded .ltk-act-rail-label { writing-mode: vertical-rl; margin-top: 4px; }
  /* the people three across — each box its full 44px (Ben, 2026-11-16) */
  .ltk-act-form .ltk-checklist { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ltk-pdca-seg.ltk-act-pdca { grid-template-columns: repeat(6, minmax(0, 1fr)); max-width: none; }
  .ltk-pdca-seg.ltk-act-pdca .ltk-pdca-btn { padding: 6px 4px; gap: 5px; }
}

/* comments on an action: the trail, the box, the row glyph */
.ltk-cmt { display: flex; flex-direction: column; gap: 8px; }
.ltk-cmt-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow: auto; scrollbar-width: thin; }
.ltk-cmt-none { font-size: 12.5px; color: var(--ltk-muted); }
.ltk-cmt-row { border: 1px solid var(--ltk-hairline); border-radius: 6px; padding: 6px 10px; background: var(--ltk-bg); }
.ltk-cmt-fresh { border-style: dashed; border-color: var(--ltk-accent); }
.ltk-cmt-meta { font-size: 11.5px; color: var(--ltk-muted); flex: 1; min-width: 0; }
.ltk-cmt-head { display: flex; align-items: center; gap: 2px; min-height: 22px; }
.ltk-cmt-edited { font-style: italic; }
/* the author's two tools — quiet until the row is under the pointer */
.ltk-cmt-tool {
  flex: none; border: none; background: none; color: var(--ltk-muted); font: inherit; font-size: 13px;
  line-height: 1; padding: 4px 6px; border-radius: 4px; cursor: pointer; min-width: 28px; min-height: 28px;
}
.ltk-cmt-tool:hover, .ltk-cmt-tool:focus-visible { color: var(--ltk-accent); background: rgba(0, 0, 0, 0.05); }
.ltk-cmt-row .ltk-confirm-btns { margin-top: 6px; }
.ltk-cmt-text { font-size: 13.5px; white-space: pre-wrap; overflow-wrap: anywhere; }
.ltk-cmt-entry { display: flex; gap: 8px; align-items: flex-end; }
.ltk-cmt-box { flex: 1; min-width: 0; min-height: 44px; }
.ltk-cmt-add { flex: none; }
.ltk-cmt-glyph { flex: none; font-size: 12px; color: var(--ltk-muted); white-space: nowrap; }
.ltk-moved-glyph { flex: none; font-size: 12px; color: var(--ltk-muted); white-space: nowrap; cursor: default; }
.ltk-resched-dates { font-size: 12.5px; color: var(--ltk-muted); }
.ltk-resched-list { display: flex; flex-direction: column; gap: 6px; }
.ltk-resched-row { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; row-gap: 1px; font-size: 12.5px; padding: 6px 8px; border: 1px solid var(--ltk-hairline); border-radius: 8px; }
.ltk-resched-move { font-variant-numeric: tabular-nums; white-space: nowrap; }
.ltk-resched-why { min-width: 0; overflow-wrap: anywhere; }
.ltk-resched-by { grid-column: 1 / -1; color: var(--ltk-muted); font-size: 12px; }

/* an inline confirmation inside a dialog's body */
.ltk-confirm {
  display: flex; flex-direction: column; gap: 8px; padding: 10px 12px;
  border: 1px solid #d13438; border-radius: 6px; background: rgba(209, 52, 56, 0.06);
}
.ltk-confirm-msg { font-size: 13.5px; font-weight: 600; }
/* a question, not a warning: the reschedule bar drops the danger red */
.ltk-confirm.ltk-resched { border-color: var(--ltk-accent); background: transparent; }
.ltk-confirm-btns { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.ltk-input {
  font: inherit; font-size: 14px; color: var(--ltk-fg);
  background: var(--ltk-bg); border: 1px solid var(--ltk-hairline);
  border-radius: 6px; padding: 8px 10px; min-height: 44px;
}
.ltk-textarea { resize: vertical; }
.ltk-char-counter { font-size: 12px; color: var(--ltk-muted); text-align: right; }

/* ---- action rows (shared action UI; circle colours set inline) ---- */
.ltk-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  border: 1px solid var(--ltk-hairline);
  border-radius: 6px;
  padding: 6px 8px 6px 10px;
  background: var(--ltk-bg);
}
.ltk-action-circle {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: 2px solid var(--ltk-hairline);
  border-radius: 999px;
  background: none;
  color: transparent;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 150ms ease, background 150ms ease;
}
.ltk-action-circle:hover { border-color: var(--ltk-muted); }
.ltk-action-main { flex: 1; min-width: 0; cursor: pointer; text-align: left; }
.ltk-action-issue {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ltk-muted);
}
.ltk-action-desc { font-size: 13px; line-height: 1.3; overflow-wrap: break-word; }
.ltk-action-right {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}
.ltk-action-who { font-size: 13px; font-weight: 600; color: var(--ltk-fg); }
.ltk-action-due { font-size: 12px; font-weight: 600; color: var(--ltk-fg); }
.ltk-action-overdue { color: #d13438; font-weight: 600; }
/* a phone (mobile review M4, 2026-10-07): the row is two lines — circle
   and text, then who · due underneath in a row — the hub's rule */
@media (max-width: 599px) {
  .ltk-action-row { flex-wrap: wrap; row-gap: 6px; }
  .ltk-action-main { flex: 1 1 55%; min-width: 55%; }
  .ltk-action-right { flex-direction: row; align-items: baseline; gap: 10px; text-align: left; flex-wrap: wrap; }
}
/* ---- the host's size signal (card-responsiveness-review-2026-10-30, R0) ----
   A card cannot read its rendered width inside a transform-scaled tile,
   and container queries are out (layout containment would trap the
   cards' fixed dialogs). The HOST — the BoardGrid stage, the focused
   card host, the list slot — stamps data-ltk-tier from the width it
   lays the card out at: phone (< 480), compact (< 900), regular
   (< 1400), wide. Card rules read the tier the way they read the
   viewport query above; the narrow action row is the first. */
[data-ltk-tier="phone"] .ltk-action-row { flex-wrap: wrap; row-gap: 6px; }
[data-ltk-tier="phone"] .ltk-action-main { flex: 1 1 55%; min-width: 55%; }
[data-ltk-tier="phone"] .ltk-action-right { flex-direction: row; align-items: baseline; gap: 10px; text-align: left; flex-wrap: wrap; }
.ltk-action-flag { color: var(--ltk-flag, var(--ltk-accent)); font-weight: 600; }
.ltk-action-edit {
  border: none;
  background: none;
  color: var(--ltk-muted);
  font-size: 14px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 6px;
  cursor: pointer;
  flex: 0 0 auto;
}
.ltk-action-edit:hover { background: var(--ltk-hairline); color: var(--ltk-fg); }

/* ---- buttons ---- */
.ltk-btn {
  font: inherit; font-size: 14px; font-weight: 600;
  border-radius: 6px; padding: 8px 14px; cursor: pointer;
  border: 1px solid transparent; min-height: 44px;
  transition: background 150ms ease, color 150ms ease;
}
.ltk-btn-primary { background: var(--ltk-accent); color: #ffffff; }
.ltk-btn-primary:hover { filter: brightness(0.92); }
.ltk-btn-secondary {
  background: none; color: var(--ltk-fg); border-color: var(--ltk-hairline);
}
.ltk-btn-secondary:hover { background: var(--ltk-hairline); }
.ltk-btn-danger { background: none; color: #d13438; border-color: #d13438; }
.ltk-btn-danger:hover { background: #d13438; color: #ffffff; }

/* ---- tile mode ----
   A card rendered as a board tile: the real editor showing real data, but
   display-only. readOnly already drops most affordances; these rules kill
   what survives it, and make the whole tile inert so nothing can be typed
   into or dragged on a shared meeting screen. Cards with their own chrome
   (ProcessMap's palette, zoom clusters) hide it from their own stylesheet. */
.ltk-tile, .ltk-tile * {
  pointer-events: none !important;
  user-select: none;
}
/* a tile cannot scroll, so a scrollbar in one is dead chrome: hide every
   scrollbar inside a tile — the content still clips at the box, the bar
   no longer pretends otherwise (card-responsiveness-review-2026-10-30, R0) */
.ltk-tile * { scrollbar-width: none !important; }
.ltk-tile *::-webkit-scrollbar { display: none !important; width: 0; height: 0; }
.ltk-tile .ltk-kebab,
.ltk-tile .ltk-info-btn,
.ltk-tile .ltk-pz-zoom { display: none !important; }
/* BoardGrid draws the title chip for each slot, so a tile that also drew its
   own bar would show the title twice — the same duplication that had to be
   stripped out of stored snapshots. */
.ltk-tile .ltk-titlebar { display: none !important; }
/* the ghost states stay visible — an empty card should still say what it is
   — but must not advertise a tap that does nothing */
.ltk-tile .ltk-ghost { cursor: default; }

/* ---- pan / zoom cluster (shared PanZoom controller) ---- */
.ltk-pz-zoom {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 4px;
  z-index: 5;
}
.ltk-pz-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--ltk-hairline);
  border-radius: 6px;
  background: var(--ltk-bg);
  color: var(--ltk-fg);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 120ms ease;
}
.ltk-pz-btn:hover { border-color: var(--ltk-accent); }
`;
