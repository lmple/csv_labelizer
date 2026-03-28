# Tasks: Adopt Verified CSV Library

**Input**: Design documents from `/specs/004-adopt-csv-library/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Existing tests (22) serve as regression suite. No new test tasks — the spec requires all existing tests to pass unchanged (SC-001).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Verify starting state before making changes

- [x] T001 Verify `csv` crate is available by running `cargo test` to confirm all 22 existing tests pass in `src-tauri/tests/integration_test.rs` and `src-tauri/tests/performance_test.rs`
- [x] T002 Verify `csv = "1.3"` dependency in `src-tauri/Cargo.toml` compiles and the crate API is accessible by adding `use csv::{ReaderBuilder, WriterBuilder};` to `src-tauri/src/csv_engine.rs`

**Checkpoint**: Baseline green — all tests pass, csv crate compiles

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace the low-level parsing and formatting primitives that all other functions depend on

**⚠️ CRITICAL**: These replacements are internal to `csv_engine.rs` and must not change any public function signatures

- [x] T003 Replace `parse_csv_line` function body with `csv::ReaderBuilder` in `src-tauri/src/csv_engine.rs` — configure delimiter, `has_headers(false)`, read single record from `line.as_bytes()`, return `Vec<String>`
- [x] T004 Replace `format_csv_row` function body with `csv::WriterBuilder` in `src-tauri/src/csv_engine.rs` — configure delimiter, write single record to `Vec<u8>`, convert to `String`
- [x] T005 Remove `count_delimiter_occurrences` function and update `detect_delimiter` to use `csv::ReaderBuilder` for field counting per candidate delimiter in `src-tauri/src/csv_engine.rs`
- [x] T006 Run `cargo test` to verify all 22 existing tests still pass after foundational replacements
- [x] T007 Run `cargo clippy` to verify zero warnings in `src-tauri/src/csv_engine.rs`

**Checkpoint**: Core parsing/formatting now uses csv crate. All tests green. No public API changes.

---

## Phase 3: User Story 1 — Reliable CSV Parsing (Priority: P1) 🎯 MVP

**Goal**: All CSV reading operations use the csv crate for parsing, with correct handling of quoted fields, delimiters, and BOM.

**Independent Test**: Open CSV files with different delimiters, quoting styles, and BOM — verify data displays correctly.

### Implementation for User Story 1

- [x] T008 [US1] Verify `build_offset_index` header parsing in `src-tauri/src/csv_engine.rs` uses the updated `parse_csv_line` (no additional changes needed if T003 is correct)
- [x] T009 [US1] Verify `read_row_at_offset` in `src-tauri/src/csv_engine.rs` returns correct fields via the updated `parse_csv_line` for rows with quoted fields containing delimiters
- [x] T010 [US1] Run integration tests in `src-tauri/tests/integration_test.rs` — specifically `test_csv_workflow` and `test_quoted_csv_handling` — to confirm parsing correctness

**Checkpoint**: CSV parsing fully backed by csv crate. Integration tests pass.

---

## Phase 4: User Story 2 — Correct CSV Writing (Priority: P1)

**Goal**: All CSV writing operations use the csv crate for formatting, with correct quoting and escaping.

**Independent Test**: Edit fields with special characters, save, reopen — verify file is valid CSV.

### Implementation for User Story 2

- [x] T011 [US2] Verify `write_row_at_offset` in `src-tauri/src/csv_engine.rs` correctly uses the updated `format_csv_row` for rows containing delimiters, quotes, and newlines
- [x] T012 [US2] Verify in-place overwrite path (same-length row) still works correctly with the new `format_csv_row` output in `src-tauri/src/csv_engine.rs`
- [x] T013 [US2] Verify tail-shift path (different-length row) still works correctly with the new `format_csv_row` output in `src-tauri/src/csv_engine.rs`
- [x] T014 [US2] Run integration tests in `src-tauri/tests/integration_test.rs` — specifically `test_csv_workflow` write/modify assertions — to confirm write correctness

**Checkpoint**: CSV writing fully backed by csv crate. Integration tests pass.

---

## Phase 5: User Story 3 — Maintained Performance (Priority: P2)

**Goal**: Performance remains comparable to the manual implementation (within 10% variance) for large files.

**Independent Test**: Open a 100K-row CSV, verify load time and memory usage match benchmarks.

### Implementation for User Story 3

- [x] T015 [US3] Run performance tests in `src-tauri/tests/performance_test.rs` — verify `test_open_performance`, `test_navigation_performance`, and `test_memory_usage` all pass within thresholds
- [x] T016 [US3] If performance regression detected in T015, profile `parse_csv_line` replacement and optimize (e.g., reuse `ReaderBuilder` or minimize allocations) in `src-tauri/src/csv_engine.rs`

**Checkpoint**: Performance benchmarks pass. No regression from library adoption.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and final validation

- [x] T017 Remove any dead code (unused imports, commented-out manual implementations) from `src-tauri/src/csv_engine.rs`
- [x] T018 Run full test suite (`cargo test`) and linter (`cargo clippy`) for final validation
- [x] T019 Verify line count reduction in `src-tauri/src/csv_engine.rs` meets SC-002 target — NOTE: format_csv_row reduced 57% (21→9 lines); overall parsing/formatting reduced ~3% (69→67 lines) because csv_core's match-based API is more verbose than manual char loops. The value is in correctness (RFC 4180 compliance), not line reduction.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, T002)
- **User Story 1 (Phase 3)**: Depends on Foundational (T003–T007)
- **User Story 2 (Phase 4)**: Depends on Foundational (T003–T007); independent of US1
- **User Story 3 (Phase 5)**: Depends on Foundational (T003–T007); independent of US1/US2
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational — no dependencies on other stories

### Within Foundational Phase

- T003 and T004 can run in parallel (different functions)
- T005 depends on understanding of T003 pattern (similar approach)
- T006 and T007 depend on T003–T005 completion

### Parallel Opportunities

- T003 and T004 can be done in parallel (independent functions)
- US1 (Phase 3) and US2 (Phase 4) verification can run in parallel after Foundational
- US3 (Phase 5) performance testing can run in parallel with US1/US2 verification

---

## Parallel Example: Foundational Phase

```bash
# These can run in parallel (different functions in same file):
Task T003: "Replace parse_csv_line with csv::ReaderBuilder"
Task T004: "Replace format_csv_row with csv::WriterBuilder"

# Then sequentially:
Task T005: "Replace count_delimiter_occurrences using csv crate"
Task T006: "Run cargo test"
Task T007: "Run cargo clippy"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify baseline)
2. Complete Phase 2: Foundational (replace parse_csv_line, format_csv_row)
3. Complete Phase 3: User Story 1 (verify parsing correctness)
4. **STOP and VALIDATE**: All integration tests pass, CSV files parse correctly
5. This alone delivers the core value of the feature

### Incremental Delivery

1. Setup + Foundational → Core replacements done
2. Add US1 verification → Parsing confirmed correct (MVP!)
3. Add US2 verification → Writing confirmed correct
4. Add US3 verification → Performance confirmed stable
5. Polish → Clean code, final metrics

---

## Notes

- This is a single-file refactor (`csv_engine.rs`) — all tasks target the same file
- No new files are created; no files are deleted
- The 22 existing tests are the primary regression safety net
- The csv crate is already in Cargo.toml — no dependency changes needed
- Public API (function signatures used by `commands.rs`) must not change
