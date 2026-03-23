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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- TanStack Start serialization requires {} over unknown
  readonly rawData: Record<string, {}> | null
}

async function fetchDataForQuery(query: DataQuery): Promise<Record<string, {}>> {
  let result: unknown
  switch (query.source) {
    case 'coingecko':
      result = await fetchPriceData(query)
      break
    case 'defillama':
      result =
        query.query === 'eth2_staking'
          ? await fetchStakingData(query)
          : await fetchFlowData(query)
      break
  }
  return result as Record<string, {}>
}

export const fetchAllChartData = createServerFn({ method: 'POST' })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
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
