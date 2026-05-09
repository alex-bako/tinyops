import {
  CircleSlashIcon,
  HashIcon,
  HomeIcon,
  ListTodoIcon,
  MessageSquareIcon,
  PlugZapIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"

import {
  CLIENTS_PATH,
  DEFAULT_SIGNED_IN_PATH,
  SETTINGS_PATH,
  SOURCES_PATH,
} from "@/lib/auth/route-policy"
import type { NavGroup } from "@/lib/navigation"

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
        id: "clients",
        label: "Clients",
        icon: UsersIcon,
        href: CLIENTS_PATH,
      },
      { id: "tasks", label: "Tasks", icon: ListTodoIcon },
      {
        id: "sources",
        label: "Data sources",
        icon: PlugZapIcon,
        href: SOURCES_PATH,
      },
    ],
  },
  {
    id: "pinned",
    label: "Pinned views",
    items: [
      { id: "march", label: "March cohort", icon: HashIcon },
      {
        id: "feedback",
        label: "Feedback queue",
        icon: MessageSquareIcon,
      },
      { id: "dnc", label: "Do not contact", icon: CircleSlashIcon },
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
