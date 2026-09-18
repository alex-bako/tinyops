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

/** What an unusable handle becomes on the paths that have always silently substituted one. */
export const WORKSPACE_HANDLE_FALLBACK = "workspace"

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
 * For storage, where a too-short handle is not storable: `""` rather than one the database
 * would reject, so callers can branch on falsiness alone.
 */
export function normalizeWorkspaceHandle(value: string) {
  const handle = deriveForStore(value)
  return handle.length < HANDLE_MIN_LENGTH ? "" : handle
}

/**
 * For the two server paths that have always silently substituted a handle rather than
 * reporting one. Bug-for-bug with the `slugify` this replaced: a too-short result is
 * kept and reaches the check constraint, which rejects it loudly as it always has, and
 * the substitution happens only when nothing is left at all. So this does *not* return a
 * storable handle by construction - nothing may assume it does.
 *
 * ponytail: kept as-is on purpose. Turning the substitution into a field-level error
 * needs a new WorkspaceActionError value, which belongs with M3.T5.
 */
export function workspaceHandleForStore(value: string) {
  return deriveForStore(value) || WORKSPACE_HANDLE_FALLBACK
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
