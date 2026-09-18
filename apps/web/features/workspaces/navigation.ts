import { HomeIcon, PlugZapIcon, Settings2Icon } from "lucide-react"

import {
  DEFAULT_SIGNED_IN_PATH,
  SETTINGS_PATH,
  SOURCES_PATH,
} from "@/lib/auth/route-policy"
import type { NavGroup } from "@/lib/navigation"

// Every entry leads somewhere. A feature that does not exist yet has no row.
export const WORKSPACE_NAV_GROUPS: NavGroup[] = [
  {
    id: "primary",
    items: [
      {
        id: "home",
        label: "Home",
        icon: HomeIcon,
        href: DEFAULT_SIGNED_IN_PATH,
      },
      {
        id: "sources",
        label: "Data sources",
        icon: PlugZapIcon,
        href: SOURCES_PATH,
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "settings",
        label: "Settings",
        icon: Settings2Icon,
        href: SETTINGS_PATH,
      },
    ],
  },
]
