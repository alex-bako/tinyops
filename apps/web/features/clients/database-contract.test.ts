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

describe("clients database contract", () => {
  it("creates workspace-scoped client memory tables with RLS", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/create extension if not exists pg_trgm/)
    expect(migration).toMatch(/create table public\.clients \(/)
    expect(migration).toMatch(/create table public\.client_identities \(/)
    expect(migration).toMatch(/create table public\.client_attributes \(/)
    expect(migration).toMatch(/create table public\.raw_source_records \(/)
    expect(migration).toMatch(/create table public\.timeline_events \(/)
    expect(migration).toMatch(/create table public\.client_domain_events \(/)

    for (const table of [
      "clients",
      "client_identities",
      "client_attributes",
      "raw_source_records",
      "timeline_events",
      "client_domain_events",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`
      )
    }
  })

  it("keeps client identities extensible while matching emails uniquely", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/identity_type text not null/)
    expect(migration).toMatch(/normalized_value text not null/)
    expect(migration).toMatch(
      /client_identities_one_value_per_workspace_type/
    )
    expect(migration).toMatch(/clients_one_primary_email_per_workspace/)
    expect(migration).toMatch(/clients_email_trgm_idx/)
    expect(migration).toMatch(/clients_display_name_trgm_idx/)
  })

  it("stores parsed source records and immutable timeline/audit events", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/content_hash text not null/)
    expect(migration).toMatch(/external_id text not null/)
    expect(migration).toMatch(/raw_payload jsonb not null/)
    expect(migration).toMatch(/body_text text not null default ''/)
    expect(migration).toMatch(/add column if not exists body jsonb/)
    expect(migration).toMatch(/drop column if exists title/)
    expect(migration).toMatch(/timeline_events_body_shape/)
    expect(migration).toMatch(/sensitivity_level integer not null default 0/)
    expect(migration).toMatch(/client_domain_events_append_only/)
    expect(migration).toMatch(/raw_source_records_unique_external_id/)
    expect(migration).toMatch(/timeline_events_unique_source_event/)
  })

  it("ingests normalized connector records transactionally", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/function public\.ingest_client_connector_records/)
    expect(migration).toMatch(/jsonb_array_elements\(normalized_records\)/)
    expect(migration).toMatch(/v_record_type text/)
    expect(migration).toMatch(/v_attribute_key text/)
    expect(migration).toMatch(/on conflict \(workspace_id, primary_email\)/)
    expect(migration).toMatch(/insert into public\.raw_source_records/)
    expect(migration).toMatch(/insert into public\.timeline_events/)
    expect(migration).toMatch(
      /grant execute on function public\.ingest_client_connector_records/
    )
  })

  it("adds sync lease fields for queued workers", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/alter table public\.data_source_sync_states/)
    expect(migration).toMatch(/lease_owner text/)
    expect(migration).toMatch(/lease_token text/)
    expect(migration).toMatch(/lease_expires_at timestamptz/)
    expect(migration).toMatch(/sync_error_count integer not null default 0/)
    expect(migration).toMatch(/data_source_sync_states_claimable_idx/)
  })

  it("publishes Client Profile read model changes to Supabase Realtime", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /alter publication supabase_realtime add table public\.clients/
    )
    expect(migration).toMatch(
      /alter publication supabase_realtime add table public\.timeline_events/
    )
  })
})
