# Data Model

## Auth and Tenant Domain

```mermaid
erDiagram
  organizations ||--o{ profiles : contains
  organizations ||--o{ api_keys : owns
  profiles ||--o{ audit_log : performs

  organizations {
    uuid id PK
    text name
    text slug
    text plan
    text status
  }
  profiles {
    uuid id PK
    uuid tenant_id FK
    text email
    text role
    text status
  }
  api_keys {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    text key_hash
  }
```

## Master Data Domain

```mermaid
erDiagram
  organizations ||--o{ products : owns
  organizations ||--o{ suppliers : owns
  organizations ||--o{ facilities : owns
  products ||--o{ bom_headers : parent
  bom_headers ||--o{ bom_lines : has
  products ||--o{ bom_lines : parent_component

  products {
    uuid id PK
    uuid tenant_id FK
    text sku
    text name
    text category
  }
  suppliers {
    uuid id PK
    uuid tenant_id FK
    text code
    text name
    text risk_rating
  }
  facilities {
    uuid id PK
    uuid tenant_id FK
    text code
    text name
    text type
  }
```

## Demand Domain

```mermaid
erDiagram
  products ||--o{ demand_history : records
  products ||--o{ statistical_forecasts : projects
  products ||--o{ forecast_overrides : adjusts
  products ||--o{ forecast_accuracy : measures

  demand_history {
    uuid id PK
    uuid tenant_id FK
    uuid product_id FK
    uuid facility_id FK
    date period_start
    numeric actual_qty
  }
  statistical_forecasts {
    uuid id PK
    uuid run_id
    numeric forecast_qty
  }
```

## Supply Domain

```mermaid
erDiagram
  planning_cycles ||--o{ planned_orders : includes
  suppliers ||--o{ planned_orders : fulfills
  products ||--o{ planned_orders : planned_for
  facilities ||--o{ planned_orders : planned_at

  planning_cycles {
    uuid id PK
    uuid tenant_id FK
    text cycle_type
    text status
  }
  planned_orders {
    uuid id PK
    uuid planning_cycle_id FK
    uuid product_id FK
    uuid facility_id FK
    text order_type
    text status
  }
```

## Inventory Domain

```mermaid
erDiagram
  products ||--o{ inventory_positions : stocked
  products ||--o{ inventory_transactions : moved
  products ||--o{ inventory_policies : optimized

  inventory_positions {
    uuid id PK
    uuid product_id FK
    uuid facility_id FK
    numeric on_hand_qty
    numeric reserved_qty
  }
  inventory_policies {
    uuid id PK
    uuid product_id FK
    uuid facility_id FK
    numeric calculated_safety_stock
    numeric calculated_rop
    numeric calculated_eoq
  }
```

## Planning and Scenario Domain

```mermaid
erDiagram
  planning_cycles ||--o{ planning_sessions : opens
  planning_sessions ||--o{ planning_cells : edits
  planning_cycles ||--o{ scenarios : branches
  scenarios ||--o{ scenario_overrides : stores

  planning_sessions {
    uuid id PK
    uuid planning_cycle_id FK
    text status
  }
  planning_cells {
    uuid id PK
    uuid session_id FK
    text field_name
    jsonb current_value
    int version
  }
```

## Exceptions and Collaboration Domain

```mermaid
erDiagram
  exceptions ||--o{ exception_comments : discussion
  suppliers ||--o{ capacity_submissions : submits
  sop_cycles ||--o{ sop_actions : tracks
  suppliers ||--o{ supplier_scorecards : scored

  exceptions {
    uuid id PK
    text exception_type
    text severity
    text status
    int priority_score
  }
  capacity_submissions {
    uuid id PK
    uuid supplier_id FK
    uuid product_id FK
    numeric available_qty
  }
```

## Analytics and Integration Domain

```mermaid
erDiagram
  organizations ||--o{ kpi_snapshots : captures
  organizations ||--o{ report_definitions : defines
  report_definitions ||--o{ report_runs : executes
  connectors ||--o{ connector_mappings : maps
  webhook_subscriptions ||--o{ webhook_deliveries : delivers

  kpi_snapshots {
    uuid id PK
    text kpi_code
    numeric value
    date period_start
  }
  connectors {
    uuid id PK
    text connector_type
    text status
  }
```
