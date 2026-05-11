export type SensitivityClassification = {
  level: 0 | 1 | 2 | 3 | 4
  matchedKeywords: string[]
}

export function classifyTimelineSensitivity({
  text,
  manualReviewKeywords,
}: {
  text: string
  manualReviewKeywords: string[]
}): SensitivityClassification {
  const normalizedText = text.toLowerCase()
  const matchedKeywords = Array.from(
    new Set(
      manualReviewKeywords
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)
        .filter((keyword) => normalizedText.includes(keyword))
    )
  )

  return {
    level: matchedKeywords.length > 0 ? 2 : 0,
    matchedKeywords,
  }
}
