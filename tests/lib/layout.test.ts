import { describe, it, expect } from 'vitest'
import { gridToPixel, GRID_UNIT_W, GRID_UNIT_H, GRID_GAP } from '~/lib/layout'

describe('gridToPixel', () => {
  it('converts origin (0,0) position with size (1,1)', () => {
    const result = gridToPixel({ x: 0, y: 0 }, { width: 1, height: 1 })
    expect(result).toEqual({ x: 0, y: 0, width: GRID_UNIT_W, height: GRID_UNIT_H })
  })

  it('converts position (1,0) — one column right', () => {
    const result = gridToPixel({ x: 1, y: 0 }, { width: 1, height: 1 })
    expect(result.x).toBe(GRID_UNIT_W + GRID_GAP)
    expect(result.y).toBe(0)
  })

  it('converts position (0,1) — one row down', () => {
    const result = gridToPixel({ x: 0, y: 1 }, { width: 1, height: 1 })
    expect(result.x).toBe(0)
    expect(result.y).toBe(GRID_UNIT_H + GRID_GAP)
  })

  it('converts double-wide size (2,1)', () => {
    const result = gridToPixel({ x: 0, y: 0 }, { width: 2, height: 1 })
    expect(result.width).toBe(GRID_UNIT_W * 2 + GRID_GAP)
    expect(result.height).toBe(GRID_UNIT_H)
  })

  it('converts position (2,1) with size (1,1)', () => {
    const result = gridToPixel({ x: 2, y: 1 }, { width: 1, height: 1 })
    expect(result.x).toBe((GRID_UNIT_W + GRID_GAP) * 2)
    expect(result.y).toBe(GRID_UNIT_H + GRID_GAP)
  })
})
