import type { DataQuery } from '~/schemas/board-schema'

const TOKEN_ALIASES: Record<string, string> = {
  eth: 'ethereum',
  btc: 'bitcoin',
  bnb: 'binancecoin',
  sol: 'solana',
  avax: 'avalanche-2',
}

function resolveToken(token: string): string {
  return TOKEN_ALIASES[token.toLowerCase()] ?? token.toLowerCase()
}

interface PriceDataResult {
  readonly prices: ReadonlyArray<readonly [number, number]>
}

interface MarketDataResult {
  readonly market_data: Record<string, unknown>
}

export async function fetchPriceData(
  query: Extract<DataQuery, { source: 'coingecko' }>,
): Promise<PriceDataResult | MarketDataResult> {
  const token = resolveToken(query.token)
  const apiKey = process.env.COINGECKO_API_KEY

  let url: string
  if (query.query === 'price_history') {
    const currency = query.vs_currency ?? 'usd'
    url = `https://api.coingecko.com/api/v3/coins/${token}/market_chart?vs_currency=${currency}&days=${query.days}`
  } else {
    url = `https://api.coingecko.com/api/v3/coins/${token}`
  }

  const headers: Record<string, string> = { accept: 'application/json' }
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
