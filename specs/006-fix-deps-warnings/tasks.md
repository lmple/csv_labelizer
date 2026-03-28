# Tasks: Fix Dependency Vulnerabilities and Compiler Warnings

**Input**: Design documents from `/specs/006-fix-deps-warnings/`
**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Not applicable — this is a maintenance task. Verification is running existing tests + audit commands.

**Organization**: Tasks grouped by user story (US1: npm vulnerabilities, US2: Rust warnings).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: User Story 1 - Resolve npm Dependency Vulnerabilities (Priority: P1)

**Goal**: `npm audit` reports 0 vulnerabilities

**Independent Test**: Run `npm audit` and verify exit code 0 with no vulnerabilities reported.

### Implementation for User Story 1

- [x] T001 [US1] Upgrade vitest and related dependencies in package.json: run `npm install vitest@latest @vitest/coverage-v8@latest --save-dev` (or latest compatible versions) to resolve esbuild/vite vulnerability chain
- [x] T002 [US1] Run `npm audit` and verify 0 vulnerabilities reported in package.json dependency tree
- [x] T003 [US1] Run existing npm test suite to verify no regressions from dependency upgrades

**Checkpoint**: `npm audit` clean, all npm-based tests pass

---

## Phase 2: User Story 2 - Eliminate Rust Compiler Warnings (Priority: P1)

**Goal**: `cargo test` and `cargo clippy` produce zero warnings across all targets

**Independent Test**: Run `cargo test 2>&1 | grep "warning:"` and verify empty output.

### Implementation for User Story 2

- [x] T004 [P] [US2] Fix unused imports in src-tauri/tests/integration_test.rs: remove `use std::io::Write`, `use std::path::PathBuf`, `use std::sync::Mutex`
- [x] T005 [P] [US2] Fix unused variable in src-tauri/tests/integration_test.rs: prefix `headers` with `_` at line 162
- [x] T006 [P] [US2] Fix unused import in src-tauri/tests/performance_test.rs: remove `use std::path::PathBuf`
- [x] T007 [US2] Run `cargo test` and verify 0 warnings in output across all test targets
- [x] T008 [US2] Run `cargo clippy` and verify 0 warnings in output

**Checkpoint**: Both `cargo test` and `cargo clippy` produce zero warnings

---

## Phase 3: Polish & Cross-Cutting Concerns

- [x] T009 Verify all existing tests pass: run `cargo test` and confirm all unit, integration, and performance tests pass
- [x] T010 Final verification: run `npm audit`, `cargo clippy`, and `cargo test` to confirm all success criteria met

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)**: No dependencies — can start immediately
- **US2 (Phase 2)**: No dependencies — can start immediately, independent of US1
- **Polish (Phase 3)**: Depends on both US1 and US2 completion

### User Story Dependencies

- **US1** and **US2** are fully independent (npm vs Rust — different toolchains)
- Can be executed in parallel

### Parallel Opportunities

- T004, T005, T006 can all run in parallel (different files or independent changes)
- US1 and US2 are entirely independent and can run in parallel

---

## Parallel Example: Rust Warning Fixes

```bash
# Launch all Rust warning fixes together:
Task: "Fix unused imports in src-tauri/tests/integration_test.rs"  # T004
Task: "Fix unused variable in src-tauri/tests/integration_test.rs"  # T005
Task: "Fix unused import in src-tauri/tests/performance_test.rs"  # T006
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: npm vulnerability fixes
2. **STOP and VALIDATE**: `npm audit` clean
3. Proceed to US2

### Incremental Delivery

1. Fix npm vulnerabilities (US1) → `npm audit` clean
2. Fix Rust warnings (US2) → `cargo test` + `cargo clippy` clean
3. Polish → Full verification pass

---

## Notes

- T004/T005 touch the same file but different lines — can be done in a single edit
- Dead code warnings for `CsvState`, `CsvMetadata`, `RowData`, `detect_image_column`, `verify_memory_budget`, `calculate_index_memory_usage` appear only when compiling test crates — these are false positives from test binary compilation, not actual dead code
- The vitest upgrade may require adapting test config if vitest 4.x has breaking changes
