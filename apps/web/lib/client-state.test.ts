import { describe, expect, it } from "vitest"

import {
  clientCohortBadge,
  clientDetailFlagBadges,
  clientFlagBadges,
  clientStatusBadge,
} from "./client-state"

describe("client state badges", () => {
  it("maps do-not-contact status to prominent badge", () => {
    expect(clientStatusBadge("dnc")).toEqual({
      kind: "dnc",
      label: "Do not contact",
      dot: true,
    })
  })

  it("maps list flags into stable badge labels", () => {
    expect(clientFlagBadges(["overdue", "sensitive", "idle", "dnc"])).toEqual([
      { kind: "warn", label: "Overdue" },
      { kind: "sensitive", label: "Sensitive" },
      { kind: "neutral", label: "Idle" },
      { kind: "dnc", label: "DNC", dot: true },
    ])
  })

  it("expands detail flag labels", () => {
    expect(clientDetailFlagBadges(["overdue", "idle"])).toEqual([
      { kind: "warn", label: "Overdue check-in" },
      { kind: "neutral", label: "Idle 60d+" },
    ])
  })

  it("maps cohort badges for detail and table surfaces", () => {
    expect(clientCohortBadge("March cohort")).toEqual({
      kind: "neutral",
      label: "March cohort",
    })
    expect(clientCohortBadge("March cohort", "tag")).toEqual({
      kind: "tag",
      label: "March cohort",
    })
  })
})
