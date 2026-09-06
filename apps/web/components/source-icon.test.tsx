import { existsSync } from "node:fs"
import path from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SourceIcon } from "./source-icon"
import {
  getConnectorMetadata,
  type ConnectorId,
  type DataSourceIcon,
} from "@/features/data-sources/connector-metadata"

describe("SourceIcon", () => {
  it.each<[ConnectorId, string]>([
    ["stripe", "/source-icons/stripe.svg"],
    ["mailerlite", "/source-icons/mailerlite.svg"],
    ["forms", "/source-icons/forms.svg"],
    ["calendly", "/source-icons/calendly.svg"],
    ["teachable", "/source-icons/teachable.png"],
  ])("renders the local decorative logo for %s", (provider, src) => {
    const { container } = render(
      <SourceIcon icon={getConnectorMetadata(provider).icon} className="size-4" />
    )
    const image = container.querySelector("img")
    expect(image).toHaveAttribute("src", src)
    expect(image).toHaveAttribute("alt", "")
    expect(image).toHaveAttribute("aria-hidden", "true")
    expect(image).toHaveClass("size-4", "object-contain")
    expect(screen.queryByRole("img")).toBeNull()
    expect(existsSync(path.join(process.cwd(), "public", src))).toBe(true)
  })

  it.each<[ConnectorId, string]>([
    ["imap", "lucide-mail"],
    ["csv", "lucide-file-text"],
  ])("retains a generic decorative icon for %s", (provider, iconClass) => {
    const { container } = render(<SourceIcon icon={getConnectorMetadata(provider).icon} />)
    expect(container.querySelector("svg")).toHaveClass(iconClass)
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("falls back to a generic plug for an unknown icon", () => {
    const { container } = render(<SourceIcon icon={"unknown" as DataSourceIcon} />)
    expect(container.querySelector("svg")).toHaveClass("lucide-plug")
  })
})
