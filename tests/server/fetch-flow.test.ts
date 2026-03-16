import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchFlowData } from '../../server/functions/fetch-flow'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchFlowData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches protocol TVL from DeFiLlama', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tvl: [{ date: 1681257600, totalLiquidityUSD: 5000000 }] }),
    })

    const result = await fetchFlowData({
      source: 'defillama',
      query: 'protocol_tvl',
      protocol: 'lido',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.llama.fi/protocol/lido'),
      expect.any(Object),
    )
    expect(result).toBeDefined()
  })

  it('fetches chain TVL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ date: 1681257600, tvl: 50000000 }]),
    })

    const result = await fetchFlowData({
      source: 'defillama',
      query: 'chain_tvl',
      chain: 'Ethereum',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.llama.fi/v2/historicalChainTvl/Ethereum'),
      expect.any(Object),
    )
    expect(result).toBeDefined()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
    await expect(
      fetchFlowData({ source: 'defillama', query: 'protocol_tvl', protocol: 'unknown' }),
    ).rejects.toThrow()
  })
})
