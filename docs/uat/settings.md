# Settings, people & organisation

Personas: user, siteadmin (a site admin of one site), superadmin. The site needs the organisation tree with at least two sites, a roster, and the directory connector signed in.

## Journey 1 — People

### UAT-SET-001 — A site admin adds a person from the directory
persona: siteadmin
modules: screens/settings.ts store/people.ts
preconditions: signed in as a site admin; someone in the directory who is not yet on the roster
steps:
1. Settings → People; type the person's name in the search box; "Search directory & add".
2. On the hit, ＋ Add; read the placement row; pick a department and crew; "Add to roster".
3. Search the roster for them.
expected: the note at the top says site admins add people from the directory into their site; the directory matches show; the placement row's Site is fixed to the admin's own site and Role to User (both greyed, with a tooltip saying why), department and crew offer the site's own; the person lands on the roster placed in that site; a super admin sees the full placement row with every site and role

## Journey 2 — Access control

### UAT-SET-002 — Members of the document control groups
persona: superadmin
modules: screens/settings.ts docs/groupMembers.ts store/accessGroup.ts
preconditions: the Document controllers and Owners & approvers groups linked under Settings → Access control, both owned by you in Entra; a person in the directory who is in neither
steps:
1. Settings → Access control → Document controllers → Members…; read the note and the ownership line.
2. Search the directory for the person; ＋ Add. In Entra (or the Owners & approvers → Members… dialog) check the owners & approvers group.
3. Remove them from Document controllers; confirm. Check the owners & approvers group again.
4. Owners & approvers → Members…: add and remove someone.
5. Settings → Users: read the Document roles column; tick Controller on a person; untick Owner/approver on another.
expected: the Users register's Document roles column shows a Controller and an Owner/approver box per person, ticked from the groups' live membership, writable only for a super admin who owns the group (the tooltip says why otherwise, and your own Controller box cannot be unticked); ticking Controller also ticks Owner/approver; unticking asks first and a refusal reverts the box with the reason under the row; Members… shows only on a linked group; the controllers dialog says an add also makes the person a member and owner of the owners & approvers group; after the add they are a controller AND a member and owner of the pool; after the remove they are no controller and no longer an owner of the pool but still its member; the pool dialog adds and removes members alone; removing the group's only owner is refused with a readable line; you cannot remove yourself

## Journey 3 — Processes

### UAT-SET-003 — A site's own process hierarchy
persona: siteadmin
modules: processes/settingsTab.ts processes/migrate.ts store/processes.ts shared/schema/process.ts
preconditions: you are a site admin of a site with no process hierarchy yet; the central hierarchy has a type with areas and processes
steps:
1. Settings → Processes: your site is the only chip; read the starter.
2. Clone the central type (or Start empty); add an area, a process beneath it and a sub-process; rename one; reorder two by drag; archive one.
3. Open a ritual's wizard, an initiative's header form and a value driver for your site.
expected: the tab shows only your site, no Central hierarchy chip; cloning creates the tree in the site's own words with every node reading "↔ <central name>" greyed (a super admin sets links) and the status line counts the rituals, initiatives and value drivers re-pointed; edits write at once and the term-set push line reads under the tree; the pickers in the wizard, the initiative form and the value driver cascade through YOUR site's tree, never the central one

### UAT-SET-004 — Links to the central hierarchy
persona: superadmin
modules: processes/settingsTab.ts shared/ui/processPicker.ts shared/schema/process.ts
preconditions: a site with its own tree; the central hierarchy with two types
steps:
1. Settings → Processes → the site chip → "↔" on an area → pick a type and a central process → Link.
2. On a process beneath that area read its link; open it and press Inherit.
3. Central hierarchy chip → the type → read the "↔ n site nodes" count on the central node; rename it.
expected: the area reads "↔ Type › Process"; the node beneath reads the same with "(inherited)"; Inherit on a node with its own link clears it back to the inherited one; the central node's count shows the explicit links; renaming a central node does not touch the term set (the central tree does not sync) and the site node's label in the Improvement tab's company-scope filter follows

### UAT-SET-005 — Initiatives compared across sites
persona: superadmin
modules: improvement/improvementTab.ts shared/ui/processPicker.ts shared/schema/process.ts
preconditions: two sites whose trees link a node each to the same central process; an initiative on each naming its site's node
steps:
1. Improvement tab at company scope (no site) → Filters → "Process (across sites)" → the type, then the process.
2. Switch the scope to one site → Filters → Process.
expected: at company scope both initiatives match the central pick and the filter count reads 1; at site scope the Process filter cascades through that site's own tree and matches only its initiative
