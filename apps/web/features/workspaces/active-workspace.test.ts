import { describe, expect, it } from "vitest"

import { resolveActiveWorkspaceId } from "@/features/workspaces/active-workspace"
import type { Workspace } from "@/features/workspaces/types"

function workspace(id: string): Pick<Workspace, "id"> {
  return { id }
}

describe("active workspace", () => {
  it("keeps requested workspace when it is visible", () => {
    expect(
      resolveActiveWorkspaceId(
        [workspace("one") as Workspace, workspace("two") as Workspace],
        "two"
      )
    ).toBe("two")
  })

  it("falls back to first visible workspace for stale requested ids", () => {
    expect(
      resolveActiveWorkspaceId(
        [workspace("one") as Workspace, workspace("two") as Workspace],
        "missing"
      )
    ).toBe("one")
  })

  it("returns null when no workspace is visible", () => {
    expect(resolveActiveWorkspaceId([], "missing")).toBeNull()
  })
})
