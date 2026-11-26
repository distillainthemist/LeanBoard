// Settings → Issues on the in-memory Dataverse (2026-11-26, R3): the
// desk with its new statuses, Export to CSV and Import answers. The
// page prints a filled-in answers file for the seeded issues under the
// desk (`window.sampleCsv`), covering a ready row, a duplicate pair, a
// fault of each kind, a withdrawn report and a row with no answer.
// Teams is not in the harness: every card "did not go", which is the
// Send again path.
import "../src/style.css";
import { ensureStylesheet } from "../../shared/ui/dom";
import { LTK_BASE_CSS } from "../../shared/ui/baseCss";
import { detectHost } from "../src/runtime";
import { renderIssuesAdmin } from "../src/issues/adminTab";
import { Ben_ltkissuesService } from "../src/generated/services/Ben_ltkissuesService";
import { Ben_ltkissuemessagesService } from "../src/generated/services/Ben_ltkissuemessagesService";
import { Ben_ltkissuewatchsService } from "../src/generated/services/Ben_ltkissuewatchsService";

type NewIssue = Parameters<typeof Ben_ltkissuesService.create>[0];
const add = async (name: string, over: Record<string, unknown> = {}): Promise<string> => {
  const r = await Ben_ltkissuesService.create({
    ben_name: name,
    ben_kind: "bug",
    ben_area: "documents",
    ben_status: "new",
    ben_description: `${name} — as the reporter described it.`,
    ben_reportername: "Kat Reporter",
    ben_reporteremail: "kat@example.test",
    ...over,
  } as unknown as NewIssue);
  return (r.data as { ben_ltkissueid: string }).ben_ltkissueid;
};

ensureStylesheet("ltk-base-css", LTK_BASE_CSS);
void (async () => {
  await detectHost();
  const a = await add("Review complete never marks complete");
  const b = await add("Second Review complete does nothing", { ben_reportername: "Ellen Other", ben_reporteremail: "ellen@example.test" });
  const c = await add("A chart's axis should start at zero", { ben_kind: "idea", ben_area: "priorities", ben_status: "triaged" });
  const d = await add("Cannot open the library from my phone", { ben_reportername: "Sam Site", ben_reporteremail: "sam@example.test" });
  const e = await add("Filters pane too narrow", { ben_status: "withdrawn" });
  const f = await add("Typo on the settings page", { ben_area: "settings", ben_resolution: "typed by hand", ben_reportername: "O'Brien, Ben", ben_reporteremail: "u1@example.test" });
  const g = await add("Kanban shows the wrong column", { ben_area: "boards", ben_status: "inprogress" });
  const h = await add("Tooltip on a library's name", { ben_kind: "idea" });
  await Ben_ltkissuewatchsService.create({ ben_name: "+1 — sam@example.test", ben_email: "sam@example.test", ben_watchername: "Sam Site", "ben_Issue@odata.bind": `/ben_ltkissues(${a})` } as Parameters<typeof Ben_ltkissuewatchsService.create>[0]);
  await Ben_ltkissuemessagesService.create({ ben_name: "Looking into it", ben_body: "Looking into it", ben_audience: "reporter", "ben_Issue@odata.bind": `/ben_ltkissues(${a})` } as Parameters<typeof Ben_ltkissuemessagesService.create>[0]);

  const csv = [
    "IssueID,Title,Kind,Area,Reporter,Raised,CurrentStatus,Status,ResolutionType,ReporterMessage,ReleaseVersion,ResolvedDate,DuplicateOfID,InternalNote",
    `${a},x,,,,,,Resolved,Bug fix,"Thanks for reporting this. Review complete now records your review, and says so.",1.0.0,3/12/2026,,Version read by name not id`,
    `${b},x,,,,,,Duplicate,Bug fix,"Thanks - this was the same problem as another report and is now fixed.",1.0.0,2026-12-03,${a},`,
    `${c},x,,,,,,deferred,Enhancement,"Thanks for the idea. We have logged it for a later release.",,,,Revisit with report 24`,
    `${d},x,,,,,,Not a software issue,Training / guidance,"Thanks. Your site admin can add you to the library's visitors group.",,,,`,
    `${e},x,,,,,,Declined,No change,"Thanks. We are keeping the pane as it is for now.",,,,`,
    `${f},x,,,,,,Partially resolved,Bug fix,"Thanks. The first typo is fixed; the second follows.",1.0.0,2026-12-03,,`,
    `${g},x,,,,,,Fixed,Bug fix,"Thanks.",,,,`,
    `${h},x,,,,,,,,,,,,`,
    `99999999-9999-4999-8999-999999999999,x,,,,,,Resolved,,"Thanks.",,,,`,
  ].join("\r\n");
  (window as unknown as { sampleCsv: string }).sampleCsv = csv;
  document.getElementById("sample")!.textContent = csv;
  await renderIssuesAdmin(document.getElementById("host")!);
})();
