import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, FilterIcon, EyeOffIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"
import { cn } from "@workspace/ui/lib/utils"

import { clientBySlug } from "@/lib/clients"

import { ClientHeader } from "./_components/client-header"
import { MemoryCallout } from "./_components/memory-callout"
import { NotesEmpty } from "./_components/notes-empty"
import { Properties } from "./_components/properties"
import { TimelineSection } from "./_components/timeline-section"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const client = clientBySlug(slug)
  if (!client) notFound()

  const propsCount = client.properties.length
  const timelineShown = client.timeline.length
  const timelineTotal = Math.max(timelineShown, 9)

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1200px] px-6 pt-10 pb-24 md:px-14 md:pt-14"
      )}
    >
      <div className="mb-[18px]">
        <Button asChild variant="tertiary" size="sm">
          <Link href="/home/clients">
            <ArrowLeftIcon />
            Back to all clients
          </Link>
        </Button>
      </div>

      <ClientHeader client={client} />

      <MemoryCallout memory={client.memory} />

      <Section divider>
        <SectionHead
          title="Properties"
          count={`${propsCount} fields`}
          actions={
            <Button variant="tertiary" size="sm">
              <PlusIcon />
              Add property
            </Button>
          }
        />
        <Properties properties={client.properties} />
      </Section>

      <Section divider>
        <SectionHead
          title="Timeline"
          count={`${timelineTotal} events · ${timelineShown} shown`}
          actions={
            <>
              <Button variant="tertiary" size="sm">
                <FilterIcon />
                Filter
              </Button>
              <Button variant="tertiary" size="sm">
                <EyeOffIcon />
                Hide sensitive
              </Button>
            </>
          }
        />
        <TimelineSection events={client.timeline} />
      </Section>

      <Section divider>
        <SectionHead title="Notes" />
        <NotesEmpty />
      </Section>
    </div>
  )
}
