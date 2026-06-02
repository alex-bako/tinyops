import { describe, expect, it } from "vitest"

import { stripQuotedReplyChain } from "@/features/clients/domain/timeline-event-body-quotes"

describe("stripQuotedReplyChain", () => {
  it("leaves a plain message without quotes untouched", () => {
    expect(stripQuotedReplyChain("Feliratkozom a kurzusra.")).toBe(
      "Feliratkozom a kurzusra."
    )
  })

  it("drops the quoted history and its 'wrote:' attribution", () => {
    const text = [
      "Thanks, that works for me.",
      "",
      "Alex Bako <alex@example.com> wrote:",
      "> Can we move the meeting to Tuesday?",
      "> > Original message here.",
    ].join("\n")

    expect(stripQuotedReplyChain(text)).toBe("Thanks, that works for me.")
  })

  it("handles localized attributions carrying an email and a date", () => {
    const text = [
      "Szia Dorottya! Majd jelentkezem. Tisztelettel Jani.",
      "",
      "Pekáry Dorottya <info@ferficoaching.hu> ezt írta (időpont: 2026. jún. 2.):",
      "> Élőben átadom az Intim Önbizalom Iránytűt.",
      ">",
      "> Szia Jani!",
    ].join("\n")

    expect(stripQuotedReplyChain(text)).toBe(
      "Szia Dorottya! Majd jelentkezem. Tisztelettel Jani."
    )
  })

  it("strips the attribution even with no blank line above the quote", () => {
    const text = [
      "Thanks, that works.",
      "Alex <alex@example.com> wrote:",
      "> Can we move the meeting?",
    ].join("\n")

    expect(stripQuotedReplyChain(text)).toBe("Thanks, that works.")
  })

  it("keeps a colon line that is real content, not an attribution", () => {
    const text = ["Here are my notes:", "> some quoted text"].join("\n")
    expect(stripQuotedReplyChain(text)).toBe("Here are my notes:")
  })

  it("falls back to the original text for a purely quoted message", () => {
    const text = ["> Forwarded content only.", "> Second quoted line."].join(
      "\n"
    )
    expect(stripQuotedReplyChain(text)).toBe(
      "> Forwarded content only.\n> Second quoted line."
    )
  })

  it("collapses excessive blank-line runs and trims edges", () => {
    const text = "First line.\n\n\n\nSecond line.\n\n"
    expect(stripQuotedReplyChain(text)).toBe("First line.\n\nSecond line.")
  })
})
