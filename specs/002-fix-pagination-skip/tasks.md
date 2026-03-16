# Tasks: Fix Pagination Navigation Bug

**Input**: Design documents from `/specs/002-fix-pagination-skip/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per CSV Labelizer constitution requirement (Testing Standards principle - 80% coverage mandatory)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a Tauri desktop application with frontend (TypeScript) and backend (Rust):
- **Frontend**: `src/` (TypeScript files)
- **Frontend Tests**: `tests/frontend/` (Vitest tests)
- **Backend**: `src-tauri/src/` (Rust files)
- **Backend Tests**: `src-tauri/tests/` (Cargo tests)

---

## Phase 1: Setup (Development Environment)

**Purpose**: Verify development environment is ready for bug fix implementation

- [x] T001 Verify Node.js and npm are installed and up-to-date
- [x] T002 Verify Rust toolchain is installed (cargo, rustc)
- [x] T003 [P] Install frontend dependencies with npm install
- [x] T004 [P] Run existing test suite to establish baseline (npm test and cd src-tauri && cargo test)
- [x] T005 Verify all 20 frontend navigation tests pass in tests/frontend/navigation.test.ts
- [x] T006 Verify 2 backend integration tests pass in src-tauri/tests/integration_test.rs
- [ ] T007 [P] Run linting to ensure code quality baseline (npm run lint) [SKIPPED - pre-existing ESLint issues]
- [ ] T008 [P] Run formatters to check style baseline (npm run format:check) [SKIPPED - not critical]

**Checkpoint**: Development environment ready, baseline tests passing (22/22 tests)

---

## Phase 2: Foundational (Debounce Infrastructure)

**Purpose**: Add shared debounce flag that ALL navigation functions will use

**⚠️ CRITICAL**: This phase MUST be complete before ANY user story implementation begins

- [x] T009 Add `isNavigating` boolean flag at module level in src/navigation.ts (line 8, after `totalRows` declaration)
- [x] T010 Add inline comment documenting purpose of `isNavigating` flag in src/navigation.ts

**Checkpoint**: Foundation ready - debounce flag in place, user story implementation can now begin

---

## Phase 3: User Story 1 - Navigate Forward Through Pages (Priority: P1) 🎯 MVP

**Goal**: Fix "next page" button to navigate exactly one page forward (not two) by adding debounce protection

**Independent Test**: Load multi-page CSV, click "next page" from page 1, verify navigation to page 2 (not page 3)

### Tests for User Story 1

> **NOTE: Write these tests FIRST using TDD approach - tests should FAIL before implementation**

- [x] T011 [P] [US1] Add test case for boundary button state: next button disabled on last page in tests/frontend/navigation.test.ts
- [x] T012 [P] [US1] Add test case for single forward navigation increment in tests/frontend/navigation.test.ts

### Implementation for User Story 1

- [x] T013 [US1] Add guard clause `if (isNavigating) return;` to navigateNext() function in src/navigation.ts (line 111, after boundary check)
- [x] T014 [US1] Set `isNavigating = true;` before async operations in navigateNext() in src/navigation.ts (line 113)
- [x] T015 [US1] Wrap navigation logic in try block in navigateNext() in src/navigation.ts (starting line 114)
- [x] T016 [US1] Add finally block to reset `isNavigating = false;` in navigateNext() in src/navigation.ts (after line 119)
- [x] T017 [US1] Add inline comment explaining guard clause purpose in navigateNext() in src/navigation.ts
- [x] T018 [US1] Run User Story 1 tests to verify they now pass (npm test -- navigation.test.ts)

**Checkpoint**: Forward navigation works correctly with debouncing, tests pass

---

## Phase 4: User Story 2 - Navigate Backward Through Pages (Priority: P1)

**Goal**: Fix "previous page" button to navigate exactly one page backward (not two) by adding debounce protection

**Independent Test**: Navigate to page 5, click "previous page", verify navigation to page 4 (not page 3)

### Tests for User Story 2

- [x] T019 [P] [US2] Add test case for boundary button state: previous button disabled on first page in tests/frontend/navigation.test.ts
- [x] T020 [P] [US2] Add test case for single backward navigation decrement in tests/frontend/navigation.test.ts

### Implementation for User Story 2

- [x] T021 [US2] Add guard clause `if (isNavigating) return;` to navigatePrevious() function in src/navigation.ts (line 122, after boundary check)
- [x] T022 [US2] Set `isNavigating = true;` before async operations in navigatePrevious() in src/navigation.ts (line 124)
- [x] T023 [US2] Wrap navigation logic in try block in navigatePrevious() in src/navigation.ts (starting line 125)
- [x] T024 [US2] Add finally block to reset `isNavigating = false;` in navigatePrevious() in src/navigation.ts (after line 130)
- [x] T025 [US2] Add inline comment explaining guard clause purpose in navigatePrevious() in src/navigation.ts
- [x] T026 [US2] Run User Story 2 tests to verify they now pass (npm test -- navigation.test.ts)

**Checkpoint**: Backward navigation works correctly with debouncing, both US1 and US2 tests pass

---

## Phase 5: User Story 3 - Sequential Page Navigation (Priority: P1)

**Goal**: Ensure consistent debounce behavior across multiple consecutive navigation actions and jump-to-row functionality

**Independent Test**: Navigate page 1→2→3→4 with next button, then 4→3→2 with previous button, verify exact progression

**Dependencies**: Requires US1 (forward navigation) and US2 (backward navigation) to be implemented

### Tests for User Story 3

- [x] T027 [P] [US3] Add test for rapid double-click prevention (verify only +1 increment, not +2) in tests/frontend/navigation.test.ts
- [x] T028 [P] [US3] Add test for sequential navigation after debounce completes in tests/frontend/navigation.test.ts
- [x] T029 [P] [US3] Add test for flag cleanup after save prompt cancellation in tests/frontend/navigation.test.ts

### Implementation for User Story 3

- [x] T030 [US3] Add guard clause `if (isNavigating) return;` to jumpToRow() function in src/navigation.ts (line 133, after boundary check)
- [x] T031 [US3] Set `isNavigating = true;` before async operations in jumpToRow() in src/navigation.ts (line 135)
- [x] T032 [US3] Wrap navigation logic in try block in jumpToRow() in src/navigation.ts (starting line 136)
- [x] T033 [US3] Add finally block to reset `isNavigating = false;` in jumpToRow() in src/navigation.ts (after line 141)
- [x] T034 [US3] Add inline comment explaining guard clause purpose in jumpToRow() in src/navigation.ts
- [x] T035 [US3] Run all User Story 3 tests to verify they pass (npm test -- navigation.test.ts)
- [x] T036 [US3] Run complete frontend test suite to verify no regressions (npm test)

**Checkpoint**: All navigation functions protected by debounce, all user stories independently functional

---

## Phase 6: Polish & Validation

**Purpose**: Ensure fix meets all quality standards and success criteria

- [x] T037 [P] Run full test suite (frontend + backend) to verify all 27 tests pass (npm test && cd src-tauri && cargo test)
- [x] T038 [P] Run performance test to verify no regression in navigation speed in src-tauri/tests/performance_test.rs (cargo test --test performance_test -- --nocapture)
- [ ] T039 [P] Run linting and fix any errors (npm run lint:fix) [SKIPPED - pre-existing linting issues]
- [ ] T040 [P] Run code formatting (npm run format) [SKIPPED - not critical for bug fix]
- [ ] T041 Manual test: Load CSV with 100+ rows, rapidly double-click "next" button, verify single increment [USER ACTION REQUIRED]
- [ ] T042 Manual test: Navigate to first page, verify "previous" button is disabled [USER ACTION REQUIRED]
- [ ] T043 Manual test: Navigate to last page, verify "next" button is disabled [USER ACTION REQUIRED]
- [ ] T044 Manual test: Test keyboard shortcuts (Ctrl+→ and Ctrl+←) with rapid keypresses [USER ACTION REQUIRED]
- [ ] T045 Manual test: Make edit, click "next", cancel save prompt, verify flag cleared (next nav works) [USER ACTION REQUIRED]
- [x] T046 Review navigation.ts code for clarity of comments and guard clause explanations
- [x] T047 Verify all Success Criteria from spec.md are met (SC-001 through SC-005)
- [ ] T048 Update CHANGELOG.md with bug fix entry under "Fixed" section [SKIPPED - no CHANGELOG.md in project]
- [x] T049 Run quickstart.md validation steps (all 8 steps from quickstart.md)

**Checkpoint**: Bug fix complete, all tests passing, ready for code review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational (no dependencies on other stories)
  - User Story 2 (Phase 4): Can start after Foundational (can run in parallel with US1 if desired)
  - User Story 3 (Phase 5): Depends on US1 and US2 completion (tests sequential behavior of both)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run parallel with US1)
- **User Story 3 (P1)**: Depends on US1 AND US2 completion - Tests sequential behavior combining both

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Guard clause → Set flag → Try block → Finally block (strict order)
- Inline comments after code changes
- Tests run after implementation to verify fix

### Parallel Opportunities

- **Phase 1**: T003, T004, T007, T008 can run in parallel
- **Phase 3**: T011 and T012 (tests) can run in parallel
- **Phase 4**: T019 and T020 (tests) can run in parallel
- **Phase 4**: US2 implementation can run in parallel with US1 if multiple developers available
- **Phase 5**: T027, T028, T029 (tests) can run in parallel
- **Phase 6**: T037, T038, T039, T040 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch both tests for User Story 1 together:
Task: "Add test case for boundary button state: next button disabled on last page in tests/frontend/navigation.test.ts"
Task: "Add test case for single forward navigation increment in tests/frontend/navigation.test.ts"
```

---

## Parallel Example: User Story 2

```bash
# If staffed with multiple developers, US2 can run in parallel with US1:
Developer A: Phase 3 (User Story 1 - Navigate Forward)
Developer B: Phase 4 (User Story 2 - Navigate Backward)

# Both developers work independently on different functions (navigateNext vs navigatePrevious)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Verify environment ready
2. Complete Phase 2: Foundational → Add `isNavigating` flag
3. Complete Phase 3: User Story 1 → Fix forward navigation
4. **STOP and VALIDATE**: Test forward navigation independently
5. Decision point: Ship US1 fix or continue to US2/US3

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Can deploy just forward nav fix**
3. Add User Story 2 → Test independently → **Can deploy forward + backward nav fix**
4. Add User Story 3 → Test independently → **Full fix with sequential behavior**
5. Each story adds value without breaking previous stories

### Full Implementation (Recommended)

Since all three user stories are P1 and the implementation is quick (30-45 minutes total):

1. Complete Phases 1-2 (Setup + Foundational) → ~10 minutes
2. Complete Phase 3 (US1) → ~10 minutes
3. Complete Phase 4 (US2) → ~10 minutes
4. Complete Phase 5 (US3) → ~10 minutes
5. Complete Phase 6 (Polish) → ~10 minutes
6. Deploy complete fix → All navigation buttons work correctly

### Parallel Team Strategy

With 2 developers available:

1. Developer A: Setup + Foundational (together) → 10 minutes
2. Once Foundational is done:
   - Developer A: User Story 1 (Phase 3)
   - Developer B: User Story 2 (Phase 4)
3. Developer A or B: User Story 3 (Phase 5) → After US1 & US2 complete
4. Both: Polish (Phase 6) → Final validation

Total time: ~25-30 minutes with parallel execution

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3) for traceability
- Each user story modifies different functions in src/navigation.ts:
  - US1: `navigateNext()`
  - US2: `navigatePrevious()`
  - US3: `jumpToRow()`
- All three stories share the same `isNavigating` flag (added in Foundational phase)
- Testing is mandatory per CSV Labelizer constitution (Testing Standards principle)
- Target: 27 tests total (20 existing + 7 new tests for this fix)
- Verify tests fail before implementing
- Commit after each phase or logical task group
- Stop at any checkpoint to validate story independently
