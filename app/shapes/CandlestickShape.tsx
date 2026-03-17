import { BaseBoxShapeUtil, TLShape } from 'tldraw'
import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, CandlestickSeries } from 'lightweight-charts'
import { useSyncStore } from '~/stores/sync-store'

const CANDLESTICK_TYPE = 'candlestick-chart'

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [CANDLESTICK_TYPE]: {
      w: number
      h: number
      title: string
      chartId: string
      data: Array<{ time: string; open: number; high: number; low: number; close: number }>
      timeRange: { start: string; end: string }
    }
  }
}

type CandlestickShape = TLShape<typeof CANDLESTICK_TYPE>

export class CandlestickShapeUtil extends BaseBoxShapeUtil<CandlestickShape> {
  static override type = CANDLESTICK_TYPE

  override getDefaultProps() {
    return {
      w: 450,
      h: 320,
      title: 'Price Chart',
      chartId: '',
      data: [] as Array<{ time: string; open: number; high: number; low: number; close: number }>,
      timeRange: { start: '', end: '' },
    }
  }

  override canResize() {
    return true
  }

  override component(shape: CandlestickShape) {
    return <CandlestickChartComponent shape={shape} />
  }

  override indicator(shape: CandlestickShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }
}

function CandlestickChartComponent({ shape }: { readonly shape: CandlestickShape }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const { setHover, clearHover, hoveredTimestamp, hoveredChartId } = useSyncStore()
  const { w, h, title, chartId, data } = shape.props

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return

    const chart = createChart(containerRef.current, {
      width: w,
      height: h - 30,
      layout: {
        background: { color: '#16213e' },
        textColor: '#ccc',
      },
      grid: {
        vertLines: { color: '#1e3a5f' },
        horzLines: { color: '#1e3a5f' },
      },
      crosshair: { mode: 0 },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff88',
      downColor: '#e94560',
      borderVisible: false,
      wickUpColor: '#00ff88',
      wickDownColor: '#e94560',
    })

    if (data.length > 0) {
      series.setData(data)
      chart.timeScale().fitContent()
    }

    chart.subscribeCrosshairMove((param) => {
      if (param.time && chartId) {
        setHover(chartId, String(param.time))
      } else {
        clearHover()
      }
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [w, h, data, chartId, setHover, clearHover])

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    if (hoveredChartId === chartId || !hoveredTimestamp) return

    chartRef.current.setCrosshairPosition(NaN, hoveredTimestamp as any, seriesRef.current)
  }, [hoveredTimestamp, hoveredChartId, chartId])

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
          color: '#e94560',
          borderBottom: '1px solid #1e3a5f',
        }}
      >
        {title}
      </div>
      {!data || data.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: h - 30,
            color: '#666',
            fontSize: 13,
          }}
        >
          No data available
        </div>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  )
}
