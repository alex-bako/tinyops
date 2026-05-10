import { describe, expect, it, vi } from "vitest"

import { createSupabaseImapSecretReader } from "@/features/data-sources/imap-secret-reader"

describe("IMAP secret reader", () => {
  it("reads the active IMAP password through the service-role RPC", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: "stored-secret", error: null }),
    }

    const reader = createSupabaseImapSecretReader({ client: client as never })

    await expect(
      reader.readImapPassword({
        workspaceId: "workspace_1",
        sourceId: "source_1",
      })
    ).resolves.toBe("stored-secret")
    expect(client.rpc).toHaveBeenCalledWith("read_imap_data_source_password", {
      target_workspace_id: "workspace_1",
      target_source_id: "source_1",
    })
  })

  it("returns a typed sync failure for RPC domain errors", async () => {
    const client = {
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "source_not_found" } }),
    }

    const reader = createSupabaseImapSecretReader({ client: client as never })

    await expect(
      reader.readImapPasswordForSync({
        workspaceId: "workspace_1",
        sourceId: "source_1",
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "source_not_found",
        message: "Source not found",
        workspaceId: "workspace_1",
        sourceId: "source_1",
        cause: { message: "source_not_found" },
      },
    })
  })

  it("maps unexpected RPC errors to a safe secret read failure", async () => {
    const rpcError = { message: "PGRST106 Invalid schema: vault" }
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: rpcError }),
    }

    const reader = createSupabaseImapSecretReader({ client: client as never })

    await expect(
      reader.readImapPasswordForSync({
        workspaceId: "workspace_1",
        sourceId: "source_1",
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "secret_read_failed",
        message: "Could not read IMAP password",
        workspaceId: "workspace_1",
        sourceId: "source_1",
        cause: rpcError,
      },
    })
  })

  it("maps rejected RPC calls to a safe secret read failure", async () => {
    const rpcError = new Error("network unavailable")
    const client = {
      rpc: vi.fn().mockRejectedValue(rpcError),
    }

    const reader = createSupabaseImapSecretReader({ client: client as never })

    await expect(
      reader.readImapPasswordForSync({
        workspaceId: "workspace_1",
        sourceId: "source_1",
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "secret_read_failed",
        message: "Could not read IMAP password",
        workspaceId: "workspace_1",
        sourceId: "source_1",
        cause: rpcError,
      },
    })
  })
})
