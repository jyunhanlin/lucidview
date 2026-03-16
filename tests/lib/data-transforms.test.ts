import { describe, it, expect } from 'vitest'
import {
  extractTimeRange,
  convertToOHLC,
  convertToTimeValue,
  convertToGraph,
  getShapeType,
  buildShapeProps,
} from '~/lib/data-transforms'

describe('extractTimeRange', () => {
  it('extracts range from CoinGecko prices array', () => {
    const data = {
      prices: [
        [1672531200000, 1200], // 2023-01-01
        [1672617600000, 1250], // 2023-01-02
        [1672704000000, 1300], // 2023-01-03
      ],
    }
    const range = extractTimeRange(data)
    expect(range).toBeDefined()
    expect(range!.start).toBe('2023-01-01')
    expect(range!.end).toBe('2023-01-03')
  })

  it('extracts range from DeFiLlama array format', () => {
    const data = [
      { date: 1672531200, totalLiquidityUSD: 1000000 }, // 2023-01-01
      { date: 1672617600, totalLiquidityUSD: 1100000 }, // 2023-01-02
    ]
    const range = extractTimeRange(data)
    expect(range).toBeDefined()
    expect(range!.start).toBe('2023-01-01')
    expect(range!.end).toBe('2023-01-02')
  })

  it('extracts range from DeFiLlama tvl nested format', () => {
    const data = {
      tvl: [
        { date: 1672531200, totalLiquidityUSD: 5000000 },
        { date: 1672704000, totalLiquidityUSD: 5500000 },
      ],
    }
    const range = extractTimeRange(data)
    expect(range).toBeDefined()
    expect(range!.start).toBe('2023-01-01')
    expect(range!.end).toBe('2023-01-03')
  })

  it('returns undefined for null/empty data', () => {
    expect(extractTimeRange(null)).toBeUndefined()
    expect(extractTimeRange({})).toBeUndefined()
    expect(extractTimeRange({ prices: [] })).toBeUndefined()
  })
})

describe('convertToOHLC', () => {
  it('groups prices by day into OHLC candles', () => {
    const prices: Array<[number, number]> = [
      [1672531200000, 100], // 2023-01-01 00:00
      [1672534800000, 110], // 2023-01-01 01:00
      [1672538400000, 95],  // 2023-01-01 02:00
      [1672617600000, 105], // 2023-01-02 00:00
    ]
    const result = convertToOHLC(prices)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      time: '2023-01-01',
      open: 100,
      high: 110,
      low: 95,
      close: 95,
    })
    expect(result[1].time).toBe('2023-01-02')
  })

  it('returns empty array for empty input', () => {
    expect(convertToOHLC([])).toEqual([])
  })
})

describe('convertToTimeValue', () => {
  it('converts CoinGecko prices format', () => {
    const data = {
      prices: [[1672531200000, 1200], [1672617600000, 1250]],
    }
    const result = convertToTimeValue(data)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ time: '2023-01-01', value: 1200 })
  })

  it('converts DeFiLlama array format', () => {
    const data = [
      { date: 1672531200, totalLiquidityUSD: 1000000 },
      { date: 1672617600, tvl: 1100000 },
    ]
    const result = convertToTimeValue(data)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(1000000)
    expect(result[1].value).toBe(1100000)
  })

  it('converts DeFiLlama tvl nested format', () => {
    const data = {
      tvl: [{ date: 1672531200, totalLiquidityUSD: 5000000 }],
    }
    const result = convertToTimeValue(data)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(5000000)
  })

  it('returns empty array for unrecognized format', () => {
    expect(convertToTimeValue({ unknown: true })).toEqual([])
    expect(convertToTimeValue('string')).toEqual([])
  })
})

describe('convertToGraph', () => {
  it('converts DeFiLlama protocol data with chains', () => {
    const data = {
      name: 'Lido',
      chains: ['Ethereum', 'Polygon'],
      chainTvls: {
        Ethereum: { tvl: [{ date: 1672531200, totalLiquidityUSD: 8000000 }] },
        Polygon: { tvl: [{ date: 1672531200, totalLiquidityUSD: 2000000 }] },
      },
    }
    const result = convertToGraph(data)
    expect(result.nodes).toHaveLength(3) // protocol + 2 chains
    expect(result.nodes[0].label).toBe('Lido')
    expect(result.links).toHaveLength(2)
    expect(result.links[0].source).toBe('protocol')
  })

  it('returns empty graph for unrecognized data', () => {
    const result = convertToGraph({ unknown: true })
    expect(result.nodes).toEqual([])
    expect(result.links).toEqual([])
  })
})

describe('getShapeType', () => {
  it('maps candlestick to candlestick-chart', () => {
    expect(getShapeType('candlestick')).toBe('candlestick-chart')
  })

  it('maps bar and line to barline-chart', () => {
    expect(getShapeType('bar')).toBe('barline-chart')
    expect(getShapeType('line')).toBe('barline-chart')
  })

  it('maps node-graph to node-graph', () => {
    expect(getShapeType('node-graph')).toBe('node-graph')
  })
})
