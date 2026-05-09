import { describe, expect, it } from "vitest"

import { createMockWorkspaceRepository } from "@/features/workspaces/mock-repository"

describe("mock workspace repository", () => {
  it("lists workspaces and joinable workspaces from the mock adapter", async () => {
    const repository = createMockWorkspaceRepository()

    await expect(repository.listWorkspaces()).resolves.toHaveLength(3)
    await expect(repository.listJoinableWorkspaces()).resolves.toHaveLength(1)
  })

  it("finds workspaces and returns null for missing ids", async () => {
    const repository = createMockWorkspaceRepository()

    await expect(repository.findWorkspaceById("course-lab")).resolves.toMatchObject(
      { name: "Replay Lab" }
    )
    await expect(repository.findWorkspaceById("missing")).resolves.toBeNull()
  })

  it("updates a workspace without exposing adapter storage", async () => {
    const repository = createMockWorkspaceRepository()
    const workspace = await repository.findWorkspaceById("jamie-practice")

    expect(workspace).not.toBeNull()
    await repository.updateWorkspace({ ...workspace!, name: "Updated" })

    expect(workspace!.name).toBe("Jamie's practice")
    await expect(repository.findWorkspaceById("jamie-practice")).resolves.toMatchObject(
      { name: "Updated" }
    )
  })
})
