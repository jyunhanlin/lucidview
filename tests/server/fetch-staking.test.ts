import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchStakingData } from '../../server/functions/fetch-staking'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchStakingData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches ETH staking data from DeFiLlama', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tvl: [{ date: 1681257600, totalLiquidityUSD: 1000000 }] }),
    })

    const result = await fetchStakingData({
      source: 'defillama',
      query: 'eth2_staking',
      days: 180,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.llama.fi'),
      expect.any(Object),
    )
    expect(result).toBeDefined()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    await expect(
      fetchStakingData({ source: 'defillama', query: 'eth2_staking', days: 30 }),
    ).rejects.toThrow()
  })
})
