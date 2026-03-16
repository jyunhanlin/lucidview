import type { ChartSpec } from '~/schemas/board-schema'

// --- Time range extraction ---

interface TimeRange {
  readonly start: string
  readonly end: string
}

export function extractTimeRange(data: unknown): TimeRange | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  if (Array.isArray(d.prices) && d.prices.length > 1) {
    const first = d.prices[0] as [number, number]
    const last = d.prices[d.prices.length - 1] as [number, number]
    return {
      start: new Date(first[0]).toISOString().split('T')[0],
      end: new Date(last[0]).toISOString().split('T')[0],
    }
  }
  return undefined
}

// --- OHLC conversion for candlestick charts ---

interface OHLCData {
  readonly time: string
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
}

export function convertToOHLC(
  prices: ReadonlyArray<readonly [number, number]>,
): OHLCData[] {
  const dayMap = new Map<string, number[]>()

  for (const [ts, price] of prices) {
    const day = new Date(ts).toISOString().split('T')[0]
    const existing = dayMap.get(day) ?? []
    existing.push(price)
    dayMap.set(day, existing)
  }

  return Array.from(dayMap.entries()).map(([day, values]) => ({
    time: day,
    open: values[0],
    high: Math.max(...values),
    low: Math.min(...values),
    close: values[values.length - 1],
  }))
}

// --- Time-value conversion for bar/line charts ---

interface TimeValueData {
  readonly time: string
  readonly value: number
}

export function convertToTimeValue(data: unknown): TimeValueData[] {
  if (Array.isArray(data)) {
    return data
      .filter((entry): entry is { date: number; totalLiquidityUSD?: number; tvl?: number } =>
        typeof entry === 'object' && entry !== null && 'date' in entry
      )
      .map((entry) => ({
        time: new Date(entry.date * 1000).toISOString().split('T')[0],
        value: entry.totalLiquidityUSD ?? entry.tvl ?? 0,
      }))
  }

  const d = data as Record<string, unknown>
  if (Array.isArray(d.prices)) {
    return (d.prices as Array<[number, number]>).map(([ts, value]) => ({
      time: new Date(ts).toISOString().split('T')[0],
      value,
    }))
  }

  if (Array.isArray(d.tvl)) {
    return (d.tvl as Array<{ date: number; totalLiquidityUSD: number }>).map((entry) => ({
      time: new Date(entry.date * 1000).toISOString().split('T')[0],
      value: entry.totalLiquidityUSD,
    }))
  }

  return []
}

// --- Graph data conversion for node-graph charts ---

interface GraphData {
  readonly nodes: Array<{ id: string; label: string; value: number }>
  readonly links: Array<{ source: string; target: string; label?: string; value?: number }>
}

export function convertToGraph(data: unknown): GraphData {
  const d = data as Record<string, unknown>

  if (d.chains && Array.isArray(d.chains)) {
    const chainBreakdown = d.chainTvls as Record<string, { tvl: Array<{ date: number; totalLiquidityUSD: number }> }> | undefined

    const nodes = (d.chains as string[]).slice(0, 8).map((chain) => {
      const tvl = chainBreakdown?.[chain]?.tvl
      const latestTvl = tvl?.[tvl.length - 1]?.totalLiquidityUSD ?? 0
      return { id: chain, label: chain, value: latestTvl }
    })

    const protocolName = (d.name as string) ?? 'Protocol'
    const centralNode = {
      id: 'protocol',
      label: protocolName,
      value: nodes.reduce((sum, n) => sum + n.value, 0),
    }

    const links = nodes.map((node) => ({
      source: 'protocol',
      target: node.id,
      value: node.value,
    }))

    return { nodes: [centralNode, ...nodes], links }
  }

  return { nodes: [], links: [] }
}

// --- Shape type mapping ---

export function getShapeType(chartType: ChartSpec['type']): string {
  switch (chartType) {
    case 'candlestick': return 'candlestick-chart'
    case 'bar':
    case 'line': return 'barline-chart'
    case 'node-graph': return 'node-graph'
  }
}

// --- Build shape props from chart spec + fetched data ---

export interface ChartData {
  readonly chartType: string
  readonly rawData: unknown
  readonly timeRange?: TimeRange
}

export function buildShapeProps(
  chart: ChartSpec,
  pixelSize: { width: number; height: number },
  data?: ChartData | null,
): Record<string, unknown> {
  const base = {
    w: pixelSize.width,
    h: pixelSize.height,
    title: chart.title,
    chartId: chart.id,
  }

  if (!data?.rawData) {
    return { ...base, data: [] }
  }

  switch (chart.type) {
    case 'candlestick': {
      const raw = data.rawData as { prices: Array<[number, number]> }
      const ohlcData = convertToOHLC(raw.prices ?? [])
      return {
        ...base,
        data: ohlcData,
        timeRange: data.timeRange ?? { start: '', end: '' },
      }
    }
    case 'bar':
    case 'line': {
      const timeValues = convertToTimeValue(data.rawData)
      return {
        ...base,
        chartType: chart.type,
        data: timeValues,
        timeRange: data.timeRange ?? { start: '', end: '' },
      }
    }
    case 'node-graph': {
      const graph = convertToGraph(data.rawData)
      return {
        ...base,
        nodes: graph.nodes,
        links: graph.links,
      }
    }
    default:
      return { ...base, data: [] }
  }
}
