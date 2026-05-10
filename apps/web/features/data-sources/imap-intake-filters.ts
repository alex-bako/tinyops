import { addressEmails, type ParsedMailLike } from "@/features/data-sources/imap-record-normalizer"
import type { ImapDataSource, ImapMessageFilterRule } from "@/features/data-sources/types"

export function matchesIntakeFilters(
  source: ImapDataSource,
  parsed: ParsedMailLike,
  bodyText: string
) {
  return source.intake.messageFilters.rules.every((rule) =>
    matchesRule(rule, parsed, bodyText)
  )
}

function matchesRule(
  rule: ImapMessageFilterRule,
  parsed: ParsedMailLike,
  bodyText: string
) {
  const fieldValue = ruleFieldValue(rule, parsed, bodyText).toLowerCase()
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
  parsed: ParsedMailLike,
  bodyText: string
) {
  if (rule.field === "subject") return parsed.subject ?? ""
  if (rule.field === "body") return bodyText
  if (rule.field === "to") {
    return [
      ...addressEmails(parsed.to),
      ...addressEmails(parsed.cc),
      ...addressEmails(parsed.bcc),
    ].join(" ")
  }
  return addressEmails(parsed.from).join(" ")
}
