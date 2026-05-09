import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function allMigrationSource() {
  const root = path.join(process.cwd(), "..", "..")
  const migrationsDir = path.join(root, "supabase", "migrations")
  return [
    "20260509000000_auth_invites_profiles.sql",
    "20260509001000_workspaces.sql",
    "20260509003000_workspace_lifecycle_rpc.sql",
    "20260510000000_onboarding_persistence.sql",
  ]
    .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n")
}

describe("onboarding database contract", () => {
  it("stores onboarding profile and workspace fields", () => {
    const migration = allMigrationSource()

    expect(migration).toMatch(/first_name text/)
    expect(migration).toMatch(/last_name text/)
    expect(migration).toMatch(/onboarded_at timestamptz/)
    expect(migration).toMatch(/vertical text/)
    expect(migration).toMatch(/default_sender_name text/)
    expect(migration).toMatch(/initial_source_intent text/)
  })

  it("creates first workspace and profile state through one RPC", () => {
    const migration = allMigrationSource()

    expect(migration).toMatch(/function public\.complete_onboarding/)
    expect(migration).toMatch(/insert into public\.workspaces/)
    expect(migration).toMatch(/insert into public\.workspace_memberships/)
    expect(migration).toMatch(/insert into public\.workspace_invitations/)
    expect(migration).toMatch(/insert into public\.auth_invites/)
    expect(migration).toMatch(/profile_onboarded_at/)
    expect(migration).toMatch(
      /grant execute on function public\.complete_onboarding/
    )
  })
})
