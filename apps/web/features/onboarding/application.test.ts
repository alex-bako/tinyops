import { describe, expect, it, vi } from "vitest"

import {
  createOnboardingApplication,
  type OnboardingCommand,
  type OnboardingPersistenceInput,
} from "@/features/onboarding/application"
import type { DataSourceStore } from "@/features/data-sources/types"
import { deriveWorkspaceHandle } from "@/features/workspaces/handle"
import { HANDLE_TABLE } from "@/features/workspaces/handle-cases"

const actor = {
  userId: "user_1",
  email: " Jamie@Example.Co ",
}

function baseCommand(
  patch: Partial<OnboardingCommand> = {}
): OnboardingCommand {
  return {
    firstName: " Jamie ",
    lastName: " Park ",
    senderName: " Jamie at Park Therapy ",
    workspaceName: " Park Therapy ",
    workspaceHandle: "Park Therapy!",
    vertical: "therapy",
    sensitivity: "strict",
    source: { type: "csv" },
    invites: [
      { email: " New.Member@Example.Co ", role: "operator" },
      { email: "  ", role: "viewer" },
    ],
    ...patch,
  }
}

function harness({
  completeFails,
  connectImapFails,
  imapTestFails,
}: {
  completeFails?: boolean | string
  connectImapFails?: boolean
  imapTestFails?: boolean
} = {}) {
  const persisted: OnboardingPersistenceInput[] = []
  const connectedImap: unknown[] = []
  const store = {
    async completeOnboarding(input: OnboardingPersistenceInput) {
      persisted.push(input)
      if (completeFails) {
        throw new Error(
          typeof completeFails === "string" ? completeFails : "persistence_failed"
        )
      }
      return { workspaceId: "workspace_1" }
    },
  }
  const dataSourceStore = {
    async connectImap(input: unknown) {
      connectedImap.push(input)
      if (connectImapFails) throw new Error("source_action_failed")
      return { id: "source_1" }
    },
  } as DataSourceStore
  const imapConnectionTester = {
    test: vi.fn(async () => {
      if (imapTestFails) throw new Error("imap_connection_failed")
      return { folders: [{ path: "INBOX", messages: 12 }] }
    }),
  }
  const mailer = {
    sendInvite: vi.fn<
      (input: { email: string }) => Promise<{ error: Error | null }>
    >(async () => ({ error: null })),
  }

  return {
    app: createOnboardingApplication({
      actor,
      store,
      dataSourceStore,
      imapConnectionTester,
      mailer,
      now: () => new Date("2026-05-10T01:02:03.000Z"),
    }),
    persisted,
    connectedImap,
    imapConnectionTester,
    mailer,
  }
}

describe("onboarding application", () => {
  it("saves profile, workspace, source intent, and normalized invites", async () => {
    const { app, persisted } = harness()

    await expect(app.complete(baseCommand())).resolves.toEqual({
      status: "completed",
      workspaceId: "workspace_1",
    })

    expect(persisted).toEqual([
      {
        actorUserId: "user_1",
        actorEmail: "jamie@example.co",
        profile: {
          firstName: "Jamie",
          lastName: "Park",
          onboardedAt: "2026-05-10T01:02:03.000Z",
        },
        workspace: {
          name: "Park Therapy",
          handle: "park-therapy",
          iconKind: "letter",
          iconLetter: "P",
          iconTone: "cobalt",
          accent: "cobalt",
          vertical: "therapy",
          defaultSenderName: "Jamie at Park Therapy",
          initialSourceIntent: "csv",
          sensitivity: {
            mode: "strict",
            autoSendThreshold: "low-only",
            manualReviewKeywords: ["crisis", "trauma"],
            excludeFromOutbound: true,
          },
        },
        invites: [{ email: "new.member@example.co", role: "operator" }],
      },
    ])
  })

  it("mails every saved invite after the workspace is created", async () => {
    const h = harness()
    h.mailer.sendInvite.mockResolvedValueOnce({ error: new Error("smtp") })

    const result = await h.app.complete(
      baseCommand({
        invites: [
          { email: " First@Example.com ", role: "operator" },
          { email: "second@example.com", role: "viewer" },
        ],
      })
    )

    expect(result).toEqual({ status: "completed", workspaceId: "workspace_1" })
    expect(h.mailer.sendInvite.mock.calls.map(([input]) => input.email)).toEqual(
      ["first@example.com", "second@example.com"]
    )
  })

  it("rejects invalid required onboarding fields before persistence", async () => {
    const { app, persisted } = harness()

    await expect(
      app.complete(
        baseCommand({
          firstName: " ",
          workspaceName: "",
          vertical: "therapy",
        })
      )
    ).resolves.toEqual({
      status: "validation_error",
      error: "first_name_required",
    })

    expect(persisted).toHaveLength(0)
  })

  it("blocks completion and offers skip-source fallback when IMAP pre-test fails", async () => {
    const { app, persisted, connectedImap } = harness({ imapTestFails: true })

    await expect(
      app.complete(
        baseCommand({
          source: {
            type: "imap",
            host: "imap.example.com",
            port: "993",
            encryption: "ssl",
            username: "jamie@example.co",
            password: "wrong",
            historyWindow: "90d",
            watchedFolders: ["INBOX"],
            skipSenders: [],
          },
        })
      )
    ).resolves.toEqual({
      status: "source_error",
      error: "imap_connection_failed",
      fallback: "skip_source",
    })

    expect(persisted).toHaveLength(0)
    expect(connectedImap).toHaveLength(0)
  })

  it("completes with a source warning when post-save IMAP connect fails", async () => {
    const { app, persisted, connectedImap } = harness({
      connectImapFails: true,
    })

    await expect(
      app.complete(
        baseCommand({
          source: {
            type: "imap",
            host: "imap.example.com",
            port: "993",
            encryption: "ssl",
            username: "jamie@example.co",
            password: "top-secret",
            historyWindow: "90d",
            watchedFolders: ["INBOX"],
            skipSenders: [],
          },
        })
      )
    ).resolves.toEqual({
      status: "completed",
      workspaceId: "workspace_1",
      warning: "source_connection_failed",
    })

    expect(persisted).toHaveLength(1)
    expect(connectedImap).toMatchObject([
      {
        workspaceId: "workspace_1",
        password: "top-secret",
        connection: {
          host: "imap.example.com",
          port: 993,
          encryption: "ssl",
          username: "jamie@example.co",
        },
        intake: {
          historyWindow: "90d",
          watchedFolders: ["INBOX"],
          skipSenders: [],
          messageFilters: { mode: "and", rules: [] },
        },
        folderSnapshot: {
          availableFolders: [{ path: "INBOX", messages: 12 }],
        },
      },
    ])
  })

  // M3.T4: a store failure the person can act on keeps its name; everything else is
  // still one unattributable failure (OBI-8).

  it("reports a handle taken between the availability answer and the write", async () => {
    const { app, persisted } = harness({
      completeFails: "workspace_handle_taken",
    })

    await expect(app.complete(baseCommand())).resolves.toEqual({
      status: "validation_error",
      error: "workspace_handle_taken",
    })
    // It was attempted: this is a collision at the write, not a rejection before it.
    expect(persisted).toHaveLength(1)
  })

  it("leaves any other store failure unattributable", async () => {
    const { app } = harness({ completeFails: true })

    await expect(app.complete(baseCommand())).resolves.toEqual({
      status: "validation_error",
      error: "onboarding_failed",
    })
  })

  // M3.T2: the handle the person is shown and the handle the server stores are the same
  // string, for the same input, or the run stops at validation - never a silent third
  // value. Runs the one shared table so this cannot drift from handle.test.ts.
  describe("agrees with the UI derivation over the shared input table", () => {
    it.each(HANDLE_TABLE)("$input", async ({ input, handle }) => {
      const h = harness()
      const result = await h.app.complete(
        baseCommand({ workspaceName: input, workspaceHandle: undefined })
      )

      if (!handle) {
        expect(result).toEqual({
          status: "validation_error",
          error: input.trim()
            ? "workspace_handle_required"
            : "workspace_name_required",
        })
        expect(h.persisted).toEqual([])
        return
      }

      expect(result).toMatchObject({ status: "completed" })
      expect(h.persisted[0]?.workspace.handle).toBe(handle)
      expect(h.persisted[0]?.workspace.handle).toBe(deriveWorkspaceHandle(input))
    })
  })
})
