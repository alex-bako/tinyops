const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
  timeZoneName: "short",
})

/** Format whole ISO timestamps only; arbitrary imported text stays verbatim. */
export function formatImportedDate(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return value
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  // Date accepts overflowing calendar days (e.g. February 30); keep them raw.
  const calendarDate = value.slice(0, 10)
  if (new Date(calendarDate).toISOString().slice(0, 10) !== calendarDate) {
    return value
  }
  return DATE_FORMATTER.format(date)
}
