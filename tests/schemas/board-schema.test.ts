import { describe, it, expect } from 'vitest'
import {
  boardResponseSchema,
  boardSchemaSchema,
  chartSpecSchema,
  dataQuerySchema,
  connectionSpecSchema,
  type BoardResponse,
  type BoardSchema,
  type ChartSpec,
  type DataQuery,
} from '~/schemas/board-schema'

describe('dataQuerySchema', () => {
  it('accepts valid coingecko price_history query', () => {
    const query = { source: 'coingecko', query: 'price_history', token: 'ethereum', days: 180 }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('accepts coingecko price_history with optional vs_currency', () => {
    const query = {
      source: 'coingecko',
      query: 'price_history',
      token: 'bitcoin',
      days: 90,
      vs_currency: 'eur',
    }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('accepts valid defillama protocol_tvl query', () => {
    const query = { source: 'defillama', query: 'protocol_tvl', protocol: 'lido' }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('accepts valid defillama eth2_staking query', () => {
    const query = { source: 'defillama', query: 'eth2_staking', days: 180 }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('rejects unknown source', () => {
    const query = { source: 'unknown', query: 'price_history', token: 'eth', days: 30 }
    expect(() => dataQuerySchema.parse(query)).toThrow()
  })

  it('rejects unknown query type', () => {
    const query = { source: 'coingecko', query: 'unknown_query', token: 'eth' }
    expect(() => dataQuerySchema.parse(query)).toThrow()
  })

  it('rejects days as string instead of number', () => {
    const query = { source: 'coingecko', query: 'price_history', token: 'ethereum', days: '180' }
    expect(() => dataQuerySchema.parse(query)).toThrow()
  })
})

describe('connectionSpecSchema', () => {
  it('accepts timestamp anchor connection', () => {
    const conn = {
      from: { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2023-04-12' },
      to: { chartId: 'chart-2', anchor: 'timestamp', timestamp: '2023-04-12' },
      label: 'Price impact',
      style: 'dashed',
    }
    expect(connectionSpecSchema.parse(conn)).toEqual(conn)
  })

  it('accepts center anchor connection for node graphs', () => {
    const conn = {
      from: { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2023-04-12' },
      to: { chartId: 'chart-3', anchor: 'center' },
      label: 'Fund flow',
      style: 'solid',
    }
    expect(connectionSpecSchema.parse(conn)).toEqual(conn)
  })

  it('rejects invalid anchor type', () => {
    const conn = {
      from: { chartId: 'chart-1', anchor: 'invalid' },
      to: { chartId: 'chart-2', anchor: 'center' },
      label: 'test',
      style: 'solid',
    }
    expect(() => connectionSpecSchema.parse(conn)).toThrow()
  })
})

describe('boardResponseSchema', () => {
  it('accepts valid board response', () => {
    const response: BoardResponse = {
      type: 'board',
      data: {
        title: 'ETH Analysis',
        charts: [
          {
            id: 'chart-1',
            type: 'candlestick',
            title: 'ETH Price',
            position: { x: 0, y: 0 },
            size: { width: 1, height: 1 },
            dataQuery: {
              source: 'coingecko',
              query: 'price_history',
              token: 'ethereum',
              days: 180,
            },
          },
        ],
        connections: [],
      },
    }
    expect(boardResponseSchema.parse(response)).toEqual(response)
  })

  it('accepts clarification response', () => {
    const response = {
      type: 'clarification',
      message: 'Which time range would you like to analyze?',
    }
    expect(boardResponseSchema.parse(response)).toEqual(response)
  })

  it('rejects response with missing type', () => {
    const response = { data: { title: 'test', charts: [], connections: [] } }
    expect(() => boardResponseSchema.parse(response)).toThrow()
  })
})
