"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { acceptWorkspaceInvitationAction } from "@/features/workspaces/actions"
import type { JoinableWorkspace } from "@/features/workspaces/types"
import { ROLE_DEFS } from "@/features/workspaces/catalog"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"

const inputClass =
  "h-9 rounded-sm border-[rgba(15,23,42,0.16)] bg-card px-3 text-[14px] text-foreground placeholder:text-[rgba(15,23,42,0.3)] focus-visible:border-cobalt-500 focus-visible:ring-cobalt-500/[0.12]"

export function JoinFlow({
  invitations,
  email,
  firstName: initialFirstName,
  lastName: initialLastName,
}: {
  invitations: JoinableWorkspace[]
  email: string
  firstName: string
  lastName: string
}) {
  const { replace } = useRouter()
  const [invitationId, setInvitationId] = React.useState(
    invitations[0]?.invitationId ?? ""
  )
  const [firstName, setFirstName] = React.useState(initialFirstName)
  const [lastName, setLastName] = React.useState(initialLastName)
  const [pending, setPending] = React.useState(false)
  const [invalid, setInvalid] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  const selected = invitations.find((i) => i.invitationId === invitationId)
  const canAccept = Boolean(selected) && firstName.trim().length > 0 && !pending

  const accept = async () => {
    setPending(true)
    setFailed(false)
    const result = await acceptWorkspaceInvitationAction(invitationId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })
    if (result.data) {
      replace(DEFAULT_SIGNED_IN_PATH)
      return
    }
    if (result.error === "invite_not_found") setInvalid(true)
    else setFailed(true)
    setPending(false)
  }

  if (invalid) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center gap-4 px-4">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.02em] text-foreground">
          This invite is no longer valid
        </h1>
        <p className="m-0 text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          Ask the workspace owner for a new invitation.
        </p>
        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="tertiary">
            Sign out
          </Button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center gap-6 px-4">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
          You&rsquo;re{" "}
          <em className="font-serif font-normal italic tracking-[-0.005em] text-cobalt-700">
            invited.
          </em>
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          Signed in as {email}. Tell us your name and you&rsquo;re in.
        </p>
      </header>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-[13px] font-medium text-foreground">
          Workspace
        </legend>
        {invitations.map((invitation) => (
          <label
            key={invitation.invitationId}
            className="flex cursor-pointer items-center gap-3 rounded-sm border border-[rgba(15,23,42,0.12)] bg-card px-3 py-2 text-[14px] has-[:checked]:border-cobalt-500"
          >
            <input
              type="radio"
              name="invitation"
              value={invitation.invitationId}
              checked={invitation.invitationId === invitationId}
              onChange={() => setInvitationId(invitation.invitationId)}
            />
            <span className="font-medium text-foreground">
              {invitation.name}
            </span>
            <span className="text-[rgba(15,23,42,0.55)]">
              · {ROLE_DEFS[invitation.role].label}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="join-first-name" className="text-[13px] font-medium">
            First name
          </Label>
          <Input
            id="join-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Mia"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="join-last-name" className="text-[13px] font-medium">
            Last name
          </Label>
          <Input
            id="join-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
      </div>

      {failed ? (
        <p role="alert" className="m-0 text-[14px] text-destructive">
          Something went wrong. Please try again.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" disabled={!canAccept} onClick={accept}>
          {pending ? "Joining…" : "Accept and join"}
        </Button>
        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="tertiary">
            Not you? Sign out
          </Button>
        </form>
      </div>
    </main>
  )
}
