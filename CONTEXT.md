# TinyOps Context

## Domain Language

- **Data Source**: workspace-owned external system connection that can produce client memory records. Current concrete data source is IMAP.
- **Source Sync Job**: leased request to sync one data source for one workspace. A job includes source id, workspace id, source type, and lease token.
- **Sync Run**: observable attempt to process a source sync job. Runs record trigger, status, persisted counts, cursor, and safe failure details.
- **Connector Record**: normalized record emitted by a source connector before ingestion into client memory.
- **Client Memory**: workspace-scoped client profile, identities, source records, timeline events, and attributes derived from connector records.
- **Client Profile**: domain read model for one imported client, independent of UI formatting.
- **Timeline Event**: dated client interaction derived from a connector record.
