// Host detection + viewer identity. Inside Power Apps the SDK context
// carries the signed-in user's Entra object id (= ben_ltkpeople.whoid);
// on a bare dev server there is no host, and the app runs in demo mode.

import { getContext } from "@microsoft/power-apps/app";
import { setAppHost } from "./links";

export interface Viewer {
  objectId: string;
  name: string;
  email: string;
}

let hosted: boolean | null = null;
let viewer: Viewer | null = null;

/** Hosted, the page is a frame on powerplatformusercontent.com; a bare dev
 *  server or a harness page is the top window. The frame is the one sign
 *  that a host SHOULD answer. */
function framed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // a cross-origin parent throws on the comparison — framed
  }
}

/** The host is asked up to three times, each wait longer than the last
 *  (2.5 s, 5 s, 10 s): a slow connection used to miss the one 2.5 s window
 *  and the whole session ran in Demo mode on demo data (Ben, 2026-11-06). */
const HOST_WAITS_MS = [2500, 5000, 10000];

/** The message a framed page shows when the host never answered — text
 *  only, never a reload button (a raw iframe reload loses the handshake). */
export const HOST_UNREACHABLE =
  "Power Apps did not answer after three tries — the connection may be slow. Close and reopen the app, or refresh the browser.";

async function askHost(waitMs: number) {
  return Promise.race([
    getContext(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), waitMs)),
  ]);
}

/**
 * True inside Power Apps, false on a bare page (demo mode). A FRAMED page
 * whose host never answers throws HOST_UNREACHABLE instead of settling on
 * demo mode: the screen's boot failure shows the message, and the next
 * screen asks the host again (nothing is cached).
 */
let asking: Promise<boolean> | null = null;

export function detectHost(): Promise<boolean> {
  if (hosted !== null) return Promise.resolve(hosted);
  // the shell and the first screen ask together: one round serves both
  if (asking === null) {
    asking = detectHostOnce().finally(() => {
      asking = null;
    });
  }
  return asking;
}

async function detectHostOnce(): Promise<boolean> {
  const inFrame = framed();
  // a bare page gets one short ask; a framed one gets the three
  const waits = inFrame ? HOST_WAITS_MS : HOST_WAITS_MS.slice(0, 1);
  for (const waitMs of waits) {
    try {
      const context = await askHost(waitMs);
      const user = context.user;
      if (user?.objectId) {
        adopt(context);
        hosted = true;
        return true;
      }
      break; // the host answered without a user: a bare page's stub, not a slow link
    } catch {
      /* no answer in time — try again, or fall through */
    }
  }
  if (inFrame) throw new Error(HOST_UNREACHABLE);
  hosted = false;
  return false;
}

type HostContext = Awaited<ReturnType<typeof getContext>>;

function adopt(context: HostContext): void {
  const user = context.user;
  if (!user?.objectId) return;
  // the shareable-link builder needs the app's own identity
  setAppHost({
    appId: context.app?.appId ?? "",
    environmentId: context.app?.environmentId ?? "",
    tenantId: user.tenantId ?? "",
    queryParams: context.app?.queryParams ?? {},
  });
  viewer = {
    objectId: user.objectId,
    name: user.fullName ?? user.userPrincipalName ?? "Me",
    email: user.userPrincipalName ?? "",
  };
}

export function currentViewer(): Viewer | null {
  return viewer;
}

/**
 * Re-read the host context's launch parameters (5I resume): a deep link
 * into an ALREADY-RUNNING mobile app foregrounds it without a boot, so
 * the only chance of seeing the new scan is asking the host again when
 * visibility returns. Harmless when the host answers with stale
 * parameters — the caller dedupes against what it already handled.
 */
export async function refreshHostParams(): Promise<void> {
  if (hosted !== true) return;
  try {
    const context = await Promise.race([
      getContext(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
    ]);
    const user = context.user;
    if (user?.objectId) {
      setAppHost({
        appId: context.app?.appId ?? "",
        environmentId: context.app?.environmentId ?? "",
        tenantId: user.tenantId ?? "",
        queryParams: context.app?.queryParams ?? {},
      });
    }
  } catch {
    /* keep the params we had */
  }
}
