import { describe, it, expect } from 'vitest'
import { computeNormalizedAnchor } from '~/shapes/ConnectionArrow'

describe('computeNormalizedAnchor', () => {
  it('returns center (0.5, 0.5) for center anchor', () => {
    const result = computeNormalizedAnchor({ chartId: 'chart-1', anchor: 'center' })
    expect(result).toEqual({ x: 0.5, y: 0.5 })
  })

  it('returns computed x and bottom y for timestamp anchor', () => {
    const result = computeNormalizedAnchor(
      { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2023-04-12' },
      { start: '2023-01-01', end: '2023-07-01' },
    )
    expect(result.x).toBeCloseTo(0.558, 1)
    expect(result.y).toBe(0.8)
  })

  it('returns center fallback when timestamp is out of range', () => {
    const result = computeNormalizedAnchor(
      { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2022-01-01' },
      { start: '2023-01-01', end: '2023-07-01' },
    )
    expect(result).toEqual({ x: 0.5, y: 0.5 })
  })
})
