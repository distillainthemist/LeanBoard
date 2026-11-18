// "＋ Add a team…" on an action (issue 10, 2026-11-17): the road the
// action dialog asks for. The reporting line comes from the directory
// (the team import's walk — one call per manager, a few at a time);
// teamModel.ts splits it against the app's people.

import type { ActionTeamResult, ActionTeamRoad } from "../../../shared/ui/actionLinkProvider";
import { MAX_ASSIGNEES } from "../../../shared/schema/actions";
import { splitTeam } from "./teamModel";

export function teamRoad(): ActionTeamRoad {
  return {
    reports: async (leaderWhoId: string, levels: 1 | 2): Promise<ActionTeamResult> => {
      const [{ walkReports }, { listPeople }] = await Promise.all([import("../store/directoryWalk"), import("../store/people")]);
      const [walk, roster] = await Promise.all([
        // the cap leaves room for the people who turn out not to be in
        // the app: the action itself holds MAX_ASSIGNEES at most
        walkReports([leaderWhoId], undefined, { maxDepth: levels, maxPeople: MAX_ASSIGNEES * 2 }),
        listPeople(),
      ]);
      const split = splitTeam(walk.people, roster, leaderWhoId);
      // stopping at the depth asked for is the answer, not a cut-off: only
      // the people cap or a failed read makes it partial (it used to say
      // "answered only in part" on every cascade)
      return { people: split.people, skipped: split.skipped, partial: walk.capped || walk.failed.length > 0 };
    },
  };
}
