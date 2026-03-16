import { createShapeId, type Editor, type TLShapeId } from 'tldraw'
import type { BoardSchema, ChartSpec, DataQuery } from '~/schemas/board-schema'
import { gridToPixel } from '~/lib/layout'
import { createConnectionArrows } from '~/shapes/ConnectionArrow'
import { fetchPriceData } from '../../server/functions/fetch-price'
import { fetchStakingData } from '../../server/functions/fetch-staking'
import { fetchFlowData } from '../../server/functions/fetch-flow'
import {
  extractTimeRange,
  getShapeType,
  buildShapeProps,
  type ChartData,
} from '~/lib/data-transforms'

// --- Data fetching orchestration ---

async function fetchDataForQuery(query: DataQuery): Promise<unknown> {
  switch (query.source) {
    case 'coingecko':
      return fetchPriceData(query)
    case 'defillama':
      if (query.query === 'eth2_staking') {
        return fetchStakingData(query)
      }
      return fetchFlowData(query)
  }
}

async function fetchAllChartData(
  charts: ReadonlyArray<ChartSpec>,
): Promise<Map<string, ChartData>> {
  const results = new Map<string, ChartData>()

  const fetches = charts.map(async (chart) => {
    try {
      const rawData = await fetchDataForQuery(chart.dataQuery)
      const timeRange = extractTimeRange(rawData)
      results.set(chart.id, { chartType: chart.type, rawData, timeRange })
    } catch (err) {
      console.error(`Failed to fetch data for ${chart.id}:`, err)
      results.set(chart.id, { chartType: chart.type, rawData: null })
    }
  })

  await Promise.all(fetches)
  return results
}

// --- Board rendering ---

export interface RenderResult {
  readonly chartShapeIds: Map<string, TLShapeId>
}

export async function renderBoardSchema(
  editor: Editor,
  schema: BoardSchema,
): Promise<RenderResult> {
  // Fetch all chart data in parallel
  const chartDataMap = await fetchAllChartData(schema.charts)

  // Create shapes on canvas
  const chartShapeIds = new Map<string, TLShapeId>()
  const timeRanges: Record<string, { start: string; end: string }> = {}

  for (const chart of schema.charts) {
    const pixel = gridToPixel(chart.position, chart.size)
    const shapeId = createShapeId()
    const data = chartDataMap.get(chart.id)

    const shapeType = getShapeType(chart.type)
    const shapeProps = buildShapeProps(chart, pixel, data)

    // Custom shape types are not in tldraw's built-in union, so we assert here
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
