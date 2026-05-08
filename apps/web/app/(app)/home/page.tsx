import { SunIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  BigSearch,
  BigSearchIcon,
  BigSearchInput,
} from "@workspace/ui/components/big-search"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  Body,
  EditorialItalic,
  H1,
} from "@workspace/ui/components/typography"

export default function HomePage() {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1080px] px-6 pt-10 pb-24 md:px-16 md:pt-14"
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground",
          "[&>svg]:size-3.5"
        )}
      >
        <SunIcon />
        <span>Wednesday, May 8 · Jamie&apos;s workspace</span>
      </div>

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

      <BigSearch className="mt-7">
        <BigSearchIcon>
          <SearchIcon />
        </BigSearchIcon>
        <BigSearchInput placeholder="anna@example.com" autoFocus />
        <Kbd className="ml-auto">↵</Kbd>
      </BigSearch>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
