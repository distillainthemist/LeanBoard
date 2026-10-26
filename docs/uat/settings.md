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
