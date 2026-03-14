# Architecture

## System Overview

```mermaid
flowchart LR
  User["Planner / Supplier User"] --> Next["Next.js 15 App Router on Vercel"]
  Next --> Auth["Supabase Auth"]
  Next --> DB["Supabase PostgreSQL + RLS"]
  Next --> RT["Supabase Realtime"]
  Next --> Storage["Supabase Storage"]
  Next --> Inngest["Inngest Workflows"]
  Inngest --> DB
  Inngest --> Email["Resend"]
  Next --> AI["OpenAI via Vercel AI SDK"]
```

## Key Architecture Decisions

### Why Next.js App Router

- Route handlers, React Server Components, and server actions keep feature code colocated.
- The planner workspace benefits from server-side data fetching for low-latency first paint.
- Route groups cleanly separate planner, portal, and auth experiences.

### Why Supabase

- Row Level Security is the core multi-tenant isolation layer.
- Realtime broadcast channels support collaborative planning without maintaining custom socket infrastructure.
- Auth, Storage, and PostgreSQL reduce platform sprawl for the MVP.

### Why Inngest

- Forecast runs, MRP, KPI refresh, scorecards, imports, reports, and exception detection all need retries and scheduling.
- Inngest provides fan-out workflows and cron without owning queue infrastructure.
- Function steps isolate failures cleanly and make long-running work observable.

### Why Vercel

- Next.js deployment is zero-friction.
- Preview deployments fit the product’s fast iteration model.
- Edge/runtime split allows auth-adjacent paths to stay fast while keeping DB and file generation on Node.js routes.

## Data Flow: Forecast Run

```mermaid
sequenceDiagram
  participant Planner
  participant API as Demand Route Handler
  participant Inngest
  participant Engine as Forecast Engine
  participant DB as Supabase

  Planner->>API: POST /api/v1/demand/forecasts/runs
  API->>DB: create forecast_runs row
  API->>Inngest: send demand/forecast.run
  Inngest->>Engine: run per product
  Engine->>DB: read demand_history
  Engine->>DB: write statistical_forecasts + forecast_accuracy
  Inngest->>DB: update forecast_runs status
```

## Data Flow: MRP Run

```mermaid
sequenceDiagram
  participant Planner
  participant API as Supply Route
  participant Inngest
  participant MRP as MRP Engine
  participant DB as Supabase

  Planner->>API: POST /api/v1/supply/mrp/runs
  API->>Inngest: send supply/mrp.run
  Inngest->>MRP: run by product batch
  MRP->>DB: read forecasts, overrides, inventory, BOM
  MRP->>DB: call calculate_net_requirements()
  MRP->>DB: write planned_orders and messages
  Inngest->>DB: update planning cycle to review
```

## Data Flow: Exception Detection

```mermaid
sequenceDiagram
  participant Cron as Inngest Cron
  participant Orchestrator
  participant Detectors
  participant DB as Supabase
  participant Email as Resend

  Cron->>Orchestrator: exceptions.detect
  Orchestrator->>Detectors: run all detectors in parallel
  Detectors->>DB: query supply, demand, inventory, planning data
  Orchestrator->>DB: dedupe and insert new exceptions
  Orchestrator->>Email: alert critical/high recipients
```

## Realtime Concurrent Planning

- Each planning session maps to a Supabase Realtime broadcast channel: `planning:session:{sessionId}`.
- Cell edits are optimistic in the UI and then persisted through route handlers.
- Presence tracks active collaborators with lightweight user state.
- Impact calculations run asynchronously via Inngest and broadcast summarized results back to the session.
- The database remains the source of truth while Realtime handles low-latency collaboration.
