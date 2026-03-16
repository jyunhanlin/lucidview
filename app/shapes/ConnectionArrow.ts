import { createShapeId, type Editor, type TLShapeId } from 'tldraw'
import { toRichText } from '@tldraw/tlschema'
import type { ConnectionSpec, ConnectionEndpoint } from '~/schemas/board-schema'
import { timestampToFraction } from '~/lib/timestamp-utils'

interface TimeRange {
  readonly start: string
  readonly end: string
}

export function computeNormalizedAnchor(
  endpoint: ConnectionEndpoint,
  timeRange?: TimeRange,
): { x: number; y: number } {
  if (endpoint.anchor === 'center') {
    return { x: 0.5, y: 0.5 }
  }

  if (!timeRange) {
    return { x: 0.5, y: 0.5 }
  }

  const fraction = timestampToFraction(endpoint.timestamp, timeRange.start, timeRange.end)
  if (fraction === null) {
    return { x: 0.5, y: 0.5 }
  }

  return { x: fraction, y: 0.8 }
}

interface ChartTimeRangeMap {
  readonly [chartId: string]: TimeRange
}

export function createConnectionArrows(
  editor: Editor,
  connections: ReadonlyArray<ConnectionSpec>,
  chartShapeIds: ReadonlyMap<string, TLShapeId>,
  timeRanges: ChartTimeRangeMap,
): void {
  for (const conn of connections) {
    const fromShapeId = chartShapeIds.get(conn.from.chartId)
    const toShapeId = chartShapeIds.get(conn.to.chartId)

    if (!fromShapeId || !toShapeId) continue

    const arrowId = createShapeId()

    editor.createShape({
      id: arrowId,
      type: 'arrow',
      x: 0,
      y: 0,
      props: {
        color: 'yellow',
        dash: conn.style === 'dashed' ? 'dashed' : 'solid',
        richText: toRichText(conn.label),
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      },
    })

    const fromAnchor = computeNormalizedAnchor(conn.from, timeRanges[conn.from.chartId])
    const toAnchor = computeNormalizedAnchor(conn.to, timeRanges[conn.to.chartId])

    editor.createBindings([
      {
        fromId: arrowId,
        toId: fromShapeId,
        type: 'arrow',
        props: {
          terminal: 'start',
          normalizedAnchor: fromAnchor,
          isPrecise: true,
          isExact: false,
        },
      },
      {
        fromId: arrowId,
        toId: toShapeId,
        type: 'arrow',
        props: {
          terminal: 'end',
          normalizedAnchor: toAnchor,
          isPrecise: true,
          isExact: false,
        },
      },
    ])
  }
}
