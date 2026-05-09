import * as React from "react"
import Link from "next/link"
import { AtSignIcon, MapPinIcon } from "lucide-react"

import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"
import { cn } from "@workspace/ui/lib/utils"

import { ClientStateBadgeView } from "@/components/client-state-badge"
import type { ClientStateBadge } from "@/lib/client-state"

type ClientIdentityAvatarSize = React.ComponentProps<typeof TonalAvatar>["size"]

type ClientIdentityInlineProps = {
  name: string
  email: string
  avatarSize?: ClientIdentityAvatarSize
  detailsClassName?: string
  nameClassName?: string
  emailClassName?: string
}

function ClientIdentityInline({
  name,
  email,
  avatarSize = "md",
  detailsClassName,
  nameClassName,
  emailClassName,
}: ClientIdentityInlineProps) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(TonalAvatar, { size: avatarSize, name }),
    React.createElement(
      "div",
      {
        className: cn("flex min-w-0 flex-col leading-[1.25]", detailsClassName),
      },
      React.createElement(
        "span",
        { className: cn("text-[14px] text-foreground", nameClassName) },
        name
      ),
      React.createElement(
        "span",
        {
          className: cn(
            "font-mono text-[11.5px] text-muted-foreground",
            emailClassName
          ),
        },
        email
      )
    )
  )
}

function ClientIdentityLink({
  href,
  className,
  name,
  email,
  avatarSize,
  detailsClassName,
  nameClassName,
  emailClassName,
  children,
}: ClientIdentityInlineProps & {
  href: string
  className?: string
  children?: React.ReactNode
}) {
  return React.createElement(
    Link,
    { href, className },
    React.createElement(ClientIdentityInline, {
      name,
      email,
      avatarSize,
      detailsClassName,
      nameClassName,
      emailClassName,
    }),
    children
  )
}

function ClientIdentityHeader({
  name,
  email,
  location,
  badges,
}: {
  name: string
  email: string
  location: string
  badges: ClientStateBadge[]
}) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(TonalAvatar, { size: "lg", name }),
    React.createElement(
      "div",
      { className: "flex min-w-0 flex-1 flex-col gap-1.5" },
      React.createElement(
        "h1",
        {
          className:
            "font-sans text-[32px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground",
        },
        name
      ),
      React.createElement(
        "div",
        {
          className:
            "flex items-center gap-2 font-mono text-[12.5px] text-muted-foreground",
        },
        React.createElement(AtSignIcon, { className: "size-[13px]" }),
        React.createElement("span", null, email),
        React.createElement(
          "span",
          { "aria-hidden": true, className: "text-muted-foreground/40" },
          "\u00b7"
        ),
        React.createElement(MapPinIcon, { className: "size-[13px]" }),
        React.createElement("span", null, location)
      ),
      React.createElement(
        "div",
        { className: "mt-1.5 flex flex-wrap gap-1.5" },
        badges.map((badge) =>
          React.createElement(ClientStateBadgeView, {
            key: `${badge.kind}-${badge.label}`,
            badge,
          })
        )
      )
    )
  )
}

export { ClientIdentityHeader, ClientIdentityInline, ClientIdentityLink }
