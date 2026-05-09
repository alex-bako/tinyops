import Link from "next/link"
import {
  ArchiveIcon,
  ChevronRightIcon,
  SearchIcon,
  SparklesIcon,
  SunIcon,
  UploadIcon,
  UserPlusIcon,
} from "lucide-react"

import {
  SearchField,
  SearchFieldIcon,
  SearchFieldInput,
  SearchFieldShortcut,
} from "@workspace/ui/components/search-field"
import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { Section, SectionHead } from "@workspace/ui/components/section"
import { EditorialItalic } from "@workspace/ui/components/typography"

import {
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"
import { connectedSources } from "@/lib/sources"

import { ATTENTION, RECENT_CLIENTS, WEEK_TASKS } from "./_data"
import { ClientRow } from "./_components/client-row"
import { SourceRow } from "./_components/source-row"
import { StatRow } from "./_components/stat-row"
import { WeekTaskRow } from "./_components/week-task-row"

export default function HomePage() {
  const homeSources = connectedSources()
  return (
    <WorkspacePageSurface>
      <WorkspacePageHeader
        eyebrowIcon={SunIcon}
        eyebrow="Wednesday, May 8 · Jamie's workspace"
        title={
          <>
            Good afternoon, Jamie.{" "}
            <EditorialItalic className="text-cobalt-500">Eight</EditorialItalic>{" "}
            clients need attention.
          </>
        }
        description="Open a client by typing their email, or work down the queue below. Drafts wait for your approval before sending."
      />

      <SearchField className="mt-7 mb-8">
        <SearchFieldIcon>
          <SearchIcon />
        </SearchFieldIcon>
        <SearchFieldInput placeholder="anna@example.com" autoFocus />
        <SearchFieldShortcut className="ml-auto">↵</SearchFieldShortcut>
      </SearchField>

      <div className="grid gap-x-14 gap-y-10 md:grid-cols-[1.5fr_1fr]">
        <div>
          <Section>
            <SectionHead
              title="Recently viewed"
              count="5"
              actions={
                <Button asChild variant="tertiary" size="sm">
                  <Link href="/home/clients">
                    All clients
                    <ChevronRightIcon />
                  </Link>
                </Button>
              }
            />
            <div className="flex flex-col">
              {RECENT_CLIENTS.map((c) => (
                <ClientRow key={c.email} client={c} />
              ))}
            </div>
          </Section>

          <Section divider>
            <SectionHead title="This week" count="2 tasks" />
            <div className="flex flex-col">
              {WEEK_TASKS.map((t) => (
                <WeekTaskRow key={t.title} task={t} />
              ))}
            </div>
          </Section>
        </div>

        <div>
          <Section>
            <SectionHead title="Needs attention" />
            <div className="flex flex-col">
              {ATTENTION.map((a) => (
                <StatRow key={a.label} item={a} />
              ))}
            </div>
          </Section>

          <Section divider>
            <SectionHead
              title="Data sources"
              count={`${homeSources.length} connected`}
              actions={
                <Button asChild variant="tertiary" size="sm">
                  <Link href="/home/sources">
                    All sources
                    <ChevronRightIcon />
                  </Link>
                </Button>
              }
            />
            <div className="flex flex-col">
              {homeSources.map((s) => (
                <SourceRow key={s.id} source={s} />
              ))}
            </div>
          </Section>

          <Section divider>
            <SectionHead title="Quick actions" />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground"
              >
                <UploadIcon />
                Upload a client list
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground"
              >
                <UserPlusIcon />
                Create a client manually
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground"
              >
                <SparklesIcon />
                New monthly check-in
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground"
              >
                <ArchiveIcon />
                Archive inactive clients
              </Button>
            </div>
            <div className="mt-3.5 border-t border-border pt-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-slate-500/70">
                Type <Kbd>/</Kbd> anywhere for commands
              </span>
            </div>
          </Section>
        </div>
      </div>
    </WorkspacePageSurface>
  )
}
