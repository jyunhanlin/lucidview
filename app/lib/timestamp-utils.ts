function toMs(dateStr: string): number {
  return new Date(dateStr).getTime()
}

export function timestampToFraction(
  timestamp: string,
  rangeStart: string,
  rangeEnd: string,
): number | null {
  const ts = toMs(timestamp)
  const start = toMs(rangeStart)
  const end = toMs(rangeEnd)

  if (ts < start || ts > end) return null
  if (start === end) return 0

  return (ts - start) / (end - start)
}

export function isTimestampInRange(
  timestamp: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const ts = toMs(timestamp)
  return ts >= toMs(rangeStart) && ts <= toMs(rangeEnd)
}
