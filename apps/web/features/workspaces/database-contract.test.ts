import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function migrationSource() {
  const root = path.join(process.cwd(), "..", "..")
  return readFileSync(
    path.join(root, "supabase", "migrations", "20260509001000_workspaces.sql"),
    "utf8"
  )
}

function rpcMigrationSource() {
  const root = path.join(process.cwd(), "..", "..")
  return readFileSync(
    path.join(
      root,
      "supabase",
      "migrations",
      "20260509003000_workspace_lifecycle_rpc.sql"
    ),
    "utf8"
  )
}

describe("workspace database contract", () => {
  it("creates workspace aggregate tables with row-level security", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/create table public\.workspaces \(/)
    expect(migration).toMatch(/create table public\.workspace_memberships \(/)
    expect(migration).toMatch(/create table public\.workspace_invitations \(/)
    expect(migration).toMatch(
      /alter table public\.workspaces enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.workspace_memberships enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.workspace_invitations enable row level security;/
    )
  })

  it("stores normalized handles and emails", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/constraint workspaces_handle_normalized check/)
    expect(migration).toMatch(/handle = lower\(btrim\(handle\)\)/)
    expect(migration).toMatch(
      /constraint workspace_invitations_email_normalized check/
    )
    expect(migration).toMatch(/email = lower\(btrim\(email\)\)/)
  })

  it("enforces one active invitation per workspace email", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /create unique index workspace_invitations_one_active_per_email/
    )
    expect(migration).toMatch(
      /where accepted_at is null and revoked_at is null/
    )
  })

  it("uses security-definer helpers for membership-aware RLS policies", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/function public\.workspace_actor_role/)
    expect(migration).toMatch(/security definer/)
    expect(migration).toMatch(
      /grant execute on function public\.workspace_actor_role\(uuid\) to authenticated;/
    )
    expect(migration).toMatch(
      /public\.workspace_actor_role\(id\) in \('owner', 'admin'\)/
    )
    expect(migration).toMatch(
      /public\.workspace_actor_role\(workspace_id\) is not null/
    )
  })

  it("allows invitees to accept active invitations as their own membership", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /create policy "Invitees can accept active workspace invitations"/
    )
    expect(migration).toMatch(/user_id = \(select auth\.uid\(\)\)/)
    expect(migration).toMatch(
      /exists \(\s*select 1\s*from public\.workspace_invitations invitation/
    )
    expect(migration).toMatch(
      /invitation\.email = lower\(\(select auth\.jwt\(\) ->> 'email'\)\)/
    )
  })

  it("allows authenticated users to create the owner membership for their own new workspace", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /create policy "Users can create owner membership for own new workspace"/
    )
    expect(migration).toMatch(/created_by = \(select auth\.uid\(\)\)/)
    expect(migration).toMatch(
      /public\.workspace_creator_id\(workspace_id\) = \(select auth\.uid\(\)\)/
    )
    expect(migration).not.toMatch(
      /not public\.workspace_has_members\(workspace_id\)/
    )
  })

  it("allows workspace co-members to read each other's app profiles", () => {
    const migration = migrationSource()

    expect(migration).toMatch(
      /create policy "Workspace co-members can read profiles"/
    )
    expect(migration).toMatch(/on public\.profiles/)
    expect(migration).toMatch(/mine\.user_id = \(select auth\.uid\(\)\)/)
    expect(migration).toMatch(/other_member\.user_id = profiles\.id/)
  })

  it("moves workspace lifecycle mutations behind transactional RPC functions", () => {
    const migration = rpcMigrationSource()

    expect(migration).toMatch(/function public\.create_personal_workspace/)
    expect(migration).toMatch(/function public\.create_workspace_invitation/)
    expect(migration).toMatch(/function public\.accept_workspace_invitation/)
    expect(migration).toMatch(/function public\.archive_workspace/)
    expect(migration).toMatch(/function public\.revoke_workspace_invitation/)
    expect(migration).toMatch(
      /grant execute on function public\.create_personal_workspace/
    )
    expect(migration).toMatch(/insert into public\.auth_invites/)
  })

  it("keeps workspace invite invariants inside the transactional RPC", () => {
    const migration = rpcMigrationSource()

    expect(migration).toMatch(/raise exception 'invalid_email'/)
    expect(migration).toMatch(/raise exception 'owner_invite_forbidden'/)
    expect(migration).toMatch(/raise exception 'duplicate_invite'/)
    expect(migration).toMatch(/raise exception 'seat_limit_reached'/)
    expect(migration).toMatch(/for update/)
  })
})
