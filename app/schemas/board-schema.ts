import { z } from 'zod'

// --- DataQuery discriminated union ---

const coingeckoPriceHistory = z.object({
  source: z.literal('coingecko'),
  query: z.literal('price_history'),
  token: z.string(),
  days: z.number().int().positive(),
  vs_currency: z.string().optional(),
})

const coingeckoMarketData = z.object({
  source: z.literal('coingecko'),
  query: z.literal('market_data'),
  token: z.string(),
})

const defillamaProtocolTvl = z.object({
  source: z.literal('defillama'),
  query: z.literal('protocol_tvl'),
  protocol: z.string(),
})

const defillamaChainTvl = z.object({
  source: z.literal('defillama'),
  query: z.literal('chain_tvl'),
  chain: z.string(),
})

const defillamaProtocolFlows = z.object({
  source: z.literal('defillama'),
  query: z.literal('protocol_flows'),
  protocol: z.string(),
  period: z.string().optional(),
})

const defillamaEth2Staking = z.object({
  source: z.literal('defillama'),
  query: z.literal('eth2_staking'),
  days: z.number().int().positive(),
})

export const dataQuerySchema = z.discriminatedUnion('query', [
  coingeckoPriceHistory,
  coingeckoMarketData,
  defillamaProtocolTvl,
  defillamaChainTvl,
  defillamaProtocolFlows,
  defillamaEth2Staking,
])

// --- Connection endpoints ---

const timestampAnchor = z.object({
  chartId: z.string(),
  anchor: z.literal('timestamp'),
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const centerAnchor = z.object({
  chartId: z.string(),
  anchor: z.literal('center'),
})

const connectionEndpointSchema = z.discriminatedUnion('anchor', [
  timestampAnchor,
  centerAnchor,
])

export const connectionSpecSchema = z.object({
  from: connectionEndpointSchema,
  to: connectionEndpointSchema,
  label: z.string(),
  style: z.enum(['solid', 'dashed']),
})

// --- ChartSpec ---

export const chartSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['candlestick', 'bar', 'line', 'node-graph']),
  title: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
  dataQuery: dataQuerySchema,
})

// --- BoardSchema ---

export const boardSchemaSchema = z.object({
  title: z.string(),
  charts: z.array(chartSpecSchema),
  connections: z.array(connectionSpecSchema),
})

// --- BoardResponse (discriminated union) ---

const boardResult = z.object({
  type: z.literal('board'),
  data: boardSchemaSchema,
})

const clarificationResult = z.object({
  type: z.literal('clarification'),
  message: z.string(),
})

export const boardResponseSchema = z.discriminatedUnion('type', [
  boardResult,
  clarificationResult,
])

// --- BoardSchemaSummary (for follow-up context) ---

export const boardSchemaSummarySchema = z.object({
  charts: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
  })),
})

// --- Inferred types ---

export type DataQuery = z.infer<typeof dataQuerySchema>
export type ConnectionEndpoint = z.infer<typeof connectionEndpointSchema>
export type ConnectionSpec = z.infer<typeof connectionSpecSchema>
export type ChartSpec = z.infer<typeof chartSpecSchema>
export type BoardSchema = z.infer<typeof boardSchemaSchema>
export type BoardResponse = z.infer<typeof boardResponseSchema>
export type BoardSchemaSummary = z.infer<typeof boardSchemaSummarySchema>
