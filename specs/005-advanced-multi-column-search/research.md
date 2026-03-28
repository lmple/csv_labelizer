# Research: Advanced Multi-Column Search

**Date**: 2026-03-28 | **Branch**: `005-advanced-multi-column-search`

## R1: Backend Search Extension Strategy

**Decision**: Add a new Tauri command `advanced_search_rows` alongside the existing `search_rows` command.

**Rationale**:
- The existing `search_rows` takes `query: String, column_index: Option<usize>` — a single query with optional column
- The advanced search needs `filters: Vec<{column_index, query}>, logic: "AND"|"OR"` — fundamentally different input shape
- Adding a new command preserves backwards compatibility (FR-006) and avoids complicating the existing simple search path
- Both commands share the same scan pattern: iterate offsets, read row, match, collect indices

**Alternatives considered**:
- Extend `search_rows` with optional parameters: Possible but muddies the interface; callers must handle two usage patterns
- Frontend-only filtering: Would require loading all rows client-side, breaking the offset-based architecture for large files

## R2: UI Pattern for Advanced Search

**Decision**: Add a collapsible "Advanced" panel below the existing search bar, activated by a toggle button. The panel contains dynamic filter rows (column dropdown + text input) with add/remove controls, plus an AND/OR toggle.

**Rationale**:
- The existing search bar in the nav area is compact (150px input + 120px column dropdown)
- An expandable panel keeps the simple search uncluttered while providing space for multiple filter rows
- A toggle button ("Advanced" / "Simple") is the clearest way to switch modes
- Each filter row has its own column dropdown (populated from headers) and text input
- The AND/OR toggle is a simple two-option selector (radio buttons or segmented control)

**Alternatives considered**:
- Tab-based switching: Overkill for two modes; adds visual weight
- Modal/dialog: Breaks the inline search workflow; users lose context of the data
- Query language (DSL): Too complex for the target user; requires learning syntax

## R3: Filter Row Management

**Decision**: Start with 2 empty filter rows when advanced mode is activated. Users can add more via an "Add filter" button and remove individual rows via an "x" button on each row. Minimum 1 filter row.

**Rationale**:
- Starting with 2 rows signals "multi-column" immediately
- The "Add filter" button is the standard pattern for dynamic form rows
- Per-row remove buttons give fine-grained control
- Minimum 1 row prevents the user from having zero filters (which would be meaningless)

**Alternatives considered**:
- Start with 1 row: Doesn't visually communicate "multi-column" as strongly
- Fixed number of rows: Too rigid; some searches need 2 filters, others need 5

## R4: Empty Filter Handling

**Decision**: Filters with an empty search value are ignored during search execution. If all filters are empty, show "No search query" feedback (no search executed).

**Rationale**:
- Ignoring empty filters is the most forgiving UX — users can leave unused rows empty
- This matches common filter builder patterns (e.g., Jira, GitHub issues)
- Prevents confusing results from "match everything" empty filters

**Alternatives considered**:
- Require all filters to have values: Too strict; forces users to remove unused rows
- Treat empty as "match all": Unexpected behavior that could confuse users

## R5: Duplicate Column Handling

**Decision**: Allow the same column in multiple filters. This is valid for OR searches (e.g., "Name contains 'Alice' OR Name contains 'Bob'").

**Rationale**:
- Restricting column reuse would prevent valid use cases
- For AND, same-column filters narrow results further (e.g., "Name contains 'A' AND Name contains 'B'" matches "Albert")
- No extra complexity to support — just apply filters as specified

## Summary: Architecture Changes

| Component | Change |
|-----------|--------|
| `src-tauri/src/commands.rs` | Add `advanced_search_rows` command with filters + logic params |
| `src-tauri/src/main.rs` | Register new command |
| `src/search.ts` | Add advanced search mode, filter management, mode toggle |
| `src/index.html` | Add advanced search panel HTML, toggle button |
| `src/style.css` | Add styles for advanced search panel, filter rows |
| `src/types.ts` | Add SearchFilter, FilterGroup interfaces |
