# API Guide

## Authentication

ISCOP supports two authentication modes:

- Supabase session cookie or bearer token for user-facing planner and supplier flows
- API key for service-style automation access

User-authenticated route handlers call `requireAuth(request)` first, then derive tenant scope from the authenticated profile. Client requests should send the Supabase session automatically through cookies.

## API Versioning

All product APIs live under `/api/v1`.

## Pagination

List endpoints use cursor pagination where data volumes warrant it.

Example response:

```json
{
  "data": [{ "id": "..." }],
  "next_cursor": "2026-03-14T08:00:00.000Z",
  "has_more": true
}
```

Send the returned cursor back as `?cursor=...` to continue.

## Error Format

Errors are serialized as RFC 7807 Problem Details.

```json
{
  "type": "https://iscop.ai/errors/403",
  "title": "Forbidden",
  "status": 403,
  "detail": "The authenticated user is not associated with a tenant."
}
```

## Rate Limiting

- Default: 100 requests per minute per user
- Intended implementation: Vercel KV sliding window
- High-cost routes such as imports, reports, and AI endpoints should be tighter in production

## Endpoint Groups

### Auth

- `GET /api/v1/auth/me`
- `PUT /api/v1/auth/me`
- `GET /api/v1/auth/users`
- `POST /api/v1/auth/users`
- `POST /api/v1/auth/api-keys`

### Master Data

- `GET /api/v1/master/products`
- `POST /api/v1/master/products`
- `GET /api/v1/master/products/:id`
- `GET /api/v1/master/products/:id/bom`
- `POST /api/v1/master/products/import`
- `GET /api/v1/master/products/export`
- Equivalent CRUD sets for suppliers and facilities
- BOM endpoints under `/api/v1/master/bom`

### Demand

- `GET /api/v1/demand/forecasts`
- `POST /api/v1/demand/forecasts/runs`
- `GET /api/v1/demand/forecasts/runs/:runId`
- `GET /api/v1/demand/history`
- `POST /api/v1/demand/overrides`

### Supply

- `GET /api/v1/supply/plans`
- `POST /api/v1/supply/mrp/runs`
- `GET /api/v1/supply/planned-orders`
- `POST /api/v1/supply/planned-orders/bulk-firm`

### Inventory

- `GET /api/v1/inventory/positions`
- `POST /api/v1/inventory/positions/adjust`
- `GET /api/v1/inventory/policies`
- `POST /api/v1/inventory/policies/calculate`
- `GET /api/v1/inventory/analytics/turns`

### Planning

- `GET /api/v1/planning/sessions`
- `POST /api/v1/planning/sessions`
- `POST /api/v1/planning/sessions/:id/cells/update`
- `GET /api/v1/planning/scenarios`
- `POST /api/v1/planning/scenarios/:id/promote`

### Exceptions

- `GET /api/v1/exceptions`
- `PATCH /api/v1/exceptions/:id/acknowledge`
- `POST /api/v1/exceptions/:id/resolve`
- `POST /api/v1/exceptions/bulk-resolve`

### Collaboration

- `GET /api/v1/collaboration/sop`
- `POST /api/v1/collaboration/sop/:id/advance`
- `GET /api/v1/collaboration/suppliers/:supplierId/capacity-gap`

### Analytics

- `GET /api/v1/analytics/kpis/current`
- `GET /api/v1/analytics/kpis/:kpiCode`
- `GET /api/v1/analytics/dashboard/:type`
- `POST /api/v1/analytics/reports/:id/run`

### Integrations and AI

- `GET /api/v1/integrations/connectors`
- `POST /api/v1/integrations/connectors/:id/sync`
- `POST /api/v1/ai/recommend`
- `POST /api/v1/ai/query`

## Request and Response Examples

### Create Product

```http
POST /api/v1/master/products
Content-Type: application/json
```

```json
{
  "sku": "FG-1000",
  "name": "Controller Assembly",
  "category": "finished_assemblies",
  "uom": "EA",
  "lead_time_days": 14,
  "min_order_qty": 10,
  "standard_cost_cents": 125000,
  "currency_code": "USD",
  "status": "active"
}
```

### Queue Forecast Run

```http
POST /api/v1/demand/forecasts/runs
Content-Type: application/json
```

```json
{
  "facility_id": "fac-123",
  "horizon_weeks": 13,
  "product_ids": ["prod-1", "prod-2"]
}
```

```json
{
  "run_id": "run-123",
  "status": "queued"
}
```

### Bulk Resolve Exceptions

```json
{
  "ids": ["exc-1", "exc-2"],
  "resolution_notes": "Demand moved to next cycle",
  "resolution_action": "replan"
}
```
