import { describe, it, expect } from 'vitest'
import { buildPrompt, buildSystemPrompt, buildUserPrompt } from '../../server/lib/prompt-template'

describe('buildSystemPrompt', () => {
  it('includes BoardSchema interface definition', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('BoardSchema')
    expect(prompt).toContain('ChartSpec')
    expect(prompt).toContain('DataQuery')
    expect(prompt).toContain('ConnectionSpec')
  })

  it('includes all valid data query types', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('price_history')
    expect(prompt).toContain('market_data')
    expect(prompt).toContain('protocol_tvl')
    expect(prompt).toContain('chain_tvl')
    expect(prompt).toContain('protocol_flows')
    expect(prompt).toContain('eth2_staking')
  })

  it('includes CoinGecko token ID instruction', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('ethereum')
    expect(prompt).toMatch(/coingecko.*id/i)
  })

  it('includes YYYY-MM-DD timestamp format instruction', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('YYYY-MM-DD')
  })
})

describe('buildPrompt', () => {
  it('includes user prompt', () => {
    const result = buildPrompt('Analyze ETH Shanghai upgrade')
    expect(result).toContain('Analyze ETH Shanghai upgrade')
  })

  it('includes few-shot example', () => {
    const result = buildPrompt('Analyze BTC halving')
    expect(result).toContain('"type": "board"')
  })

  it('includes existing schema context for follow-ups', () => {
    const existing = { charts: [{ id: 'chart-1', type: 'candlestick', title: 'ETH Price' }] }
    const result = buildPrompt('Add gas fee chart', existing)
    expect(result).toContain('chart-1')
    expect(result).toContain('ETH Price')
  })

  it('omits context section when no existing schema', () => {
    const result = buildPrompt('New analysis')
    expect(result).not.toContain('Existing charts')
  })
})

describe('buildUserPrompt', () => {
  it('includes user prompt text', () => {
    const result = buildUserPrompt('Analyze ETH')
    expect(result).toContain('Analyze ETH')
  })

  it('includes existing context when provided', () => {
    const existing = { charts: [{ id: 'c1', type: 'line', title: 'Test' }] }
    const result = buildUserPrompt('Add more', existing)
    expect(result).toContain('c1')
  })
})
