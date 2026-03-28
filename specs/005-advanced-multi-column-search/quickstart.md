# Quickstart: Advanced Multi-Column Search

**Feature**: 005-advanced-multi-column-search | **Date**: 2026-03-28

## Integration Scenario 1: AND Search

**Goal**: Find rows where animal is "Cat" AND scene is "Indoor"

1. Open a CSV file with columns: Name, Animal, Scene, Label
2. Click the "Advanced" toggle button next to the search bar
3. The advanced search panel expands with 2 filter rows
4. In filter row 1: select "Animal" from column dropdown, type "Cat"
5. In filter row 2: select "Scene" from column dropdown, type "Indoor"
6. Ensure AND toggle is selected (default)
7. Click "Search" button
8. Results show: "3 results" — only rows where Animal contains "Cat" AND Scene contains "Indoor"
9. Navigate with ◀ ▶ buttons (same as simple search)

## Integration Scenario 2: OR Search

**Goal**: Find rows matching any of several criteria

1. Same CSV file open
2. Switch to advanced mode (if not already)
3. In filter row 1: select "Animal", type "Cat"
4. In filter row 2: select "Animal", type "Dog"
5. Toggle logic to OR
6. Click "Search"
7. Results show all rows where Animal contains "Cat" or "Dog"
8. No duplicate rows even if a row matches both filters

## Integration Scenario 3: Adding/Removing Filters

1. In advanced mode with 2 filter rows
2. Click "Add filter" → a 3rd empty filter row appears
3. Fill in the 3rd filter (e.g., "Label" contains "reviewed")
4. Click the × button on filter row 2 → it is removed; rows 1 and 3 remain
5. Search executes with the 2 remaining filters

## Integration Scenario 4: Switching Modes

1. Perform an advanced search (results showing "5 results")
2. Click "Simple" toggle button
3. Advanced panel collapses; simple search bar is restored
4. Previous results are cleared; search state reset
5. Type a query in the simple search bar → works as before

## Integration Scenario 5: Empty Filters Ignored

1. In advanced mode with 3 filter rows
2. Filter 1: "Animal" = "Cat"
3. Filter 2: column selected but query is empty
4. Filter 3: "Scene" = "Outdoor"
5. Click "Search"
6. Only filters 1 and 3 are applied (filter 2 is ignored)
7. AND mode: rows must match both "Cat" in Animal AND "Outdoor" in Scene

## Edge Case: All Filters Empty

1. In advanced mode, leave all filter queries empty
2. Click "Search"
3. No search is executed; feedback: "No search query"

## Edge Case: Single Column CSV

1. Open a CSV with only 1 column
2. Switch to advanced mode
3. All filter row dropdowns show only that single column
4. Search works — multiple filters on the same column (useful for OR: "contains A OR contains B")

## UI Layout Reference

```
┌─────────────────────────────────────────────────────┐
│  [Search input] [Column ▼] [🔍] [◀ 2/5 ▶] [Advanced]│  ← Simple mode (default)
├─────────────────────────────────────────────────────┤
│  ● AND  ○ OR                                        │  ← Advanced panel (when toggled)
│  [Column ▼] [Filter text........] [×]               │
│  [Column ▼] [Filter text........] [×]               │
│  [+ Add filter]                    [Search]          │
└─────────────────────────────────────────────────────┘
```
