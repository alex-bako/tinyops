"use client"

import * as React from "react"

import { checkWorkspaceHandleAvailability } from "@/features/workspaces/actions"
import { isValidWorkspaceHandle } from "@/features/workspaces/handle"

/**
 * Long enough that typing a handle is one question rather than one per keystroke, short
 * enough that the answer is there before a finger leaves the keyboard. A constant, not a
 * design decision - confirm it against the local stack and change the number.
 */
export const HANDLE_CHECK_DEBOUNCE_MS = 300

export type WorkspaceHandleAvailability =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "free" }
  | { status: "taken"; suggestion: string | null }
  /** The check itself failed. Never block the flow on it (OBI-9). */
  | { status: "unknown" }

const IDLE: WorkspaceHandleAvailability = { status: "idle" }

/**
 * What is known about the handle *currently in the field*. Every answer is keyed to the
 * question it answers, so a slow reply can never land on top of a newer one (OBI-5) -
 * which is the whole reason this is a hook and not a call in an event handler.
 */
export function useWorkspaceHandleAvailability(
  handle: string
): WorkspaceHandleAvailability {
  const [state, setState] = React.useState<WorkspaceHandleAvailability>(IDLE)
  /**
   * Which question the displayed answer is allowed to come from. A counter rather than the
   * handle itself: typing `park`, then `bako`, then `park` again asks three questions and
   * two of them are about the same string, so the string cannot tell the slow first answer
   * apart from the current third one.
   */
  const asked = React.useRef(0)

  React.useEffect(() => {
    // A new value knows nothing yet - it must not keep displaying the last one's verdict,
    // and nothing still in flight may answer for it.
    const question = ++asked.current
    setState(IDLE)

    // A handle the format rule already rejects has its own message from T2, and the
    // database could only ever answer "free" for something it would refuse to store.
    if (!isValidWorkspaceHandle(handle)) return

    const timer = setTimeout(() => {
      setState({ status: "checking" })
      checkWorkspaceHandleAvailability(handle).then(
        (answer) => {
          if (asked.current === question) setState(answer)
        },
        () => {
          if (asked.current === question) setState({ status: "unknown" })
        }
      )
    }, HANDLE_CHECK_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [handle])

  return state
}
