import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useRef } from 'react'
import type { Editor } from 'tldraw'
import { BoardCanvas } from '~/components/BoardCanvas'
import { PromptInput } from '~/components/PromptInput'
import { LoadingOverlay } from '~/components/LoadingOverlay'
import { analyzePrompt } from '../../server/functions/analyze-prompt'
import { renderBoardSchema } from '~/lib/board-renderer'
import type { BoardSchemaSummary } from '~/schemas/board-schema'

export const Route = createFileRoute('/')({
  component: HomePage,
})

type LoadingPhase = 'analyzing' | 'fetching' | 'rendering' | null

function HomePage() {
  const editorRef = useRef<Editor | null>(null)
  const [loading, setLoading] = useState<LoadingPhase>(null)
  const [clarification, setClarification] = useState<string | null>(null)
  const [boardHistory, setBoardHistory] = useState<BoardSchemaSummary>({ charts: [] })

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const handleSubmit = useCallback(async (prompt: string) => {
    const editor = editorRef.current
    if (!editor) return

    setClarification(null)

    try {
      // Phase 1: AI analysis
      setLoading('analyzing')
      const existing = boardHistory.charts.length > 0 ? boardHistory : undefined
      const response = await analyzePrompt({ data: { prompt, existingSchema: existing } })

      if (response.type === 'clarification') {
        setClarification(response.message)
        setLoading(null)
        return
      }

      const schema = response.data

      // Phase 2+3: Fetch data and render
      setLoading('fetching')
      await renderBoardSchema(editor, schema)
      setLoading(null)

      // Update board history for follow-up prompts
      setBoardHistory((prev) => ({
        charts: [
          ...prev.charts,
          ...schema.charts.map((c) => ({ id: c.id, type: c.type, title: c.title })),
        ],
      }))
    } catch (err) {
      console.error('Board generation failed:', err)
      setClarification(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(null)
    }
  }, [boardHistory])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <BoardCanvas onEditorReady={handleEditorReady} />
      <PromptInput
        onSubmit={handleSubmit}
        isLoading={loading !== null}
        clarification={clarification}
      />
      <LoadingOverlay phase={loading} />
    </div>
  )
}
