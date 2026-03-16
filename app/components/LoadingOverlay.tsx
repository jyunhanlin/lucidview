interface LoadingOverlayProps {
  readonly phase: 'analyzing' | 'fetching' | 'rendering' | null
}

const PHASE_LABELS = {
  analyzing: 'AI analyzing your prompt...',
  fetching: 'Fetching data from APIs...',
  rendering: 'Rendering whiteboard...',
} as const

export function LoadingOverlay({ phase }: LoadingOverlayProps) {
  if (!phase) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(10, 10, 30, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid #0f3460',
          borderRadius: 12,
          padding: '24px 40px',
          color: '#e0e0e0',
          fontSize: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: 12 }}>{PHASE_LABELS[phase]}</div>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #0f3460',
            borderTopColor: '#00d2ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
