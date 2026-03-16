import type { DataQuery } from '~/schemas/board-schema'

export async function fetchStakingData(
  query: Extract<DataQuery, { query: 'eth2_staking' }>,
): Promise<unknown> {
  const url = `https://api.llama.fi/protocol/lido`

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`DeFiLlama API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const nowMs = Date.now()
  const startMs = nowMs - query.days * 24 * 60 * 60 * 1000
  const tvlHistory = (data.tvl ?? []).filter(
    (entry: { date: number }) => entry.date * 1000 >= startMs,
  )

  return tvlHistory
}
