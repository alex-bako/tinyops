"use client"

import * as React from "react"
import { CheckIcon, RotateCcwIcon, TypeIcon, UploadIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Form, FormGrid, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { WorkspaceIcon } from "@workspace/ui/components/workspace-icon"

import type { Workspace, WorkspaceTone } from "@/features/workspaces/types"
import type { WorkspaceProfilePatch } from "@/features/workspaces/use-cases"

const ACCENT_OPTIONS: { id: WorkspaceTone; hex: string }[] = [
  { id: "cobalt", hex: "#2563EB" },
  { id: "citron", hex: "#BEF264" },
  { id: "mint", hex: "#10B981" },
  { id: "coral", hex: "#FB7185" },
  { id: "slate", hex: "#475569" },
]

export function SectionGeneral({
  workspace,
  onUpdateProfile,
}: {
  workspace: Workspace
  onUpdateProfile: (patch: WorkspaceProfilePatch) => void
}) {
  const [draft, setDraft] = React.useState<WorkspaceProfilePatch>(() => ({
    name: workspace.name,
    handle: workspace.handle,
    description: workspace.description,
    accent: workspace.accent,
  }))

  React.useEffect(() => {
    setDraft({
      name: workspace.name,
      handle: workspace.handle,
      description: workspace.description,
      accent: workspace.accent,
    })
  }, [
    workspace.id,
    workspace.name,
    workspace.handle,
    workspace.description,
    workspace.accent,
  ])

  const reset = () => {
    setDraft({
      name: workspace.name,
      handle: workspace.handle,
      description: workspace.description,
      accent: workspace.accent,
    })
  }

  return (
    <div>
      <SectionHead
        title="General"
        description="Identifies this workspace across the product surface."
      />
      <Form>
        <FormRow
          label="Workspace icon"
          help="Shown in the sidebar and on shared links."
        >
          <div className="flex items-center gap-3.5">
            <WorkspaceIcon icon={workspace.icon} size={48} />
            <div className="flex gap-1.5">
              <Button variant="secondary" size="sm" disabled>
                <UploadIcon />
                Upload image
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <TypeIcon />
                Use a letter
              </Button>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5">
            <span className="mr-1 text-[12px] text-muted-foreground">
              Accent
            </span>
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setDraft((current) => ({ ...current, accent: a.id }))
                }
                title={a.id}
                aria-label={`${a.id} accent`}
                aria-pressed={draft.accent === a.id}
                style={{ background: a.hex }}
                className={cn(
                  "inline-block size-[22px] rounded-full border-2 border-transparent shadow-[inset_0_0_0_1px_rgba(15,23,42,0.10)] transition-transform duration-(--dur-fast)",
                  "hover:scale-[1.08]",
                  draft.accent === a.id && "border-foreground"
                )}
              />
            ))}
          </div>
        </FormRow>

        <FormRow label="Workspace name" help="Visible to all members.">
          <Input
            value={draft.name ?? ""}
            onChange={(e) =>
              setDraft((current) => ({ ...current, name: e.target.value }))
            }
          />
        </FormRow>

        <FormRow label="URL handle" help="Used for shared links and SSO.">
          <div className="flex items-stretch">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-[var(--tint-hover)] px-2.5 font-mono text-[12.5px] text-muted-foreground">
              tinyops.app/
            </span>
            <Input
              value={draft.handle ?? ""}
              onChange={(e) =>
                setDraft((current) => ({ ...current, handle: e.target.value }))
              }
              className="rounded-l-none font-mono"
            />
          </div>
        </FormRow>

        <FormRow
          label="Description"
          help="Helps members orient when switching."
        >
          <textarea
            rows={2}
            value={draft.description ?? ""}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                description: e.target.value,
              }))
            }
            className="min-h-[64px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-sans text-[14px] leading-[1.55] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </FormRow>

        <FormRow
          label="Default sender"
          help="Name and reply-to attached to drafts."
        >
          <FormGrid className="gap-3">
            <Input
              placeholder="Sender name"
              defaultValue="Jamie Park"
              disabled
            />
            <Input
              placeholder="reply@…"
              defaultValue={`hello@${workspace.handle}.com`}
              className="font-mono"
              disabled
            />
          </FormGrid>
        </FormRow>

        <FormRow label="Time zone" help="Used to schedule sends and reports.">
          <div className="flex flex-wrap gap-3">
            <Select defaultValue="ny">
              <SelectTrigger className="w-[220px]" disabled>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ny">(GMT−05:00) New York</SelectItem>
                <SelectItem value="london">(GMT+00:00) London</SelectItem>
                <SelectItem value="berlin">(GMT+01:00) Berlin</SelectItem>
                <SelectItem value="tokyo">(GMT+09:00) Tokyo</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="en-us">
              <SelectTrigger className="w-[180px]" disabled>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-us">English (US)</SelectItem>
                <SelectItem value="en-uk">English (UK)</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormRow>
      </Form>

      <div className="mt-7 flex items-center gap-2 border-t border-border pt-4">
        <span className="flex-1 text-[12px] text-muted-foreground">
          Review changes before saving.
        </span>
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcwIcon />
          Discard
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onUpdateProfile(draft)}
        >
          <CheckIcon />
          Save changes
        </Button>
      </div>
    </div>
  )
}

function SectionHead({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-1.5 font-sans text-[22px] leading-[1.2] font-bold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
