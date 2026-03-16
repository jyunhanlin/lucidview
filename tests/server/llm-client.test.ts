import { describe, it, expect } from 'vitest'
import { createLLMClient, parseLLMResponse } from '../../server/lib/llm-client'

describe('createLLMClient', () => {
  it('returns a client with a generate method', () => {
    const client = createLLMClient('claude-p')
    expect(client).toHaveProperty('generate')
    expect(typeof client.generate).toBe('function')
  })

  it('throws for unknown provider', () => {
    expect(() => createLLMClient('unknown' as any)).toThrow('Unknown LLM provider')
  })
})

describe('parseLLMResponse', () => {
  it('parses valid board JSON', () => {
    const json = JSON.stringify({
      type: 'board',
      data: {
        title: 'Test',
        charts: [{
          id: 'chart-1',
          type: 'candlestick',
          title: 'ETH',
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          dataQuery: { source: 'coingecko', query: 'price_history', token: 'ethereum', days: 180 },
        }],
        connections: [],
      },
    })
    const result = parseLLMResponse(json)
    expect(result.type).toBe('board')
  })

  it('parses clarification response', () => {
    const json = JSON.stringify({
      type: 'clarification',
      message: 'Which token?',
    })
    const result = parseLLMResponse(json)
    expect(result.type).toBe('clarification')
  })

  it('throws on invalid JSON', () => {
    expect(() => parseLLMResponse('not json')).toThrow()
  })

  it('throws on valid JSON but invalid schema', () => {
    expect(() => parseLLMResponse('{"type":"board","data":{}}')).toThrow()
  })

  it('extracts JSON from markdown code blocks', () => {
    const wrapped = '```json\n{"type":"clarification","message":"Which token?"}\n```'
    const result = parseLLMResponse(wrapped)
    expect(result.type).toBe('clarification')
  })
})
