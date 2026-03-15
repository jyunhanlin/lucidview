# LucidView — Infinite Research Whiteboard Design Spec

## Overview

LucidView is a prompt-driven infinite research whiteboard for crypto investors and traders. Users input a natural language prompt (e.g., "Analyze the impact of Ethereum Shanghai upgrade on fund flows and price"), and the AI generates a multi-chart whiteboard with candlestick charts, bar charts, and node graphs — automatically connected by annotated arrows at key time points.

### Core Differentiator

Unlike existing AI chart tools that render a single chart in a fixed `<div>`, LucidView generates **multiple interlinked charts on an infinite canvas** with:
- AI-generated spatial layout
- Cross-chart hover synchronization
- Automated arrow annotations connecting key time points across charts

## Target Users

**MVP:** General crypto investors and traders who want to quickly understand market events without writing SQL or code.

**Future:** Professional analysts, content creators / KOLs.

## Technical Decisions

| Dimension | Decision | Rationale |
|-----------|----------|-----------|
| Canvas | tldraw | True infinite whiteboard feel; custom shapes for embedding charts; users can freely drag, annotate, and draw |
| Full-stack framework | TanStack Start | Vite-native (best tldraw compatibility); type-safe server functions; avoids Next.js SSR/canvas conflicts; easy to split later |
| Chart library | Lightweight Charts (unified) | Single dependency for candlestick, line, and bar charts; consistent financial UI style; 40KB gzipped; familiar TradingView interface for traders |
| Node graph | D3-force | Force-directed layout for fund flow visualization; draggable nodes |
| State management | Zustand | Cross-chart hover synchronization via shared store |
| Schema validation | Zod | Native TanStack integration; type inference from schema; LLM output validation |
| LLM strategy | claude -p (prototype) → Gemini Flash-Lite (dev) → BYOK (production) | Zero cost start; cheapest API for development; user-provided keys for production |
| Data sources | CoinGecko + DeFiLlama + Beacon Chain | Free tier APIs sufficient for MVP; covers price, TVL, staking, fund flow data |
| Database | None (MVP) | localStorage for whiteboard persistence; no user accounts in MVP |
| Deployment | Vercel | Native TanStack Start support |

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                       │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  Prompt   │   │  tldraw      │   │  Chart Shapes   │  │
│  │  Input    │──▶│  Canvas      │◀──│  (K線/Bar/Node) │  │
│  └──────────┘   └──────┬───────┘   └────────┬────────┘  │
│                        │                     │           │
│              ┌─────────▼─────────┐           │           │
│              │  Zustand Store    │◀──────────┘           │
│              │  (hover sync)     │                       │
│              └─────────┬─────────┘                       │
│                        │                                 │
├────────────────────────┼─────────────────────────────────┤
│                        │    TanStack Start               │
│              ┌─────────▼─────────┐                       │
│              │  Server Functions │                       │
│              ├───────────────────┤                       │
│              │ analyzePrompt()   │──▶ LLM                │
│              │ fetchPriceData()  │──▶ CoinGecko          │
│              │ fetchStakingData()│──▶ Beacon Chain API    │
│              │ fetchFlowData()   │──▶ DeFiLlama          │
│              └───────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. User inputs prompt (e.g., "Analyze Ethereum Shanghai upgrade")
2. Server function `analyzePrompt()` calls LLM → returns **Board Schema** (JSON)
3. Frontend parses schema, calls data server functions **in parallel**
4. Once data arrives, creates tldraw Chart Shapes + Connection Arrows
5. Zustand store manages hover synchronization (`hoveredTimestamp`)

### Architecture Approach: Schema-Driven

AI outputs a declarative JSON schema describing what to render. Frontend handles all data fetching and rendering.

**Why Schema-Driven over alternatives:**
- **vs Code-Gen:** No security risks from executing AI-generated code; predictable, validatable output
- **vs Tool-Use Pipeline:** Single LLM call = lower latency and cost; sufficient for MVP's fixed chart types
- **Future evolution:** Schema objects map 1:1 to tool calls, making migration to Tool-Use Pipeline straightforward when "AI working live on canvas" UX is desired

## Board Schema

The core interface between AI and frontend.

```typescript
interface BoardSchema {
  title: string
  charts: ChartSpec[]
  connections: ConnectionSpec[]
}

interface ChartSpec {
  id: string
  type: "candlestick" | "bar" | "line" | "node-graph"
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  dataQuery: DataQuery
}

interface DataQuery {
  source: "coingecko" | "defillama" | "beaconchain"
  endpoint: string
  params: Record<string, string>
}

interface ConnectionSpec {
  from: { chartId: string; timestamp: string }
  to: { chartId: string; timestamp: string }
  label: string
  style: "solid" | "dashed"
}
```

**Key design choices:**
- `DataQuery` separates AI decision-making from data fetching — AI decides *what* data, frontend handles *how* to fetch
- `position` provides AI-computed initial layout; users can override by dragging on canvas
- `ConnectionSpec` uses `timestamp` (not pixel coordinates) to define connection points — frontend converts timestamps to x/y coordinates based on each chart's time axis

## tldraw Custom Shapes

Three custom shape types, all sharing a common hover synchronization mechanism.

### Shape Types

| Shape | Rendering | Description |
|-------|-----------|-------------|
| `CandlestickShape` | Lightweight Charts | Candlestick chart for price data |
| `BarLineShape` | Lightweight Charts | Bar chart or line chart for staking, TVL, etc. |
| `NodeGraphShape` | D3-force | Force-directed node graph for fund flows |

### Hover Synchronization

All chart shapes share a Zustand store for cross-chart hover linking:

```typescript
interface SyncStore {
  hoveredTimestamp: string | null
  hoveredChartId: string | null
  setHover: (chartId: string, timestamp: string) => void
  clearHover: () => void
}
```

- User hovers data point on any chart → `setHover("chart-1", "2023-04-12")`
- All other charts subscribe → draw vertical cursor line at corresponding timestamp
- Node graph (no time axis) → highlights nodes/edges relevant to that timestamp

### Shape Structure

Each shape follows this pattern:
- **Title bar:** Chart title + data source indicator
- **Chart area:** Independent React component with its own lifecycle
- **Hover layer:** Subscribes to Zustand store, draws/updates cursor line
- **tldraw provides:** Drag, resize, select, delete for free

## Connection Arrow System

AI-generated arrows connecting key time points across charts.

### Dynamic Coordinate Calculation

Arrow endpoints must update when charts are dragged or resized:

1. Read `ConnectionSpec`: `{ chartId: "chart-1", timestamp: "2023-04-12" }`
2. Get chart's current tldraw position: `(shapeX, shapeY)`
3. Convert timestamp to chart-internal x coordinate:
   - e.g., "2023-04-12" is day 102 of 180 → relative x = `(102/180) * chartWidth`
4. Arrow start = `shapeX + relativeX, shapeY + chartHeight`
5. Calculate end point the same way
6. Use tldraw Arrow shape with binding to anchor points

### Implementation

- Each Chart Shape exposes **anchor points** calculated from timestamps
- Arrow shapes bind to these anchors via tldraw's binding mechanism
- When charts are dragged, arrows follow automatically

### Visual Style

- Arrow: Dashed line, gold color (#ffd700) to distinguish from chart data
- Label: Semi-transparent background + text, attached at arrow midpoint, user-draggable

## User Experience Flow

```
1. Open app
   └─ Empty tldraw canvas + Prompt input bar at top

2. Enter prompt
   └─ "Analyze Ethereum Shanghai upgrade impact on fund flows and price"
   └─ Press Enter to submit

3. Loading (approx 3-8 seconds)
   ├─ Phase 1: "AI analyzing..." → LLM returns Board Schema
   ├─ Phase 2: "Fetching data..." → Parallel data API calls
   └─ Phase 3: "Rendering..." → Create shapes + connections

4. Whiteboard generated
   ├─ 2-3 charts appear on canvas per AI layout
   ├─ Connection arrows auto-drawn
   └─ Canvas auto zoom-to-fit

5. User interaction
   ├─ Drag charts to adjust layout
   ├─ Hover charts for cross-chart cursor sync
   ├─ Delete unwanted charts
   ├─ Enter follow-up prompt ("Add a Gas fee chart")
   └─ Use tldraw tools to draw arrows, add text notes manually
```

### Follow-up Prompts

When user adds a new prompt to an existing whiteboard:
- AI receives **existing schema + new prompt** → returns **incremental schema** (only new charts and connections)
- Frontend appends to whiteboard without affecting existing chart positions

### Error Handling

| Scenario | Handling |
|----------|----------|
| LLM returns invalid JSON | Auto-retry once; show error message if still fails |
| Data API timeout/failure | Show "Data load failed" on that chart; other charts render normally |
| Prompt too vague | AI returns `{ "clarification": "Which time range?" }` and prompts user |

## Project Structure

```
lucidview/
├── app/
│   ├── routes/
│   │   └── index.tsx              # Main page: Prompt input + tldraw canvas
│   ├── components/
│   │   ├── PromptInput.tsx        # Prompt input bar
│   │   ├── BoardCanvas.tsx        # tldraw canvas container
│   │   └── LoadingOverlay.tsx     # Loading state during generation
│   ├── shapes/
│   │   ├── CandlestickShape.tsx   # Candlestick chart shape (Lightweight Charts)
│   │   ├── BarLineShape.tsx       # Bar/Line chart shape (Lightweight Charts)
│   │   ├── NodeGraphShape.tsx     # Force-directed node graph shape (D3-force)
│   │   └── ConnectionArrow.tsx    # Arrow binding and coordinate logic
│   ├── stores/
│   │   └── sync-store.ts          # Zustand hover sync store
│   ├── schemas/
│   │   └── board-schema.ts        # Zod schema definitions + TypeScript types
│   └── lib/
│       ├── layout.ts              # AI coordinates → tldraw coordinates conversion
│       └── timestamp-utils.ts     # Timestamp → chart-internal x coordinate conversion
├── server/
│   ├── functions/
│   │   ├── analyze-prompt.ts      # LLM call, returns Board Schema
│   │   ├── fetch-price.ts         # CoinGecko proxy
│   │   ├── fetch-staking.ts       # Beacon Chain proxy
│   │   └── fetch-flow.ts          # DeFiLlama proxy
│   └── lib/
│       ├── llm-client.ts          # LLM adapter (claude -p / Gemini / BYOK)
│       └── prompt-template.ts     # System prompt + few-shot examples
├── app.config.ts                  # TanStack Start config
├── package.json
└── .env                           # API keys (gitignored)
```

## MVP Scope Summary

**In scope:**
- Single-page app with prompt input + tldraw infinite canvas
- AI generates Board Schema from natural language prompt
- 4 chart types: candlestick, line, bar (Lightweight Charts) + node graph (D3-force)
- Cross-chart hover synchronization
- AI-generated arrow annotations connecting key time points
- Follow-up prompts for incremental chart addition
- localStorage whiteboard persistence
- Free data APIs: CoinGecko, DeFiLlama, Beacon Chain

**Out of scope (future):**
- User accounts / authentication
- Database persistence / cross-device sync
- Shareable whiteboard links
- Tool-Use Pipeline (live AI manipulation UX)
- Advanced node graph with transaction-level Etherscan data
- Multiple LLM provider UI (BYOK settings page)
- Export whiteboard as image/PDF
