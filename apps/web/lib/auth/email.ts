const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") return null

  const email = value.trim().toLowerCase()
  if (!SIMPLE_EMAIL_PATTERN.test(email)) return null

  return email
}
