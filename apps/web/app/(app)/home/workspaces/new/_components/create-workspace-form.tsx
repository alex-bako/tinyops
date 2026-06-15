"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { ThreadSpinner } from "@workspace/ui/components/loaders"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import { createWorkspaceAction } from "@/features/workspaces/actions"

export function CreateWorkspaceForm() {
  const { push, refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [handle, setHandle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createWorkspaceAction({
        name,
        handle,
        description,
      })
      if (result.error) {
        setError("Could not create workspace.")
        return
      }
      refresh()
      push("/home/settings")
    })
  }

  return (
    <div className="mt-8 max-w-[640px]">
      <Form>
        <FormRow label="Workspace name" help="Visible to all members.">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jamie Practice"
          />
        </FormRow>
        <FormRow label="URL handle" help="Lowercase letters, numbers, and dashes.">
          <div className="flex items-stretch">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-[var(--tint-hover)] px-2.5 font-mono text-[12.5px] text-muted-foreground">
              tinyops.app/
            </span>
            <Input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="jamie-practice"
              className="rounded-l-none font-mono"
            />
          </div>
        </FormRow>
        <FormRow label="Description" help="Helps members orient later.">
          <textarea
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
          disabled={pending || !name.trim()}
          onClick={submit}
        >
          {pending ? <ThreadSpinner /> : <CheckIcon />}
          {pending ? "Creating workspace" : "Create workspace"}
        </Button>
      </div>
    </div>
  )
}
