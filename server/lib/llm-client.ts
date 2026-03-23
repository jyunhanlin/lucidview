import {
  boardResponseSchema,
  type BoardResponse,
  type BoardSchemaSummary,
} from '~/schemas/board-schema'

export interface LLMClient {
  generate(prompt: string, existingSchema?: BoardSchemaSummary): Promise<BoardResponse>
}

export function parseLLMResponse(raw: string): BoardResponse {
  // Strip markdown code blocks if present
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim()

  const parsed = JSON.parse(jsonStr)
  return boardResponseSchema.parse(parsed)
}

export function createLLMClient(provider: string): LLMClient {
  switch (provider) {
    case 'anthropic':
      return createAnthropicClient()
    case 'claude-p':
      return createClaudePClient()
    case 'gemini':
      return createGeminiClient()
    case 'openai-compatible':
      return createOpenAICompatibleClient()
    default:
      throw new Error(`Unknown LLM provider: ${provider}`)
  }
}

function createAnthropicClient(): LLMClient {
  return {
    async generate(prompt, existingSchema) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const { buildSystemPrompt, buildUserPrompt } = await import('./prompt-template')

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-latest'

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: buildSystemPrompt(),
        messages: [
          { role: 'user', content: buildUserPrompt(prompt, existingSchema) },
          { role: 'assistant', content: '{' },
        ],
      })

      const text =
        '{' +
        response.content
          .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
          .map((block) => block.text)
          .join('')

      return parseLLMResponse(text)
    },
  }
}

function createClaudePClient(): LLMClient {
  return {
    async generate(prompt, existingSchema) {
      const { buildPrompt } = await import('./prompt-template')
      const fullPrompt = buildPrompt(prompt, existingSchema)

      const { execSync } = await import('child_process')
      // IMPORTANT: Use stdin via input option to avoid shell injection
      const result = execSync('claude -p', {
        input: fullPrompt,
        encoding: 'utf-8',
        timeout: 30_000,
      })

      return parseLLMResponse(result)
    },
  }
}

function createGeminiClient(): LLMClient {
  return {
    async generate(prompt, existingSchema) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const { buildSystemPrompt, buildUserPrompt } = await import('./prompt-template')

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        systemInstruction: buildSystemPrompt(),
        generationConfig: { responseMimeType: 'application/json' },
      })

      const userPrompt = buildUserPrompt(prompt, existingSchema)
      const result = await model.generateContent(userPrompt)
      const text = result.response.text()

      return parseLLMResponse(text)
    },
  }
}

function createOpenAICompatibleClient(): LLMClient {
  return {
    async generate(prompt, existingSchema) {
      const OpenAI = (await import('openai')).default
      const { buildSystemPrompt, buildUserPrompt } = await import('./prompt-template')

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        baseURL: process.env.OPENAI_BASE_URL,
      })

      const systemPrompt = buildSystemPrompt()
      const userPrompt = buildUserPrompt(prompt, existingSchema)

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      })

      const text = response.choices[0]?.message?.content ?? ''
      return parseLLMResponse(text)
    },
  }
}
