import { BaseBoxShapeUtil, TLShape } from 'tldraw'
import { useEffect, useRef } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts'
import { useSyncStore } from '~/stores/sync-store'

const BARLINE_TYPE = 'barline-chart'

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [BARLINE_TYPE]: {
      w: number
      h: number
      title: string
      chartId: string
      chartType: 'bar' | 'line'
      data: Array<{ time: string; value: number }>
      timeRange: { start: string; end: string }
    }
  }
}

type BarLineShape = TLShape<typeof BARLINE_TYPE>

export class BarLineShapeUtil extends BaseBoxShapeUtil<BarLineShape> {
  static override type = BARLINE_TYPE

  override getDefaultProps() {
    return {
      w: 450,
      h: 320,
      title: 'Chart',
      chartId: '',
      chartType: 'bar' as const,
      data: [] as Array<{ time: string; value: number }>,
      timeRange: { start: '', end: '' },
    }
  }

  override canResize() {
    return true
  }

  override component(shape: BarLineShape) {
    return <BarLineChartComponent shape={shape} />
  }

  override indicator(shape: BarLineShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
  }
}

function BarLineChartComponent({ shape }: { readonly shape: BarLineShape }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | ISeriesApi<'Line'> | null>(null)
  const { setHover, clearHover, hoveredTimestamp, hoveredChartId } = useSyncStore()
  const { w, h, title, chartId, chartType, data } = shape.props

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

    const series =
      chartType === 'bar'
        ? chart.addSeries(HistogramSeries, { color: '#00d2ff' })
        : chart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 2 })

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
  }, [w, h, data, chartId, chartType, setHover, clearHover])

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    if (hoveredChartId === chartId || !hoveredTimestamp) return

    chartRef.current.setCrosshairPosition(NaN, hoveredTimestamp as any, seriesRef.current)
  }, [hoveredTimestamp, hoveredChartId, chartId])

  const titleColor = chartType === 'bar' ? '#00d2ff' : '#a78bfa'

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
          color: titleColor,
          borderBottom: '1px solid #1e3a5f',
        }}
      >
        {title}
      </div>
      <div ref={containerRef} />
    </div>
  )
}
