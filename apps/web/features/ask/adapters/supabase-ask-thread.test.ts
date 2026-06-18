import { describe, expect, it } from "vitest"

import type { GroundedAnswerData } from "@/features/ask/domain/grounded-answer"
import {
  createSupabaseAskThreadReader,
  createSupabaseAskThreadWriter,
} from "./supabase-ask-thread"

type Call = { table: string; op: string; values?: unknown; eq: [string, unknown][] }

const ANSWER: GroundedAnswerData = {
  question: "What has Anna asked for?",
  lead: "Mostly practical access.",
  body: "Logistics.",
  scope: "Grounded in 1 event for Anna",
  confidencePct: 86,
  sources: [],
  followUps: ["Is anything sensitive?"],
}

function fakeClient(
  responses: {
    select?: { data: unknown; error: { message: string } | null }
    mutate?: { error: { message: string } | null }
  } = {}
) {
  const calls: Call[] = []

  function readBuilder(call: Call) {
    const result = responses.select ?? { data: [], error: null }
    const builder = {
      select(columns: string) {
        call.values = columns
        return builder
      },
      eq(column: string, value: unknown) {
        call.eq.push([column, value])
        return builder
      },
      order(column: string) {
        call.eq.push(["order", column])
        return Promise.resolve(result)
      },
    }
    return builder
  }

  function mutateBuilder(call: Call) {
    const result = responses.mutate ?? { error: null }
    const builder = {
      eq(column: string, value: unknown) {
        call.eq.push([column, value])
        return builder
      },
      then(
        onFulfilled: (value: { error: { message: string } | null }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return builder
  }

  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          const call: Call = { table, op: "select", eq: [] }
          calls.push(call)
          return readBuilder(call).select(columns)
        },
        insert(values: unknown) {
          const call: Call = { table, op: "insert", values, eq: [] }
          calls.push(call)
          return mutateBuilder(call)
        },
        delete() {
          const call: Call = { table, op: "delete", eq: [] }
          calls.push(call)
          return mutateBuilder(call)
        },
      }
    },
  }

  return { client, calls }
}

describe("supabase ask thread reader", () => {
  it("lists turns scoped by workspace + client, oldest first, mapping author + answer", async () => {
    const { client, calls } = fakeClient({
      select: {
        data: [
          {
            id: "turn_1",
            question: "What has Anna asked for?",
            answer: ANSWER,
            created_at: "2026-06-18T10:00:00.000Z",
            created_by: "user_1",
            author: { first_name: "Alex", last_name: "Bako", email: "alex@example.com" },
          },
        ],
        error: null,
      },
    })
    const reader = createSupabaseAskThreadReader({ client })

    const turns = await reader.listTurns({ workspaceId: "ws_1", clientId: "client_1" })

    expect(turns).toEqual([
      {
        id: "turn_1",
        question: "What has Anna asked for?",
        answer: ANSWER,
        askedBy: "Alex Bako",
        createdAt: "2026-06-18T10:00:00.000Z",
      },
    ])
    expect(calls[0]).toMatchObject({ table: "client_ask_turns", op: "select" })
    expect(calls[0]!.eq).toEqual([
      ["workspace_id", "ws_1"],
      ["client_id", "client_1"],
      ["order", "created_at"],
    ])
  })

  it("returns an empty list when there are no turns", async () => {
    const { client } = fakeClient({ select: { data: [], error: null } })
    const reader = createSupabaseAskThreadReader({ client })

    await expect(
      reader.listTurns({ workspaceId: "ws_1", clientId: "client_1" })
    ).resolves.toEqual([])
  })

  it("falls back to a null author when the profile join is absent", async () => {
    const { client } = fakeClient({
      select: {
        data: [
          {
            id: "turn_1",
            question: "Q",
            answer: ANSWER,
            created_at: "2026-06-18T10:00:00.000Z",
            created_by: null,
            author: null,
          },
        ],
        error: null,
      },
    })
    const reader = createSupabaseAskThreadReader({ client })

    const [turn] = await reader.listTurns({ workspaceId: "ws_1", clientId: "client_1" })
    expect(turn?.askedBy).toBeNull()
  })

  it("throws when the read errors", async () => {
    const { client } = fakeClient({ select: { data: null, error: { message: "boom" } } })
    const reader = createSupabaseAskThreadReader({ client })

    await expect(
      reader.listTurns({ workspaceId: "ws_1", clientId: "client_1" })
    ).rejects.toThrow("ask_thread_read_failed")
  })
})

describe("supabase ask thread writer", () => {
  it("appends a turn with the workspace, client, question and answer", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseAskThreadWriter({ client })

    await writer.appendTurn({
      workspaceId: "ws_1",
      clientId: "client_1",
      question: "What has Anna asked for?",
      answer: ANSWER,
    })

    expect(calls[0]).toMatchObject({
      table: "client_ask_turns",
      op: "insert",
      values: {
        workspace_id: "ws_1",
        client_id: "client_1",
        question: "What has Anna asked for?",
        answer: ANSWER,
      },
    })
    // created_by is left to the DB default (auth.uid()).
    expect(calls[0]!.values).not.toHaveProperty("created_by")
  })

  it("clears the thread scoped by workspace + client", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseAskThreadWriter({ client })

    await writer.clearThread({ workspaceId: "ws_1", clientId: "client_1" })

    expect(calls[0]).toMatchObject({ op: "delete", table: "client_ask_turns" })
    expect(calls[0]!.eq).toEqual([
      ["workspace_id", "ws_1"],
      ["client_id", "client_1"],
    ])
  })

  it("throws when an append errors", async () => {
    const { client } = fakeClient({ mutate: { error: { message: "boom" } } })
    const writer = createSupabaseAskThreadWriter({ client })

    await expect(
      writer.appendTurn({
        workspaceId: "ws_1",
        clientId: "client_1",
        question: "Q",
        answer: ANSWER,
      })
    ).rejects.toThrow("ask_thread_write_failed")
  })

  it("throws when a clear errors", async () => {
    const { client } = fakeClient({ mutate: { error: { message: "boom" } } })
    const writer = createSupabaseAskThreadWriter({ client })

    await expect(
      writer.clearThread({ workspaceId: "ws_1", clientId: "client_1" })
    ).rejects.toThrow("ask_thread_write_failed")
  })
})
