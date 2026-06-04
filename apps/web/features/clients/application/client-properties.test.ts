import { describe, expect, it, vi } from "vitest"

import {
  createClientPropertiesCommandApplication,
  type ClientPropertyWriterPort,
} from "@/features/clients/application/client-properties"
import type { WorkspaceRole } from "@/features/workspaces/types"

function createWriter(
  overrides: Partial<ClientPropertyWriterPort> = {}
): ClientPropertyWriterPort {
  return {
    create: vi.fn(async () => ({ id: "prop_1" })),
    update: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    reorder: vi.fn(async () => {}),
    ...overrides,
  }
}

function appWith(role: WorkspaceRole, writer = createWriter()) {
  return {
    writer,
    app: createClientPropertiesCommandApplication({
      workspace: { id: "workspace_1", role },
      writer,
    }),
  }
}

describe("client properties command application", () => {
  it("creates a property, trimming the name and normalizing the value", async () => {
    const { app, writer } = appWith("owner")

    const result = await app.createProperty({
      clientId: "client_1",
      name: "  Goal  ",
      icon: "target",
      type: "text",
      value: { kind: "text", text: "  Improve comms  " },
    })

    expect(result).toEqual({ data: { id: "prop_1" } })
    expect(writer.create).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      clientId: "client_1",
      name: "Goal",
      icon: "target",
      type: "text",
      value: { kind: "text", text: "Improve comms" },
    })
  })

  it("dedupes, trims, and drops empty tags", async () => {
    const { app, writer } = appWith("admin")

    await app.createProperty({
      clientId: "client_1",
      name: "Sources",
      icon: "plug",
      type: "tags",
      value: { kind: "tags", values: [" IMAP ", "IMAP", "", "Forms"] },
    })

    expect(writer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        value: { kind: "tags", values: ["IMAP", "Forms"] },
      })
    )
  })

  it("rejects callers who cannot manage properties before touching the writer", async () => {
    for (const role of ["operator", "reviewer", "viewer"] as const) {
      const { app, writer } = appWith(role)

      expect(
        await app.createProperty({
          clientId: "c",
          name: "X",
          icon: "tag",
          type: "text",
          value: { kind: "text", text: "y" },
        })
      ).toEqual({ error: "property_manage_forbidden" })
      expect(
        await app.updateProperty({
          id: "p",
          name: "X",
          icon: "tag",
          type: "text",
          value: { kind: "text", text: "y" },
        })
      ).toEqual({ error: "property_manage_forbidden" })
      expect(await app.deleteProperty({ id: "p" })).toEqual({
        error: "property_manage_forbidden",
      })
      expect(
        await app.reorderProperties({ clientId: "c", orderedIds: ["p"] })
      ).toEqual({ error: "property_manage_forbidden" })

      expect(writer.create).not.toHaveBeenCalled()
      expect(writer.update).not.toHaveBeenCalled()
      expect(writer.delete).not.toHaveBeenCalled()
      expect(writer.reorder).not.toHaveBeenCalled()
    }
  })

  it("rejects a blank property name", async () => {
    const { app, writer } = appWith("owner")

    expect(
      await app.createProperty({
        clientId: "c",
        name: "   ",
        icon: "tag",
        type: "text",
        value: { kind: "text", text: "y" },
      })
    ).toEqual({ error: "invalid_property" })
    expect(writer.create).not.toHaveBeenCalled()
  })

  it("forwards reorder ids to the writer", async () => {
    const { app, writer } = appWith("owner")

    await app.reorderProperties({
      clientId: "client_1",
      orderedIds: ["prop_2", "prop_1"],
    })

    expect(writer.reorder).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      clientId: "client_1",
      orderedIds: ["prop_2", "prop_1"],
    })
  })

  it("maps unknown writer failures to property_action_failed", async () => {
    const { app } = appWith("owner", {
      ...createWriter(),
      delete: vi.fn(async () => {
        throw new Error("connection reset")
      }),
    })

    expect(await app.deleteProperty({ id: "p" })).toEqual({
      error: "property_action_failed",
    })
  })
})
