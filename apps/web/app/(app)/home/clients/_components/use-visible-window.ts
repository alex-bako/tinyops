"use client"

import * as React from "react"

/** Rows rendered before the first scroll; roughly three screens of table. */
const WINDOW_STEP = 100

/**
 * Grows the rendered slice of a list as a sentinel scrolls into view.
 *
 * Filtering and search still run over every row, so results are never limited
 * to what happens to be rendered — only the DOM is. A windowed virtualiser
 * would need absolute positioning and would break `<table>` semantics for
 * screen readers, and neither is worth a dependency here.
 */
export function useVisibleWindow<T>(rows: T[]) {
  const [limit, setLimit] = React.useState(WINDOW_STEP)
  // A callback ref, not a plain one: the sentinel mounts and unmounts as the
  // window grows, and an effect reading a ref object would miss those swaps.
  const [sentinel, setSentinel] = React.useState<HTMLElement | null>(null)

  // A new filter or query means a new list; start from the top again.
  React.useEffect(() => {
    setLimit(WINDOW_STEP)
  }, [rows])

  React.useEffect(() => {
    if (!sentinel || limit >= rows.length) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setLimit((current) => current + WINDOW_STEP)
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, limit, rows.length])

  return {
    visibleRows: limit >= rows.length ? rows : rows.slice(0, limit),
    hasMore: limit < rows.length,
    sentinelRef: setSentinel,
  }
}
