import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function migrationSource() {
  const migrationsDir = path.join(
    process.cwd(),
    "..",
    "..",
    "supabase",
    "migrations"
  )
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n")
}

describe("data sources database contract", () => {
  it("creates workspace-scoped data source tables with RLS", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/create extension if not exists supabase_vault/)
    expect(migration).toMatch(/create table public\.data_sources \(/)
    expect(migration).toMatch(/create table public\.data_source_secrets \(/)
    expect(migration).toMatch(/create table public\.data_source_sync_states \(/)
    expect(migration).toMatch(/create table public\.data_source_intake_configs \(/)
    expect(migration).toMatch(
      /alter table public\.data_sources enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.data_source_secrets enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.data_source_sync_states enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.data_source_intake_configs enable row level security;/
    )
  })

  it("keeps one active connector per workspace and type except Google Forms modes", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/data_sources_one_active_per_workspace_singleton_type/)
    expect(migration).toMatch(/where disconnected_at is null\s+and source_type <> 'forms'/)
    expect(migration).toMatch(/data_sources_one_active_google_form_per_mode/)
    expect(migration).toMatch(/config->>'externalFormId'/)
    expect(migration).toMatch(/config->>'connectionMode'/)
  })

  it("stores IMAP passwords through Vault inside the connect RPC", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/function public\.connect_imap_data_source/)
    expect(migration).toMatch(/function public\.update_imap_connection_settings/)
    expect(migration).toMatch(/function public\.update_imap_intake_config/)
    expect(migration).toMatch(/function public\.update_imap_folder_snapshot/)
    expect(migration).toMatch(/function public\.is_valid_imap_message_filters/)
    expect(migration).toMatch(/data_source_intake_configs/)
    expect(migration).toMatch(/vault\.create_secret/)
    expect(migration).toMatch(/insert into public\.data_source_secrets/)
    expect(migration).toMatch(/imap_password/)
    expect(migration).toMatch(/grant execute on function public\.connect_imap_data_source/)
  })

  it("limits source management to owner and admin roles", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/public\.workspace_actor_role\(workspace_id\) is not null/)
    expect(migration).toMatch(
      /public\.workspace_actor_role\(workspace_id\) in \('owner', 'admin'\)/
    )
    expect(migration).toMatch(/function public\.disconnect_data_source/)
    expect(migration).toMatch(/function public\.request_data_source_sync/)
    expect(migration).toMatch(/function public\.request_all_data_source_syncs/)
  })

  it("claims and completes queued sync jobs through service-role RPCs", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/function public\.claim_next_data_source_sync/)
    expect(migration).toMatch(/source_type text/)
    expect(migration).toMatch(/for update skip locked/)
    expect(migration).toMatch(
      /function public\.complete_data_source_sync\(\s*target_source_id uuid,\s*lease_token text,/
    )
    expect(migration).toMatch(
      /function public\.fail_data_source_sync\(\s*target_source_id uuid,\s*lease_token text,/
    )
    expect(migration).toMatch(/sync_lease_not_owned/)
    expect(migration).toMatch(
      /grant execute on function public\.claim_next_data_source_sync/
    )
  })

  it("stores data source sync run history with member-readable RLS", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/create table public\.data_source_sync_runs \(/)
    expect(migration).toMatch(/source_id uuid not null/)
    expect(migration).toMatch(/workspace_id uuid not null/)
    expect(migration).toMatch(/trigger text not null/)
    expect(migration).toMatch(/status text not null/)
    expect(migration).toMatch(/persisted_counts jsonb/)
    expect(migration).toMatch(/diagnostics jsonb/)
    expect(migration).toMatch(/cause_message text/)
    expect(migration).toMatch(
      /alter table public\.data_source_sync_runs enable row level security;/
    )
    expect(migration).toMatch(
      /create policy "Members can read data source sync runs"/
    )
    expect(migration).toMatch(/data_source_sync_runs_source_started_idx/)
    expect(migration).toMatch(
      /grant select on public\.data_source_sync_runs to authenticated;/
    )
    expect(migration).toMatch(
      /grant select, insert, update on public\.data_source_sync_runs to service_role;/
    )
  })

  it("publishes sync state and run changes to Supabase Realtime", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /alter publication supabase_realtime add table public\.data_source_sync_states/
    )
    expect(migration).toMatch(
      /alter publication supabase_realtime add table public\.data_source_sync_runs/
    )
  })

  it("queues all active workspace data sources through a bulk sync RPC", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /function public\.request_all_data_source_syncs\(\s*target_workspace_id uuid\s*\)/
    )
    expect(migration).toMatch(/returns integer/)
    expect(migration).toMatch(/source_manage_forbidden/)
    expect(migration).toMatch(/where workspace_id = target_workspace_id/)
    expect(migration).toMatch(/and disconnected_at is null/)
    expect(migration).toMatch(
      /grant execute on function public\.request_all_data_source_syncs\(uuid\)/
    )
    expect(migration).toMatch(
      /revoke execute on function public\.request_all_data_source_syncs\(uuid\)/
    )
  })

  it("stores Google Forms manual CSV uploads for sync worker ingestion", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/create table public\.google_forms_csv_uploads \(/)
    expect(migration).toMatch(/create table public\.google_forms_csv_rows \(/)
    expect(migration).toMatch(/response_key text not null/)
    expect(migration).toMatch(/unique \(source_id, response_key\)/)
    expect(migration).toMatch(
      /function public\.connect_google_forms_manual_csv_data_source/
    )
    expect(migration).toMatch(/form_connection_mode = 'manual_csv'/)
    expect(migration).toMatch(/invalid_google_forms_csv_mapping/)
    expect(migration).toMatch(/grant execute on function public\.connect_google_forms_manual_csv_data_source/)
  })

  it("exposes IMAP password decrypt through a service-role-only RPC", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /function public\.read_imap_data_source_password\(\s*target_workspace_id uuid,\s*target_source_id uuid\s*\)/
    )
    expect(migration).toMatch(/returns text/)
    expect(migration).toMatch(/security definer/)
    expect(migration).toMatch(/vault\.decrypted_secrets/)
    expect(migration).toMatch(/source_not_found/)
    expect(migration).toMatch(/invalid_imap_config/)
    expect(migration).toMatch(/secret_read_failed/)
    expect(migration).toMatch(
      /grant execute on function public\.read_imap_data_source_password\(uuid, uuid\)\s+to service_role;/
    )
    expect(migration).toMatch(
      /revoke execute on function public\.read_imap_data_source_password\(uuid, uuid\)\s+from anon, authenticated, public;/
    )
  })

  it("exposes IMAP thread message IDs through a service-role-only RPC", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /function public\.read_imap_thread_message_ids\(\s*target_workspace_id uuid,\s*target_source_id uuid\s*\)/
    )
    expect(migration).toMatch(/returns text\[\]/)
    expect(migration).toMatch(/security definer/)
    expect(migration).toMatch(/raw_payload\s*->\s*'metadata'\s*->\s*'imapThread'\s*->\s*'relatedMessageIds'/)
    expect(migration).toMatch(/raw_payload\s*->\s*'metadata'\s*->>\s*'messageId'/)
    expect(migration).toMatch(
      /grant execute on function public\.read_imap_thread_message_ids\(uuid, uuid\)\s+to service_role;/
    )
    expect(migration).toMatch(
      /revoke execute on function public\.read_imap_thread_message_ids\(uuid, uuid\)\s+from anon, authenticated, public;/
    )
  })
})
