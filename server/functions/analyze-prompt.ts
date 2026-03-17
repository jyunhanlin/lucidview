import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createLLMClient } from '../lib/llm-client'
import { boardSchemaSummarySchema, type BoardResponse } from '~/schemas/board-schema'

const inputSchema = z.object({
  prompt: z.string().min(1),
  existingSchema: boardSchemaSummarySchema.optional(),
})

export const analyzePrompt = createServerFn({ method: 'POST' })
  .validator(inputSchema)
  .handler(async ({ data }): Promise<BoardResponse> => {
    const provider = process.env.LLM_PROVIDER ?? 'claude-p'
    const client = createLLMClient(provider)

    const MAX_RETRIES = 2
    let lastError: Error | null = null
    let promptWithFeedback = data.prompt

    // Intentional sequential retry — each attempt depends on the previous error
    // eslint-disable-next-line no-await-in-loop
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await client.generate(promptWithFeedback, data.existingSchema)
        return result
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        // Append error feedback to prompt for next attempt so LLM can self-correct
        promptWithFeedback = `${data.prompt}\n\n[PREVIOUS ATTEMPT FAILED: ${lastError.message}. Please fix the output format and try again.]`
      }
    }

    throw new Error(`LLM failed after ${MAX_RETRIES} attempts: ${lastError?.message}`)
  })
