import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPriceData } from '../../server/functions/fetch-price'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchPriceData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches price history from CoinGecko', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        prices: [
          [1681257600000, 1850.5],
          [1681344000000, 1900.2],
        ],
      }),
    })

    const result = await fetchPriceData({
      source: 'coingecko',
      query: 'price_history',
      token: 'ethereum',
      days: 180,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.coingecko.com'),
      expect.any(Object),
    )
    expect(result).toHaveProperty('prices')
    expect(result.prices).toHaveLength(2)
  })

  it('handles common token aliases', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prices: [] }),
    })

    await fetchPriceData({
      source: 'coingecko',
      query: 'price_history',
      token: 'eth',
      days: 30,
    })

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('ethereum'), expect.any(Object))
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })

    await expect(
      fetchPriceData({ source: 'coingecko', query: 'price_history', token: 'ethereum', days: 30 }),
    ).rejects.toThrow()
  })
})
