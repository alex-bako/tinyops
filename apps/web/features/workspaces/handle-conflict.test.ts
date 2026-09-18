import { describe, expect, it } from "vitest"

import { isWorkspaceHandleConflict } from "@/features/workspaces/handle-conflict"

/**
 * The shapes below are what Postgres actually produced against the local stack, not
 * shapes invented to pass: `insert into public.workspaces` with a handle already held.
 */
const handleConflict = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "workspaces_handle_key"',
  details: "Key (handle)=(park-therapy) already exists.",
  hint: null,
}

describe("isWorkspaceHandleConflict", () => {
  it("recognizes the unique index on the handle", () => {
    expect(isWorkspaceHandleConflict(handleConflict)).toBe(true)
  })

  // The whole reason this reads more than the code: complete_onboarding raises this
  // one itself, with the same SQLSTATE, about a completely different field.
  it("does not mistake a duplicate invite for a taken handle", () => {
    expect(
      isWorkspaceHandleConflict({ code: "23505", message: "duplicate_invite" })
    ).toBe(false)
  })

  it("does not mistake another constraint on the same table for the handle", () => {
    expect(
      isWorkspaceHandleConflict({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "workspace_memberships_workspace_id_user_id_key"',
      })
    ).toBe(false)
  })

  // `details` is where Postgres prints the values that collided, so anything a person
  // can type reaches it. Reading it would make an invitation to this address look like
  // a taken handle - and no edit of the handle could ever clear that.
  it("does not read the constraint name out of a value someone typed", () => {
    expect(
      isWorkspaceHandleConflict({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "workspace_invitations_one_active_per_email"',
        details:
          "Key (email)=(workspaces_handle_key@example.com) already exists.",
      })
    ).toBe(false)
  })

  it("ignores failures that are not unique violations", () => {
    expect(
      isWorkspaceHandleConflict({
        code: "42501",
        message: 'workspaces_handle_key permission denied',
      })
    ).toBe(false)
  })

  it("survives a cause that is not an error object at all", () => {
    for (const cause of [null, undefined, "23505", 23505, []]) {
      expect(isWorkspaceHandleConflict(cause)).toBe(false)
    }
  })
})
