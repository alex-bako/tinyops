# TinyOps Context

## Domain Language

- **Connector Type**: catalog-level integration family such as IMAP mailbox or Google Forms. A workspace can create multiple connector instances of the same type when each has a distinct name and configuration.
- **Data Source**: one named, workspace-owned connector instance that can produce client memory records. Each active instance has a stable slug scoped to its workspace and connector type; display names can change without changing the slug.
- **IMAP Source**: one connected mailbox connector instance. Active IMAP sources in the same workspace cannot share the same host, port, encryption, and username.
- **Google Form Source**: one connected Google Form response source. Active Google Form sources in the same workspace cannot share the same external form id and connection mode. Supported connection modes are Manual CSV Upload and Live Sync.
- **Manual CSV Upload**: Google Forms response export uploaded by a workspace owner or admin. The app sends row number and payload only; storage validates mapped identity/timestamp fields and derives the response key.
- **Live Sync**: Google Form connection mode that reads responses through the Google Forms API as the TinyOps service account. The form owner shares the form with the service account address; each Source Sync Job pulls responses submitted or edited after the stored cursor, and edited responses replace the earlier event.
- **Stripe Source**: one connected Stripe account, authenticated with a secret API key stored in Vault. Active Stripe sources in the same workspace cannot share the same Stripe account id. Sync polls customers, charges, refunds, disputes, invoices and subscriptions created on or after the Sync Start Date, then replays recent Stripe events so status changes update existing Payment Events in place.
- **Sync Start Date**: the date chosen when connecting a Stripe Source; Stripe objects created before it are never imported.
- **Payment Event**: a Timeline Event of type `payment` derived from a Stripe charge, refund, dispute, invoice or subscription. The record type names the Stripe object; the Stripe customer id is stored as an external-id Client Identity.
- **MailerLite Source**: one connected MailerLite account, authenticated with an API key stored in Vault. Active MailerLite sources in the same workspace cannot share the same shop ids (or, without a shop, the same key). Sync re-walks every subscriber and every shop's orders each run, then reads the subscriber-activity report of each sent campaign finished on or after the Sync Start Date; campaigns finished more than 30 days before the previous pass are not re-read.
- **Engagement Event**: a Timeline Event of type `email_engagement` derived from a MailerLite campaign report: one per campaign and subscriber, recording opens and clicks. MailerLite orders become Payment Events; the MailerLite subscriber id is stored as an external-id Client Identity and subscriber status, groups and custom fields become Client Attributes.
- **Identity Question**: the form question whose answer is used as the client email for a Live Sync source when the form does not collect respondent emails. A collected respondent email always wins over the question answer.
- **Source Sync Job**: leased request to sync one data source for one workspace. A job includes source id, workspace id, source type, and lease token.
- **Sync Run**: observable attempt to process a source sync job. Runs record trigger, status, persisted counts, cursor, and safe failure details.
- **Deploy Environment**: named release target for TinyOps infrastructure. Current environments are Staging and Production, each with its own Vercel project, Supabase project, GitHub environment, and Source Sync Job schedule.
- **Deploy Health Check**: service-role-only smoke check used after deployment. It verifies the deployed Next.js app can authenticate the deploy health request and reach Supabase through the deploy health RPC.
- **Connector Record**: normalized record emitted by a source connector before ingestion into client memory.
- **Client Memory**: workspace-scoped client profile, identities, source records, timeline events, and attributes derived from connector records.
- **Client Profile**: domain read model for one imported client, independent of UI formatting.
- **Timeline Event**: dated client interaction derived from a connector record.
- **Email Thread**: an IMAP conversation linked only by RFC message headers (`Message-ID`, `In-Reply-To`, `References`), never by subject fallback.
- **Thread Anchor**: an imported incoming email that passed intake filters and seeds future thread-member imports.
- **Thread Member**: a later email linked to a Thread Anchor by header IDs; it can be imported even when it does not match intake filters itself.
- **Sent Folder**: an IMAP folder identified by special-use metadata, flags, or common Sent names; sync seeds its cursor first and imports only future linked owner replies.
- **Import Reason**: the thread-policy reason stored on email metadata explaining why a message was imported (`filter_anchor`, `thread_member`, or `thread_reply`).
