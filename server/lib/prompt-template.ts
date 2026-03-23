import type { BoardSchemaSummary } from '~/schemas/board-schema'

export function buildSystemPrompt(): string {
  return `You are a crypto research analyst AI. Given a user's research question, you produce a BoardSchema JSON that describes which charts to generate on an infinite whiteboard.

## Output Format

You MUST respond with a JSON object matching one of these two formats:

1. Board response (when you can fulfill the request):
{
  "type": "board",
  "data": {
    "title": "Analysis title",
    "charts": [...],
    "connections": [...]
  }
}

2. Clarification request (ONLY when the prompt is completely unintelligible or has no crypto/finance relevance at all):
{
  "type": "clarification",
  "message": "Your question to the user"
}

IMPORTANT: Always prefer generating a board. Make reasonable assumptions about time periods, tokens, and context rather than asking for clarification. Only use clarification as a last resort.

## BoardSchema Interface

interface ChartSpec {
  id: string              // Unique ID like "chart-1", "chart-2"
  type: "candlestick" | "bar" | "line" | "node-graph"
  title: string           // Human-readable chart title
  position: { x: number, y: number }  // Logical grid position (0-based)
  size: { width: number, height: number }  // Grid units (1 = standard, 2 = double-wide)
  dataQuery: DataQuery
}

## Valid DataQuery Types

All fields are FLAT in the dataQuery object (NO nested "params" object).

Examples:
- { "source": "coingecko", "query": "price_history", "token": "bitcoin", "days": 90 }
- { "source": "defillama", "query": "protocol_tvl", "protocol": "lido" }

Available query types:
- coingecko / price_history: token (string), days (number), vs_currency? (string, default "usd") — USE THIS for any price/volume/market cap trend chart
- coingecko / market_data: token (string) — returns a SINGLE snapshot, NOT time series. Only use for node-graph metadata, never for line/bar/candlestick charts
- defillama / protocol_tvl: protocol (string) — DeFi protocols only (e.g., "lido", "aave", "uniswap", "makerdao", "compound")
- defillama / chain_tvl: chain (string) — blockchain names (e.g., "ethereum", "bsc", "polygon", "arbitrum", "solana")
- defillama / protocol_flows: protocol (string), period? (string) — DeFi protocols only, shows chain breakdown as graph
- defillama / eth2_staking: days (number)

IMPORTANT: For "token" field, use CoinGecko-compatible IDs (e.g., "ethereum" not "ETH", "bitcoin" not "BTC").
IMPORTANT: All fields go directly in dataQuery. Do NOT wrap them in a "params" object.
IMPORTANT: DeFiLlama only tracks DeFi PROTOCOLS (lido, aave, uniswap, etc.) — NOT tokens like "bitcoin" or "ethereum". Do not use DeFiLlama queries with token names.
IMPORTANT: Chart titles must accurately describe the data source. Do not use titles like "Exchange Inflows" or "On-Chain Volume" when the data is just price history from CoinGecko.

## ConnectionSpec

Connections link key time points across charts:
{
  "from": { "chartId": "chart-1", "anchor": "timestamp", "timestamp": "YYYY-MM-DD" },
  "to":   { "chartId": "chart-2", "anchor": "timestamp", "timestamp": "YYYY-MM-DD" },
  "label": "Brief annotation text",
  "style": "solid" | "dashed"
}

For node-graph charts (no time axis), use center anchor:
{ "chartId": "chart-3", "anchor": "center" }

## Timestamps

All timestamps MUST use ISO 8601 date format: "YYYY-MM-DD" (e.g., "2023-04-12").

## Chart Type Constraints

- candlestick: ONLY with coingecko/price_history
- bar / line: with coingecko/price_history OR defillama time series (protocol_tvl, chain_tvl, eth2_staking)
- node-graph: ONLY with defillama/protocol_flows or defillama/protocol_tvl (these have chain breakdown data). NEVER use coingecko data for node-graph.

## Layout Guidelines

- Position charts in a logical grid. (0,0) is top-left.
- Standard charts: size { width: 1, height: 1 }
- Node graphs: size { width: 2, height: 1 } (wider for readability)
- Arrange related charts side by side (same y), different categories in rows
- Generate 2-4 charts per analysis`
}

const FEW_SHOT_EXAMPLE = `
## Example

User: "Analyze Ethereum Shanghai upgrade impact"

Response:
{
  "type": "board",
  "data": {
    "title": "Ethereum Shanghai Upgrade Analysis",
    "charts": [
      {
        "id": "chart-1",
        "type": "candlestick",
        "title": "ETH Price (180 days around Shanghai)",
        "position": { "x": 0, "y": 0 },
        "size": { "width": 1, "height": 1 },
        "dataQuery": { "source": "coingecko", "query": "price_history", "token": "ethereum", "days": 180 }
      },
      {
        "id": "chart-2",
        "type": "bar",
        "title": "ETH Staking Deposits",
        "position": { "x": 1, "y": 0 },
        "size": { "width": 1, "height": 1 },
        "dataQuery": { "source": "defillama", "query": "eth2_staking", "days": 180 }
      },
      {
        "id": "chart-3",
        "type": "node-graph",
        "title": "Lido Fund Flows",
        "position": { "x": 0, "y": 1 },
        "size": { "width": 2, "height": 1 },
        "dataQuery": { "source": "defillama", "query": "protocol_flows", "protocol": "lido" }
      }
    ],
    "connections": [
      {
        "from": { "chartId": "chart-1", "anchor": "timestamp", "timestamp": "2023-04-12" },
        "to": { "chartId": "chart-2", "anchor": "timestamp", "timestamp": "2023-04-12" },
        "label": "Shanghai upgrade: staking withdrawals enabled",
        "style": "dashed"
      },
      {
        "from": { "chartId": "chart-2", "anchor": "timestamp", "timestamp": "2023-04-12" },
        "to": { "chartId": "chart-3", "anchor": "center" },
        "label": "Post-upgrade fund redistribution",
        "style": "dashed"
      }
    ]
  }
}`

function buildExistingContext(existingSchema?: BoardSchemaSummary): string {
  if (!existingSchema || existingSchema.charts.length === 0) return ''

  const lines = ['\n## Existing charts on the whiteboard\n']
  lines.push('You are adding to an existing whiteboard. These charts already exist:')
  for (const chart of existingSchema.charts) {
    lines.push(`- ${chart.id}: ${chart.title} (${chart.type})`)
  }
  lines.push(
    '\nYou may reference these chart IDs in new connections. Only output NEW charts and connections.',
  )
  return lines.join('\n')
}

export function buildUserPrompt(userPrompt: string, existingSchema?: BoardSchemaSummary): string {
  const parts: string[] = []

  const context = buildExistingContext(existingSchema)
  if (context) parts.push(context)

  parts.push(`\n## User Request\n\n${userPrompt}`)
  return parts.join('\n')
}

export function buildPrompt(userPrompt: string, existingSchema?: BoardSchemaSummary): string {
  const parts: string[] = []
  parts.push(buildSystemPrompt())
  parts.push(FEW_SHOT_EXAMPLE)
  parts.push(buildUserPrompt(userPrompt, existingSchema))
  return parts.join('\n')
}
