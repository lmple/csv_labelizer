# Contract: Tauri IPC Commands

**Feature**: 007-exact-word-search
**Date**: 2026-04-02

## Modified Command: `advanced_search_rows`

### Request

```
Command: "advanced_search_rows"
Arguments:
  filters: SearchFilter[]
  logic: FilterLogic
```

**SearchFilter** (updated):
```
{
  column_index: integer,   // 0-based column index
  query: string,           // search term
  exact: boolean           // NEW - default false; true = full field equality
}
```

**FilterLogic**:
```
"AND" | "OR"
```

### Response

```
Success: integer[]   // Array of matching row indices (0-based)
Error: string        // Error message
```

### Behavior

- Filters with empty `query` (after trim) are ignored
- If all filters are empty, returns empty array
- When `exact` is `false`: field contains query (substring, case-insensitive)
- When `exact` is `true`: field.trim().lowercase == query.trim().lowercase (full equality)
- AND logic: all active filters must match the row
- OR logic: at least one active filter must match the row

### Backward Compatibility

The `exact` field defaults to `false` when not provided. Existing callers that omit it get identical substring behavior.
