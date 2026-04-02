# Quickstart: Exact Match in Advanced Search

**Feature**: 007-exact-word-search
**Date**: 2026-04-02

## Overview

Add a per-filter "exact match" toggle to the advanced search panel. When enabled, a filter requires the entire cell value to equal the search term (case-insensitive, whitespace-trimmed) instead of matching as a substring.

## Files to Modify

### Backend (Rust)
- `src-tauri/src/commands.rs` — Add `exact: bool` to `SearchFilter`, update matching logic in `execute_advanced_search`

### Frontend (TypeScript)
- `src/types.ts` — Add `exact: boolean` to `SearchFilter` interface
- `src/search.ts` — Add exact match toggle button to filter rows, include `exact` flag in filter state

### Styles
- `src/style.css` — Style the exact match toggle button (active/inactive states)

### Tests
- `src-tauri/src/commands.rs` (test module) — Add tests for exact matching with AND/OR logic, mixed exact/substring filters
- `tests/frontend/search.test.ts` (new) — Test filter row rendering includes exact toggle, state management

## Key Implementation Steps

1. **Rust struct**: Add `#[serde(default)] pub exact: bool` to `SearchFilter`
2. **Rust matching**: In `execute_advanced_search`, branch on `exact` flag:
   - `true`: `field.trim().to_lowercase() == query.trim().to_lowercase()`
   - `false`: `field.to_lowercase().contains(&query_lower)` (unchanged)
3. **TypeScript interface**: Add `exact: boolean` to `SearchFilter`
4. **Frontend state**: Initialize new filters with `exact: false`
5. **UI**: Add toggle button per filter row in `renderFilterRows()`
6. **Tests**: Cover exact match with AND/OR, mixed modes, whitespace trimming, empty queries

## Build & Test

```bash
# Rust tests
cd src-tauri && cargo test

# Frontend tests
npm test

# Lint
cd src-tauri && cargo clippy
```
