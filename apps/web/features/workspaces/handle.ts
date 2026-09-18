/**
 * The one rule for workspace handles, shared by the onboarding flow, the create-workspace
 * form and both server paths, so what a person sees is what gets stored.
 *
 * The authority is the database check constraint
 * (`supabase/migrations/20260509001000_workspaces.sql`):
 *
 *     handle = lower(btrim(handle)) and handle ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'
 *
 * so: 3-64 characters, first and last alphanumeric. Derivation caps at 63 to stay clear of
 * the upper bound; a handle the database already holds keeps its own length (A6).
 */

export const HANDLE_MIN_LENGTH = 3
export const HANDLE_MAX_LENGTH = 63

/**
 * For the handle *field*. A trailing dash survives because the person may be typing past
 * it - eating it mid-word makes `park-clinic` impossible to type. A leading dash does not,
 * because no amount of further typing makes it valid.
 */
export function sanitizeWorkspaceHandleInput(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, HANDLE_MAX_LENGTH)
}

/**
 * For a handle *derived* from a workspace name. Nothing is being typed at the end here, so
 * a trailing dash is noise: typing the space in `Park Therapy` must show `park`, not flash
 * a trailing-dash error.
 */
export function deriveWorkspaceHandle(value: string) {
  return sanitizeWorkspaceHandleInput(value).replace(/-+$/, "")
}

/** The database's own rule, verbatim: a value it accepts exactly as it stands. */
const STORED_HANDLE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

export function isStoredWorkspaceHandle(value: string) {
  return STORED_HANDLE.test(value)
}

/**
 * Derivation for a value bound for storage. The 63-character cap exists to keep *new*
 * handles clear of the upper bound; applying it to a handle the database already holds
 * would shorten a live row on an unrelated save (A6), so such a value keeps its length.
 * It still gets the rest of the rule - the constraint permits `ab--cd`, which every other
 * entry point collapses to `ab-cd`, and a stored handle is lowercase with no outer dash
 * already, so collapsing runs is all that is left to do.
 */
function deriveForStore(value: string) {
  return isStoredWorkspaceHandle(value)
    ? value.replace(/[^a-z0-9]+/g, "-")
    : deriveWorkspaceHandle(value)
}

/**
 * The one derivation for a value bound for storage, for every server path. A result the
 * database would reject comes back as `""` rather than as a substitute: a handle nobody
 * typed is a worse answer than being told the handle cannot be used, and every caller can
 * branch on falsiness alone. Length is the only rejection it can report, because
 * `deriveForStore` has already removed everything else the constraint would refuse.
 */
export function normalizeWorkspaceHandle(value: string) {
  const handle = deriveForStore(value)
  return handle.length < HANDLE_MIN_LENGTH ? "" : handle
}

/** `at_max_length` is advisory; the rest block Continue. */
export type WorkspaceHandleIssue =
  | "required"
  | "too_short"
  | "trailing_dash"
  | "at_max_length"

export const WORKSPACE_HANDLE_MESSAGES: Record<WorkspaceHandleIssue, string> = {
  required: "A handle is required.",
  too_short: `A handle needs at least ${HANDLE_MIN_LENGTH} characters.`,
  trailing_dash: "A handle cannot end with a dash.",
  at_max_length: `A handle is capped at ${HANDLE_MAX_LENGTH} characters.`,
}

/** Takes an already-sanitized field value: what the person is looking at. */
export function workspaceHandleIssue(
  handle: string
): WorkspaceHandleIssue | null {
  if (!handle) return "required"
  if (handle.endsWith("-")) return "trailing_dash"
  if (handle.length < HANDLE_MIN_LENGTH) return "too_short"
  if (handle.length >= HANDLE_MAX_LENGTH) return "at_max_length"
  return null
}

export function isValidWorkspaceHandle(handle: string) {
  const issue = workspaceHandleIssue(handle)
  return issue === null || issue === "at_max_length"
}
