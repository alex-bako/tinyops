import {
  HANDLE_MAX_LENGTH,
  normalizeWorkspaceHandle,
} from "@/features/workspaces/handle"

export type WorkspaceHandleCheck =
  | { status: "free" }
  | { status: "taken"; suggestion: string | null }
  /** The question could not be answered. Callers must not read this as either answer. */
  | { status: "unknown" }

/** How far the `-2`, `-3`, … search goes before giving up and offering nothing. */
const SUGGESTION_LIMIT = 10

/**
 * The nth alternative to a taken handle. The suffix has to fit *inside* the length rule,
 * so the base is trimmed to make room rather than the result being truncated - `-2` is the
 * part that carries the meaning. Normalizing afterwards cleans up a trim that landed on a
 * dash (`park-` + `-2` is `park-2`, never `park--2`).
 */
export function workspaceHandleAlternative(handle: string, n: number) {
  const suffix = `-${n}`
  return normalizeWorkspaceHandle(
    handle.slice(0, HANDLE_MAX_LENGTH - suffix.length) + suffix
  )
}

/**
 * Whether a handle is free, and if not, a free one to offer instead.
 *
 * `isHandleFree` is the only thing that knows anything: every candidate returned as a
 * suggestion has been through it, so the flow never offers a handle that is itself taken.
 * A throw anywhere becomes `unknown` - the check failing must not read as "taken" and
 * strand someone on a handle that is fine (OBI-9).
 */
export async function resolveWorkspaceHandleAvailability(
  handle: string,
  isHandleFree: (candidate: string) => Promise<boolean>
): Promise<WorkspaceHandleCheck> {
  try {
    // Never trust the caller's value: the same rule that the field applies, applied again
    // here, so what gets asked about is what would actually be stored. Inside the `try`
    // because this runs behind a server action, where the body is whatever was posted -
    // a value that is not even a string is an unanswerable question, not a crash.
    const normalized = normalizeWorkspaceHandle(handle)
    // Not storable at all, so neither free nor taken - and the field already says why.
    if (!normalized) return { status: "unknown" }

    if (await isHandleFree(normalized)) return { status: "free" }

    for (let n = 2; n <= SUGGESTION_LIMIT; n++) {
      const candidate = workspaceHandleAlternative(normalized, n)
      if (await isHandleFree(candidate)) {
        return { status: "taken", suggestion: candidate }
      }
    }

    // Bounded on purpose: one keystroke must not turn into unbounded database work.
    return { status: "taken", suggestion: null }
  } catch {
    return { status: "unknown" }
  }
}
