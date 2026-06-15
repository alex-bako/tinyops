import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/* TinyOps — Loading & progress components
 * --------------------------------------------------------------------------
 * Branded "thread of memory" loaders: light dots ride the logo's thread and
 * the citron endpoint pulses as each one lands. Styles live in globals.css
 * (the `.to-*` classes). Pure SVG/CSS — safe in server components.
 *
 *   <RouteLoader />     full-page branded loader (route changes / app boot)
 *   <ThreadSpinner />   inline mark spinner for buttons (inherits currentColor)
 *   <DotSpinner />      tiny 3-dot relay spinner       (inherits currentColor)
 * -------------------------------------------------------------------------- */

/* ── 1 · Full-page route loader (branded cobalt + citron) ────────────────── */
function RouteLoader({
  label = "tinyops",
  hint = "Loading your workspace…",
  showProgress = true,
  className,
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  showProgress?: boolean
  className?: string
}) {
  return (
    <div
      className={cn("to-route", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <svg
        className="to-route__mark"
        width="64"
        height="64"
        viewBox="0 0 44 44"
        fill="none"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="40" height="40" rx="11" fill="#2563EB" />
        <line
          x1="11"
          y1="22"
          x2="30"
          y2="22"
          stroke="#82A3FF"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* light dots riding the thread */}
        <circle
          className="to-travel to-travel--1"
          cx="11"
          cy="22"
          r="2.4"
          fill="#DCE6FF"
        />
        <circle
          className="to-travel to-travel--2"
          cx="11"
          cy="22"
          r="2.4"
          fill="#DCE6FF"
        />
        {/* citron endpoint + radiating halo */}
        <circle className="to-halo" cx="32" cy="22" r="5.5" fill="#BEF264" />
        <circle className="to-citron" cx="32" cy="22" r="5.5" fill="#BEF264" />
      </svg>

      {label ? <div className="to-route__label">{label}</div> : null}
      {hint ? <div className="to-route__hint">{hint}</div> : null}
      {showProgress ? <div className="to-progress" aria-hidden="true" /> : null}
    </div>
  )
}

/* Full-screen overlay wrapper — handy for App Router loading.tsx / route
 * transitions. `blur` floats it over the previous page; otherwise it sits on
 * solid Paper. */
function RouteLoaderOverlay({
  blur = false,
  className,
  ...props
}: React.ComponentProps<typeof RouteLoader> & { blur?: boolean }) {
  return (
    <div className={cn("to-overlay", blur && "to-overlay--blur", className)}>
      <RouteLoader {...props} />
    </div>
  )
}

/* ── 2 · Inline mark spinner for buttons (monochrome → currentColor) ───────
 * Decorative by default — pair it with visible text ("Saving…") so the spinner
 * stays out of the a11y tree. For standalone use pass `aria-hidden={false}` and
 * a `role="status"` + `aria-label`. */
function ThreadSpinner({
  className,
  ...rest
}: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("to-thread", className)}
      viewBox="0 0 40 16"
      fill="none"
      aria-hidden="true"
      {...rest}
    >
      <line
        className="to-thread__track"
        x1="7"
        y1="8"
        x2="30"
        y2="8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle className="to-travel to-travel--1" cx="7" cy="8" r="2.1" />
      <circle className="to-travel to-travel--2" cx="7" cy="8" r="2.1" />
      <circle className="to-thread__end" cx="34" cy="8" r="3" />
    </svg>
  )
}

/* ── 3 · Tiny 3-dot relay (monochrome → currentColor) ──────────────────────
 * Decorative by default (see ThreadSpinner). */
function DotSpinner({ className, ...rest }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("to-dots", className)}
      viewBox="0 0 28 8"
      fill="none"
      aria-hidden="true"
      {...rest}
    >
      <circle cx="4" cy="4" r="2.2" />
      <circle cx="14" cy="4" r="2.2" />
      <circle cx="24" cy="4" r="2.2" />
    </svg>
  )
}

export { RouteLoader, RouteLoaderOverlay, ThreadSpinner, DotSpinner }
