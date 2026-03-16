import type { DataQuery } from '~/schemas/board-schema'

// Handles protocol_tvl, chain_tvl, protocol_flows queries.
// eth2_staking is handled by fetchStakingData — do NOT add it here.
export async function fetchFlowData(
  query: Extract<DataQuery, { source: 'defillama'; query: 'protocol_tvl' | 'chain_tvl' | 'protocol_flows' }>,
): Promise<unknown> {
  let url: string

  switch (query.query) {
    case 'protocol_tvl':
      url = `https://api.llama.fi/protocol/${query.protocol}`
      break
    case 'chain_tvl':
      url = `https://api.llama.fi/v2/historicalChainTvl/${query.chain}`
      break
    case 'protocol_flows':
      url = `https://api.llama.fi/protocol/${query.protocol}`
      break
    default:
      throw new Error(`Unknown DeFiLlama query type`)
  }

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`DeFiLlama API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
