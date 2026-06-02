/**
 * Reduce a plain-text email body to just the message this event actually adds,
 * stripping the quoted reply history (and its "… wrote:" attribution line).
 *
 * Each email in a thread is imported as its own timeline event, so the quoted
 * copy of earlier messages is redundant — and, for newsletter/HTML-derived
 * mail, a wall of blank lines and tracking URLs. Removing it lets the timeline
 * read like a clean conversation, one message per event.
 *
 * Quoting follows the leading `>` convention (RFC 3676): the first `>`-prefixed
 * line marks the start of the quoted history. The attribution paragraph just
 * above it ("On … wrote:", "… ezt írta:") is removed too when it clearly looks
 * like one (ends in ":" and carries an email, a year, or a "wrote" verb).
 *
 * A purely-quoted message (e.g. a bare forward) keeps its original text so an
 * event is never blank.
 */
export function stripQuotedReplyChain(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")

  const firstQuoteIndex = lines.findIndex((line) => quoteDepth(line) >= 1)
  if (firstQuoteIndex === -1) {
    return tidy(normalized)
  }

  let cut = firstQuoteIndex

  // Contiguous run of non-blank lines directly above the quote.
  let blockEnd = firstQuoteIndex - 1
  while (blockEnd >= 0 && isBlank(lines[blockEnd])) blockEnd--
  let blockStart = blockEnd
  while (blockStart - 1 >= 0 && !isBlank(lines[blockStart - 1])) blockStart--

  // Drop the smallest trailing suffix of that run that reads as an attribution
  // ("… wrote:"), which may soft-wrap across a couple of lines. Stopping at the
  // smallest match keeps the reply prose above it intact.
  const maxAttributionLines = Math.min(3, blockEnd - blockStart + 1)
  for (let k = 1; k <= maxAttributionLines; k++) {
    const start = blockEnd - k + 1
    if (looksLikeAttribution(lines.slice(start, blockEnd + 1).join("\n"))) {
      cut = start
      break
    }
  }

  const visible = tidy(lines.slice(0, cut).join("\n"))
  return visible || tidy(normalized)
}

function quoteDepth(line: string): number {
  let depth = 0
  let i = 0
  while (line[i] === ">") {
    depth++
    i++
    if (line[i] === " ") i++
  }
  return depth
}

function looksLikeAttribution(paragraph: string): boolean {
  if (!paragraph.trimEnd().endsWith(":")) return false
  return (
    /@/.test(paragraph) ||
    /\b\d{4}\b/.test(paragraph) ||
    /\b(wrote|ezt írta|írta|schrieb|escribió|a écrit|napisał|skrev)\b/i.test(
      paragraph
    )
  )
}

function tidy(text: string): string {
  // Collapse runs of 2+ blank lines into a single blank line, then trim.
  return text.replace(/\n{3,}/g, "\n\n").trim()
}

function isBlank(line: string | undefined): boolean {
  return (line ?? "").trim().length === 0
}
