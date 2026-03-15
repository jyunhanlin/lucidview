# LucidView Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a prompt-driven infinite research whiteboard that generates interlinked crypto charts on a tldraw canvas from natural language input.

**Architecture:** Schema-driven — AI returns a declarative JSON (BoardSchema) describing charts, positions, and connections. Frontend parses the schema, fetches data from free APIs, and renders custom tldraw shapes with cross-chart hover synchronization and arrow annotations.

**Tech Stack:** TanStack Start, tldraw, Lightweight Charts, D3-force, Zustand, Zod, Gemini/OpenAI API (BYOK)

**Spec:** `docs/superpowers/specs/2026-03-15-infinite-research-whiteboard-design.md`

---

## File Structure

```
lucidview/
├── app.config.ts                          # TanStack Start config
├── package.json
├── tsconfig.json
├── .env                                   # API keys (gitignored)
├── .gitignore
├── app/
│   ├── routes/
│   │   ├── __root.tsx                     # Root layout
│   │   └── index.tsx                      # Main page: prompt + canvas
│   ├── components/
│   │   ├── PromptInput.tsx                # Prompt input bar
│   │   ├── BoardCanvas.tsx                # tldraw canvas container
│   │   └── LoadingOverlay.tsx             # Loading state overlay
│   ├── shapes/
│   │   ├── CandlestickShape.tsx           # K-line shape (Lightweight Charts)
│   │   ├── BarLineShape.tsx               # Bar/Line shape (Lightweight Charts)
│   │   ├── NodeGraphShape.tsx             # Force-directed node graph (D3)
│   │   └── ConnectionArrow.ts             # Arrow creation + binding logic
│   ├── stores/
│   │   └── sync-store.ts                  # Zustand hover sync store
│   ├── schemas/
│   │   └── board-schema.ts                # Zod schemas + TS types
│   ├── lib/
│   │   ├── layout.ts                      # Grid → tldraw coordinate conversion
│   │   ├── timestamp-utils.ts             # Timestamp ↔ chart x-coordinate
│   │   ├── data-transforms.ts             # API response → chart data conversion
│   │   └── board-renderer.ts              # Orchestrate schema → tldraw shapes
│   ├── router.tsx                         # Router factory + type registration
│   └── client.tsx                         # Client entry
├── server/
│   ├── functions/
│   │   ├── analyze-prompt.ts              # LLM call → BoardResponse
│   │   ├── fetch-price.ts                 # CoinGecko proxy
│   │   ├── fetch-staking.ts               # DeFiLlama ETH staking
│   │   └── fetch-flow.ts                  # DeFiLlama protocol flows
│   └── lib/
│       ├── llm-client.ts                  # LLM adapter interface + impls
│       └── prompt-template.ts             # System prompt + few-shot examples
├── tests/
│   ├── schemas/
│   │   └── board-schema.test.ts           # Schema validation tests
│   ├── lib/
│   │   ├── layout.test.ts                 # Layout conversion tests
│   │   └── timestamp-utils.test.ts        # Timestamp utility tests
│   ├── stores/
│   │   └── sync-store.test.ts             # Zustand store tests
│   ├── server/
│   │   ├── llm-client.test.ts             # LLM adapter tests
│   │   ├── prompt-template.test.ts        # Prompt construction tests
│   │   ├── analyze-prompt.test.ts         # Analyze prompt with retry tests
│   │   ├── fetch-price.test.ts            # CoinGecko fetch tests
│   │   ├── fetch-staking.test.ts          # Staking fetch tests
│   │   └── fetch-flow.test.ts             # Flow fetch tests
│   └── shapes/
│       └── ConnectionArrow.test.ts        # Arrow binding logic tests
```

---

## Chunk 1: Foundation

### Task 1: Scaffold TanStack Start Project

**Files:**
- Create: `package.json`, `app.config.ts`, `tsconfig.json`, `vitest.config.ts`, `app/routes/__root.tsx`, `app/routes/index.tsx`, `app/client.tsx`, `app/ssr.tsx`, `app/router.tsx`
- Auto-generated: `app/routeTree.gen.ts` (created by TanStack Router on first `npx vinxi dev`)
- Modify: `.gitignore`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd /Users/jhlin/playground/lucidview
npm init -y
npm install @tanstack/react-start @tanstack/react-router vinxi react react-dom
npm install -D typescript @types/react @types/react-dom vite vitest
```

- [ ] **Step 2: Install all MVP dependencies**

```bash
npm install tldraw zod zustand lightweight-charts d3-force openai @google/generative-ai
npm install -D @types/d3-force
```

- [ ] **Step 3: Create app.config.ts**

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/react-start/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  vite: {
    plugins: () => [viteTsConfigPaths()],
  },
})
```

```bash
npm install -D vite-tsconfig-paths
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [viteTsConfigPaths()],
  test: {
    globals: true,
  },
})
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./dist",
    "paths": {
      "~/*": ["./app/*"]
    }
  },
  "include": ["app", "server", "tests"]
}
```

- [ ] **Step 5: Create root layout and index route**

```typescript
// app/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>LucidView</title>
      </head>
      <body style={{ margin: 0, height: '100vh' }}>
        <Outlet />
      </body>
    </html>
  )
}
```

```typescript
// app/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return <div>LucidView — coming soon</div>
}
```

- [ ] **Step 6: Create client entry and SSR entry**

```typescript
// app/client.tsx
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import { createRouter } from './router'

const router = createRouter()

hydrateRoot(document, <StartClient router={router} />)
```

```typescript
// app/ssr.tsx
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { getRouterManifest } from '@tanstack/react-start/router-manifest'
import { createRouter } from './router'

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(defaultStreamHandler)
```

```typescript
// app/router.tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  return createTanStackRouter({ routeTree })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
```

- [ ] **Step 7: Update .gitignore**

Append to existing `.gitignore`:
```
node_modules/
dist/
.vinxi/
.env
```

- [ ] **Step 8: Verify dev server starts**

```bash
npx vinxi dev
```

Expected: Dev server starts on `http://localhost:3000`, shows "LucidView — coming soon"

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts app.config.ts app/ .gitignore
git commit -m "chore: scaffold TanStack Start project with all MVP dependencies"
```

---

### Task 2: Zod Board Schema

**Files:**
- Create: `app/schemas/board-schema.ts`
- Test: `tests/schemas/board-schema.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/schemas/board-schema.test.ts
import { describe, it, expect } from 'vitest'
import {
  boardResponseSchema,
  boardSchemaSchema,
  chartSpecSchema,
  dataQuerySchema,
  connectionSpecSchema,
  type BoardResponse,
  type BoardSchema,
  type ChartSpec,
  type DataQuery,
} from '~/schemas/board-schema'

describe('dataQuerySchema', () => {
  it('accepts valid coingecko price_history query', () => {
    const query = { source: 'coingecko', query: 'price_history', token: 'ethereum', days: 180 }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('accepts coingecko price_history with optional vs_currency', () => {
    const query = { source: 'coingecko', query: 'price_history', token: 'bitcoin', days: 90, vs_currency: 'eur' }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('accepts valid defillama protocol_tvl query', () => {
    const query = { source: 'defillama', query: 'protocol_tvl', protocol: 'lido' }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('accepts valid defillama eth2_staking query', () => {
    const query = { source: 'defillama', query: 'eth2_staking', days: 180 }
    expect(dataQuerySchema.parse(query)).toEqual(query)
  })

  it('rejects unknown source', () => {
    const query = { source: 'unknown', query: 'price_history', token: 'eth', days: 30 }
    expect(() => dataQuerySchema.parse(query)).toThrow()
  })

  it('rejects unknown query type', () => {
    const query = { source: 'coingecko', query: 'unknown_query', token: 'eth' }
    expect(() => dataQuerySchema.parse(query)).toThrow()
  })

  it('rejects days as string instead of number', () => {
    const query = { source: 'coingecko', query: 'price_history', token: 'ethereum', days: '180' }
    expect(() => dataQuerySchema.parse(query)).toThrow()
  })
})

describe('connectionSpecSchema', () => {
  it('accepts timestamp anchor connection', () => {
    const conn = {
      from: { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2023-04-12' },
      to: { chartId: 'chart-2', anchor: 'timestamp', timestamp: '2023-04-12' },
      label: 'Price impact',
      style: 'dashed',
    }
    expect(connectionSpecSchema.parse(conn)).toEqual(conn)
  })

  it('accepts center anchor connection for node graphs', () => {
    const conn = {
      from: { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2023-04-12' },
      to: { chartId: 'chart-3', anchor: 'center' },
      label: 'Fund flow',
      style: 'solid',
    }
    expect(connectionSpecSchema.parse(conn)).toEqual(conn)
  })

  it('rejects invalid anchor type', () => {
    const conn = {
      from: { chartId: 'chart-1', anchor: 'invalid' },
      to: { chartId: 'chart-2', anchor: 'center' },
      label: 'test',
      style: 'solid',
    }
    expect(() => connectionSpecSchema.parse(conn)).toThrow()
  })
})

describe('boardResponseSchema', () => {
  it('accepts valid board response', () => {
    const response: BoardResponse = {
      type: 'board',
      data: {
        title: 'ETH Analysis',
        charts: [{
          id: 'chart-1',
          type: 'candlestick',
          title: 'ETH Price',
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          dataQuery: { source: 'coingecko', query: 'price_history', token: 'ethereum', days: 180 },
        }],
        connections: [],
      },
    }
    expect(boardResponseSchema.parse(response)).toEqual(response)
  })

  it('accepts clarification response', () => {
    const response = {
      type: 'clarification',
      message: 'Which time range would you like to analyze?',
    }
    expect(boardResponseSchema.parse(response)).toEqual(response)
  })

  it('rejects response with missing type', () => {
    const response = { data: { title: 'test', charts: [], connections: [] } }
    expect(() => boardResponseSchema.parse(response)).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/schemas/board-schema.test.ts
```

Expected: FAIL — module `~/schemas/board-schema` not found

- [ ] **Step 3: Implement board-schema.ts**

```typescript
// app/schemas/board-schema.ts
import { z } from 'zod'

// --- DataQuery discriminated union ---

const coingeckoPriceHistory = z.object({
  source: z.literal('coingecko'),
  query: z.literal('price_history'),
  token: z.string(),
  days: z.number().int().positive(),
  vs_currency: z.string().optional(),
})

const coingeckoMarketData = z.object({
  source: z.literal('coingecko'),
  query: z.literal('market_data'),
  token: z.string(),
})

const defillamaProtocolTvl = z.object({
  source: z.literal('defillama'),
  query: z.literal('protocol_tvl'),
  protocol: z.string(),
})

const defillamaChainTvl = z.object({
  source: z.literal('defillama'),
  query: z.literal('chain_tvl'),
  chain: z.string(),
})

const defillamaProtocolFlows = z.object({
  source: z.literal('defillama'),
  query: z.literal('protocol_flows'),
  protocol: z.string(),
  period: z.string().optional(),
})

const defillamaEth2Staking = z.object({
  source: z.literal('defillama'),
  query: z.literal('eth2_staking'),
  days: z.number().int().positive(),
})

export const dataQuerySchema = z.discriminatedUnion('query', [
  coingeckoPriceHistory,
  coingeckoMarketData,
  defillamaProtocolTvl,
  defillamaChainTvl,
  defillamaProtocolFlows,
  defillamaEth2Staking,
])

// --- Connection endpoints ---

const timestampAnchor = z.object({
  chartId: z.string(),
  anchor: z.literal('timestamp'),
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const centerAnchor = z.object({
  chartId: z.string(),
  anchor: z.literal('center'),
})

const connectionEndpointSchema = z.discriminatedUnion('anchor', [
  timestampAnchor,
  centerAnchor,
])

export const connectionSpecSchema = z.object({
  from: connectionEndpointSchema,
  to: connectionEndpointSchema,
  label: z.string(),
  style: z.enum(['solid', 'dashed']),
})

// --- ChartSpec ---

export const chartSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['candlestick', 'bar', 'line', 'node-graph']),
  title: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }),
  dataQuery: dataQuerySchema,
})

// --- BoardSchema ---

export const boardSchemaSchema = z.object({
  title: z.string(),
  charts: z.array(chartSpecSchema),
  connections: z.array(connectionSpecSchema),
})

// --- BoardResponse (discriminated union) ---

const boardResult = z.object({
  type: z.literal('board'),
  data: boardSchemaSchema,
})

const clarificationResult = z.object({
  type: z.literal('clarification'),
  message: z.string(),
})

export const boardResponseSchema = z.discriminatedUnion('type', [
  boardResult,
  clarificationResult,
])

// --- BoardSchemaSummary (for follow-up context) ---

export const boardSchemaSummarySchema = z.object({
  charts: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
  })),
})

// --- Inferred types ---

export type DataQuery = z.infer<typeof dataQuerySchema>
export type ConnectionEndpoint = z.infer<typeof connectionEndpointSchema>
export type ConnectionSpec = z.infer<typeof connectionSpecSchema>
export type ChartSpec = z.infer<typeof chartSpecSchema>
export type BoardSchema = z.infer<typeof boardSchemaSchema>
export type BoardResponse = z.infer<typeof boardResponseSchema>
export type BoardSchemaSummary = z.infer<typeof boardSchemaSummarySchema>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/schemas/board-schema.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/schemas/board-schema.ts tests/schemas/board-schema.test.ts
git commit -m "feat: add Zod board schema with discriminated unions for DataQuery and BoardResponse"
```

---

### Task 3: Layout Utilities

**Files:**
- Create: `app/lib/layout.ts`
- Test: `tests/lib/layout.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/layout.test.ts
import { describe, it, expect } from 'vitest'
import { gridToPixel, GRID_UNIT_W, GRID_UNIT_H, GRID_GAP } from '~/lib/layout'

describe('gridToPixel', () => {
  it('converts origin (0,0) position with size (1,1)', () => {
    const result = gridToPixel({ x: 0, y: 0 }, { width: 1, height: 1 })
    expect(result).toEqual({ x: 0, y: 0, width: GRID_UNIT_W, height: GRID_UNIT_H })
  })

  it('converts position (1,0) — one column right', () => {
    const result = gridToPixel({ x: 1, y: 0 }, { width: 1, height: 1 })
    expect(result.x).toBe(GRID_UNIT_W + GRID_GAP)
    expect(result.y).toBe(0)
  })

  it('converts position (0,1) — one row down', () => {
    const result = gridToPixel({ x: 0, y: 1 }, { width: 1, height: 1 })
    expect(result.x).toBe(0)
    expect(result.y).toBe(GRID_UNIT_H + GRID_GAP)
  })

  it('converts double-wide size (2,1)', () => {
    const result = gridToPixel({ x: 0, y: 0 }, { width: 2, height: 1 })
    expect(result.width).toBe(GRID_UNIT_W * 2 + GRID_GAP)
    expect(result.height).toBe(GRID_UNIT_H)
  })

  it('converts position (2,1) with size (1,1)', () => {
    const result = gridToPixel({ x: 2, y: 1 }, { width: 1, height: 1 })
    expect(result.x).toBe((GRID_UNIT_W + GRID_GAP) * 2)
    expect(result.y).toBe(GRID_UNIT_H + GRID_GAP)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/layout.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement layout.ts**

```typescript
// app/lib/layout.ts

export const GRID_UNIT_W = 450
export const GRID_UNIT_H = 320
export const GRID_GAP = 30

interface GridPosition {
  readonly x: number
  readonly y: number
}

interface GridSize {
  readonly width: number
  readonly height: number
}

interface PixelRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export function gridToPixel(position: GridPosition, size: GridSize): PixelRect {
  return {
    x: position.x * (GRID_UNIT_W + GRID_GAP),
    y: position.y * (GRID_UNIT_H + GRID_GAP),
    width: size.width * GRID_UNIT_W + Math.max(0, size.width - 1) * GRID_GAP,
    height: size.height * GRID_UNIT_H + Math.max(0, size.height - 1) * GRID_GAP,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/layout.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/layout.ts tests/lib/layout.test.ts
git commit -m "feat: add grid-to-pixel coordinate conversion utility"
```

---

### Task 4: Timestamp Utilities

**Files:**
- Create: `app/lib/timestamp-utils.ts`
- Test: `tests/lib/timestamp-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/timestamp-utils.test.ts
import { describe, it, expect } from 'vitest'
import { timestampToFraction, isTimestampInRange } from '~/lib/timestamp-utils'

describe('timestampToFraction', () => {
  it('returns 0 for the start date', () => {
    expect(timestampToFraction('2023-01-01', '2023-01-01', '2023-12-31')).toBe(0)
  })

  it('returns 1 for the end date', () => {
    expect(timestampToFraction('2023-12-31', '2023-01-01', '2023-12-31')).toBe(1)
  })

  it('returns ~0.5 for the midpoint', () => {
    const result = timestampToFraction('2023-07-02', '2023-01-01', '2023-12-31')
    expect(result).toBeCloseTo(0.5, 1)
  })

  it('returns null for timestamp before range', () => {
    expect(timestampToFraction('2022-12-31', '2023-01-01', '2023-12-31')).toBeNull()
  })

  it('returns null for timestamp after range', () => {
    expect(timestampToFraction('2024-01-01', '2023-01-01', '2023-12-31')).toBeNull()
  })
})

describe('isTimestampInRange', () => {
  it('returns true for timestamp within range', () => {
    expect(isTimestampInRange('2023-06-15', '2023-01-01', '2023-12-31')).toBe(true)
  })

  it('returns true for boundary timestamps', () => {
    expect(isTimestampInRange('2023-01-01', '2023-01-01', '2023-12-31')).toBe(true)
    expect(isTimestampInRange('2023-12-31', '2023-01-01', '2023-12-31')).toBe(true)
  })

  it('returns false for out-of-range timestamp', () => {
    expect(isTimestampInRange('2024-01-01', '2023-01-01', '2023-12-31')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/timestamp-utils.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement timestamp-utils.ts**

```typescript
// app/lib/timestamp-utils.ts

function toMs(dateStr: string): number {
  return new Date(dateStr).getTime()
}

export function timestampToFraction(
  timestamp: string,
  rangeStart: string,
  rangeEnd: string,
): number | null {
  const ts = toMs(timestamp)
  const start = toMs(rangeStart)
  const end = toMs(rangeEnd)

  if (ts < start || ts > end) return null
  if (start === end) return 0

  return (ts - start) / (end - start)
}

export function isTimestampInRange(
  timestamp: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const ts = toMs(timestamp)
  return ts >= toMs(rangeStart) && ts <= toMs(rangeEnd)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/timestamp-utils.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/timestamp-utils.ts tests/lib/timestamp-utils.test.ts
git commit -m "feat: add timestamp-to-fraction and range-check utilities"
```

---

### Task 5: Zustand Sync Store

**Files:**
- Create: `app/stores/sync-store.ts`
- Test: `tests/stores/sync-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/stores/sync-store.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/stores/sync-store.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement sync-store.ts**

```typescript
// app/stores/sync-store.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/stores/sync-store.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/stores/sync-store.ts tests/stores/sync-store.test.ts
git commit -m "feat: add Zustand sync store for cross-chart hover synchronization"
```

---

## Chunk 2: Server Layer

### Task 6: LLM Client Adapter

**Files:**
- Create: `server/lib/llm-client.ts`
- Test: `tests/server/llm-client.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/server/llm-client.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createLLMClient, type LLMClient } from '../../server/lib/llm-client'
import { boardResponseSchema } from '~/schemas/board-schema'

describe('createLLMClient', () => {
  it('returns a client with a generate method', () => {
    const client = createLLMClient('claude-p')
    expect(client).toHaveProperty('generate')
    expect(typeof client.generate).toBe('function')
  })

  it('throws for unknown provider', () => {
    expect(() => createLLMClient('unknown' as any)).toThrow('Unknown LLM provider')
  })
})

describe('parseLLMResponse', () => {
  it('parses valid board JSON', async () => {
    const { parseLLMResponse } = await import('../../server/lib/llm-client')
    const json = JSON.stringify({
      type: 'board',
      data: {
        title: 'Test',
        charts: [{
          id: 'chart-1',
          type: 'candlestick',
          title: 'ETH',
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          dataQuery: { source: 'coingecko', query: 'price_history', token: 'ethereum', days: 180 },
        }],
        connections: [],
      },
    })
    const result = parseLLMResponse(json)
    expect(result.type).toBe('board')
  })

  it('parses clarification response', async () => {
    const { parseLLMResponse } = await import('../../server/lib/llm-client')
    const json = JSON.stringify({
      type: 'clarification',
      message: 'Which token?',
    })
    const result = parseLLMResponse(json)
    expect(result.type).toBe('clarification')
  })

  it('throws on invalid JSON', async () => {
    const { parseLLMResponse } = await import('../../server/lib/llm-client')
    expect(() => parseLLMResponse('not json')).toThrow()
  })

  it('throws on valid JSON but invalid schema', async () => {
    const { parseLLMResponse } = await import('../../server/lib/llm-client')
    expect(() => parseLLMResponse('{"type":"board","data":{}}')).toThrow()
  })

  it('extracts JSON from markdown code blocks', async () => {
    const { parseLLMResponse } = await import('../../server/lib/llm-client')
    const wrapped = '```json\n{"type":"clarification","message":"Which token?"}\n```'
    const result = parseLLMResponse(wrapped)
    expect(result.type).toBe('clarification')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/llm-client.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement llm-client.ts**

```typescript
// server/lib/llm-client.ts
import { boardResponseSchema, type BoardResponse, type BoardSchemaSummary } from '~/schemas/board-schema'

export interface LLMClient {
  generate(prompt: string, existingSchema?: BoardSchemaSummary): Promise<BoardResponse>
}

export function parseLLMResponse(raw: string): BoardResponse {
  // Strip markdown code blocks if present
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim()

  const parsed = JSON.parse(jsonStr)
  return boardResponseSchema.parse(parsed)
}

export function createLLMClient(provider: string): LLMClient {
  switch (provider) {
    case 'claude-p':
      return createClaudePClient()
    case 'gemini':
      return createGeminiClient()
    case 'openai-compatible':
      return createOpenAICompatibleClient()
    default:
      throw new Error(`Unknown LLM provider: ${provider}`)
  }
}

function createClaudePClient(): LLMClient {
  return {
    async generate(prompt, existingSchema) {
      const { buildPrompt } = await import('./prompt-template')
      const fullPrompt = buildPrompt(prompt, existingSchema)

      const { execSync } = await import('child_process')
      // IMPORTANT: Use stdin via input option to avoid shell injection
      const result = execSync('claude -p', {
        input: fullPrompt,
        encoding: 'utf-8',
        timeout: 30_000,
      })

      return parseLLMResponse(result)
    },
  }
}

function createGeminiClient(): LLMClient {
  return {
    async generate(prompt, existingSchema) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const { buildPrompt } = await import('./prompt-template')

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        systemInstruction: buildSystemPrompt(),
        generationConfig: { responseMimeType: 'application/json' },
      })

      const userPrompt = buildUserPrompt(prompt, existingSchema)
      const result = await model.generateContent(userPrompt)
      const text = result.response.text()

      return parseLLMResponse(text)
    },
  }
}

function createOpenAICompatibleClient(): LLMClient {
  return {
    async generate(prompt, existingSchema) {
      const OpenAI = (await import('openai')).default
      const { buildPrompt, buildSystemPrompt } = await import('./prompt-template')

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        baseURL: process.env.OPENAI_BASE_URL,
      })

      const systemPrompt = buildSystemPrompt()
      const userPrompt = buildPrompt(prompt, existingSchema)

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      })

      const text = response.choices[0]?.message?.content ?? ''
      return parseLLMResponse(text)
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/llm-client.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/lib/llm-client.ts tests/server/llm-client.test.ts
git commit -m "feat: add LLM client adapter with claude-p, Gemini, and OpenAI-compatible providers"
```

---

### Task 7: Prompt Template

**Files:**
- Create: `server/lib/prompt-template.ts`
- Test: `tests/server/prompt-template.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/server/prompt-template.test.ts
import { describe, it, expect } from 'vitest'
import { buildPrompt, buildSystemPrompt } from '../../server/lib/prompt-template'

describe('buildSystemPrompt', () => {
  it('includes BoardSchema interface definition', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('BoardSchema')
    expect(prompt).toContain('ChartSpec')
    expect(prompt).toContain('DataQuery')
    expect(prompt).toContain('ConnectionSpec')
  })

  it('includes all valid data query types', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('price_history')
    expect(prompt).toContain('market_data')
    expect(prompt).toContain('protocol_tvl')
    expect(prompt).toContain('chain_tvl')
    expect(prompt).toContain('protocol_flows')
    expect(prompt).toContain('eth2_staking')
  })

  it('includes CoinGecko token ID instruction', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('ethereum')
    expect(prompt).toMatch(/coingecko.*id/i)
  })

  it('includes YYYY-MM-DD timestamp format instruction', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('YYYY-MM-DD')
  })
})

describe('buildPrompt', () => {
  it('includes user prompt', () => {
    const result = buildPrompt('Analyze ETH Shanghai upgrade')
    expect(result).toContain('Analyze ETH Shanghai upgrade')
  })

  it('includes few-shot example', () => {
    const result = buildPrompt('Analyze BTC halving')
    expect(result).toContain('"type": "board"')
  })

  it('includes existing schema context for follow-ups', () => {
    const existing = { charts: [{ id: 'chart-1', type: 'candlestick', title: 'ETH Price' }] }
    const result = buildPrompt('Add gas fee chart', existing)
    expect(result).toContain('chart-1')
    expect(result).toContain('ETH Price')
  })

  it('omits context section when no existing schema', () => {
    const result = buildPrompt('New analysis')
    expect(result).not.toContain('Existing charts')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/prompt-template.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement prompt-template.ts**

```typescript
// server/lib/prompt-template.ts
import type { BoardSchemaSummary } from '~/schemas/board-schema'

export function buildSystemPrompt(): string {
  return `You are a crypto research analyst AI. Given a user's research question, you produce a BoardSchema JSON that describes which charts to generate on an infinite whiteboard.

## Output Format

You MUST respond with a JSON object matching one of these two formats:

1. Board response (when you can fulfill the request):
{
  "type": "board",
  "data": {
    "title": "Analysis title",
    "charts": [...],
    "connections": [...]
  }
}

2. Clarification request (when the prompt is too vague):
{
  "type": "clarification",
  "message": "Your question to the user"
}

## BoardSchema Interface

interface ChartSpec {
  id: string              // Unique ID like "chart-1", "chart-2"
  type: "candlestick" | "bar" | "line" | "node-graph"
  title: string           // Human-readable chart title
  position: { x: number, y: number }  // Logical grid position (0-based)
  size: { width: number, height: number }  // Grid units (1 = standard, 2 = double-wide)
  dataQuery: DataQuery
}

## Valid DataQuery Types

Use ONLY these predefined query types:

| source     | query            | params                                    |
|------------|------------------|-------------------------------------------|
| coingecko  | price_history    | token (string), days (number), vs_currency? (string, default "usd") |
| coingecko  | market_data      | token (string)                            |
| defillama  | protocol_tvl     | protocol (string)                         |
| defillama  | chain_tvl        | chain (string)                            |
| defillama  | protocol_flows   | protocol (string), period? (string)       |
| defillama  | eth2_staking     | days (number)                             |

IMPORTANT: For "token" field, use CoinGecko-compatible IDs (e.g., "ethereum" not "ETH", "bitcoin" not "BTC").

## ConnectionSpec

Connections link key time points across charts:
{
  "from": { "chartId": "chart-1", "anchor": "timestamp", "timestamp": "YYYY-MM-DD" },
  "to":   { "chartId": "chart-2", "anchor": "timestamp", "timestamp": "YYYY-MM-DD" },
  "label": "Brief annotation text",
  "style": "solid" | "dashed"
}

For node-graph charts (no time axis), use center anchor:
{ "chartId": "chart-3", "anchor": "center" }

## Timestamps

All timestamps MUST use ISO 8601 date format: "YYYY-MM-DD" (e.g., "2023-04-12").

## Layout Guidelines

- Position charts in a logical grid. (0,0) is top-left.
- Standard charts: size { width: 1, height: 1 }
- Node graphs: size { width: 2, height: 1 } (wider for readability)
- Arrange related charts side by side (same y), different categories in rows
- Generate 2-4 charts per analysis`
}

const FEW_SHOT_EXAMPLE = `
## Example

User: "Analyze Ethereum Shanghai upgrade impact"

Response:
{
  "type": "board",
  "data": {
    "title": "Ethereum Shanghai Upgrade Analysis",
    "charts": [
      {
        "id": "chart-1",
        "type": "candlestick",
        "title": "ETH Price (180 days around Shanghai)",
        "position": { "x": 0, "y": 0 },
        "size": { "width": 1, "height": 1 },
        "dataQuery": { "source": "coingecko", "query": "price_history", "token": "ethereum", "days": 180 }
      },
      {
        "id": "chart-2",
        "type": "bar",
        "title": "ETH Staking Deposits",
        "position": { "x": 1, "y": 0 },
        "size": { "width": 1, "height": 1 },
        "dataQuery": { "source": "defillama", "query": "eth2_staking", "days": 180 }
      },
      {
        "id": "chart-3",
        "type": "node-graph",
        "title": "Lido Fund Flows",
        "position": { "x": 0, "y": 1 },
        "size": { "width": 2, "height": 1 },
        "dataQuery": { "source": "defillama", "query": "protocol_flows", "protocol": "lido" }
      }
    ],
    "connections": [
      {
        "from": { "chartId": "chart-1", "anchor": "timestamp", "timestamp": "2023-04-12" },
        "to": { "chartId": "chart-2", "anchor": "timestamp", "timestamp": "2023-04-12" },
        "label": "Shanghai upgrade: staking withdrawals enabled",
        "style": "dashed"
      },
      {
        "from": { "chartId": "chart-2", "anchor": "timestamp", "timestamp": "2023-04-12" },
        "to": { "chartId": "chart-3", "anchor": "center" },
        "label": "Post-upgrade fund redistribution",
        "style": "dashed"
      }
    ]
  }
}`

export function buildPrompt(
  userPrompt: string,
  existingSchema?: BoardSchemaSummary,
): string {
  const parts: string[] = []

  parts.push(buildSystemPrompt())
  parts.push(FEW_SHOT_EXAMPLE)

  if (existingSchema && existingSchema.charts.length > 0) {
    parts.push(`\n## Existing charts on the whiteboard\n`)
    parts.push(`You are adding to an existing whiteboard. These charts already exist:`)
    for (const chart of existingSchema.charts) {
      parts.push(`- ${chart.id}: ${chart.title} (${chart.type})`)
    }
    parts.push(`\nYou may reference these chart IDs in new connections. Only output NEW charts and connections.`)
  }

  parts.push(`\n## User Request\n\n${userPrompt}`)

  return parts.join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/prompt-template.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/lib/prompt-template.ts tests/server/prompt-template.test.ts
git commit -m "feat: add LLM prompt template with system prompt and few-shot examples"
```

---

### Task 8: Data Fetch Server Functions

**Files:**
- Create: `server/functions/fetch-price.ts`, `server/functions/fetch-staking.ts`, `server/functions/fetch-flow.ts`
- Test: `tests/server/fetch-price.test.ts`, `tests/server/fetch-staking.test.ts`, `tests/server/fetch-flow.test.ts`

- [ ] **Step 1: Write fetch-price tests**

```typescript
// tests/server/fetch-price.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPriceData } from '../../server/functions/fetch-price'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchPriceData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches price history from CoinGecko', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        prices: [[1681257600000, 1850.5], [1681344000000, 1900.2]],
      }),
    })

    const result = await fetchPriceData({
      source: 'coingecko',
      query: 'price_history',
      token: 'ethereum',
      days: 180,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.coingecko.com'),
      expect.any(Object),
    )
    expect(result).toHaveProperty('prices')
    expect(result.prices).toHaveLength(2)
  })

  it('handles common token aliases', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ prices: [] }),
    })

    await fetchPriceData({
      source: 'coingecko',
      query: 'price_history',
      token: 'eth',
      days: 30,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ethereum'),
      expect.any(Object),
    )
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })

    await expect(
      fetchPriceData({ source: 'coingecko', query: 'price_history', token: 'ethereum', days: 30 }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/fetch-price.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement fetch-price.ts**

```typescript
// server/functions/fetch-price.ts
import type { DataQuery } from '~/schemas/board-schema'

const TOKEN_ALIASES: Record<string, string> = {
  eth: 'ethereum',
  btc: 'bitcoin',
  bnb: 'binancecoin',
  sol: 'solana',
  avax: 'avalanche-2',
}

function resolveToken(token: string): string {
  return TOKEN_ALIASES[token.toLowerCase()] ?? token.toLowerCase()
}

interface PriceDataResult {
  readonly prices: ReadonlyArray<readonly [number, number]>
}

interface MarketDataResult {
  readonly market_data: Record<string, unknown>
}

export async function fetchPriceData(
  query: Extract<DataQuery, { source: 'coingecko' }>,
): Promise<PriceDataResult | MarketDataResult> {
  const token = resolveToken(query.token)

  let url: string
  if (query.query === 'price_history') {
    const currency = query.vs_currency ?? 'usd'
    url = `https://api.coingecko.com/api/v3/coins/${token}/market_chart?vs_currency=${currency}&days=${query.days}`
  } else {
    url = `https://api.coingecko.com/api/v3/coins/${token}`
  }

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

- [ ] **Step 4: Run fetch-price tests**

```bash
npx vitest run tests/server/fetch-price.test.ts
```

Expected: PASS

- [ ] **Step 5: Write and implement fetch-staking.ts**

```typescript
// tests/server/fetch-staking.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchStakingData } from '../../server/functions/fetch-staking'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchStakingData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches ETH staking data from DeFiLlama', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ date: 1681257600, totalLiquidityUSD: 1000000 }]),
    })

    const result = await fetchStakingData({
      source: 'defillama',
      query: 'eth2_staking',
      days: 180,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('defillama'),
      expect.any(Object),
    )
    expect(Array.isArray(result)).toBe(true)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    await expect(
      fetchStakingData({ source: 'defillama', query: 'eth2_staking', days: 30 }),
    ).rejects.toThrow()
  })
})
```

```typescript
// server/functions/fetch-staking.ts
import type { DataQuery } from '~/schemas/board-schema'

export async function fetchStakingData(
  query: Extract<DataQuery, { query: 'eth2_staking' }>,
): Promise<unknown> {
  // DeFiLlama Lido protocol TVL as proxy for ETH staking trends
  const url = `https://api.llama.fi/protocol/lido`

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`DeFiLlama API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  // Filter to requested time range
  const nowMs = Date.now()
  const startMs = nowMs - query.days * 24 * 60 * 60 * 1000
  const tvlHistory = (data.tvl ?? []).filter(
    (entry: { date: number }) => entry.date * 1000 >= startMs,
  )

  return tvlHistory
}
```

- [ ] **Step 6: Run fetch-staking tests**

```bash
npx vitest run tests/server/fetch-staking.test.ts
```

Expected: PASS

- [ ] **Step 7: Write and implement fetch-flow.ts**

```typescript
// tests/server/fetch-flow.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchFlowData } from '../../server/functions/fetch-flow'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchFlowData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches protocol TVL from DeFiLlama', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tvl: [{ date: 1681257600, totalLiquidityUSD: 5000000 }] }),
    })

    const result = await fetchFlowData({
      source: 'defillama',
      query: 'protocol_tvl',
      protocol: 'lido',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.llama.fi/protocol/lido'),
      expect.any(Object),
    )
    expect(result).toBeDefined()
  })

  it('fetches chain TVL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ date: 1681257600, tvl: 50000000 }]),
    })

    const result = await fetchFlowData({
      source: 'defillama',
      query: 'chain_tvl',
      chain: 'Ethereum',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.llama.fi/v2/historicalChainTvl/Ethereum'),
      expect.any(Object),
    )
    expect(result).toBeDefined()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
    await expect(
      fetchFlowData({ source: 'defillama', query: 'protocol_tvl', protocol: 'unknown' }),
    ).rejects.toThrow()
  })
})
```

```typescript
// server/functions/fetch-flow.ts
import type { DataQuery } from '~/schemas/board-schema'

// Handles protocol_tvl, chain_tvl, protocol_flows queries.
// eth2_staking is handled by fetchStakingData — do NOT add it here.
export async function fetchFlowData(
  query: Extract<DataQuery, { source: 'defillama'; query: 'protocol_tvl' | 'chain_tvl' | 'protocol_flows' }>,
): Promise<unknown> {
  let url: string

  switch (query.query) {
    case 'protocol_tvl':
      url = `https://api.llama.fi/protocol/${query.protocol}`
      break
    case 'chain_tvl':
      url = `https://api.llama.fi/v2/historicalChainTvl/${query.chain}`
      break
    case 'protocol_flows':
      url = `https://api.llama.fi/protocol/${query.protocol}`
      break
    default:
      throw new Error(`Unknown DeFiLlama query type`)
  }

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`DeFiLlama API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

- [ ] **Step 8: Run all fetch tests**

```bash
npx vitest run tests/server/fetch-price.test.ts tests/server/fetch-staking.test.ts tests/server/fetch-flow.test.ts
```

Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add server/functions/ tests/server/fetch-*.test.ts
git commit -m "feat: add CoinGecko and DeFiLlama data fetch server functions"
```

---

### Task 9: Analyze Prompt Server Function

**Files:**
- Create: `server/functions/analyze-prompt.ts`

- [ ] **Step 1: Implement analyze-prompt.ts**

This is the TanStack Start server function that wraps the LLM client with retry logic.

```typescript
// server/functions/analyze-prompt.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createLLMClient, parseLLMResponse } from '../lib/llm-client'
import { boardResponseSchema, boardSchemaSummarySchema, type BoardResponse } from '~/schemas/board-schema'

const inputSchema = z.object({
  prompt: z.string().min(1),
  existingSchema: boardSchemaSummarySchema.optional(),
})

export const analyzePrompt = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<BoardResponse> => {
    const provider = process.env.LLM_PROVIDER ?? 'claude-p'
    const client = createLLMClient(provider)

    const MAX_RETRIES = 2
    let lastError: Error | null = null
    let promptWithFeedback = data.prompt

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await client.generate(promptWithFeedback, data.existingSchema)
        return result
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        // Append error feedback to prompt for next attempt so LLM can self-correct
        promptWithFeedback = `${data.prompt}\n\n[PREVIOUS ATTEMPT FAILED: ${lastError.message}. Please fix the output format and try again.]`
      }
    }

    throw new Error(`LLM failed after ${MAX_RETRIES} attempts: ${lastError?.message}`)
  })
```

- [ ] **Step 2: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add server/functions/analyze-prompt.ts
git commit -m "feat: add analyzePrompt server function with retry logic"
```

---

## Chunk 3: tldraw Custom Shapes

### Task 10: BoardCanvas Component

**Files:**
- Create: `app/components/BoardCanvas.tsx`

- [ ] **Step 1: Create BoardCanvas with tldraw**

```tsx
// app/components/BoardCanvas.tsx
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useCallback, useState } from 'react'
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
```

- [ ] **Step 2: Commit**

```bash
git add app/components/BoardCanvas.tsx
git commit -m "feat: add BoardCanvas component with tldraw and custom shape registration"
```

---

### Task 11: CandlestickShape

**Files:**
- Create: `app/shapes/CandlestickShape.tsx`

- [ ] **Step 1: Implement CandlestickShapeUtil**

```tsx
// app/shapes/CandlestickShape.tsx
import { BaseBoxShapeUtil, type TLBaseShape } from 'tldraw'
import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, CandlestickSeries } from 'lightweight-charts'
import { useSyncStore } from '~/stores/sync-store'

type CandlestickShapeProps = {
  w: number
  h: number
  title: string
  chartId: string
  data: Array<{ time: string; open: number; high: number; low: number; close: number }>
  timeRange: { start: string; end: string }
}

export type CandlestickShape = TLBaseShape<'candlestick-chart', CandlestickShapeProps>

export class CandlestickShapeUtil extends BaseBoxShapeUtil<CandlestickShape> {
  static override type = 'candlestick-chart' as const

  getDefaultProps(): CandlestickShapeProps {
    return {
      w: 450,
      h: 320,
      title: 'Price Chart',
      chartId: '',
      data: [],
      timeRange: { start: '', end: '' },
    }
  }

  override canResize() {
    return true
  }

  component(shape: CandlestickShape) {
    return <CandlestickChartComponent shape={shape} />
  }

  indicator(shape: CandlestickShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

function CandlestickChartComponent({ shape }: { shape: CandlestickShape }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const { hoveredTimestamp, hoveredChartId, setHover, clearHover } = useSyncStore()
  const { w, h, title, chartId, data, timeRange } = shape.props

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: w,
      height: h - 30, // Leave room for title
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

    // Subscribe to crosshair for hover sync
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
  }, [w, h, data, chartId])

  // Sync crosshair from other charts
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    if (hoveredChartId === chartId || !hoveredTimestamp) {
      return
    }
    // Set crosshair position from external hover
    chartRef.current.setCrosshairPosition(
      NaN, // price — NaN means just show vertical line
      hoveredTimestamp,
      seriesRef.current,
    )
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
      <div ref={containerRef} />
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit
```

Expected: No errors (may need to adjust imports based on tldraw version)

- [ ] **Step 3: Commit**

```bash
git add app/shapes/CandlestickShape.tsx
git commit -m "feat: add CandlestickShape with Lightweight Charts and hover sync"
```

---

### Task 12: BarLineShape

**Files:**
- Create: `app/shapes/BarLineShape.tsx`

- [ ] **Step 1: Implement BarLineShapeUtil**

```tsx
// app/shapes/BarLineShape.tsx
import { BaseBoxShapeUtil, type TLBaseShape } from 'tldraw'
import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, HistogramSeries, LineSeries } from 'lightweight-charts'
import { useSyncStore } from '~/stores/sync-store'

type BarLineShapeProps = {
  w: number
  h: number
  title: string
  chartId: string
  chartType: 'bar' | 'line'
  data: Array<{ time: string; value: number }>
  timeRange: { start: string; end: string }
}

export type BarLineShape = TLBaseShape<'barline-chart', BarLineShapeProps>

export class BarLineShapeUtil extends BaseBoxShapeUtil<BarLineShape> {
  static override type = 'barline-chart' as const

  getDefaultProps(): BarLineShapeProps {
    return {
      w: 450,
      h: 320,
      title: 'Chart',
      chartId: '',
      chartType: 'bar',
      data: [],
      timeRange: { start: '', end: '' },
    }
  }

  override canResize() {
    return true
  }

  component(shape: BarLineShape) {
    return <BarLineChartComponent shape={shape} />
  }

  indicator(shape: BarLineShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

function BarLineChartComponent({ shape }: { shape: BarLineShape }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | ISeriesApi<'Line'> | null>(null)
  const { hoveredTimestamp, hoveredChartId, setHover, clearHover } = useSyncStore()
  const { w, h, title, chartId, chartType, data } = shape.props

  useEffect(() => {
    if (!containerRef.current) return

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

    const series = chartType === 'bar'
      ? chart.addSeries(HistogramSeries, { color: '#00d2ff' })
      : chart.addSeries(LineSeries, { color: '#00d2ff', lineWidth: 2 })

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
  }, [w, h, data, chartId, chartType])

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    if (hoveredChartId === chartId || !hoveredTimestamp) return

    chartRef.current.setCrosshairPosition(NaN, hoveredTimestamp, seriesRef.current)
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
```

- [ ] **Step 2: Commit**

```bash
git add app/shapes/BarLineShape.tsx
git commit -m "feat: add BarLineShape for bar and line charts with hover sync"
```

---

### Task 13: NodeGraphShape

**Files:**
- Create: `app/shapes/NodeGraphShape.tsx`

- [ ] **Step 1: Implement NodeGraphShapeUtil**

```tsx
// app/shapes/NodeGraphShape.tsx
import { BaseBoxShapeUtil, type TLBaseShape } from 'tldraw'
import { useEffect, useRef, useState } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force'

interface GraphNode extends SimulationNodeDatum {
  readonly id: string
  readonly label: string
  readonly value: number
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  readonly label?: string
  readonly value?: number
}

type NodeGraphShapeProps = {
  w: number
  h: number
  title: string
  chartId: string
  nodes: ReadonlyArray<{ id: string; label: string; value: number }>
  links: ReadonlyArray<{ source: string; target: string; label?: string; value?: number }>
}

export type NodeGraphShape = TLBaseShape<'node-graph', NodeGraphShapeProps>

export class NodeGraphShapeUtil extends BaseBoxShapeUtil<NodeGraphShape> {
  static override type = 'node-graph' as const

  getDefaultProps(): NodeGraphShapeProps {
    return {
      w: 930,
      h: 320,
      title: 'Fund Flow',
      chartId: '',
      nodes: [],
      links: [],
    }
  }

  override canResize() {
    return true
  }

  component(shape: NodeGraphShape) {
    return <NodeGraphComponent shape={shape} />
  }

  indicator(shape: NodeGraphShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

function NodeGraphComponent({ shape }: { shape: NodeGraphShape }) {
  const { w, h, title, nodes: inputNodes, links: inputLinks } = shape.props
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([])
  const [simulatedLinks, setSimulatedLinks] = useState<GraphLink[]>([])

  useEffect(() => {
    if (inputNodes.length === 0) return

    const nodes: GraphNode[] = inputNodes.map((n) => ({ ...n }))
    const links: GraphLink[] = inputLinks.map((l) => ({ ...l }))

    const simulation = forceSimulation(nodes)
      .force('link', forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(100))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(w / 2, (h - 30) / 2))

    simulation.on('tick', () => {
      setSimulatedNodes([...nodes])
      setSimulatedLinks([...links])
    })

    simulation.on('end', () => {
      setSimulatedNodes([...nodes])
      setSimulatedLinks([...links])
    })

    return () => {
      simulation.stop()
    }
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
              <text
                x={node.x}
                y={node.y + 4}
                fill="#fff"
                fontSize={10}
                textAnchor="middle"
              >
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/shapes/NodeGraphShape.tsx
git commit -m "feat: add NodeGraphShape with D3-force layout engine"
```

---

## Chunk 4: Connection Arrows, Integration, and UX

### Task 14: Connection Arrow Logic

**Files:**
- Create: `app/shapes/ConnectionArrow.ts`
- Test: `tests/shapes/ConnectionArrow.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/shapes/ConnectionArrow.test.ts
import { describe, it, expect } from 'vitest'
import { computeNormalizedAnchor } from '~/shapes/ConnectionArrow'

describe('computeNormalizedAnchor', () => {
  it('returns center (0.5, 0.5) for center anchor', () => {
    const result = computeNormalizedAnchor({ chartId: 'chart-1', anchor: 'center' })
    expect(result).toEqual({ x: 0.5, y: 0.5 })
  })

  it('returns computed x and bottom y for timestamp anchor', () => {
    const result = computeNormalizedAnchor(
      { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2023-04-12' },
      { start: '2023-01-01', end: '2023-07-01' },
    )
    // April 12 is roughly 101/181 ≈ 0.558 through the range
    expect(result.x).toBeCloseTo(0.558, 1)
    expect(result.y).toBe(0.8) // Bottom area of chart
  })

  it('returns center fallback when timestamp is out of range', () => {
    const result = computeNormalizedAnchor(
      { chartId: 'chart-1', anchor: 'timestamp', timestamp: '2022-01-01' },
      { start: '2023-01-01', end: '2023-07-01' },
    )
    expect(result).toEqual({ x: 0.5, y: 0.5 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/shapes/ConnectionArrow.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement ConnectionArrow.ts**

```typescript
// app/shapes/ConnectionArrow.ts
import { createShapeId, type Editor } from 'tldraw'
import type { ConnectionSpec, ConnectionEndpoint } from '~/schemas/board-schema'
import { timestampToFraction } from '~/lib/timestamp-utils'

interface TimeRange {
  readonly start: string
  readonly end: string
}

export function computeNormalizedAnchor(
  endpoint: ConnectionEndpoint,
  timeRange?: TimeRange,
): { x: number; y: number } {
  if (endpoint.anchor === 'center') {
    return { x: 0.5, y: 0.5 }
  }

  if (!timeRange) {
    return { x: 0.5, y: 0.5 }
  }

  const fraction = timestampToFraction(endpoint.timestamp, timeRange.start, timeRange.end)
  if (fraction === null) {
    return { x: 0.5, y: 0.5 }
  }

  return { x: fraction, y: 0.8 }
}

interface ChartTimeRangeMap {
  readonly [chartId: string]: TimeRange
}

export function createConnectionArrows(
  editor: Editor,
  connections: ReadonlyArray<ConnectionSpec>,
  chartShapeIds: ReadonlyMap<string, string>, // chartId → tldraw shapeId
  timeRanges: ChartTimeRangeMap,
): void {
  for (const conn of connections) {
    const fromShapeId = chartShapeIds.get(conn.from.chartId)
    const toShapeId = chartShapeIds.get(conn.to.chartId)

    if (!fromShapeId || !toShapeId) continue

    const arrowId = createShapeId()

    editor.createShape({
      id: arrowId,
      type: 'arrow',
      props: {
        color: 'yellow',
        dash: conn.style === 'dashed' ? 'dashed' : 'solid',
        text: conn.label,
      },
    })

    const fromAnchor = computeNormalizedAnchor(conn.from, timeRanges[conn.from.chartId])
    const toAnchor = computeNormalizedAnchor(conn.to, timeRanges[conn.to.chartId])

    editor.createBindings([
      {
        fromId: arrowId,
        toId: fromShapeId as any,
        type: 'arrow',
        props: {
          terminal: 'start',
          normalizedAnchor: fromAnchor,
          isPrecise: true,
          isExact: true,
        },
      },
      {
        fromId: arrowId,
        toId: toShapeId as any,
        type: 'arrow',
        props: {
          terminal: 'end',
          normalizedAnchor: toAnchor,
          isPrecise: true,
          isExact: true,
        },
      },
    ])
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/shapes/ConnectionArrow.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/shapes/ConnectionArrow.ts tests/shapes/ConnectionArrow.test.ts
git commit -m "feat: add connection arrow logic with normalized anchor computation"
```

---

### Task 15: PromptInput Component

**Files:**
- Create: `app/components/PromptInput.tsx`

- [ ] **Step 1: Implement PromptInput**

```tsx
// app/components/PromptInput.tsx
import { useState, useCallback, type KeyboardEvent } from 'react'

interface PromptInputProps {
  readonly onSubmit: (prompt: string) => void
  readonly isLoading: boolean
  readonly clarification?: string | null
}

export function PromptInput({ onSubmit, isLoading, clarification }: PromptInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed && !isLoading) {
      onSubmit(trimmed)
      setValue('')
    }
  }, [value, isLoading, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#1a1a2e',
          border: '1px solid #0f3460',
          borderRadius: 12,
          padding: '8px 16px',
          width: 600,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your research... (e.g., 'Analyze ETH Shanghai upgrade')"
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e0e0',
            fontSize: 14,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !value.trim()}
          style={{
            background: isLoading ? '#333' : '#0f3460',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          {isLoading ? 'Analyzing...' : 'Generate'}
        </button>
      </div>
      {clarification && (
        <div
          style={{
            background: '#2a1a3e',
            border: '1px solid #6b3fa0',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#d0b0ff',
            fontSize: 13,
            maxWidth: 600,
          }}
        >
          AI asks: {clarification}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/PromptInput.tsx
git commit -m "feat: add PromptInput component with loading state and clarification display"
```

---

### Task 16: LoadingOverlay Component

**Files:**
- Create: `app/components/LoadingOverlay.tsx`

- [ ] **Step 1: Implement LoadingOverlay**

```tsx
// app/components/LoadingOverlay.tsx

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
```

- [ ] **Step 2: Commit**

```bash
git add app/components/LoadingOverlay.tsx
git commit -m "feat: add LoadingOverlay component with phase-based status messages"
```

---

### Task 17: Data Transforms + Board Renderer

**Files:**
- Create: `app/lib/data-transforms.ts` (extractTimeRange, convertToOHLC, convertToTimeValue, convertToGraph)
- Create: `app/lib/board-renderer.ts` (fetchAllChartData, renderBoardSchema orchestration)

Extract the following helper functions from the main page into focused modules:

- `app/lib/data-transforms.ts` — all `convertTo*` functions and `extractTimeRange`
- `app/lib/board-renderer.ts` — `fetchAllChartData`, `fetchDataForQuery`, `buildShapeProps`, `getShapeType`

This keeps `index.tsx` focused on UI state management (~100 lines) rather than data transformation (~200 lines).

**IMPORTANT:** Data fetch functions (`fetchPriceData`, etc.) are TanStack server functions created via `createServerFn`. They must be invoked with `{ data: ... }` syntax, not called directly. Example: `await fetchPriceData({ data: query })`.

- [ ] **Step 1: Create data-transforms.ts with all conversion functions**
- [ ] **Step 2: Create board-renderer.ts with data fetching orchestration**
- [ ] **Step 3: Implement the main page (see below)**

### Task 17b: Main Page UI

**Files:**
- Modify: `app/routes/index.tsx`

- [ ] **Step 1: Implement the main page**

```tsx
// app/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useRef } from 'react'
import { type Editor, createShapeId } from 'tldraw'
import { BoardCanvas } from '~/components/BoardCanvas'
import { PromptInput } from '~/components/PromptInput'
import { LoadingOverlay } from '~/components/LoadingOverlay'
import { analyzePrompt } from '../../server/functions/analyze-prompt'
import { fetchPriceData } from '../../server/functions/fetch-price'
import { fetchStakingData } from '../../server/functions/fetch-staking'
import { fetchFlowData } from '../../server/functions/fetch-flow'
import { createConnectionArrows } from '~/shapes/ConnectionArrow'
import { gridToPixel } from '~/lib/layout'
import type { BoardSchema, BoardSchemaSummary, ChartSpec, DataQuery } from '~/schemas/board-schema'

export const Route = createFileRoute('/')({
  component: HomePage,
})

type LoadingPhase = 'analyzing' | 'fetching' | 'rendering' | null

function HomePage() {
  const editorRef = useRef<Editor | null>(null)
  const [loading, setLoading] = useState<LoadingPhase>(null)
  const [clarification, setClarification] = useState<string | null>(null)
  const [boardHistory, setBoardHistory] = useState<BoardSchemaSummary>({ charts: [] })

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const handleSubmit = useCallback(async (prompt: string) => {
    const editor = editorRef.current
    if (!editor) return

    setClarification(null)

    try {
      // Phase 1: AI analysis
      setLoading('analyzing')
      const existing = boardHistory.charts.length > 0 ? boardHistory : undefined
      const response = await analyzePrompt({ data: { prompt, existingSchema: existing } })

      if (response.type === 'clarification') {
        setClarification(response.message)
        setLoading(null)
        return
      }

      const schema = response.data

      // Phase 2: Fetch data
      setLoading('fetching')
      const chartDataMap = await fetchAllChartData(schema.charts)

      // Phase 3: Render
      setLoading('rendering')
      const chartShapeIds = new Map<string, string>()
      const timeRanges: Record<string, { start: string; end: string }> = {}

      for (const chart of schema.charts) {
        const pixel = gridToPixel(chart.position, chart.size)
        const shapeId = createShapeId()
        const data = chartDataMap.get(chart.id)

        const shapeType = getShapeType(chart.type)
        const shapeProps = buildShapeProps(chart, pixel, data)

        editor.createShape({
          id: shapeId,
          type: shapeType,
          x: pixel.x,
          y: pixel.y,
          props: shapeProps,
        })

        chartShapeIds.set(chart.id, shapeId)

        // Track time range for arrow binding
        if (data?.timeRange) {
          timeRanges[chart.id] = data.timeRange
        }
      }

      // Create connection arrows
      createConnectionArrows(editor, schema.connections, chartShapeIds, timeRanges)

      // Zoom to fit
      editor.zoomToFit({ animation: { duration: 500 } })

      // Update board history for follow-up prompts
      setBoardHistory((prev) => ({
        charts: [
          ...prev.charts,
          ...schema.charts.map((c) => ({ id: c.id, type: c.type, title: c.title })),
        ],
      }))
    } catch (err) {
      console.error('Board generation failed:', err)
      setClarification(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(null)
    }
  }, [boardHistory])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <BoardCanvas onEditorReady={handleEditorReady} />
      <PromptInput
        onSubmit={handleSubmit}
        isLoading={loading !== null}
        clarification={clarification}
      />
      <LoadingOverlay phase={loading} />
    </div>
  )
}

// --- Helper functions ---

function getShapeType(chartType: ChartSpec['type']): string {
  switch (chartType) {
    case 'candlestick': return 'candlestick-chart'
    case 'bar':
    case 'line': return 'barline-chart'
    case 'node-graph': return 'node-graph'
  }
}

interface ChartData {
  chartType: string
  rawData: unknown
  timeRange?: { start: string; end: string }
}

async function fetchAllChartData(
  charts: ReadonlyArray<ChartSpec>,
): Promise<Map<string, ChartData>> {
  const results = new Map<string, ChartData>()

  const fetches = charts.map(async (chart) => {
    try {
      const rawData = await fetchDataForQuery(chart.dataQuery)
      const timeRange = extractTimeRange(rawData)
      results.set(chart.id, { chartType: chart.type, rawData, timeRange })
    } catch (err) {
      console.error(`Failed to fetch data for ${chart.id}:`, err)
      results.set(chart.id, { chartType: chart.type, rawData: null })
    }
  })

  await Promise.all(fetches)
  return results
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

function extractTimeRange(data: unknown): { start: string; end: string } | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  if (Array.isArray(d.prices) && d.prices.length > 1) {
    const first = d.prices[0] as [number, number]
    const last = d.prices[d.prices.length - 1] as [number, number]
    return {
      start: new Date(first[0]).toISOString().split('T')[0],
      end: new Date(last[0]).toISOString().split('T')[0],
    }
  }
  return undefined
}

function buildShapeProps(chart: ChartSpec, pixel: { width: number; height: number }, data?: ChartData | null): Record<string, unknown> {
  const base = {
    w: pixel.width,
    h: pixel.height,
    title: chart.title,
    chartId: chart.id,
  }

  if (!data?.rawData) {
    return { ...base, data: [] }
  }

  switch (chart.type) {
    case 'candlestick': {
      const raw = data.rawData as { prices: Array<[number, number]> }
      const ohlcData = convertToOHLC(raw.prices ?? [])
      return {
        ...base,
        data: ohlcData,
        timeRange: data.timeRange ?? { start: '', end: '' },
      }
    }
    case 'bar':
    case 'line': {
      const timeValues = convertToTimeValue(data.rawData)
      return {
        ...base,
        chartType: chart.type,
        data: timeValues,
        timeRange: data.timeRange ?? { start: '', end: '' },
      }
    }
    case 'node-graph': {
      const graph = convertToGraph(data.rawData)
      return {
        ...base,
        nodes: graph.nodes,
        links: graph.links,
      }
    }
    default:
      return { ...base, data: [] }
  }
}

function convertToOHLC(
  prices: Array<[number, number]>,
): Array<{ time: string; open: number; high: number; low: number; close: number }> {
  // Group by day and create OHLC candles
  const dayMap = new Map<string, number[]>()

  for (const [ts, price] of prices) {
    const day = new Date(ts).toISOString().split('T')[0]
    const existing = dayMap.get(day) ?? []
    existing.push(price)
    dayMap.set(day, existing)
  }

  return Array.from(dayMap.entries()).map(([day, values]) => ({
    time: day,
    open: values[0],
    high: Math.max(...values),
    low: Math.min(...values),
    close: values[values.length - 1],
  }))
}

function convertToTimeValue(data: unknown): Array<{ time: string; value: number }> {
  if (Array.isArray(data)) {
    return data
      .filter((entry: any) => entry.date && (entry.totalLiquidityUSD ?? entry.tvl) !== undefined)
      .map((entry: any) => ({
        time: new Date(entry.date * 1000).toISOString().split('T')[0],
        value: entry.totalLiquidityUSD ?? entry.tvl ?? 0,
      }))
  }

  const d = data as Record<string, unknown>
  if (Array.isArray(d.prices)) {
    return d.prices.map(([ts, value]: [number, number]) => ({
      time: new Date(ts).toISOString().split('T')[0],
      value,
    }))
  }

  if (Array.isArray(d.tvl)) {
    return (d.tvl as Array<{ date: number; totalLiquidityUSD: number }>).map((entry) => ({
      time: new Date(entry.date * 1000).toISOString().split('T')[0],
      value: entry.totalLiquidityUSD,
    }))
  }

  return []
}

function convertToGraph(data: unknown): {
  nodes: Array<{ id: string; label: string; value: number }>
  links: Array<{ source: string; target: string; label?: string; value?: number }>
} {
  // Extract protocol token holders/chains as nodes from DeFiLlama data
  const d = data as Record<string, unknown>

  if (d.chains && Array.isArray(d.chains)) {
    const chainBreakdown = d.chainTvls as Record<string, { tvl: Array<{ date: number; totalLiquidityUSD: number }> }> | undefined

    const nodes = (d.chains as string[]).slice(0, 8).map((chain) => {
      const tvl = chainBreakdown?.[chain]?.tvl
      const latestTvl = tvl?.[tvl.length - 1]?.totalLiquidityUSD ?? 0
      return { id: chain, label: chain, value: latestTvl }
    })

    const protocolName = (d.name as string) ?? 'Protocol'
    const centralNode = { id: 'protocol', label: protocolName, value: nodes.reduce((sum, n) => sum + n.value, 0) }

    const links = nodes.map((node) => ({
      source: 'protocol',
      target: node.id,
      value: node.value,
    }))

    return { nodes: [centralNode, ...nodes], links }
  }

  return { nodes: [], links: [] }
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Start dev server and test manually**

```bash
npx vinxi dev
```

Open `http://localhost:3000`, type a prompt, verify the full flow works.

- [ ] **Step 4: Commit**

```bash
git add app/routes/index.tsx
git commit -m "feat: integrate main page with prompt input, data fetching, and chart rendering"
```

---

### Task 18: localStorage Persistence

**Files:**
- Modify: `app/components/BoardCanvas.tsx`

- [ ] **Step 1: Add persistence to BoardCanvas**

Update `BoardCanvas.tsx` to auto-save tldraw state to localStorage (debounced 2s) and restore on mount.

**IMPORTANT:** `useCallback` does not support cleanup returns — only `useEffect` does. Store the editor ref and use a separate `useEffect` for the subscription.

```tsx
// Add to BoardCanvas.tsx:

const STORAGE_KEY = 'lucidview-board'
const editorInstanceRef = useRef<Editor | null>(null)

const handleMount = useCallback(
  (editor: Editor) => {
    // Restore from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const snapshot = JSON.parse(saved)
        editor.store.loadSnapshot(snapshot)
      }
    } catch (err) {
      console.warn('Failed to restore board:', err)
    }

    editorInstanceRef.current = editor
    onEditorReady(editor)
  },
  [onEditorReady],
)

// Auto-save subscription — in a separate useEffect for proper cleanup
useEffect(() => {
  const editor = editorInstanceRef.current
  if (!editor) return

  let saveTimeout: ReturnType<typeof setTimeout>
  const unsub = editor.store.listen(() => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      try {
        const snapshot = editor.store.getSnapshot()
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
}, [editorInstanceRef.current])
```

- [ ] **Step 2: Manually test persistence**

1. Start dev server, generate a whiteboard
2. Refresh the page
3. Verify charts are restored

- [ ] **Step 3: Commit**

```bash
git add app/components/BoardCanvas.tsx
git commit -m "feat: add localStorage auto-save and restore for tldraw board state"
```

---

### Task 19: Environment Configuration

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

```bash
# LLM Provider: "claude-p" | "gemini" | "openai-compatible"
LLM_PROVIDER=claude-p

# Gemini (when LLM_PROVIDER=gemini)
# GEMINI_API_KEY=your-key-here

# OpenAI-compatible (when LLM_PROVIDER=openai-compatible)
# OPENAI_API_KEY=your-key-here
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini
```

- [ ] **Step 2: Update .gitignore to include .env**

Verify `.env` is in `.gitignore` (already done in Task 1).

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example with LLM provider configuration"
```

---

### Task 20: End-to-End Smoke Test

- [ ] **Step 1: Create .env with claude-p**

```bash
cp .env.example .env
# Ensure LLM_PROVIDER=claude-p
```

- [ ] **Step 2: Start dev server and test full flow**

```bash
npx vinxi dev
```

1. Open `http://localhost:3000`
2. Enter: "Analyze Ethereum Shanghai upgrade impact on price and staking"
3. Verify:
   - Loading phases show correctly
   - 2-3 charts appear on canvas
   - Charts have real data from APIs
   - Connection arrows link charts
   - Hover on one chart shows crosshair on others
   - Drag charts — arrows follow
   - Refresh page — board restores from localStorage

- [ ] **Step 3: Fix any issues found during smoke test**

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete LucidView MVP — prompt-driven infinite research whiteboard"
```
