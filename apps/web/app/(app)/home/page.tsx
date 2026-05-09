import Link from "next/link"
import {
  ArchiveIcon,
  ChevronRightIcon,
  PlusIcon,
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
import {
  Body,
  EditorialItalic,
  Eyebrow,
  H1,
} from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

import { ATTENTION, RECENT_CLIENTS, SOURCES, WEEK_TASKS } from "./_data"
import { ClientRow } from "./_components/client-row"
import { SourceRow } from "./_components/source-row"
import { StatRow } from "./_components/stat-row"
import { WeekTaskRow } from "./_components/week-task-row"

export default function HomePage() {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1200px] px-6 pt-10 pb-24 md:px-14 md:pt-14"
      )}
    >
      <Eyebrow className="inline-flex items-center gap-1.5 [&>svg]:size-3.5">
        <SunIcon />
        <span>Wednesday, May 8 · Jamie&apos;s workspace</span>
      </Eyebrow>

      <H1
        className={cn(
          "mt-3 text-[38px] font-bold leading-[1.15] tracking-[-0.025em]"
        )}
      >
        Good afternoon, Jamie.{" "}
        <EditorialItalic className="text-cobalt-500">Eight</EditorialItalic>{" "}
        clients need attention.
      </H1>

      <Body
        size="lg"
        className="mt-2.5 max-w-[640px] text-[15px] leading-[1.55] text-muted-foreground"
      >
        Open a client by typing their email, or work down the queue below.
        Drafts wait for your approval before sending.
      </Body>

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
              count="3 connected"
              actions={
                <Button variant="tertiary" size="sm">
                  <PlusIcon />
                  Add
                </Button>
              }
            />
            <div className="flex flex-col">
              {SOURCES.map((s) => (
                <SourceRow key={s.name} source={s} />
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
    </div>
  )
}
