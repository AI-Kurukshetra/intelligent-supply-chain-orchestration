# ISCOP — Intelligent Supply Chain Orchestration Platform

ISCOP is a multi-tenant, AI-native supply chain planning product for mid-market manufacturers. It combines demand forecasting, MRP, inventory optimization, exception management, concurrent planning, supplier collaboration, analytics, integrations, and AI-assisted workflows in a single Next.js 15 application backed by Supabase and Inngest.

## Stack Overview

- Frontend: Next.js 15 App Router, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui
- Data: Supabase PostgreSQL 15, Row Level Security, Realtime, Storage
- Auth: Supabase Auth with email/password, magic link, and SSO-ready routing
- Async jobs: Inngest for cron jobs, fan-out forecasting, MRP, reports, and alerts
- Charts and grids: ECharts, AG Grid Enterprise, Recharts for compact visuals
- AI: Vercel AI SDK with OpenAI for recommendations and natural-language queries
- Email: Resend with React Email templates
- Deployment: Vercel + Supabase

## Prerequisites

- Node.js 20+
- npm 10+ or pnpm 9+
- Supabase CLI
- A Supabase project or local Supabase stack
- Inngest account and keys
- Resend API key for transactional email
- OpenAI API key for AI routes

## Quick Start

Run these five commands from a fresh clone:

```bash
npm ci
cp .env.example .env.local
npm run db:start
npm run db:migrate
npm run dev
```

Then, in a second terminal:

```bash
npm run db:seed
```

Open `http://localhost:3000` and sign in with your seeded planner credentials.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CONNECTOR_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PORTAL_URL`

## Supabase Setup

1. Create a Supabase project or run `npm run db:start` for local development.
2. Apply migrations with `npm run db:migrate`.
3. Seed demo data with `npm run db:seed`.
4. Generate types with `npm run db:types`.
5. Confirm Realtime is enabled for the planning and exceptions tables.

## Inngest Setup

1. Create an Inngest app.
2. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.
3. Point the Inngest dev server or cloud app to `/api/webhooks/inngest`.
4. Start the app locally with `npm run dev` and let Inngest discover functions automatically.

## Testing

- Unit and route tests: `npm run test`
- Coverage: `npm run test:coverage`
- E2E: `npm run test:e2e`
- Lint + typecheck: `npm run lint`

The test suite assumes a local Supabase stack is available. Run `npm run db:start` before Vitest or Playwright if you want database-backed test execution.

## Project Highlights

- Multi-tenant isolation through Supabase RLS on every domain table
- Realtime concurrent planning via Supabase broadcast channels and presence
- Forecasting and inventory optimization implemented in pure TypeScript for MVP portability
- MRP, exception detection, report generation, and supplier scorecards automated through Inngest
- Planner and supplier experiences served from the same codebase with role-aware routing

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Data Model](./docs/DATA_MODEL.md)
- [API Guide](./docs/API_GUIDE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Supabase Guide](./docs/SUPABASE_GUIDE.md)
