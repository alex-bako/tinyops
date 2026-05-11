export function matchesImapSkipSender(
  skipSenders: string[],
  senderEmails: string[]
) {
  return senderEmails.some((email) =>
    skipSenders.some((pattern) => matchesEmailPattern(pattern, email))
  )
}

function matchesEmailPattern(pattern: string, email: string) {
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")
  return new RegExp(`^${escaped}$`).test(email)
}
