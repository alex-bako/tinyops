"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ThreadSpinner } from "@workspace/ui/components/loaders"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { createWorkspaceAction } from "@/features/workspaces/actions"
import {
  deriveWorkspaceHandle,
  sanitizeWorkspaceHandleInput,
  WORKSPACE_HANDLE_MESSAGES,
  workspaceHandleIssue,
  type WorkspaceHandleIssue,
} from "@/features/workspaces/handle"
import {
  useWorkspaceHandleAvailability,
  type WorkspaceHandleAvailability,
} from "@/features/workspaces/use-handle-availability"

/**
 * The refusals that are about the handle, and so belong at it. Both arrive after the
 * write was attempted: `taken` is the collision this form cannot predict, and
 * `invalid_workspace_handle` is the server holding the same rule this form holds - it is
 * only reachable if the two ever drift, which is exactly when a person needs to be told
 * which field it was. Everything else is one sentence under the button, because nothing
 * here can say what it was about.
 */
const HANDLE_REJECTIONS: Record<string, string> = {
  workspace_handle_taken: "That handle was taken just now. Try another.",
  // Not WORKSPACE_HANDLE_MESSAGES.too_short: the server returns this for anything it
  // could not derive a handle from, and "!!!" is refused for having no letters at all,
  // not for being short. A message that names the wrong reason is worse than a general
  // one on the only path where nobody can see which of the two it was.
  invalid_workspace_handle:
    "That handle cannot be used. Try lowercase letters, numbers and dashes.",
}

export function CreateWorkspaceForm() {
  const { push, refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [handle, setHandle] = React.useState("")
  const [description, setDescription] = React.useState("")
  /**
   * Whether the handle is the person's own or still following the name. Emptying the
   * field hands it back: an empty handle is not a choice, and a form that then refuses to
   * fill it again has no way left to say so.
   */
  const [handleEdited, setHandleEdited] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  /**
   * The handle the server refused, and why. A rejection is about a value, not about a
   * field (M3.T4): it clears when that value changes and comes back if it is typed back,
   * because it is still true of it.
   */
  const [rejected, setRejected] = React.useState<{
    error: string
    handle: string
  } | null>(null)

  const availability = useWorkspaceHandleAvailability(handle)

  const handleRejected =
    rejected && rejected.handle === handle
      ? HANDLE_REJECTIONS[rejected.error]!
      : null

  // Nothing to say about a field nobody has reached yet.
  const issue = name || handle ? workspaceHandleIssue(handle) : null
  const formatBlocking = issue !== null && issue !== "at_max_length"
  const blocking =
    formatBlocking || availability.status === "taken" || handleRejected !== null

  const onName = (value: string) => {
    setName(value)
    if (!handleEdited) setHandle(deriveWorkspaceHandle(value))
  }

  const onHandle = (value: string) => {
    const next = sanitizeWorkspaceHandleInput(value)
    setHandle(next)
    setHandleEdited(next !== "")
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createWorkspaceAction({ name, handle, description })
      if (result.error) {
        if (HANDLE_REJECTIONS[result.error]) {
          setRejected({ error: result.error, handle })
        } else {
          setError("Could not create workspace.")
        }
        return
      }
      refresh()
      push("/home/settings")
    })
  }

  return (
    <div className="mt-8 max-w-[640px]">
      <Form>
        <FormRow
          label={<label htmlFor="workspace-name">Workspace name</label>}
          help="Visible to all members."
        >
          <Input
            id="workspace-name"
            value={name}
            onChange={(event) => onName(event.target.value)}
            placeholder="Jamie Practice"
          />
        </FormRow>
        <FormRow
          label={<label htmlFor="workspace-handle">URL handle</label>}
          help="Lowercase letters, numbers, and dashes."
        >
          <div className="flex items-stretch">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-[var(--tint-hover)] px-2.5 font-mono text-[12.5px] text-muted-foreground">
              tinyops.app/
            </span>
            <Input
              id="workspace-handle"
              value={handle}
              onChange={(event) => onHandle(event.target.value)}
              aria-invalid={blocking || undefined}
              aria-describedby="workspace-handle-hint"
              placeholder="jamie-practice"
              className="rounded-l-none font-mono"
            />
          </div>
          {/* One live region, mounted before it has anything to say: a role that appears
              together with its text is not reliably announced (M3.T4). */}
          <span
            id="workspace-handle-hint"
            role="status"
            className={cn(
              "text-[12px] leading-[1.5]",
              blocking ? "text-coral-700" : "text-muted-foreground"
            )}
          >
            {handleMessage({ handleRejected, issue, availability })}
          </span>
          {availability.status === "taken" && availability.suggestion && (
            <button
              type="button"
              onClick={() => onHandle(availability.suggestion!)}
              className="self-start rounded-md border border-input px-2 py-1 font-mono text-[12px] hover:bg-[var(--tint-hover)]"
            >
              Use {availability.suggestion}
            </button>
          )}
        </FormRow>
        <FormRow
          label={<label htmlFor="workspace-description">Description</label>}
          help="Helps members orient later."
        >
          <textarea
            id="workspace-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[82px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-sans text-[14px] leading-[1.55] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </FormRow>
      </Form>

      {error ? (
        <p className="mt-4 text-[13px] text-coral-700">{error}</p>
      ) : null}

      <div className="mt-7 flex justify-end border-t border-border pt-4">
        <Button
          variant="primary"
          size="sm"
          disabled={pending || blocking || !name.trim()}
          onClick={submit}
        >
          {pending ? <ThreadSpinner /> : <CheckIcon />}
          {pending ? "Creating workspace" : "Create workspace"}
        </Button>
      </div>
    </div>
  )
}

/**
 * What the one live region says. Ordered by what is actually stopping the person, so
 * that the reason the button is unavailable is the reason on screen: `at_max_length` is
 * advisory and would otherwise hide a taken handle behind "capped at 63 characters".
 */
function handleMessage({
  handleRejected,
  issue,
  availability,
}: {
  handleRejected: string | null
  issue: WorkspaceHandleIssue | null
  availability: WorkspaceHandleAvailability
}) {
  if (handleRejected) return handleRejected
  if (issue && issue !== "at_max_length") return WORKSPACE_HANDLE_MESSAGES[issue]
  if (availability.status !== "idle") return availabilityMessage(availability)
  if (issue) return WORKSPACE_HANDLE_MESSAGES[issue]
  return availabilityMessage(availability)
}

/** Same wording as onboarding: it is the same question about the same handle. */
function availabilityMessage(availability: WorkspaceHandleAvailability) {
  switch (availability.status) {
    case "checking":
      return "Checking whether that handle is free…"
    case "free":
      return "That handle is free."
    case "taken":
      return availability.suggestion
        ? `That handle is taken. ${availability.suggestion} is free.`
        : "That handle is taken."
    case "unknown":
      return "We could not check whether that handle is free. You can continue."
    case "idle":
      return "Used for shared links and SSO."
  }
}
