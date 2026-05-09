"use client"

import * as React from "react"
import {
  Search,
  Mail,
  Plus,
  Sparkles,
  Calendar,
  Filter,
  ChevronDown,
  AlertCircle,
  EyeOff,
  Send,
  Pencil,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Switch } from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

import { Badge, BadgeDot } from "@workspace/ui/components/badge"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  Callout,
  CalloutStamp,
  CalloutSummary,
} from "@workspace/ui/components/callout"
import {
  SearchField,
  SearchFieldIcon,
  SearchFieldInput,
  SearchFieldShortcut,
} from "@workspace/ui/components/search-field"
import {
  H1,
  H2,
  H3,
  H4,
  Eyebrow,
  Body,
  Caption,
  Mono,
  EditorialItalic,
} from "@workspace/ui/components/typography"

const PALETTE: { name: string; vars: { token: string; value: string }[] }[] = [
  {
    name: "Paper / surface",
    vars: [
      { token: "paper", value: "#FAFAF7" },
      { token: "paper-2", value: "#F2F2EC" },
      { token: "surface", value: "#FFFFFF" },
      { token: "hairline", value: "#E7E7E0" },
    ],
  },
  {
    name: "Cobalt — primary",
    vars: [
      { token: "cobalt-50", value: "#EEF3FF" },
      { token: "cobalt-100", value: "#DCE6FF" },
      { token: "cobalt-300", value: "#82A3FF" },
      { token: "cobalt-500", value: "#2563EB" },
      { token: "cobalt-700", value: "#1E40AF" },
      { token: "cobalt-900", value: "#0E1F5C" },
    ],
  },
  {
    name: "Citron — accent",
    vars: [
      { token: "citron-100", value: "#ECFCCB" },
      { token: "citron-300", value: "#D9F99D" },
      { token: "citron-500", value: "#BEF264" },
      { token: "citron-700", value: "#65A30D" },
    ],
  },
  {
    name: "Mint — positive",
    vars: [
      { token: "mint-100", value: "#D1FAE5" },
      { token: "mint-300", value: "#6EE7B7" },
      { token: "mint-500", value: "#10B981" },
      { token: "mint-700", value: "#047857" },
    ],
  },
  {
    name: "Coral — sensitive",
    vars: [
      { token: "coral-100", value: "#FFE4E0" },
      { token: "coral-300", value: "#FCA5A5" },
      { token: "coral-500", value: "#FB7185" },
      { token: "coral-700", value: "#BE123C" },
    ],
  },
  {
    name: "Slate — neutral",
    vars: [
      { token: "slate-50", value: "#F8FAFC" },
      { token: "slate-100", value: "#F1F5F9" },
      { token: "slate-300", value: "#CBD5E1" },
      { token: "slate-500", value: "#64748B" },
      { token: "slate-700", value: "#334155" },
      { token: "slate-900", value: "#0F172A" },
    ],
  },
]

function ShowcaseSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-border pt-12 pb-2">
      <div className="mb-8 max-w-[640px]">
        <Eyebrow>{eyebrow}</Eyebrow>
        <H3 className="mt-3">{title}</H3>
        {description && (
          <Body size="lg" className="mt-3 text-muted-foreground">
            {description}
          </Body>
        )}
      </div>
      {children}
    </section>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-6">
      <Mono className="w-32 shrink-0 pt-1.5 text-muted-foreground">{label}</Mono>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export default function Page() {
  return (
    <TooltipProvider>
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-[1080px] px-8 py-20 sm:px-14">
          {/* Header */}
          <header className="mb-16">
            <Eyebrow>TinyOps · design system</Eyebrow>
            <H1 className="mt-4">
              Primitives for an AI memory{" "}
              <EditorialItalic className="text-cobalt-500">
                between humans
              </EditorialItalic>
              .
            </H1>
            <Body size="lg" className="mt-5 max-w-[640px]">
              The building blocks of the TinyOps interface — colors, type, and
              the small components everything else composes from. Nothing here
              is a page. Everything here is a primitive.
            </Body>
          </header>

          {/* Colors */}
          <ShowcaseSection
            eyebrow="01 — Color"
            title="A clean cream paper, one electric primary, one playful pop."
            description="Cobalt does the heavy lifting. Citron is the rare ping. Coral signals care, never alarm. Mint confirms. Slate carries everything else."
          >
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {PALETTE.map((group) => (
                <div key={group.name}>
                  <Caption className="mb-3 block font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {group.name}
                  </Caption>
                  <div className="flex flex-col">
                    {group.vars.map((swatch) => (
                      <div
                        key={swatch.token}
                        className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
                      >
                        <span
                          className="size-8 shrink-0 rounded-sm border border-hairline"
                          style={{ background: swatch.value }}
                        />
                        <Body className="flex-1 text-foreground">
                          {swatch.token}
                        </Body>
                        <Mono className="text-muted-foreground">
                          {swatch.value}
                        </Mono>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ShowcaseSection>

          {/* Typography */}
          <ShowcaseSection
            eyebrow="02 — Typography"
            title="Geist does almost everything. Instrument Serif italic appears once a page, max."
          >
            <div className="flex flex-col gap-1">
              <Row label="48 / H1">
                <H1>What I know about Anna</H1>
              </Row>
              <Row label="36 / H2">
                <H2>Eight clients need attention</H2>
              </Row>
              <Row label="28 / H3">
                <H3>Monthly check-in — March cohort</H3>
              </Row>
              <Row label="18 / H4">
                <H4>Section heading in sans</H4>
              </Row>
              <Row label="16 / body-lg">
                <Body size="lg">
                  Default copy for marketing and onboarding surfaces.
                </Body>
              </Row>
              <Row label="14 / body">
                <Body>
                  Default body for dense product surfaces — timelines, tables,
                  cards.
                </Body>
              </Row>
              <Row label="12 / caption">
                <Caption>Captions, helper text, table column labels.</Caption>
              </Row>
              <Row label="12 / EYEBROW">
                <Eyebrow>Sensitive — review manually</Eyebrow>
              </Row>
              <Row label="13 / mono">
                <Mono>anna@example.com · evt_3df0e2</Mono>
              </Row>
              <Row label="editorial">
                <EditorialItalic className="text-[22px]">
                  asked for clearer instructions
                </EditorialItalic>
              </Row>
            </div>
          </ShowcaseSection>

          {/* Buttons */}
          <ShowcaseSection
            eyebrow="03 — Buttons"
            title="One primary action per screen. Everything else is ghost or tertiary."
            description="Buttons rest at 4px radius — tight, document-like. The page should read as content first."
          >
            <div className="flex flex-col gap-1">
              <Row label="primary">
                <Button>Approve &amp; send</Button>
                <Button>
                  <Send /> Send drafts
                </Button>
              </Row>
              <Row label="accent">
                <Button variant="accent">Try it free</Button>
                <Button variant="accent">
                  <Sparkles /> Generate draft
                </Button>
              </Row>
              <Row label="secondary">
                <Button variant="secondary">Edit draft</Button>
                <Button variant="secondary">
                  <Pencil /> Edit
                </Button>
              </Row>
              <Row label="ghost">
                <Button variant="ghost">Add note</Button>
                <Button variant="ghost">
                  <Plus /> Add source
                </Button>
              </Row>
              <Row label="tertiary">
                <Button variant="tertiary">Skip</Button>
                <Button variant="tertiary">Cancel</Button>
              </Row>
              <Row label="destructive">
                <Button variant="destructive">Disconnect source</Button>
              </Row>
              <Row label="disabled">
                <Button variant="secondary" disabled>
                  Send (none approved)
                </Button>
              </Row>
              <Row label="sizes">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Add">
                  <Plus />
                </Button>
              </Row>
              <Row label="iaction">
                <Button variant="secondary" size="iaction">
                  <Filter /> Filter
                </Button>
                <Button variant="secondary" size="iaction">
                  <Calendar /> Last 30d
                </Button>
                <Button variant="secondary" size="iaction">
                  Edit
                </Button>
              </Row>
            </div>
          </ShowcaseSection>

          {/* Inputs / Form */}
          <ShowcaseSection
            eyebrow="04 — Inputs"
            title="Hairline border on cream. Cobalt ring on focus."
          >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="flex flex-col gap-5 max-w-[440px]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Client email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="anna@example.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    rows={3}
                    placeholder="What did Anna ask for? Keep it short."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="approve-low" defaultChecked />
                  <Label htmlFor="approve-low" className="cursor-pointer">
                    Approve all low-risk drafts
                  </Label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="exclude-sensitive" className="cursor-pointer">
                    Exclude sensitive context from outbound
                  </Label>
                  <Switch id="exclude-sensitive" defaultChecked />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="weekly" className="cursor-pointer">
                    Send weekly digest
                  </Label>
                  <Switch id="weekly" />
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <Caption className="mb-2 block">Big search (hero)</Caption>
                  <SearchField>
                    <SearchFieldIcon>
                      <Search />
                    </SearchFieldIcon>
                    <SearchFieldInput placeholder="Type a client email address…" />
                    <SearchFieldShortcut>↵</SearchFieldShortcut>
                  </SearchField>
                </div>

                <div>
                  <Caption className="mb-2 block">Select</Caption>
                  <Select defaultValue="march">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="march">March cohort</SelectItem>
                      <SelectItem value="february">February cohort</SelectItem>
                      <SelectItem value="january">January cohort</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Caption className="mb-2 block">Radio group</Caption>
                  <RadioGroup defaultValue="grounded" className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="grounded" id="r-grounded" />
                      <Label htmlFor="r-grounded" className="cursor-pointer">
                        Grounded — cite sources only
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="cautious" id="r-cautious" />
                      <Label htmlFor="r-cautious" className="cursor-pointer">
                        Cautious — flag inferences
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="off" id="r-off" />
                      <Label htmlFor="r-off" className="cursor-pointer">
                        Off — no AI memory
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </ShowcaseSection>

          {/* Tabs / Toggle */}
          <ShowcaseSection
            eyebrow="05 — Selection"
            title="Tabs and segmented controls."
          >
            <div className="flex flex-col gap-8">
              <div>
                <Caption className="mb-3 block">Tabs (default)</Caption>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All · 47</TabsTrigger>
                    <TabsTrigger value="low">Low risk · 38</TabsTrigger>
                    <TabsTrigger value="medium">Medium · 6</TabsTrigger>
                    <TabsTrigger value="high">High · 3</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all">
                    <Body className="pt-3 text-muted-foreground">
                      Showing all 47 clients in the March cohort.
                    </Body>
                  </TabsContent>
                  <TabsContent value="low">
                    <Body className="pt-3 text-muted-foreground">
                      38 clients flagged low risk — auto-personalize ok.
                    </Body>
                  </TabsContent>
                  <TabsContent value="medium">
                    <Body className="pt-3 text-muted-foreground">
                      6 clients with medium risk indicators.
                    </Body>
                  </TabsContent>
                  <TabsContent value="high">
                    <Body className="pt-3 text-muted-foreground">
                      3 clients require manual review.
                    </Body>
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <Caption className="mb-3 block">Toggle group</Caption>
                <ToggleGroup type="single" defaultValue="month">
                  <ToggleGroupItem value="day">Day</ToggleGroupItem>
                  <ToggleGroupItem value="week">Week</ToggleGroupItem>
                  <ToggleGroupItem value="month">Month</ToggleGroupItem>
                  <ToggleGroupItem value="quarter">Quarter</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </ShowcaseSection>

          {/* Badges */}
          <ShowcaseSection
            eyebrow="06 — Badges"
            title="Small, square, document-friendly. Pill shape is reserved for in-text status dots."
          >
            <div className="flex flex-col gap-1">
              <Row label="active">
                <Badge variant="active">
                  <BadgeDot />
                  Active
                </Badge>
                <Badge variant="active">Approved</Badge>
                <Badge variant="active">Low risk</Badge>
              </Row>
              <Row label="warn">
                <Badge variant="warn">Review</Badge>
                <Badge variant="warn">Medium</Badge>
                <Badge variant="warn">Overdue check-in</Badge>
              </Row>
              <Row label="brand">
                <Badge variant="brand">3 to review</Badge>
                <Badge variant="brand">Ready to review</Badge>
              </Row>
              <Row label="sensitive">
                <Badge variant="sensitive">
                  <AlertCircle />
                  Sensitive — review
                </Badge>
                <Badge variant="sensitive">High risk</Badge>
              </Row>
              <Row label="dnc">
                <Badge variant="dnc">
                  <BadgeDot className="bg-citron-500 opacity-100" />
                  Do not contact
                </Badge>
              </Row>
              <Row label="neutral">
                <Badge variant="neutral">Inactive 90d+</Badge>
                <Badge variant="neutral">Skipped</Badge>
                <Badge variant="neutral">No history</Badge>
              </Row>
              <Row label="tag">
                <Badge variant="tag">March cohort</Badge>
                <Badge variant="tag">IMAP</Badge>
                <Badge variant="tag">Forms</Badge>
                <Badge variant="tag">CSV</Badge>
              </Row>
            </div>
          </ShowcaseSection>

          {/* Avatars */}
          <ShowcaseSection
            eyebrow="07 — Avatars"
            title="Deterministic monogram. The same name always gets the same color."
          >
            <div className="flex flex-col gap-1">
              <Row label="sizes">
                <TonalAvatar name="Anna Smith" size="xs" />
                <TonalAvatar name="Anna Smith" size="sm" />
                <TonalAvatar name="Anna Smith" size="md" />
                <TonalAvatar name="Anna Smith" size="lg" />
              </Row>
              <Row label="tones">
                <TonalAvatar name="Anna Smith" />
                <TonalAvatar name="Mariko Tan" />
                <TonalAvatar name="Sara Berger" />
                <TonalAvatar name="Jules Ono" />
                <TonalAvatar name="Pat Quinn" />
                <TonalAvatar name="Lee Park" />
                <TonalAvatar name="Yuki Tanaka" />
              </Row>
              <Row label="explicit">
                <TonalAvatar name="Anna Smith" tone="cobalt" />
                <TonalAvatar name="Anna Smith" tone="citron" />
                <TonalAvatar name="Anna Smith" tone="coral" />
                <TonalAvatar name="Anna Smith" tone="mint" />
                <TonalAvatar name="Anna Smith" tone="slate" />
              </Row>
            </div>
          </ShowcaseSection>

          {/* Kbd */}
          <ShowcaseSection
            eyebrow="08 — Keyboard"
            title="Mono-cased key chips for shortcut hints."
          >
            <Row label="keys">
              <Body className="flex items-center gap-2">
                Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search
              </Body>
              <Body className="flex items-center gap-2">
                <Kbd>↵</Kbd> to confirm
              </Body>
              <Body className="flex items-center gap-2">
                <Kbd>Esc</Kbd> to dismiss
              </Body>
            </Row>
          </ShowcaseSection>

          {/* Callout */}
          <ShowcaseSection
            eyebrow="09 — Callout"
            title="A left rule, a stamp, a sentence. The AI memory lives here."
            description="Inferences are flagged separately from facts. The AI cites the events it's grounded in."
          >
            <div className="flex flex-col gap-8 max-w-[640px]">
              <Callout className="group/callout" tone="brand">
                <CalloutStamp>
                  <Sparkles className="size-3" />
                  AI memory · grounded in source events
                </CalloutStamp>
                <CalloutSummary>
                  Anna joined the March cohort. She{" "}
                  <EditorialItalic className="text-cobalt-700">
                    asked for clearer replay instructions
                  </EditorialItalic>{" "}
                  on Mar 8 and hasn&apos;t submitted feedback in six weeks.
                </CalloutSummary>
              </Callout>

              <Callout className="group/callout" tone="sensitive">
                <CalloutStamp>
                  <EyeOff className="size-3" />
                  Sensitive — review manually
                </CalloutStamp>
                <CalloutSummary>
                  Topic is firewalled from outbound. Approve any reference to it
                  manually.
                </CalloutSummary>
              </Callout>

              <Callout className="group/callout" tone="neutral">
                <CalloutStamp>
                  <Mail className="size-3" />
                  Generic fallback
                </CalloutStamp>
                <CalloutSummary>
                  Not enough history to personalize. Using the generic
                  check-in.
                </CalloutSummary>
              </Callout>
            </div>
          </ShowcaseSection>

          {/* Overlays */}
          <ShowcaseSection
            eyebrow="10 — Overlays"
            title="Floating UI. Shadows live here, not on resting cards."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary">Hover for tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>
                  Sourced from anna&apos;s Mar 8 email.
                </TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary">
                    Open popover <ChevronDown />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="flex flex-col gap-2">
                    <Eyebrow>Filter clients</Eyebrow>
                    <Body className="text-muted-foreground">
                      Applies to the current cohort only.
                    </Body>
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    Actions <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>Approve &amp; send</DropdownMenuItem>
                  <DropdownMenuItem>Edit draft</DropdownMenuItem>
                  <DropdownMenuItem>Skip this client</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Mark do-not-contact</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send to 47 clients?</DialogTitle>
                    <DialogDescription>
                      This will send 47 emails. They cannot be unsent.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button>Approve &amp; send</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </ShowcaseSection>

          {/* Footer */}
          <Separator className="mt-16" />
          <footer className="mt-6 flex items-center justify-between">
            <Caption>TinyOps · primitives v0</Caption>
            <Mono className="text-muted-foreground">
              packages/ui/src/components/*
            </Mono>
          </footer>
        </div>
      </main>
    </TooltipProvider>
  )
}
