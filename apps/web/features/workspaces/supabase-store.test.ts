import { describe, expect, it } from "vitest"

import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"

function chain(
  table: string,
  calls: unknown[],
  result:
    | { data: unknown; error: null }
    | { data: null; error: { message: string } }
) {
  const api = {
    select(columns: string) {
      calls.push({ table, method: "select", columns })
      return api
    },
    update(value: unknown) {
      calls.push({ table, method: "update", value })
      return api
    },
    delete() {
      calls.push({ table, method: "delete" })
      return api
    },
    eq(column: string, value: unknown) {
      calls.push({ table, method: "eq", column, value })
      return api
    },
    is(column: string, value: unknown) {
      calls.push({ table, method: "is", column, value })
      return api
    },
    order(column: string, options?: unknown) {
      calls.push({ table, method: "order", column, options })
      return Promise.resolve(result)
    },
    single() {
      calls.push({ table, method: "single" })
      return Promise.resolve(result)
    },
  }
  return api
}

describe("supabase workspace store", () => {
  it("loads visible workspaces through Supabase and maps them", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return chain(table, calls, {
          data: [
            {
              id: "workspace_1",
              name: "Jamie Practice",
              handle: "jamie-practice",
              description: "Private practice",
              icon_kind: "mark",
              icon_letter: null,
              icon_tone: "cobalt",
              accent: "cobalt",
              plan_tier: "Team",
              plan_price: "$0 / alpha",
              plan_seats: 5,
              sensitivity_mode: "strict",
              auto_send_threshold: "low-only",
              manual_review_keywords: ["crisis"],
              exclude_from_outbound: true,
              workspace_memberships: [
                {
                  id: "member_1",
                  user_id: "user_1",
                  role: "owner",
                  joined_at: "2026-05-09T00:00:00.000Z",
                  last_active_at: null,
                  profiles: { email: "jamie@example.co" },
                },
              ],
              workspace_invitations: [],
            },
          ],
          error: null,
        })
      },
      rpc() {
        throw new Error("unexpected rpc call")
      },
    }

    const store = createSupabaseWorkspaceStore({
      client: client as never,
      actorUserId: "user_1",
    })

    await expect(store.listWorkspaces()).resolves.toMatchObject([
      { id: "workspace_1", role: "owner" },
    ])
    expect(calls).toContainEqual({
      table: "workspaces",
      method: "is",
      column: "archived_at",
      value: null,
    })
  })

  it("uses RPC for workspace lifecycle mutations", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        throw new Error(`unexpected table call: ${table}`)
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        if (fn === "create_personal_workspace") {
          return Promise.resolve({ data: "workspace_created", error: null })
        }
        if (fn === "create_workspace_invitation") {
          return Promise.resolve({
            data: {
              id: "invite_1",
              workspace_id: "workspace_1",
              email: "new@example.co",
              role: "operator",
            },
            error: null,
          })
        }
        if (fn === "accept_workspace_invitation") {
          return Promise.resolve({ data: "workspace_1", error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
    }

    const store = createSupabaseWorkspaceStore({
      client: client as never,
      actorUserId: "user_1",
    })

    await expect(
      store.createWorkspace({
        email: "jamie@example.co",
        name: "Jamie Practice",
        handle: "jamie-practice",
      })
    ).resolves.toMatchObject({ id: "workspace_created" })
    await expect(
      store.createWorkspaceInvite({
        workspaceId: "workspace_1",
        email: "new@example.co",
        role: "operator",
      })
    ).resolves.toMatchObject({ id: "invite_1" })
    await expect(
      store.acceptWorkspaceInvitation({
        invitationId: "invite_1",
        email: "jamie@example.co",
      })
    ).resolves.toEqual({ workspaceId: "workspace_1" })
    await expect(store.archiveWorkspace("workspace_1")).resolves.toBe(undefined)
    await expect(store.revokeWorkspaceInvite("invite_1")).resolves.toBe(
      undefined
    )

    expect(calls).toEqual([
      {
        method: "rpc",
        fn: "create_personal_workspace",
        args: {
          actor_email: "jamie@example.co",
          workspace_handle: "jamie-practice",
          workspace_name: "Jamie Practice",
        },
      },
      {
        method: "rpc",
        fn: "create_workspace_invitation",
        args: {
          target_email: "new@example.co",
          target_role: "operator",
          target_workspace_id: "workspace_1",
        },
      },
      {
        method: "rpc",
        fn: "accept_workspace_invitation",
        args: { target_invitation_id: "invite_1" },
      },
      {
        method: "rpc",
        fn: "archive_workspace",
        args: { target_workspace_id: "workspace_1" },
      },
      {
        method: "rpc",
        fn: "revoke_workspace_invitation",
        args: { target_invitation_id: "invite_1" },
      },
    ])
  })

  it("preserves workspace invite domain errors from RPC", async () => {
    const client = {
      from(table: string) {
        throw new Error(`unexpected table call: ${table}`)
      },
      rpc() {
        return Promise.resolve({
          data: null,
          error: { message: "duplicate_invite", code: "23505" },
        })
      },
    }
    const store = createSupabaseWorkspaceStore({
      client: client as never,
      actorUserId: "user_1",
    })

    await expect(
      store.createWorkspaceInvite({
        workspaceId: "workspace_1",
        email: "new@example.co",
        role: "operator",
      })
    ).rejects.toThrow("duplicate_invite")
  })
})
