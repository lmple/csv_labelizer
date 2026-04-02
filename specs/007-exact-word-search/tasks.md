# Tasks: Exact Match in Advanced Search

**Input**: Design documents from `/specs/007-exact-word-search/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per constitution requirement (Testing Standards NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project setup needed. This feature extends existing files only.

(No tasks — project structure already exists.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend shared types that all user stories depend on.

- [x] T001 [P] Add `exact: bool` field with `#[serde(default)]` to `SearchFilter` struct in `src-tauri/src/commands.rs`
- [x] T002 [P] Add `exact: boolean` field to `SearchFilter` interface in `src/types.ts`

**Checkpoint**: Shared types updated — user story implementation can now begin.

---

## Phase 3: User Story 1 — Toggle Exact Match on a Filter (Priority: P1) 🎯 MVP

**Goal**: A user can toggle exact match on an individual advanced search filter and get only rows where the cell value equals the search term exactly (case-insensitive, whitespace-trimmed).

**Independent Test**: Open any CSV, activate advanced search, enter a term, enable exact match, verify only exact matches appear. Disable exact match, verify substring matches appear again.

### Tests for User Story 1

- [x] T003 [P] [US1] Add unit test `test_exact_match_single_filter` in `src-tauri/src/commands.rs` — exact match on one column returns only rows with full field equality (e.g., "cat" matches "cat" but not "catfish")
- [x] T004 [P] [US1] Add unit test `test_exact_match_case_insensitive` in `src-tauri/src/commands.rs` — exact match with "Cat" matches "cat" and "CAT"
- [x] T005 [P] [US1] Add unit test `test_exact_match_whitespace_trimmed` in `src-tauri/src/commands.rs` — exact match with "cat" matches " cat " (leading/trailing whitespace trimmed)
- [x] T006 [P] [US1] Add unit test `test_exact_false_is_substring` in `src-tauri/src/commands.rs` — filter with `exact: false` still uses substring matching (no regression)
- [x] T007 [P] [US1] Add unit test `test_exact_match_empty_query_ignored` in `src-tauri/src/commands.rs` — filter with exact match and empty query is ignored

### Implementation for User Story 1

- [x] T008 [US1] Update matching logic in `execute_advanced_search` in `src-tauri/src/commands.rs` — branch on `exact` flag: when true use `field.trim().to_lowercase() == query.trim().to_lowercase()`, when false use existing `.contains()` logic
- [x] T009 [US1] Initialize `advancedFilters` entries with `exact: false` in `src/search.ts` (in `addFilterRow` or equivalent initialization)
- [x] T010 [US1] Add exact match toggle button to each filter row in `renderFilterRows()` in `src/search.ts` — place between text input and remove button, toggle `advancedFilters[index].exact` on click
- [x] T011 [US1] Add CSS styles for exact match toggle button (active/inactive states) in `src/style.css` — visually distinct when active (e.g., highlighted background, bold border)
- [x] T012 [US1] Include `exact` field when collecting filters in `performAdvancedSearch()` in `src/search.ts` — ensure it's sent to backend via `invoke('advanced_search_rows', ...)`

**Checkpoint**: User Story 1 is fully functional — exact match toggle works for single filters. Run `cargo test` and verify all new + existing tests pass.

---

## Phase 4: User Story 2 — Mix Exact and Substring Filters (Priority: P2)

**Goal**: Users can combine filters where some use exact matching and others use substring matching, with both AND and OR logic.

**Independent Test**: Create two filters — one exact on "Status" = "Active", one substring on "Notes" containing "review" — verify AND/OR logic applies each filter's own match mode.

### Tests for User Story 2

- [x] T013 [P] [US2] Add unit test `test_mixed_exact_and_substring_and_logic` in `src-tauri/src/commands.rs` — one exact filter + one substring filter with AND logic
- [x] T014 [P] [US2] Add unit test `test_mixed_exact_and_substring_or_logic` in `src-tauri/src/commands.rs` — one exact filter + one substring filter with OR logic

### Implementation for User Story 2

No additional implementation needed — Phase 2 (T001) added `exact` as a per-filter field, and US1 (T008) branches per-filter. Mixed modes work automatically because each filter's `exact` flag is checked independently in the matching closure.

- [x] T015 [US2] Verify mixed exact/substring filters work end-to-end — run T013 and T014 tests, confirm pass. If any issue, fix matching logic in `execute_advanced_search` in `src-tauri/src/commands.rs`

**Checkpoint**: Mixed filter modes work with AND/OR logic. All tests pass.

---

## Phase 5: User Story 3 — Exact Match Persists Across Search Sessions (Priority: P3)

**Goal**: The exact match toggle state persists on a filter row while navigating results. New filter rows default to substring matching.

**Independent Test**: Enable exact match on a filter, navigate results with Previous/Next, verify toggle is still enabled. Add a new filter, verify it defaults to off.

### Implementation for User Story 3

No additional implementation needed — the toggle state is stored in `advancedFilters[index].exact` in memory (set in T009/T010). Since `renderFilterRows()` reads from this state, and navigation doesn't re-render filter rows, the state persists naturally. New filters are initialized with `exact: false` (T009).

- [x] T016 [US3] Verify exact match toggle persists during result navigation — manually test: enable exact match, search, navigate with Previous/Next, confirm toggle is still active. Verify new filter rows default to `exact: false`

**Checkpoint**: All 3 user stories functional and tested.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 Run `cargo clippy` and fix any warnings in `src-tauri/src/commands.rs`
- [x] T018 Run full test suite (`cargo test` + `npm test`) and verify zero regressions
- [x] T019 Validate against quickstart.md — confirm all listed files were modified and build/test commands succeed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — can start immediately
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T001, T002)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (US1 implementation enables mixed mode)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (US1 implementation creates the toggle)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational only — core feature
- **User Story 2 (P2)**: Depends on US1 — mixed mode relies on per-filter exact matching
- **User Story 3 (P3)**: Depends on US1 — persistence relies on toggle existing

### Within Each User Story

- Tests written first (T003-T007 before T008-T012)
- Backend logic (T008) before frontend (T009-T012)
- Frontend state (T009) before UI (T010-T011) before integration (T012)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files: Rust struct vs TypeScript interface)
- T003-T007 (US1 tests) can all run in parallel (same file but independent test functions)
- T013-T014 (US2 tests) can run in parallel
- T010 and T011 can run in parallel (search.ts UI vs style.css)

---

## Parallel Example: User Story 1

```text
# Parallel: Foundation types
Task T001: Add exact field to Rust SearchFilter in src-tauri/src/commands.rs
Task T002: Add exact field to TypeScript SearchFilter in src/types.ts

# Parallel: US1 tests (after T001)
Task T003: test_exact_match_single_filter
Task T004: test_exact_match_case_insensitive
Task T005: test_exact_match_whitespace_trimmed
Task T006: test_exact_false_is_substring
Task T007: test_exact_match_empty_query_ignored

# Sequential: US1 implementation (after T001, T002)
Task T008: Update matching logic (backend)
Task T009: Initialize filter state (frontend)
Task T010 + T011 in parallel: Toggle button UI + CSS
Task T012: Wire up invoke call
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational types (T001-T002)
2. Complete Phase 3: User Story 1 tests + implementation (T003-T012)
3. **STOP and VALIDATE**: Run `cargo test`, verify exact match works
4. This alone delivers the core feature request

### Incremental Delivery

1. Foundation types → US1 (exact match toggle) → **MVP ready**
2. Add US2 tests (T013-T015) → Confirm mixed modes work → **Full feature**
3. Add US3 verification (T016) → Confirm persistence → **Polished**
4. Polish phase (T017-T019) → **Ship-ready**

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- This is a small, surgical feature — most complexity is in US1
- US2 and US3 require minimal additional code since per-filter matching and state persistence fall out naturally from the US1 implementation
- Commit after each phase checkpoint
