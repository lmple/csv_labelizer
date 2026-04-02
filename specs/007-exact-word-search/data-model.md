# Data Model: Exact Match in Advanced Search

**Feature**: 007-exact-word-search
**Date**: 2026-04-02

## Entity Changes

### SearchFilter (modified)

Existing entity extended with a new field.

| Field        | Type    | Default | Description                                                  |
|--------------|---------|---------|--------------------------------------------------------------|
| column_index | integer | -       | Index of the column to search in (existing)                  |
| query        | string  | ""      | The search term (existing)                                   |
| **exact**    | boolean | false   | When true, requires full field equality instead of substring  |

**Constraints**:
- `exact` defaults to `false` to preserve backward compatibility
- When `exact` is `true`, matching uses trimmed, case-insensitive full field equality
- When `exact` is `false`, matching uses existing substring contains behavior

### FilterLogic (unchanged)

| Value | Description                        |
|-------|------------------------------------|
| AND   | All filters must match             |
| OR    | At least one filter must match     |

No changes to this entity.

## Matching Behavior Matrix

| exact | Field value   | Query | Matches? | Reason                          |
|-------|---------------|-------|----------|---------------------------------|
| false | "catfish"     | "cat" | Yes      | Substring "cat" found           |
| true  | "catfish"     | "cat" | No       | "catfish" != "cat"              |
| true  | "cat"         | "cat" | Yes      | Exact equality                  |
| true  | " cat "       | "cat" | Yes      | Whitespace trimmed before match |
| true  | "Cat"         | "cat" | Yes      | Case-insensitive                |
| false | "the cat sat" | "cat" | Yes      | Substring "cat" found           |
| true  | "the cat sat" | "cat" | No       | "the cat sat" != "cat"          |
| true  | ""            | ""    | N/A      | Empty query: filter is ignored  |

## State Transitions

No state transitions. The `exact` flag is a static per-filter configuration that does not change during search execution.
