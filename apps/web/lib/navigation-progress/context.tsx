"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

type NavigateOptions = { replace?: boolean; scroll?: boolean }

type NavigationProgressApi = {
  /** Programmatic navigation that drives both the crossfade and the top bar. */
  navigate: (href: string, opts?: NavigateOptions) => void
  /** Imperative bar control (ref-counted) for Link reporters / popstate. */
  start: () => void
  done: () => void
  isNavigating: boolean
}

const NavigationProgressContext =
  React.createContext<NavigationProgressApi | null>(null)

/** Defensive ceiling: if a nav is aborted and never commits, drop the bar. */
const SAFETY_TIMEOUT_MS = 10_000

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = React.useTransition()
  const [refCount, setRefCount] = React.useState(0)

  const start = React.useCallback(() => setRefCount((c) => c + 1), [])
  const done = React.useCallback(
    () => setRefCount((c) => Math.max(0, c - 1)),
    []
  )

  const navigate = React.useCallback(
    (href: string, opts?: NavigateOptions) => {
      startTransition(() => {
        if (opts?.replace) {
          router.replace(href, { scroll: opts.scroll })
        } else {
          router.push(href, { scroll: opts?.scroll })
        }
      })
    },
    [router]
  )

  const isNavigating = isPending || refCount > 0

  // Settle: once the committed route changes, force-clear any outstanding
  // ref-counts so the bar can never get stuck. (isPending clears on its own.)
  React.useEffect(() => {
    setRefCount(0)
  }, [pathname])

  // Safety net for navigations that start the bar but never commit.
  React.useEffect(() => {
    if (refCount === 0) return
    const id = setTimeout(() => setRefCount(0), SAFETY_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [refCount])

  // Back/forward doesn't flow through navigate()/Link reporters, so surface the
  // bar on popstate; the pathname-settle effect clears it on commit.
  React.useEffect(() => {
    const onPopState = () => start()
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [start])

  const api = React.useMemo<NavigationProgressApi>(
    () => ({ navigate, start, done, isNavigating }),
    [navigate, start, done, isNavigating]
  )

  return (
    <NavigationProgressContext.Provider value={api}>
      {children}
    </NavigationProgressContext.Provider>
  )
}

export function useNavigationProgress(): NavigationProgressApi {
  const ctx = React.useContext(NavigationProgressContext)
  if (!ctx) {
    throw new Error(
      "useNavigationProgress must be used within a NavigationProgressProvider"
    )
  }
  return ctx
}
