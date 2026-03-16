import { describe, it, expect } from 'vitest'
import { timestampToFraction, isTimestampInRange } from '~/lib/timestamp-utils'

describe('timestampToFraction', () => {
  it('returns 0 for the start date', () => {
    expect(timestampToFraction('2023-01-01', '2023-01-01', '2023-12-31')).toBe(0)
  })

  it('returns 1 for the end date', () => {
    expect(timestampToFraction('2023-12-31', '2023-01-01', '2023-12-31')).toBe(1)
  })

  it('returns ~0.5 for the midpoint', () => {
    const result = timestampToFraction('2023-07-02', '2023-01-01', '2023-12-31')
    expect(result).toBeCloseTo(0.5, 1)
  })

  it('returns null for timestamp before range', () => {
    expect(timestampToFraction('2022-12-31', '2023-01-01', '2023-12-31')).toBeNull()
  })

  it('returns null for timestamp after range', () => {
    expect(timestampToFraction('2024-01-01', '2023-01-01', '2023-12-31')).toBeNull()
  })
})

describe('isTimestampInRange', () => {
  it('returns true for timestamp within range', () => {
    expect(isTimestampInRange('2023-06-15', '2023-01-01', '2023-12-31')).toBe(true)
  })

  it('returns true for boundary timestamps', () => {
    expect(isTimestampInRange('2023-01-01', '2023-01-01', '2023-12-31')).toBe(true)
    expect(isTimestampInRange('2023-12-31', '2023-01-01', '2023-12-31')).toBe(true)
  })

  it('returns false for out-of-range timestamp', () => {
    expect(isTimestampInRange('2024-01-01', '2023-01-01', '2023-12-31')).toBe(false)
  })
})
