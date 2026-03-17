import { BaseBoxShapeUtil, TLShape } from 'tldraw'
import { useEffect, useState } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'

interface GraphNode extends SimulationNodeDatum {
  readonly id: string
  readonly label: string
  readonly value: number
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  readonly label?: string
  readonly value?: number
}

const NODE_GRAPH_TYPE = 'node-graph'

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [NODE_GRAPH_TYPE]: {
      w: number
      h: number
      title: string
      chartId: string
      nodes: Array<{ id: string; label: string; value: number }>
      links: Array<{ source: string; target: string; label?: string; value?: number }>
    }
  }
}

type NodeGraphShape = TLShape<typeof NODE_GRAPH_TYPE>

export class NodeGraphShapeUtil extends BaseBoxShapeUtil<NodeGraphShape> {
  static override type = NODE_GRAPH_TYPE

  override getDefaultProps() {
    return {
      w: 930,
      h: 320,
      title: 'Fund Flow',
      chartId: '',
      nodes: [] as Array<{ id: string; label: string; value: number }>,
      links: [] as Array<{ source: string; target: string; label?: string; value?: number }>,
    }
  }

  override canResize() {
    return true
  }

  override component(shape: NodeGraphShape) {
    return <NodeGraphComponent shape={shape} />
  }

  override indicator(shape: NodeGraphShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }
}

function NodeGraphComponent({ shape }: { readonly shape: NodeGraphShape }) {
  const { w, h, title, nodes: inputNodes, links: inputLinks } = shape.props
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([])
  const [simulatedLinks, setSimulatedLinks] = useState<GraphLink[]>([])

  useEffect(() => {
    if (inputNodes.length === 0) return

    const nodes: GraphNode[] = inputNodes.map((n) => ({ ...n }))
    const links: GraphLink[] = inputLinks.map((l) => ({ ...l }))

    const simulation = forceSimulation(nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(100),
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(w / 2, (h - 30) / 2))
      .stop()

    // Run simulation to completion synchronously (single render)
    simulation.tick(300)

    setSimulatedNodes([...nodes])
    setSimulatedLinks([...links])
  }, [inputNodes, inputLinks, w, h])

  const maxValue = Math.max(...inputNodes.map((n) => n.value), 1)

  return (
    <div
      style={{
        width: w,
        height: h,
        background: '#16213e',
        borderRadius: 8,
        overflow: 'hidden',
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#ff6b6b',
          borderBottom: '1px solid #1e3a5f',
        }}
      >
        {title}
      </div>
      <svg width={w} height={h - 30}>
        <defs>
          <marker id="node-arrow" markerWidth="8" markerHeight="6" refX="20" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#ffd700" opacity="0.6" />
          </marker>
        </defs>
        {simulatedLinks.map((link, i) => {
          const source = link.source as GraphNode
          const target = link.target as GraphNode
          if (!source.x || !source.y || !target.x || !target.y) return null
          return (
            <g key={i}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#ffd700"
                strokeWidth={1.5}
                opacity={0.5}
                markerEnd="url(#node-arrow)"
              />
              {link.label && (
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 - 8}
                  fill="#ffd700"
                  fontSize={9}
                  textAnchor="middle"
                  opacity={0.8}
                >
                  {link.label}
                </text>
              )}
            </g>
          )
        })}
        {simulatedNodes.map((node) => {
          if (!node.x || !node.y) return null
          const radius = 15 + (node.value / maxValue) * 15
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill="#1a3a5c"
                stroke="#00d2ff"
                strokeWidth={2}
              />
              <text x={node.x} y={node.y + 4} fill="#fff" fontSize={10} textAnchor="middle">
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
