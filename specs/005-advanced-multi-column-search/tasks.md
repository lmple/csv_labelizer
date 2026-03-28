# Tasks: Advanced Multi-Column Search

**Input**: Design documents from `/specs/005-advanced-multi-column-search/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included per constitution requirement (Testing Standards NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define shared types and register the new command

- [x] T001 [P] Add SearchFilter and FilterGroup interfaces to src/types.ts
- [x] T002 [P] Add SearchFilter, FilterGroup, and FilterLogic structs/enums to src-tauri/src/commands.rs
- [x] T003 Register `advanced_search_rows` command in src-tauri/src/main.rs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the backend `advanced_search_rows` command — all frontend stories depend on this

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `advanced_search_rows` Tauri command in src-tauri/src/commands.rs: accept `filters: Vec<SearchFilter>` and `logic: String` ("AND"/"OR"), iterate all row offsets, read each row via `read_row_at_offset`, apply case-insensitive substring matching per filter, skip filters with empty query, collect matching row indices (no duplicates), return sorted `Vec<usize>`
- [x] T005 Write Rust unit tests for `advanced_search_rows` in src-tauri/src/commands.rs (or separate test module): test AND logic with 2 filters, OR logic with 2 filters, empty filter skipping, all-empty returns empty, no duplicate rows in OR mode, single filter equivalence

**Checkpoint**: Backend command working and tested — frontend work can begin

---

## Phase 3: User Story 1 - AND Search Across Multiple Columns (Priority: P1) 🎯 MVP

**Goal**: Users can define multiple column filters and search with AND logic to find rows matching ALL conditions

**Independent Test**: Open a CSV, enter 2+ column filters with AND logic, search, verify only rows matching ALL conditions appear. Navigate results with prev/next.

### Implementation for User Story 1

- [x] T006 [US1] Add advanced search HTML panel to src/index.html: add a toggle button ("Advanced") next to existing search controls, add a collapsible `div#advanced-search-panel` containing AND/OR radio buttons, a `div#filter-rows-container` for dynamic filter rows, an "Add filter" button, and a "Search" button
- [x] T007 [US1] Add CSS styles for the advanced search panel in src/style.css: styles for the collapsible panel, filter rows (column dropdown + text input + remove button inline), add-filter button, AND/OR toggle, hidden/shown states, responsive layout matching existing nav bar width
- [x] T008 [US1] Implement advanced search mode toggle in src/search.ts: add state variables (`isAdvancedMode`, `advancedFilters`, `filterLogic`), implement `toggleAdvancedSearch()` to show/hide the panel and clear previous results, initialize with 2 empty filter rows when entering advanced mode (R3)
- [x] T009 [US1] Implement filter row management in src/search.ts: `addFilterRow()` creates a new filter row (column dropdown populated from metadata.headers + text input + remove button), `removeFilterRow(index)` removes a row (minimum 1 enforced), `updateFilter(index, field, value)` updates filter state
- [x] T010 [US1] Implement `performAdvancedSearch()` in src/search.ts: collect non-empty filters from state, if none show "No search query" feedback, call `invoke('advanced_search_rows', { filters, logic })`, store results in `searchResults`, update result count display, navigate to first result
- [x] T011 [US1] Wire AND logic as default: ensure AND radio button is selected by default, verify end-to-end flow — toggle advanced, set 2 filters with AND, search, confirm only rows matching ALL filters are returned, prev/next navigation works

**Checkpoint**: AND search fully functional — users can toggle advanced mode, add/remove filters, search with AND logic, navigate results

---

## Phase 4: User Story 2 - OR Search Across Multiple Columns (Priority: P1)

**Goal**: Users can search with OR logic to find rows matching ANY condition

**Independent Test**: Open a CSV, enter 2+ column filters with OR logic, search, verify rows matching ANY condition appear (no duplicates).

### Implementation for User Story 2

- [x] T012 [US2] Wire OR radio button in src/search.ts: ensure `filterLogic` state updates when OR is selected, `performAdvancedSearch()` passes the selected logic to the backend invoke call
- [x] T013 [US2] Verify OR search end-to-end: toggle to OR, set 2 filters, search, confirm rows matching ANY filter appear, confirm no duplicate rows when a row matches multiple filters, confirm result count and navigation are correct

**Checkpoint**: Both AND and OR search work correctly — full advanced search functionality available

---

## Phase 5: User Story 3 - Switching Between Simple and Advanced Search (Priority: P2)

**Goal**: Users can seamlessly switch between simple and advanced search modes

**Independent Test**: Toggle between modes, perform searches in each, verify both work independently and switching clears previous results.

### Implementation for User Story 3

- [x] T014 [US3] Implement mode switching logic in src/search.ts: when toggling from advanced to simple, hide advanced panel, clear advanced filters and results, restore simple search bar to functional state; when toggling from simple to advanced, hide/disable simple search input, show advanced panel with 2 empty filter rows, clear simple search results
- [x] T015 [US3] Ensure simple search remains fully functional in src/search.ts: verify existing `performSearch()` still works when in simple mode, ensure `initializeSearch()` correctly sets up both modes, confirm no regressions to search-input, search-column, search-btn, prev/next navigation

**Checkpoint**: Both search modes work independently, switching is seamless, no regressions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, performance validation, and cleanup

- [x] T016 [P] Handle edge case: single-column CSV — verify all filter dropdowns show the single column in src/search.ts
- [x] T017 [P] Handle edge case: more filters than columns — verify adding filters beyond column count works (same column reuse allowed per R5) in src/search.ts
- [x] T018 Run `cargo clippy` and fix any warnings in src-tauri/src/commands.rs
- [x] T019 Run `cargo test` and verify all tests pass
- [x] T020 Validate quickstart.md scenarios manually: AND search, OR search, add/remove filters, mode switching, empty filters

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T002 (Rust types) from Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion (backend command ready)
- **User Story 2 (Phase 4)**: Depends on US1 (UI exists to toggle OR)
- **User Story 3 (Phase 5)**: Depends on US1 (advanced mode exists to switch from)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — delivers core advanced search with AND logic
- **User Story 2 (P1)**: Depends on US1 (same UI, just OR toggle) — minimal incremental work
- **User Story 3 (P2)**: Depends on US1 (mode switching requires both modes to exist)

### Within Each User Story

- HTML structure before CSS styling before JS behavior
- Filter management before search execution
- Core flow before edge cases

### Parallel Opportunities

- T001 and T002 can run in parallel (different files: types.ts vs commands.rs)
- T016 and T017 can run in parallel (independent edge case validations)

---

## Parallel Example: Setup Phase

```bash
# Launch both type definition tasks together:
Task: "Add SearchFilter and FilterGroup interfaces to src/types.ts"  # T001
Task: "Add SearchFilter/FilterGroup/FilterLogic structs to src-tauri/src/commands.rs"  # T002
```

## Parallel Example: Polish Phase

```bash
# Launch edge case validations together:
Task: "Handle single-column CSV edge case"  # T016
Task: "Handle more-filters-than-columns edge case"  # T017
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types in both frontend and backend)
2. Complete Phase 2: Foundational (backend command + tests)
3. Complete Phase 3: User Story 1 (AND search with full UI)
4. **STOP and VALIDATE**: Test AND search independently
5. Deliver — users can already do multi-column AND searches

### Incremental Delivery

1. Setup + Foundational → Backend ready
2. Add User Story 1 → AND search works → MVP!
3. Add User Story 2 → OR search works → Full search capability
4. Add User Story 3 → Mode switching polished → Complete feature
5. Polish → Edge cases handled, clippy clean, tests pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Backend command (T004) is the critical-path bottleneck — everything else depends on it
- US2 is lightweight (OR toggle wiring only) since the backend already supports both logics
- US3 is primarily about cleanup/state management for seamless mode transitions
- Commit after each task or logical group
