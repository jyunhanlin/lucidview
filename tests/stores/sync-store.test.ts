import { describe, it, expect, beforeEach } from 'vitest'
import { useSyncStore } from '~/stores/sync-store'

describe('syncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({
      hoveredTimestamp: null,
      hoveredChartId: null,
    })
  })

  it('starts with null hover state', () => {
    const state = useSyncStore.getState()
    expect(state.hoveredTimestamp).toBeNull()
    expect(state.hoveredChartId).toBeNull()
  })

  it('setHover updates timestamp and chartId', () => {
    useSyncStore.getState().setHover('chart-1', '2023-04-12')
    const state = useSyncStore.getState()
    expect(state.hoveredTimestamp).toBe('2023-04-12')
    expect(state.hoveredChartId).toBe('chart-1')
  })

  it('clearHover resets to null', () => {
    useSyncStore.getState().setHover('chart-1', '2023-04-12')
    useSyncStore.getState().clearHover()
    const state = useSyncStore.getState()
    expect(state.hoveredTimestamp).toBeNull()
    expect(state.hoveredChartId).toBeNull()
  })

  it('setHover overwrites previous hover state', () => {
    useSyncStore.getState().setHover('chart-1', '2023-04-12')
    useSyncStore.getState().setHover('chart-2', '2023-05-01')
    const state = useSyncStore.getState()
    expect(state.hoveredTimestamp).toBe('2023-05-01')
    expect(state.hoveredChartId).toBe('chart-2')
  })
})
