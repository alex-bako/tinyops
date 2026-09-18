/**
 * The unique index on `workspaces.handle`, as it comes back through PostgREST.
 *
 * Pinned by the collision case in `supabase/tests/onboarding_rpc_contract.sql`: nothing
 * on this side of the wire can notice the constraint being renamed, so the database is
 * where that has to be held down.
 */
const HANDLE_CONSTRAINT = "workspaces_handle_key"

/**
 * Whether a failed write is a handle someone else already holds.
 *
 * The SQLSTATE alone cannot say so. `complete_onboarding` raises `duplicate_invite`
 * with the same `23505`, and six other RPCs in this schema do the same - reading the
 * code and nothing else would tell a person their handle was taken when it was their
 * colleague's email that was the duplicate. The constraint name is the part that
 * actually says which column collided.
 *
 * Read out of `message` and nowhere else. `details` is the one field Postgres fills with
 * the offending *values* - an invitation to an address containing this constraint's name
 * would otherwise be reported as a taken handle, and no edit of the handle could clear
 * it. `message` interpolates the constraint name and nothing else.
 *
 * The name alone, not the sentence around it: that sentence is English because
 * `lc_messages` happens to be, and matching it would quietly turn a taken handle back
 * into "Onboarding could not be completed" on a server set to anything else. The name is
 * also the only part the psql contract can pin.
 */
export function isWorkspaceHandleConflict(cause: unknown): boolean {
  if (!cause || typeof cause !== "object") return false
  const { code, message } = cause as { code?: unknown; message?: unknown }
  return code === "23505" && String(message ?? "").includes(HANDLE_CONSTRAINT)
}
