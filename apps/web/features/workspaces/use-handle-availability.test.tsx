import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { checkWorkspaceHandleAvailability } from "@/features/workspaces/actions"
import {
  HANDLE_CHECK_DEBOUNCE_MS,
  useWorkspaceHandleAvailability,
} from "@/features/workspaces/use-handle-availability"

vi.mock("@/features/workspaces/actions", () => ({
  checkWorkspaceHandleAvailability: vi.fn(),
}))

const check = vi.mocked(checkWorkspaceHandleAvailability)

/** A promise this test decides when - and in which order - to settle. */
function deferred<T>() {
  let settle!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

/** Past the debounce, and past the microtasks any already-settled answer is waiting on. */
async function afterDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(HANDLE_CHECK_DEBOUNCE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  check.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useWorkspaceHandleAvailability", () => {
  // The milestone names this the most likely defect in the slice, so it is the first test
  // written: a reply for a handle nobody is looking at any more must not be displayed.
  it("never shows a late answer for a handle the field has moved on from", async () => {
    const slow = deferred<Awaited<ReturnType<typeof check>>>()
    const fast = deferred<Awaited<ReturnType<typeof check>>>()
    check.mockImplementation((handle) =>
      handle === "park" ? slow.promise : fast.promise
    )

    const { result, rerender } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "park" } }
    )

    await afterDebounce()
    expect(check).toHaveBeenCalledWith("park")

    rerender({ handle: "park-t" })
    await afterDebounce()
    expect(check).toHaveBeenCalledWith("park-t")

    // The answer for what is in the field now lands first...
    await act(async () => {
      fast.settle({ status: "taken", suggestion: "park-t-2" })
    })
    expect(result.current).toEqual({ status: "taken", suggestion: "park-t-2" })

    // ...and the answer for the handle two keystrokes ago lands after it. It is for a
    // different question and must be dropped, not rendered over the current one.
    await act(async () => {
      slow.settle({ status: "free" })
    })
    expect(result.current).toEqual({ status: "taken", suggestion: "park-t-2" })
  })

  // The same string can be asked about more than once, so the guard cannot be the string.
  // Retyping a handle after trying another one is ordinary behaviour, not an edge case.
  it("drops a late answer even when the field has come back to the same handle", async () => {
    const first = deferred<Awaited<ReturnType<typeof check>>>()
    const third = deferred<Awaited<ReturnType<typeof check>>>()
    const answers = [
      first.promise,
      Promise.resolve({ status: "free" } as const),
      third.promise,
    ]
    check.mockImplementation(() => answers.shift()!)

    const { result, rerender } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "park-therapy" } }
    )

    await afterDebounce()
    rerender({ handle: "bako-studio" })
    await afterDebounce()
    rerender({ handle: "park-therapy" })
    await afterDebounce()

    expect(check.mock.calls.flat()).toEqual([
      "park-therapy",
      "bako-studio",
      "park-therapy",
    ])

    await act(async () => {
      third.settle({ status: "taken", suggestion: "park-therapy-2" })
    })
    expect(result.current).toEqual({
      status: "taken",
      suggestion: "park-therapy-2",
    })

    // The very first question happens to be about the handle now in the field. It is
    // still a different question, asked before the person had finished changing their
    // mind, and its answer must not replace the one that is current.
    await act(async () => {
      first.settle({ status: "free" })
    })
    expect(result.current).toEqual({
      status: "taken",
      suggestion: "park-therapy-2",
    })
  })

  it("drops an answer for a field that has since been cleared", async () => {
    const pending = deferred<Awaited<ReturnType<typeof check>>>()
    check.mockReturnValue(pending.promise)

    const { result, rerender } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "park-therapy" } }
    )

    await afterDebounce()
    rerender({ handle: "" })

    await act(async () => {
      pending.settle({ status: "taken", suggestion: "park-therapy-2" })
    })

    expect(result.current).toEqual({ status: "idle" })
  })

  it("asks once for a handle typed one character at a time", async () => {
    check.mockResolvedValue({ status: "free" })

    const { rerender } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "par" } }
    )

    for (const handle of ["park", "park-", "park-t", "park-th"]) {
      rerender({ handle })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(HANDLE_CHECK_DEBOUNCE_MS / 4)
      })
    }
    await afterDebounce()

    // `park-` is not asked about at all - it fails the format rule - so the only call is
    // the one for the value the field settled on.
    expect(check.mock.calls).toEqual([["park-th"]])
  })

  it("does not ask about a handle the format rule already rejects", async () => {
    check.mockResolvedValue({ status: "free" })

    const { result, rerender } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "pa" } }
    )
    await afterDebounce()
    expect(result.current).toEqual({ status: "idle" })

    rerender({ handle: "park-" })
    await afterDebounce()
    expect(result.current).toEqual({ status: "idle" })

    rerender({ handle: "" })
    await afterDebounce()
    expect(result.current).toEqual({ status: "idle" })

    expect(check).not.toHaveBeenCalled()
  })

  it("reports a free handle, and says so only once the answer is in", async () => {
    const answer = deferred<Awaited<ReturnType<typeof check>>>()
    check.mockReturnValue(answer.promise)

    const { result, rerender } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "park-therapy" } }
    )

    // Nothing is claimed before the debounce has even elapsed.
    expect(result.current).toEqual({ status: "idle" })

    await afterDebounce()
    expect(result.current).toEqual({ status: "checking" })

    await act(async () => {
      answer.settle({ status: "free" })
    })
    expect(result.current).toEqual({ status: "free" })

    // A fresh handle drops the previous verdict immediately rather than showing it for
    // the new value until an answer arrives.
    rerender({ handle: "bako-studio" })
    expect(result.current).toEqual({ status: "idle" })
  })

  it("reports a failed check as unknown rather than blocking the flow (OBI-9)", async () => {
    check.mockRejectedValue(new Error("network down"))

    const { result } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "park-therapy" } }
    )

    await afterDebounce()
    expect(result.current).toEqual({ status: "unknown" })
  })

  it("passes an action-reported failure through as unknown too", async () => {
    check.mockResolvedValue({ status: "unknown" })

    const { result } = renderHook(
      ({ handle }) => useWorkspaceHandleAvailability(handle),
      { initialProps: { handle: "park-therapy" } }
    )

    await afterDebounce()
    expect(result.current).toEqual({ status: "unknown" })
  })
})
