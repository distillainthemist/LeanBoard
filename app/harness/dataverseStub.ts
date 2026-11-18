// Harness stand-in for "@microsoft/power-apps/data" (2026-11-18): an
// in-memory Dataverse. Every generated service asks `getClient(...)` for
// five record operations; answering them here lets a harness page run
// the REAL stores and screens (the Priorities page could not be seen
// locally at all — its reads never settle outside Power Apps). Seed
// through the stores' own save functions, then mount the screen.
//
// Filters: the subset of OData the app writes — eq / ne / gt / ge / lt /
// le, and / or / not, parentheses, startswith / endswith / contains. A
// filter it cannot read matches everything and says so in the console.

type Row = Record<string, unknown>;
const tables = new Map<string, Row[]>();
let info: Record<string, { primaryKey?: string }> = {};
const rowsOf = (name: string): Row[] => {
  let t = tables.get(name);
  if (!t) tables.set(name, (t = []));
  return t;
};
const pk = (name: string): string => info[name]?.primaryKey ?? `${name}id`;
const guid = (): string => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const ok = <T>(data: T) => ({ success: true as const, data });
const wait = () => new Promise((r) => setTimeout(r, 15));

/** `"ben_Pillar@odata.bind": "/ben_ltkpillars(<guid>)"` is how a lookup
 *  is written; it is read back as `_ben_pillar_value`. */
function normalise(record: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(record)) {
    const m = /^(.+)@odata\.bind$/.exec(k);
    if (m) out[`_${m[1].toLowerCase()}_value`] = /\(([^)]+)\)/.exec(String(v))?.[1] ?? null;
    else out[k] = v;
  }
  return out;
}

// ---- the filter -------------------------------------------------------------
type Tok = { t: "(" | ")" | "," | "word" | "str" | "num"; v: string };
function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) i++;
    else if (c === "(" || c === ")" || c === ",") out.push({ t: c, v: c }), i++;
    else if (c === "'") {
      let s = "";
      i++;
      while (i < src.length) {
        if (src[i] === "'" && src[i + 1] === "'") (s += "'"), (i += 2);
        else if (src[i] === "'") break;
        else s += src[i++];
      }
      i++;
      out.push({ t: "str", v: s });
    } else {
      let w = "";
      while (i < src.length && !/[\s(),]/.test(src[i])) w += src[i++];
      out.push({ t: /^-?\d+(\.\d+)?$/.test(w) ? "num" : "word", v: w });
    }
  }
  return out;
}
function compile(filter: string): (r: Row) => boolean {
  const toks = lex(filter);
  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];
  const value = (): ((r: Row) => unknown) => {
    const t = next();
    if (!t) throw new Error("value expected");
    if (t.t === "str") return () => t.v;
    if (t.t === "num") return () => Number(t.v);
    if (t.t === "word") {
      const w = t.v.toLowerCase();
      if (w === "true") return () => true;
      if (w === "false") return () => false;
      if (w === "null") return () => null;
      if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(t.v)) return () => t.v;
      return (r) => r[t.v] ?? null;
    }
    throw new Error(`unexpected ${t.v}`);
  };
  const same = (a: unknown, b: unknown) => (typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : (a ?? null) === (b ?? null));
  const atom = (): ((r: Row) => boolean) => {
    const t = peek();
    if (!t) throw new Error("expression expected");
    if (t.t === "(") {
      next();
      const e = or();
      next();
      return e;
    }
    if (t.t === "word" && t.v.toLowerCase() === "not") {
      next();
      const e = atom();
      return (r) => !e(r);
    }
    if (t.t === "word" && /^(startswith|endswith|contains)$/i.test(t.v) && toks[i + 1]?.t === "(") {
      const fn = next().v.toLowerCase();
      next();
      const a = value();
      next();
      const b = value();
      next();
      return (r) => {
        const x = String(a(r) ?? "").toLowerCase();
        const y = String(b(r) ?? "").toLowerCase();
        return fn === "startswith" ? x.startsWith(y) : fn === "endswith" ? x.endsWith(y) : x.includes(y);
      };
    }
    const left = value();
    const op = next()?.v.toLowerCase();
    const right = value();
    return (r) => {
      const a = left(r);
      const b = right(r);
      if (op === "eq") return same(a, b);
      if (op === "ne") return !same(a, b);
      const x = a as number | string;
      const y = b as number | string;
      return op === "gt" ? x > y : op === "ge" ? x >= y : op === "lt" ? x < y : op === "le" ? x <= y : true;
    };
  };
  const and = (): ((r: Row) => boolean) => {
    let e = atom();
    while (peek()?.t === "word" && peek().v.toLowerCase() === "and") {
      next();
      const l = e;
      const rr = atom();
      e = (r) => l(r) && rr(r);
    }
    return e;
  };
  const or = (): ((r: Row) => boolean) => {
    let e = and();
    while (peek()?.t === "word" && peek().v.toLowerCase() === "or") {
      next();
      const l = e;
      const rr = and();
      e = (r) => l(r) || rr(r);
    }
    return e;
  };
  return or();
}
function matcher(filter: string | undefined): (r: Row) => boolean {
  if (!filter || filter.trim() === "") return () => true;
  try {
    return compile(filter);
  } catch (e) {
    console.warn("[dataverse stub] filter not understood — matching everything:", filter, e);
    return () => true;
  }
}

// ---- the client ----------------------------------------------------------------
const client = {
  async createRecordAsync(name: string, record: Row) {
    await wait();
    const now = new Date().toISOString();
    const row: Row = { ...normalise(record), [pk(name)]: guid(), createdon: now, modifiedon: now };
    rowsOf(name).push(row);
    return ok({ ...row });
  },
  async updateRecordAsync(name: string, id: string, fields: Row) {
    await wait();
    const row = rowsOf(name).find((r) => r[pk(name)] === id);
    if (!row) return { success: false as const, error: { message: `No ${name} row ${id}` } };
    Object.assign(row, normalise(fields), { modifiedon: new Date().toISOString() });
    return ok({ ...row });
  },
  async deleteRecordAsync(name: string, id: string) {
    await wait();
    const t = rowsOf(name);
    const at = t.findIndex((r) => r[pk(name)] === id);
    if (at >= 0) t.splice(at, 1);
  },
  async retrieveRecordAsync(name: string, id: string) {
    await wait();
    const row = rowsOf(name).find((r) => r[pk(name)] === id);
    return row ? ok({ ...row }) : { success: false as const, error: { message: `No ${name} row ${id}` } };
  },
  async retrieveMultipleRecordsAsync(name: string, options?: { filter?: string }) {
    await wait();
    const keep = matcher(options?.filter);
    return ok(rowsOf(name).filter(keep).map((r) => ({ ...r })));
  },
  // connectors and metadata: not in the harness
  async executeAsync() {
    await wait();
    return { success: false as const, error: { message: "Not available in the harness" } };
  },
};

export function getClient(dataSourcesInfo: Record<string, { primaryKey?: string }>) {
  info = { ...info, ...dataSourcesInfo };
  return client;
}

/** For a harness page's console: what the stub holds. */
export function dump(name?: string): unknown {
  return name ? rowsOf(name) : Object.fromEntries([...tables.entries()].map(([k, v]) => [k, v.length]));
}
(window as unknown as { dvDump: typeof dump }).dvDump = dump;
