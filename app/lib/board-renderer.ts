import { createShapeId, type Editor, type TLShapeId } from 'tldraw'
import type { BoardSchema } from '~/schemas/board-schema'
import { gridToPixel } from '~/lib/layout'
import { createConnectionArrows } from '~/shapes/ConnectionArrow'
import { fetchAllChartData } from '../../server/functions/fetch-chart-data'
import { extractTimeRange, getShapeType, buildShapeProps, type ChartData } from '~/lib/data-transforms'

// --- Board rendering ---

export interface RenderResult {
  readonly chartShapeIds: Map<string, TLShapeId>
}

export async function renderBoardSchema(
  editor: Editor,
  schema: BoardSchema,
): Promise<RenderResult> {
  // Fetch all chart data via server function (avoids CORS issues)
  const results = await fetchAllChartData({
    data: {
      charts: schema.charts.map((c) => ({
        id: c.id,
        type: c.type,
        dataQuery: c.dataQuery,
      })),
    },
  })

  // Build ChartData map from server results
  const chartDataMap = new Map<string, ChartData>()
  for (const result of results) {
    const timeRange = extractTimeRange(result.rawData)
    chartDataMap.set(result.id, {
      chartType: result.chartType,
      rawData: result.rawData,
      timeRange,
    })
  }

  // Create shapes on canvas
  const chartShapeIds = new Map<string, TLShapeId>()
  const timeRanges: Record<string, { start: string; end: string }> = {}

  for (const chart of schema.charts) {
    const pixel = gridToPixel(chart.position, chart.size)
    const shapeId = createShapeId()
    const data = chartDataMap.get(chart.id)

    const shapeType = getShapeType(chart.type)
    const shapeProps = buildShapeProps(chart, pixel, data)

    editor.createShape({
      id: shapeId,
      type: shapeType as 'geo',
      x: pixel.x,
      y: pixel.y,
      props: shapeProps as Record<string, unknown>,
    })

    chartShapeIds.set(chart.id, shapeId)

    if (data?.timeRange) {
      timeRanges[chart.id] = data.timeRange
    }
  }

  // Create connection arrows
  createConnectionArrows(editor, schema.connections, chartShapeIds, timeRanges)

  // Zoom to fit
  editor.zoomToFit({ animation: { duration: 500 } })

  return { chartShapeIds }
}
