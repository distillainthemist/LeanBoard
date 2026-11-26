// A file's bytes as the SharePoint connector hands them back (N4,
// 2026-11-26). Pure.
//
// The SDK decides the shape by the RESPONSE's content type
// (runtimeDataClient.js, read in 1.2.7):
//   - application/octet-stream → a Uint8Array;
//   - image/*                  → a base64 string;
//   - anything else (a PDF is application/pdf) → a "binary string": one
//     character per byte, built with String.fromCharCode. Lossless.
// The October write probe read a 32-byte .bin back as a Uint8Array, so
// the string shape was never met until a real PDF was asked for — the
// viewer said "it answered as string, not bytes" (Ben, dev).

const fromBinaryString = (s: string): Uint8Array | null => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return null; // not one character per byte: do not guess
    out[i] = c;
  }
  return out;
};

const fromBase64 = (s: string): Uint8Array | null => {
  const clean = s.replace(/\s+/g, "");
  if (clean === "" || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return null;
  try {
    return fromBinaryString(atob(clean));
  } catch {
    return null;
  }
};

const startsWith = (b: Uint8Array, magic: string): boolean => {
  if (b.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) if (b[i] !== magic.charCodeAt(i)) return false;
  return true;
};

/**
 * The bytes in a connector answer, whatever shape it came in; null when
 * it is not bytes this app can trust. `magic`: what the file must begin
 * with ("%PDF" for a PDF) — it tells a binary string from a base64 one,
 * and refuses anything that is neither.
 */
export function bytesFromConnector(data: unknown, magic: string): Uint8Array | null {
  if (data instanceof Uint8Array) return data.length > 0 ? data : null;
  if (data instanceof ArrayBuffer) return data.byteLength > 0 ? new Uint8Array(data) : null;
  if (typeof data !== "string" || data === "") return null;
  const direct = fromBinaryString(data);
  if (direct !== null && startsWith(direct, magic)) return direct;
  const decoded = fromBase64(data);
  if (decoded !== null && startsWith(decoded, magic)) return decoded;
  return null;
}

/** How an answer that was NOT usable bytes is described in the readout. */
export function describeAnswer(data: unknown): string {
  if (data instanceof Uint8Array) return `${data.length} bytes`;
  if (typeof data === "string") return `a string of ${data.length} characters beginning "${data.slice(0, 8).replace(/[^\x20-\x7e]/g, "?")}"`;
  if (data === null || data === undefined) return "nothing";
  return `a ${typeof data}`;
}
