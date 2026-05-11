# TinyOps Context

## Domain Language

- **Data Source**: workspace-owned external system connection that can produce client memory records. Current concrete data source is IMAP.
- **Source Sync Job**: leased request to sync one data source for one workspace. A job includes source id, workspace id, source type, and lease token.
- **Sync Run**: observable attempt to process a source sync job. Runs record trigger, status, persisted counts, cursor, and safe failure details.
- **Connector Record**: normalized record emitted by a source connector before ingestion into client memory.
- **Client Memory**: workspace-scoped client profile, identities, source records, timeline events, and attributes derived from connector records.
- **Client Profile**: domain read model for one imported client, independent of UI formatting.
- **Timeline Event**: dated client interaction derived from a connector record.
- **Email Thread**: an IMAP conversation linked only by RFC message headers (`Message-ID`, `In-Reply-To`, `References`), never by subject fallback.
- **Thread Anchor**: an imported incoming email that passed intake filters and seeds future thread-member imports.
- **Thread Member**: a later email linked to a Thread Anchor by header IDs; it can be imported even when it does not match intake filters itself.
- **Sent Folder**: an IMAP folder identified by special-use metadata, flags, or common Sent names; sync seeds its cursor first and imports only future linked owner replies.
- **Import Reason**: the thread-policy reason stored on email metadata explaining why a message was imported (`filter_anchor`, `thread_member`, or `thread_reply`).
