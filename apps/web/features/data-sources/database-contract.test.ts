import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function migrationSource() {
  const root = path.join(process.cwd(), "..", "..")
  return readFileSync(
    path.join(root, "supabase", "migrations", "20260509004000_data_sources.sql"),
    "utf8"
  )
}

describe("data sources database contract", () => {
  it("creates workspace-scoped data source tables with RLS", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/create extension if not exists supabase_vault/)
    expect(migration).toMatch(/create table public\.data_sources \(/)
    expect(migration).toMatch(/create table public\.data_source_secrets \(/)
    expect(migration).toMatch(/create table public\.data_source_sync_states \(/)
    expect(migration).toMatch(
      /alter table public\.data_sources enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.data_source_secrets enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.data_source_sync_states enable row level security;/
    )
  })

  it("keeps one active connector per workspace and type", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/data_sources_one_active_per_workspace_type/)
    expect(migration).toMatch(/where disconnected_at is null/)
  })

  it("stores IMAP passwords through Vault inside the connect RPC", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/function public\.connect_imap_data_source/)
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
  })
})
