import Link from "next/link"
import { ArrowLeftIcon, SearchXIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Body, Eyebrow, H1 } from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

export default function ClientNotFound() {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[640px] px-6 pt-24 pb-24 text-center md:pt-32"
      )}
    >
      <Eyebrow className="inline-flex items-center gap-1.5 [&>svg]:size-3.5">
        <SearchXIcon />
        <span>Client not found</span>
      </Eyebrow>
      <H1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.025em]">
        We couldn&apos;t find that client.
      </H1>
      <Body
        size="lg"
        className="mt-2.5 text-[15px] leading-[1.55] text-muted-foreground"
      >
        The slug in the URL doesn&apos;t match anyone in your practice. They may
        have been removed or the link is from an older version.
      </Body>
      <div className="mt-7 flex justify-center">
        <Button asChild variant="primary" size="sm">
          <Link href="/home/clients">
            <ArrowLeftIcon />
            Back to all clients
          </Link>
        </Button>
      </div>
    </div>
  )
}
