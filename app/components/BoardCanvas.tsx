import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useCallback } from 'react'
import { CandlestickShapeUtil } from '~/shapes/CandlestickShape'
import { BarLineShapeUtil } from '~/shapes/BarLineShape'
import { NodeGraphShapeUtil } from '~/shapes/NodeGraphShape'

const customShapeUtils = [CandlestickShapeUtil, BarLineShapeUtil, NodeGraphShapeUtil]

interface BoardCanvasProps {
  readonly onEditorReady: (editor: Editor) => void
}

export function BoardCanvas({ onEditorReady }: BoardCanvasProps) {
  const handleMount = useCallback(
    (editor: Editor) => {
      onEditorReady(editor)
    },
    [onEditorReady],
  )

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Tldraw shapeUtils={customShapeUtils} onMount={handleMount} />
    </div>
  )
}
