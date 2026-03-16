export const GRID_UNIT_W = 450
export const GRID_UNIT_H = 320
export const GRID_GAP = 30

interface GridPosition {
  readonly x: number
  readonly y: number
}

interface GridSize {
  readonly width: number
  readonly height: number
}

interface PixelRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export function gridToPixel(position: GridPosition, size: GridSize): PixelRect {
  return {
    x: position.x * (GRID_UNIT_W + GRID_GAP),
    y: position.y * (GRID_UNIT_H + GRID_GAP),
    width: size.width * GRID_UNIT_W + Math.max(0, size.width - 1) * GRID_GAP,
    height: size.height * GRID_UNIT_H + Math.max(0, size.height - 1) * GRID_GAP,
  }
}
