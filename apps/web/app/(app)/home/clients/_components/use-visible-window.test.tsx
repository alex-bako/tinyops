import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

import { useVisibleWindow } from "./use-visible-window"

let triggerIntersection: (() => void) | null = null

beforeEach(() => {
  triggerIntersection = null
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        triggerIntersection = () => callback([{ isIntersecting: true }])
      }
      observe() {}
      disconnect() {}
    }
  )
})

const rows = Array.from({ length: 250 }, (_, index) => ({ id: index }))

describe("useVisibleWindow", () => {
  it("renders only the first window but reports the full list as having more", () => {
    const { result } = renderHook(() => useVisibleWindow(rows))

    expect(result.current.visibleRows).toHaveLength(100)
    expect(result.current.hasMore).toBe(true)
  })

  it("grows when the sentinel is reached and stops at the end of the list", () => {
    const { result } = renderHook(() => useVisibleWindow(rows))

    act(() => result.current.sentinelRef(document.createElement("div")))

    act(() => triggerIntersection?.())
    expect(result.current.visibleRows).toHaveLength(200)

    act(() => triggerIntersection?.())
    expect(result.current.visibleRows).toHaveLength(250)
    expect(result.current.hasMore).toBe(false)
  })

  it("resets to the first window when the filtered list changes", () => {
    const { result, rerender } = renderHook(
      ({ list }) => useVisibleWindow(list),
      { initialProps: { list: rows } }
    )

    act(() => result.current.sentinelRef(document.createElement("div")))
    act(() => triggerIntersection?.())

    rerender({ list: rows.slice(0, 150) })
    expect(result.current.visibleRows).toHaveLength(100)
  })
})
