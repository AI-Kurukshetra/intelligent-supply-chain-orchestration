# Deployment Guide

## Vercel Setup

1. Create a Vercel project from the repository.
2. Configure the project as a Next.js app.
3. Set the production environment variables from `.env.example`.
4. Ensure the Inngest webhook route `/api/webhooks/inngest` is reachable from the public deployment.
5. Set custom domains for planner and supplier portal traffic.

## Environment Variable Checklist

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CONNECTOR_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PORTAL_URL`

## Supabase Project Setup

- Create storage buckets for imports, reports, and attachments.
- Enable Realtime publication for planning cells, exceptions, KPI snapshots, and S&OP actions.
- Confirm RLS policies are enabled on every tenant-scoped table.
- Configure Auth providers and redirect URLs for planner and supplier experiences.

## Inngest Setup

- Register the app with `appId=iscop`.
- Point the webhook to `https://<your-domain>/api/webhooks/inngest`.
- Verify cron-based functions are active for forecasting, KPIs, scorecards, inventory policies, and exception detection.

## Production Checklist

- RLS verified on all tables
- Supabase Storage buckets provisioned and access policies applied
- SMTP and Resend domain verified
- Custom domains and SSL active
- Vercel preview and production environments configured
- Supabase migrations applied through CI/CD
- Smoke tests passing on `/api/v1/auth/me` and `/api/v1/analytics/kpis/current`
- AI routes rate-limited and monitored
- Connector encryption key rotated and stored securely
