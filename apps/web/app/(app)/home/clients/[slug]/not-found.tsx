import Link from "next/link"
import { ArrowLeftIcon, SearchXIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"

export default function ClientNotFound() {
  return (
    <WorkspacePageSurface
      width="narrow"
      className="pt-24 text-center md:pt-32"
    >
      <WorkspacePageHeader
        eyebrowIcon={SearchXIcon}
        eyebrow="Client not found"
        title="We couldn't find that client."
        titleClassName="text-[32px] leading-[1.1]"
        description="The slug in the URL doesn't match anyone in your practice. They may have been removed or the link is from an older version."
        descriptionClassName="text-[15px] leading-[1.55]"
      />
      <div className="mt-7 flex justify-center">
        <Button asChild variant="primary" size="sm">
          <Link href="/home/clients">
            <ArrowLeftIcon />
            Back to all clients
          </Link>
        </Button>
      </div>
    </WorkspacePageSurface>
  )
}
