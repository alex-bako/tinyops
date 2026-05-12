import {
  KeyRoundIcon,
  ServerIcon,
  ShieldCheckIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

import type { DataSourceAuth } from "@/lib/sources"

const AUTH_META: Record<DataSourceAuth, { icon: LucideIcon; label: string }> = {
  oauth: { icon: ShieldCheckIcon, label: "OAuth" },
  apikey: { icon: KeyRoundIcon, label: "API key" },
  imap: { icon: ServerIcon, label: "IMAP" },
  csv: { icon: UploadIcon, label: "Upload" },
  multi: { icon: ShieldCheckIcon, label: "CSV / OAuth" },
}

function AuthChip({ auth }: { auth: DataSourceAuth }) {
  const { icon: Icon, label } = AUTH_META[auth]
  return (
    <Badge variant="neutral" className="gap-1.5">
      <Icon className="size-3" />
      {label}
    </Badge>
  )
}

export { AuthChip, AUTH_META }
