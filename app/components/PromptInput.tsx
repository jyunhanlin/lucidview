import { useState, useCallback, type KeyboardEvent } from 'react'

interface PromptInputProps {
  readonly onSubmit: (prompt: string) => void
  readonly isLoading: boolean
  readonly clarification?: string | null
}

export function PromptInput({ onSubmit, isLoading, clarification }: PromptInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed && !isLoading) {
      onSubmit(trimmed)
      setValue('')
    }
  }, [value, isLoading, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#1a1a2e',
          border: '1px solid #0f3460',
          borderRadius: 12,
          padding: '8px 16px',
          width: 600,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your research... (e.g., 'Analyze ETH Shanghai upgrade')"
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e0e0',
            fontSize: 14,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !value.trim()}
          style={{
            background: isLoading ? '#333' : '#0f3460',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          {isLoading ? 'Analyzing...' : 'Generate'}
        </button>
      </div>
      {clarification && (
        <div
          style={{
            background: '#2a1a3e',
            border: '1px solid #6b3fa0',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#d0b0ff',
            fontSize: 13,
            maxWidth: 600,
          }}
        >
          AI asks: {clarification}
        </div>
      )}
    </div>
  )
}
