// Cadence Current State — the carriage (Ben, 2026-11-05). The result goes
// by email through the Office 365 Outlook connector the scan already
// uses: "Send an email (V2)" takes the JSON and Excel files as
// attachments and sends from the person's own mailbox, so Sent Items
// keeps the record. No Teams connector (a chat cannot carry a file
// without storing it in OneDrive first; Ben dropped it, 2026-11-05).

import { Office365OutlookService } from "../generated/services/Office365OutlookService";

type OpResult = { success?: boolean; data?: unknown; error?: unknown } | undefined;

const failText = (r: OpResult): string => {
  if (!r || r.success !== false) return "";
  const e = r.error as { message?: unknown } | string | null | undefined;
  const msg = typeof e === "string" ? e : typeof e?.message === "string" ? e.message : JSON.stringify(e);
  return (msg || "refused").slice(0, 300);
};

export interface MailFile {
  name: string;
  /** base64 */
  content: string;
}

/** "" when sent, otherwise the honest reason it was not. */
export async function sendByEmail(email: string, subject: string, html: string, files: MailFile[]): Promise<string> {
  try {
    const r = (await Office365OutlookService.SendEmailV2({
      To: email.trim().toLowerCase(),
      Subject: subject,
      Body: html,
      Attachments: files.map((f) => ({ Name: f.name, ContentBytes: f.content })),
    })) as OpResult;
    return failText(r);
  } catch (e) {
    return String((e as Error)?.message ?? e).slice(0, 300);
  }
}
