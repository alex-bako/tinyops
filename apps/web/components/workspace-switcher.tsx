"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  SettingsIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Input } from "@workspace/ui/components/input"
import { Kbd } from "@workspace/ui/components/kbd"
import { RoleChip } from "@workspace/ui/components/role-chip"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"
import { WorkspaceIcon } from "@workspace/ui/components/workspace-icon"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

import { SETTINGS_PATH } from "@/lib/auth/route-policy"
import { useWorkspaceFeature } from "@/features/workspaces/context"
import {
  buildWorkspaceSwitcherView,
  type WorkspaceSwitcherRow,
} from "@/features/workspaces/view-models"

export function WorkspaceSwitcher({
  userEmail,
  userName = "Jamie Park",
}: {
  userEmail?: string | null
  userName?: string
}) {
  const { push } = useRouter()
  const { state, commands } = useWorkspaceFeature()
  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState("")

  React.useEffect(() => {
    if (!open) setFilter("")
  }, [open])

  const view = buildWorkspaceSwitcherView(state, {
    filter,
    userEmail,
    userName,
  })

  const goSettings = () => {
    setOpen(false)
    push(SETTINGS_PATH)
  }
  const goSwitch = (id: string) => {
    commands.switchWorkspace(id)
    setOpen(false)
  }
  const goAccept = (invitationId: string) => {
    commands.acceptInvitation(invitationId)
    setOpen(false)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="default"
              aria-label={`${view.active.name} workspace`}
              data-state={open ? "open" : "closed"}
              className={cn(
                "h-9 gap-2.5 px-2 [&>svg:last-child]:size-3.5 [&>svg:last-child]:shrink-0 [&>svg:last-child]:text-sidebar-foreground/45",
                "data-[state=open]:bg-sidebar-accent",
                "mb-4"
              )}
            >
              <WorkspaceIcon icon={view.active.icon} size={22} />
              <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-sidebar-foreground">
                {view.active.name}
              </span>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-[320px] gap-0 p-1.5"
          >
            <div className="mb-1 flex items-center gap-2 border-b border-border/60 px-1.5 pb-2 pt-1">
              <TonalAvatar name={view.account.email} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[12.5px] font-medium text-foreground">
                  {view.account.name}
                </span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {view.account.email}
                </span>
              </div>
              <button
                type="button"
                aria-label="Account settings"
                title="Account settings"
                className="inline-flex size-[22px] items-center justify-center rounded-xs text-muted-foreground transition-colors duration-(--dur-fast) hover:bg-[var(--tint-hover)] hover:text-foreground"
              >
                <SettingsIcon className="size-3.5" />
              </button>
            </div>

            <div className="mx-1 mb-1.5 mt-1 flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <SearchIcon className="size-3.5" />
              <Input
                placeholder="Find a workspace…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-auto border-0 bg-transparent p-0 text-[12.5px] text-foreground shadow-none focus-visible:border-0 focus-visible:ring-0"
              />
            </div>

            <SectionLabel>Current workspace</SectionLabel>
            <button
              type="button"
              onClick={goSettings}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md border border-cobalt-500/20 bg-cobalt-500/[0.06] p-2 text-left transition-colors duration-(--dur-fast) hover:bg-cobalt-500/[0.10]"
              )}
              title="Open workspace settings"
            >
              <WorkspaceIcon icon={view.active.icon} size={28} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                <span className="truncate text-[13px] font-medium text-foreground">
                  {view.active.name}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <RoleChip
                    label={view.active.roleDef.label}
                    tone={view.active.roleDef.tone}
                    you
                  />
                  <span aria-hidden className="text-muted-foreground/55">
                    ·
                  </span>
                  <span className="truncate">{view.active.type}</span>
                </span>
              </div>
              <CheckIcon className="size-3.5 text-cobalt-500" />
            </button>

            {view.switchRows.length > 0 ? (
              <>
                <SectionLabel>Switch to</SectionLabel>
                {view.switchRows.map((ws) => (
                  <SwitchRow
                    key={ws.id}
                    workspace={ws}
                    onClick={() => goSwitch(ws.id)}
                  />
                ))}
              </>
            ) : null}

            {view.invitationRows.length > 0 ? (
              <>
                <SectionLabel>Invitations</SectionLabel>
                {view.invitationRows.map((ws) => (
                  <div
                    key={ws.handle}
                    className="flex items-center gap-2.5 rounded-md border border-citron-500/45 bg-citron-500/[0.10] p-2"
                  >
                    <WorkspaceIcon icon={ws.icon} size={28} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                      <span className="truncate text-[13px] font-medium text-foreground">
                        {ws.name}
                      </span>
                      <span className="truncate text-[11.5px] text-muted-foreground">
                        {ws.hint}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => goAccept(ws.invitationId)}
                      className="rounded-xs bg-cobalt-500 px-2.5 py-1 text-[11.5px] font-medium text-white transition-colors duration-(--dur-fast) hover:bg-cobalt-700"
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </>
            ) : null}

            <div className="my-1.5 h-px bg-border" />

            <ActionRow
              icon={<PlusIcon className="size-3.5" />}
              label="Create or join a workspace"
              kbd="⌘⇧N"
              onClick={() => {
                setOpen(false)
                push("/home/workspaces/new")
              }}
            />
            <ActionRow
              icon={<Settings2Icon className="size-3.5" />}
              label="Workspace settings"
              onClick={goSettings}
            />
            <ActionRow
              icon={<LogOutIcon className="size-3.5" />}
              label="Log out of all workspaces"
              destructive
              onClick={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
      {children}
    </div>
  )
}

function SwitchRow({
  workspace,
  onClick,
}: {
  workspace: WorkspaceSwitcherRow
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-md border border-transparent p-2 text-left transition-colors duration-(--dur-fast) hover:bg-[var(--tint-hover)]"
    >
      <WorkspaceIcon icon={workspace.icon} size={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate text-[13px] font-medium text-foreground">
          {workspace.name}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <RoleChip
            label={workspace.roleDef.label}
            tone={workspace.roleDef.tone}
            you
          />
          <span aria-hidden className="text-muted-foreground/55">
            ·
          </span>
          <span className="truncate">{workspace.type}</span>
        </span>
      </div>
      <ArrowRightIcon className="size-3.5 text-muted-foreground/55 transition-colors group-hover:text-muted-foreground" />
    </button>
  )
}

function ActionRow({
  icon,
  label,
  kbd,
  destructive,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  kbd?: string
  destructive?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors duration-(--dur-fast)",
        destructive
          ? "text-coral-700 hover:bg-coral-500/10"
          : "text-foreground hover:bg-[var(--tint-hover)]",
        "[&>svg]:text-muted-foreground",
        destructive && "[&>svg]:text-coral-700"
      )}
    >
      {icon}
      <span>{label}</span>
      {kbd ? (
        <Kbd className="ml-auto border-none bg-transparent p-0 font-mono text-[10.5px] text-muted-foreground/60">
          {kbd}
        </Kbd>
      ) : null}
    </button>
  )
}
