# Documents

## Journey 1 — Register and libraries

### UAT-DOC-001 — Open the Documents tab and see the libraries
persona: reader
modules: docs/docsScreen.ts docs/docsTiles.ts
preconditions: signed in as a reader at a site with at least two exposed libraries
steps:
1. Open LeanBoard → Documents.
2. Read the library tiles.
expected: every exposed library shows as a tile with its document count; the ingestion and template libraries do not show as register tiles
