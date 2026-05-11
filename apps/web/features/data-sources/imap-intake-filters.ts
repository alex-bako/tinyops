import type { ImapMessageFacts } from "@/features/data-sources/imap-message-facts"
import type { ImapDataSource, ImapMessageFilterRule } from "@/features/data-sources/types"

export function matchesIntakeFilters(
  source: ImapDataSource,
  facts: ImapMessageFacts
) {
  return source.intake.messageFilters.rules.every((rule) =>
    matchesRule(rule, facts)
  )
}

function matchesRule(
  rule: ImapMessageFilterRule,
  facts: ImapMessageFacts
) {
  const fieldValue = ruleFieldValue(rule, facts).toLowerCase()
  const ruleValue = rule.value.toLowerCase()

  if (rule.operator === "is") return fieldValue === ruleValue
  if (rule.operator === "is_not") return fieldValue !== ruleValue
  if (rule.operator === "does_not_contain") {
    return !fieldValue.includes(ruleValue)
  }
  return fieldValue.includes(ruleValue)
}

function ruleFieldValue(
  rule: ImapMessageFilterRule,
  facts: ImapMessageFacts
) {
  if (rule.field === "subject") return facts.subject
  if (rule.field === "body") return facts.bodyText
  if (rule.field === "to") return [...facts.toEmails, ...facts.ccEmails, ...facts.bccEmails].join(" ")
  return facts.fromEmails.join(" ")
}
