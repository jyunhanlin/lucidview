import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { dataQuerySchema, type DataQuery } from '~/schemas/board-schema'
import { fetchPriceData } from './fetch-price'
import { fetchStakingData } from './fetch-staking'
import { fetchFlowData } from './fetch-flow'

const inputSchema = z.object({
  charts: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      dataQuery: dataQuerySchema,
    }),
  ),
})

export interface ChartDataResult {
  readonly id: string
  readonly chartType: string
  readonly rawData: unknown
}

async function fetchDataForQuery(query: DataQuery): Promise<unknown> {
  switch (query.source) {
    case 'coingecko':
      return fetchPriceData(query)
    case 'defillama':
      if (query.query === 'eth2_staking') {
        return fetchStakingData(query)
      }
      return fetchFlowData(query)
  }
}

export const fetchAllChartData = createServerFn({ method: 'POST' })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<ChartDataResult[]> => {
    const results = await Promise.all(
      data.charts.map(async (chart) => {
        try {
          const rawData = await fetchDataForQuery(chart.dataQuery)
          return { id: chart.id, chartType: chart.type, rawData }
        } catch (err) {
          console.error(`Failed to fetch data for ${chart.id}:`, err)
          return { id: chart.id, chartType: chart.type, rawData: null }
        }
      }),
    )
    return results
  })
