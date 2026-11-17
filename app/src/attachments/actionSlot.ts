// An action's attachments & links, in the action dialog (issue 5,
// 2026-11-17). Whoever has the dialog open may add; whoever raised the
// action or holds a part of it may remove anyone's, everyone else only
// their own.

import type { LtkAction } from "../../../shared/schema/actions";
import { mountAttachments } from "./list";

export function mountActionAttachments(host: HTMLElement, action: LtkAction, viewer: { objectId: string; name: string } | null): () => void {
  const whoId = viewer?.objectId ?? "";
  return mountAttachments({
    host,
    parent: { kind: "action", id: action.id },
    actor: { whoId, who: viewer?.name ?? "" },
    canAdd: whoId !== "",
    managesParent: whoId !== "" && (action.createdBy === whoId || action.assignees.some((x) => x.whoId === whoId)),
    heading: "Attachments & links",
  }).teardown;
}
