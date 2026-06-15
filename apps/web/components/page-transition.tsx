"use client"

import * as React from "react"

/* React's <ViewTransition> ships in Next's vendored React behind the
 * `experimental.viewTransition` flag. It is absent from the published React
 * types and from the workspace React used by unit tests, so resolve it
 * defensively and fall back to a plain passthrough when it isn't available. */
const ViewTransition = (
  React as unknown as {
    ViewTransition?: React.ComponentType<{
      default?: string
      children?: React.ReactNode
    }>
  }
).ViewTransition

/* Wraps the page content so route changes crossfade (and rise slightly).
 * Non-keyed: the boundary persists across navigation and React animates the
 * content swap as an "update", which is the reliable crossfade path (a keyed
 * boundary loses its stable view-transition-name and falls back to the — here
 * disabled — root snapshot, so nothing animates). Styling lives in motion.css
 * under the `.page-transition` view-transition class; the shell
 * (sidebar/topbar) sits outside this boundary and stays put. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  if (!ViewTransition) {
    return <>{children}</>
  }
  return <ViewTransition default="page-transition">{children}</ViewTransition>
}
