"use client"

import * as React from "react"

import { useNavigationProgress } from "./context"

/* Keep the bar on screen long enough to register, even when a navigation
 * resolves almost instantly (cached route) — otherwise it just flickers. */
const MIN_VISIBLE_MS = 360

export function NavigationProgressBar() {
  const { isNavigating } = useNavigationProgress()
  const [visible, setVisible] = React.useState(false)
  const shownAtRef = React.useRef(0)
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (isNavigating) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      if (!visible) {
        shownAtRef.current = Date.now()
        setVisible(true)
      }
      return
    }

    if (visible && !hideTimerRef.current) {
      const elapsed = Date.now() - shownAtRef.current
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null
        setVisible(false)
      }, remaining)
    }
  }, [isNavigating, visible])

  React.useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    },
    []
  )

  return (
    <div className="nav-progress" data-visible={visible} aria-hidden="true">
      <div className="nav-progress__bar" />
    </div>
  )
}
