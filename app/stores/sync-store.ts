import { create } from 'zustand'

interface SyncStore {
  readonly hoveredTimestamp: string | null
  readonly hoveredChartId: string | null
  readonly setHover: (chartId: string, timestamp: string) => void
  readonly clearHover: () => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  hoveredTimestamp: null,
  hoveredChartId: null,
  setHover: (chartId, timestamp) =>
    set({ hoveredChartId: chartId, hoveredTimestamp: timestamp }),
  clearHover: () =>
    set({ hoveredChartId: null, hoveredTimestamp: null }),
}))
