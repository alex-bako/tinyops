import { describe, expect, it } from "vitest"

import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  deriveWorkspaceHandle,
  isValidWorkspaceHandle,
  WORKSPACE_HANDLE_FALLBACK,
  normalizeWorkspaceHandle,
  sanitizeWorkspaceHandleInput,
  workspaceHandleForStore,
  workspaceHandleIssue,
} from "@/features/workspaces/handle"
import { HANDLE_TABLE } from "@/features/workspaces/handle-cases"

/** Copied from supabase/migrations/20260509001000_workspaces.sql - the real authority. */
const DB_CONSTRAINT = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/


describe("sanitizeWorkspaceHandleInput", () => {
  it("lowercases rather than deleting, so typing `Park` is not `ark`", () => {
    expect(sanitizeWorkspaceHandleInput("Park")).toBe("park")
    expect(sanitizeWorkspaceHandleInput("PARK")).toBe("park")
  })

  it("keeps a trailing dash the person may still be typing past", () => {
    expect(sanitizeWorkspaceHandleInput("park-")).toBe("park-")
    expect(sanitizeWorkspaceHandleInput("park-clinic")).toBe("park-clinic")
  })

  it("drops a leading dash, which no further typing could make valid", () => {
    expect(sanitizeWorkspaceHandleInput("-park")).toBe("park")
    expect(sanitizeWorkspaceHandleInput("--park--")).toBe("park-")
  })

  it("collapses any run of punctuation into one dash", () => {
    expect(sanitizeWorkspaceHandleInput("park   therapy")).toBe("park-therapy")
    expect(sanitizeWorkspaceHandleInput("park!!!therapy")).toBe("park-therapy")
    expect(sanitizeWorkspaceHandleInput("park---therapy")).toBe("park-therapy")
  })

  it("caps at the maximum length", () => {
    expect(sanitizeWorkspaceHandleInput("x".repeat(200))).toHaveLength(
      HANDLE_MAX_LENGTH
    )
  })
})

describe("deriveWorkspaceHandle", () => {
  it("strips the trailing dash a sanitized field would keep", () => {
    // Typing the space in `Park Therapy` must not flash a trailing-dash error.
    expect(deriveWorkspaceHandle("Park ")).toBe("park")
    expect(deriveWorkspaceHandle("--park--")).toBe("park")
  })

  it("keeps a too-short result so the field can explain it", () => {
    expect(deriveWorkspaceHandle("Pa")).toBe("pa")
  })

  it("never ends in a dash even when the cap cuts mid-word", () => {
    const cut = deriveWorkspaceHandle(`${"x".repeat(HANDLE_MAX_LENGTH - 1)} yz`)
    expect(cut.endsWith("-")).toBe(false)
    expect(cut).toBe("x".repeat(HANDLE_MAX_LENGTH - 1))
  })
})

describe("normalizeWorkspaceHandle", () => {
  it.each(HANDLE_TABLE)("$input -> $handle", ({ input, handle }) => {
    expect(normalizeWorkspaceHandle(input)).toBe(handle)
  })

  it("returns nothing below the minimum length, rather than an unstorable handle", () => {
    expect(normalizeWorkspaceHandle("Pa")).toBe("")
    expect(normalizeWorkspaceHandle("a")).toBe("")
    expect(normalizeWorkspaceHandle("abc")).toBe("abc")
  })

  // Property-style: the point is not these particular strings but that no input at all
  // can produce a non-empty handle the database would reject.
  it("only ever produces a handle the database check constraint accepts", () => {
    const fragments = [
      "",
      "a",
      "Z",
      "9",
      "-",
      "--",
      " ",
      "!",
      "ó",
      "日本",
      "_",
      ".",
      "/",
      "x".repeat(40),
      "Park Therapy",
    ]
    const corpus: string[] = []
    for (const a of fragments) {
      for (const b of fragments) {
        corpus.push(a + b, `${a}-${b}`, `${a} ${b}`, a + b + a)
      }
    }

    expect(corpus.length).toBeGreaterThan(800)
    for (const input of corpus) {
      const handle = normalizeWorkspaceHandle(input)
      if (!handle) continue
      expect(handle, `input ${JSON.stringify(input)}`).toMatch(DB_CONSTRAINT)
      expect(handle.length).toBeGreaterThanOrEqual(HANDLE_MIN_LENGTH)
      expect(handle.length).toBeLessThanOrEqual(HANDLE_MAX_LENGTH)
      expect(handle).toBe(handle.trim().toLowerCase())
    }
  })
})

describe("workspaceHandleForStore", () => {
  it("does not apply the 63-character cap to a handle the database already holds", () => {
    // A 64-character handle predates the cap and is still valid. Capping it on an unrelated
    // settings save would silently shorten a live workspace (A6). The cap is the *only*
    // thing skipped - see the dash-collapse case below.
    const legacy = "y".repeat(64)
    expect(workspaceHandleForStore(legacy)).toBe(legacy)
    expect(normalizeWorkspaceHandle(legacy)).toBe(legacy)
    expect(workspaceHandleForStore("park-therapy")).toBe("park-therapy")
  })

  it("collapses repeated dashes even in a handle the constraint would accept", () => {
    // The constraint permits `ab--cd`; the `slugify` this replaced always collapsed it.
    // Keeping it verbatim would store something the field itself could never produce.
    expect(workspaceHandleForStore("ab--cd")).toBe("ab-cd")
    expect(workspaceHandleForStore("a---------b")).toBe("a-b")
    expect(normalizeWorkspaceHandle("ab--cd")).toBe("ab-cd")
    expect(sanitizeWorkspaceHandleInput("ab--cd")).toBe("ab-cd")
  })

  it("keeps a too-short handle rather than renaming the workspace", () => {
    // The database rejects these, loudly, exactly as it did before this module existed.
    // Substituting here would silently rename someone's workspace on a settings save.
    expect(workspaceHandleForStore("ab")).toBe("ab")
    expect(workspaceHandleForStore("Pa")).toBe("pa")
    expect(workspaceHandleForStore("9")).toBe("9")
  })

  it("substitutes only when the input leaves nothing at all", () => {
    expect(workspaceHandleForStore("!!!")).toBe(WORKSPACE_HANDLE_FALLBACK)
    expect(workspaceHandleForStore("")).toBe(WORKSPACE_HANDLE_FALLBACK)
    expect(workspaceHandleForStore("---")).toBe(WORKSPACE_HANDLE_FALLBACK)
  })
})

describe("workspaceHandleIssue", () => {
  it("reports an empty field as required", () => {
    expect(workspaceHandleIssue("")).toBe("required")
  })

  it("reports a trailing dash before length, since it is the fixable one", () => {
    expect(workspaceHandleIssue("park-")).toBe("trailing_dash")
    expect(workspaceHandleIssue("p-")).toBe("trailing_dash")
  })

  it("reports a short handle", () => {
    expect(workspaceHandleIssue("pa")).toBe("too_short")
    expect(workspaceHandleIssue("par")).toBeNull()
  })

  it("notes the cap without blocking", () => {
    const capped = "x".repeat(HANDLE_MAX_LENGTH)
    expect(workspaceHandleIssue(capped)).toBe("at_max_length")
    expect(isValidWorkspaceHandle(capped)).toBe(true)
  })

  it("blocks everything else", () => {
    expect(isValidWorkspaceHandle("")).toBe(false)
    expect(isValidWorkspaceHandle("pa")).toBe(false)
    expect(isValidWorkspaceHandle("park-")).toBe(false)
    expect(isValidWorkspaceHandle("park-therapy")).toBe(true)
  })
})
