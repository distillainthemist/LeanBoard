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
expected: Members… shows only on a linked group; the controllers dialog says an add also makes the person a member and owner of the owners & approvers group; after the add they are a controller AND a member and owner of the pool; after the remove they are no controller and no longer an owner of the pool but still its member; the pool dialog adds and removes members alone; removing the group's only owner is refused with a readable line; you cannot remove yourself
