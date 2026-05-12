# TinyOps Context

## Domain Language

- **Connector Type**: catalog-level integration family such as IMAP mailbox or Google Forms. A workspace can create multiple connector instances of the same type when each has a distinct name and configuration.
- **Data Source**: one named, workspace-owned connector instance that can produce client memory records. Each active instance has a stable slug scoped to its workspace and connector type; display names can change without changing the slug.
- **IMAP Source**: one connected mailbox connector instance. Active IMAP sources in the same workspace cannot share the same host, port, encryption, and username.
- **Google Form Source**: one connected Google Form response source. Active Google Form sources in the same workspace cannot share the same external form id and connection mode. The current supported connection mode is Manual CSV Upload.
- **Manual CSV Upload**: Google Forms response export uploaded by a workspace owner or admin. The app sends row number and payload only; storage validates mapped identity/timestamp fields and derives the response key.
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
