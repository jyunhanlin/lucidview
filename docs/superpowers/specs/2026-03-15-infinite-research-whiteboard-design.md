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
| Data sources | CoinGecko + DeFiLlama + beaconcha.in | Free tier APIs sufficient for MVP; covers price, TVL, staking, fund flow data |
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
│              │ fetchStakingData()│──▶ beaconcha.in API     │
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

The core interface between AI and frontend. All timestamps use **ISO 8601 date format: `"YYYY-MM-DD"`** (e.g., `"2023-04-12"`). This canonical format applies everywhere: `ConnectionSpec.timestamp`, `SyncStore.hoveredTimestamp`, and `getAnchorForTimestamp()`.

```typescript
// LLM response is a discriminated union — either a valid board or a clarification request
type BoardResponse =
  | { type: "board"; data: BoardSchema }
  | { type: "clarification"; message: string }

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

// Supported data queries — AI must use one of these predefined query types.
// Server functions validate and map these to actual API calls.
type DataQuery =
  | { source: "coingecko"; query: "price_history"; token: string; days: number; vs_currency?: string }
  | { source: "coingecko"; query: "market_data"; token: string }
  | { source: "defillama"; query: "protocol_tvl"; protocol: string }
  | { source: "defillama"; query: "chain_tvl"; chain: string }
  | { source: "defillama"; query: "protocol_flows"; protocol: string; period?: string }
  | { source: "beaconchain"; query: "staking_deposits"; days: number }
  | { source: "beaconchain"; query: "validator_count"; days: number }

// Connection endpoint — time-axis charts use timestamp, node graphs use "center" anchor
type ConnectionEndpoint =
  | { chartId: string; anchor: "timestamp"; timestamp: string }  // ISO 8601 date "YYYY-MM-DD"
  | { chartId: string; anchor: "center" }                        // For node graphs (no time axis)

interface ConnectionSpec {
  from: ConnectionEndpoint
  to: ConnectionEndpoint
  label: string
  style: "solid" | "dashed"
}
```

### Position Coordinate System

AI outputs positions in a **logical grid** system, not tldraw pixel coordinates:
- AI uses a coordinate space where 1 unit = 1 logical block (roughly 400×300 pixels)
- `position: { x: 0, y: 0 }` = top-left of the whiteboard
- `position: { x: 1, y: 0 }` = one chart-width to the right
- `layout.ts` converts these logical positions to tldraw pixel coordinates with spacing gaps
- This abstraction frees the AI from needing to know tldraw's coordinate system

### Incremental Schema (Follow-up Prompts)

When user adds a follow-up prompt to an existing whiteboard, the AI returns the same `BoardSchema` interface but containing **only the new charts and connections**. Rules:
- New `connections` may reference existing chart IDs (from the prior schema sent as context)
- New charts get new unique IDs (no collision with existing IDs)
- AI cannot modify or remove existing charts — only add new ones
- Frontend appends new shapes to the canvas without affecting existing positions

**Key design choices:**
- `DataQuery` uses a **discriminated union of predefined query types** instead of raw endpoint strings — this prevents LLM hallucination of invalid endpoints and eliminates SSRF risk. Server functions map each query type to the actual API call.
- `position` uses a logical grid system; `layout.ts` converts to tldraw coordinates. This decouples AI spatial reasoning from pixel-level details.
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
- Node graph (no time axis) → MVP: no hover sync for node graphs. Node graphs display a static snapshot of fund flows for the queried period. Cross-chart hover sync only applies between time-axis charts (candlestick, bar, line). Future: add temporal node graph animation.

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

Each Chart Shape must implement a timestamp-to-anchor interface for arrow binding:

```typescript
// Every time-axis shape exposes this method
interface TimeAnchorable {
  getAnchorForTimestamp(timestamp: string): { x: number; y: number } | null
  // Returns shape-local coordinates for a given timestamp
  // Returns null if timestamp is outside chart's time range
}
```

- tldraw Arrow shapes bind to custom anchor points via tldraw's `BindingUtil`
- When charts are dragged, tldraw's binding mechanism automatically updates arrow positions
- `ConnectionArrow.tsx` creates arrow shapes and sets up bindings using each chart's `getAnchorForTimestamp()`
- For `NodeGraphShape` (no time axis), arrows bind to the shape's center point

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
| LLM returns valid JSON but invalid schema | Zod validation catches it; auto-retry with error feedback appended to prompt |
| Data API timeout (>10s) | Abort request; show "Data load timed out" on that chart; other charts render normally |
| Data API returns empty/unexpected data | Show "No data available for this range" on that chart |
| Data API rate limit (429) | Show "Rate limited, please wait" with retry countdown |
| Prompt too vague | AI returns `{ type: "clarification", message: "Which time range?" }` — frontend shows the message in the prompt area and waits for user input |

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
│       ├── llm-client.ts          # LLM adapter (see LLM Adapter below)
│       └── prompt-template.ts     # System prompt + few-shot examples
├── app.config.ts                  # TanStack Start config
├── package.json
└── .env                           # API keys (gitignored)
```

## LLM Adapter

`llm-client.ts` implements a simple adapter interface to support switching LLM providers:

```typescript
interface LLMClient {
  generateBoardSchema(prompt: string, existingSchema?: BoardSchema): Promise<BoardSchema>
}
```

Three implementations, swapped via environment variable `LLM_PROVIDER`:
- **`claude-p`**: Spawns `claude -p` subprocess, passes prompt via stdin, parses stdout as JSON. Local dev only. Has no built-in JSON mode — relies on prompt engineering to produce valid JSON, validated by Zod. On validation failure, uses the same retry-with-error-feedback strategy as other providers.
- **`gemini`**: Calls Gemini Flash-Lite API via `@google/generative-ai` SDK with JSON mode. Uses `GEMINI_API_KEY` env var.
- **`openai-compatible`**: Calls any OpenAI-compatible API (OpenAI, DeepSeek, etc.) via `openai` SDK. Uses `OPENAI_API_KEY` + `OPENAI_BASE_URL` env vars. This is the BYOK path.

### Prompt Strategy

`prompt-template.ts` constructs the LLM prompt with:
1. **System prompt**: Defines the AI's role, the BoardSchema interface (with all valid `DataQuery` types), and output format rules
2. **Few-shot examples**: 2-3 curated prompt→schema pairs (e.g., "Ethereum Shanghai upgrade" → complete BoardSchema JSON) to ground the AI's output format
3. **User prompt**: The user's natural language input
4. **Context** (for follow-ups): A summary of the existing BoardSchema (chart IDs, titles, types, and time ranges — `dataQuery` params stripped to save tokens), so the AI can reference existing chart IDs in new connections without exceeding token budgets

## Additional Decisions

- **Platform**: Desktop-only for MVP. tldraw's mobile experience and chart interactions on touch screens require significant additional work.
- **localStorage persistence**: Auto-saves the full tldraw document snapshot on every change (debounced 2s). On app load, restores from localStorage if available. No explicit save/load UI needed for MVP.

## MVP Scope Summary

**In scope:**
- Single-page app with prompt input + tldraw infinite canvas
- AI generates Board Schema from natural language prompt
- 4 chart types: candlestick, line, bar (Lightweight Charts) + node graph (D3-force)
- Cross-chart hover synchronization
- AI-generated arrow annotations connecting key time points
- Follow-up prompts for incremental chart addition
- localStorage whiteboard persistence
- Free data APIs: CoinGecko, DeFiLlama, beaconcha.in

**Out of scope (future):**
- User accounts / authentication
- Database persistence / cross-device sync
- Shareable whiteboard links
- Tool-Use Pipeline (live AI manipulation UX)
- Advanced node graph with transaction-level Etherscan data
- Multiple LLM provider UI (BYOK settings page)
- Export whiteboard as image/PDF
