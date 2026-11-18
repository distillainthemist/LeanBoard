// The Priorities page itself, on the in-memory Dataverse (dataverseStub
// + appStub): a company with three sites, two pillars, sub-pillars that
// change between 2026 and 2027, priorities, a proposal, a cascade waiting
// on the site, one on hold, a pull proposed by a direct report, and a
// priority whose sub-pillar ended. Seeded through the stores' own save
// functions, so what the screen reads is what the app would have written.
//   ?org=PacOps        view the company (default: the site Weipa)
//   ?as=u2             sign in as someone else (u1 owns Weipa; u2 is a
//                      direct report; u9 is a plain user)
//   ?year=2027         the year in view
import "../src/style.css";
import { detectHost } from "../src/runtime";
import { orgKey, orgRef } from "../src/priorities/model";
import { seed } from "./prioritiesSeed";
import { rememberShared } from "../src/sessionView";
import { mountPriorities } from "../src/priorities/prioritiesScreen";

const q = new URLSearchParams(location.search);

void (async () => {
  await detectHost();
  await seed();
  // the org and year in view are the session's: set them before the mount
  rememberShared(orgKey(q.get("org") === "PacOps" ? orgRef("PacOps") : orgRef("PacOps", "Weipa")), q.get("year") ?? "2026");
  mountPriorities(document.getElementById("host")!);
})();
