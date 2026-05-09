import Link from "next/link"
import { ArrowLeftIcon, PlugZapIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"

export default function SourceNotFound() {
  return (
    <WorkspacePageSurface
      width="narrow"
      className="pt-24 text-center md:pt-32"
    >
      <WorkspacePageHeader
        eyebrowIcon={PlugZapIcon}
        eyebrow="Source not found"
        title="We couldn't find that data source."
        titleClassName="text-[32px] leading-[1.1]"
        description="The slug in the URL doesn't match any connector in your workspace. The connector may have been removed or the link is from an older version."
        descriptionClassName="text-[15px] leading-[1.55]"
      />
      <div className="mt-7 flex justify-center">
        <Button asChild variant="primary" size="sm">
          <Link href="/home/sources">
            <ArrowLeftIcon />
            Back to all sources
          </Link>
        </Button>
      </div>
    </WorkspacePageSurface>
  )
}
