// Tiny DOM helpers — the toolkit renders plain DOM/SVG, no framework.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) node.setAttribute(k, String(attrs[k]));
  }
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Escape, as a field over a dialog hears it. A dialog swallows the key
 *  at the document, before it reaches any field (a form never closes on
 *  Escape, and letting it through would close the overlay beneath) — so
 *  a type-ahead's own keydown never fired there and its list would not
 *  close (the message panel, 2026-11-17). The dialog relays the key to
 *  the focused field as this event; `onEscape` hears both roads. */
export const ESCAPE_RELAY = "ltk-escape";

/** Run `handle` when Escape reaches this field, by its own keydown or by
 *  a dialog's relay. `handle` returns true when it acted (a list was
 *  open): the key is then spent and goes no further. */
export function onEscape(field: HTMLElement, handle: () => boolean): void {
  field.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key !== "Escape") return;
    if (handle()) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  field.addEventListener(ESCAPE_RELAY, () => void handle());
}

/** Inject a stylesheet once per document (canvas apps can host many controls). */
export function ensureStylesheet(id: string, css: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}
