# Data Model: Advanced Multi-Column Search

**Feature**: 005-advanced-multi-column-search | **Date**: 2026-03-28

## Entities

### SearchFilter

A single condition in an advanced search query.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| column_index | usize | Index of the target column (0-based) | Must be valid column index in the loaded CSV |
| query | String | Search text for substring matching | Case-insensitive comparison; empty string means filter is ignored |

**Notes**:
- Match type is always case-insensitive substring (consistent with existing search behavior)
- Empty query filters are silently skipped during search execution (R4)
- Same column may appear in multiple filters (R5)

### FilterGroup

A collection of search filters combined with a logic operator.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| filters | Vec<SearchFilter> | List of individual filter conditions | At least 1 filter; empty-query filters ignored at execution |
| logic | FilterLogic | How to combine filter results | AND or OR only; no mixed logic |

### FilterLogic (Enum)

| Variant | Description |
|---------|-------------|
| And | Row must match ALL non-empty filters |
| Or | Row must match ANY non-empty filter |

## Relationships

```text
FilterGroup 1──* SearchFilter
FilterGroup 1──1 FilterLogic
```

## State Transitions

### Search Mode

```text
Simple (default) ──[toggle]──> Advanced
Advanced ──[toggle]──> Simple
```

- Switching modes clears previous search results
- Advanced mode starts with 2 empty filter rows (R3)
- Simple mode restores the original single-query search bar

### Filter Row Lifecycle

```text
[Add filter] → Empty (column=first, query="")
Empty → Filled (user types query / selects column)
Filled → Empty (user clears query)
Any → [Removed] (user clicks remove button; minimum 1 row enforced)
```

## Backend Contract

### Tauri Command: `advanced_search_rows`

**Input** (from frontend via `invoke`):

```typescript
{
  filters: Array<{ column_index: number; query: string }>,
  logic: "AND" | "OR"
}
```

**Output**: `number[]` — array of matching row indices (0-based, no duplicates, sorted ascending)

**Behavior**:
1. Strip filters with empty query strings
2. If no non-empty filters remain, return empty array
3. Iterate all row offsets, read each row
4. For AND: row matches if ALL non-empty filters match (case-insensitive substring)
5. For OR: row matches if ANY non-empty filter matches
6. Collect and return matching row indices
