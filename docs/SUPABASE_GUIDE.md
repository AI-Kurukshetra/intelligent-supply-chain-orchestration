# Supabase Guide

## Running Migrations

Apply the local migration set with:

```bash
npm run db:migrate
```

Reset a local development database when needed:

```bash
npm run db:reset
```

## Generating TypeScript Types

Generate fresh database types from the local Supabase stack:

```bash
npm run db:types
```

This updates `lib/supabase/types.ts`.

## RLS Policy Pattern

ISCOP uses tenant isolation through a profile lookup pattern:

```sql
CREATE POLICY "tenant_isolation" ON table_name
USING (
  tenant_id = (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
);
```

Rules that matter in this codebase:

- Never trust a client-supplied `tenant_id`
- Derive tenant scope from the authenticated user profile
- Use the service role only for controlled admin operations such as audit logging, invitations, report generation, and background fan-out work

## Realtime Setup

ISCOP uses both:

- Broadcast channels for concurrent planning sessions
- Postgres changes for live exception and KPI updates

The expected broadcast naming pattern is:

```text
planning:session:{sessionId}
```

Presence state is used to track active collaborators and their current editing location.

## Storage Bucket Configuration

Recommended buckets:

- `master-data-imports`
- `reports`
- `attachments`

For downloads:

- Generate signed URLs with one-hour expiry
- Avoid public buckets for planner data
- Restrict writes through server-side route handlers or background jobs

## Local Development Notes

- Start Supabase locally with `npm run db:start`
- Seed demo data with `npm run db:seed`
- Keep `auth.site_url` aligned with your local Next.js port
- Regenerate types after every schema change so strict TypeScript stays accurate
