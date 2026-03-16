import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CandlestickShapeUtil } from '~/shapes/CandlestickShape'
import { BarLineShapeUtil } from '~/shapes/BarLineShape'
import { NodeGraphShapeUtil } from '~/shapes/NodeGraphShape'

const customShapeUtils = [CandlestickShapeUtil, BarLineShapeUtil, NodeGraphShapeUtil]
const STORAGE_KEY = 'lucidview-board'

interface BoardCanvasProps {
  readonly onEditorReady: (editor: Editor) => void
}

export function BoardCanvas({ onEditorReady }: BoardCanvasProps) {
  const editorRef = useRef<Editor | null>(null)
  const [editorReady, setEditorReady] = useState(false)

  const handleMount = useCallback(
    (editor: Editor) => {
      // Restore from localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const snapshot = JSON.parse(saved)
          editor.loadSnapshot(snapshot)
        }
      } catch (err) {
        console.warn('Failed to restore board:', err)
      }

      editorRef.current = editor
      setEditorReady(true)
      onEditorReady(editor)
    },
    [onEditorReady],
  )

  // Auto-save subscription with proper useEffect cleanup
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    let saveTimeout: ReturnType<typeof setTimeout>
    const unsub = editor.store.listen(() => {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        try {
          const snapshot = editor.getSnapshot()
          localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
        } catch (err) {
          console.warn('Failed to save board:', err)
        }
      }, 2000)
    })

    return () => {
      unsub()
      clearTimeout(saveTimeout)
    }
  }, [editorReady])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Tldraw shapeUtils={customShapeUtils} onMount={handleMount} />
    </div>
  )
}
