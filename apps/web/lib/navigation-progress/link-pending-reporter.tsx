"use client"

import * as React from "react"
import { useLinkStatus } from "next/link"

import { useNavigationProgress } from "./context"

/* Drop one of these inside a <Link> to feed its pending state into the top
 * progress bar. Renders nothing. `useLinkStatus()` stays pending until the
 * navigation commits, so this covers the slow (suspends into loading.tsx) case
 * as well as fast ones. */
export function LinkPendingReporter() {
  const { pending } = useLinkStatus()
  const { start, done } = useNavigationProgress()

  React.useEffect(() => {
    if (!pending) return
    start()
    return () => done()
  }, [pending, start, done])

  return null
}
