# Tasks: Preserve Empty Class Values

**Input**: Design documents from `/specs/003-preserve-empty-classes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Note**: This is a bug fix feature where the core implementation (adding empty option to dropdowns) addresses all three user stories simultaneously. Tasks are organized to show which story each test validates, even though the implementation is shared.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend (TypeScript)**: `src/` at repository root
- **Backend (Rust)**: `src-tauri/src/` at repository root
- **Tests**: `tests/frontend/` for TypeScript tests

---

## Phase 1: Setup (Development Environment)

**Purpose**: Verify development environment is ready for implementation

- [X] T001 Verify development environment setup (Node.js, Rust, Tauri CLI installed)
- [X] T002 Install frontend dependencies via npm install
- [X] T003 Verify application runs via npm run tauri dev
- [X] T004 Run existing test suite to establish baseline (npm test)

---

## Phase 2: Foundational (Code Review & Understanding)

**Purpose**: Understand current implementation before making changes

**⚠️ CRITICAL**: Must understand existing dropdown rendering logic before implementing fix

- [X] T005 Review current dropdown rendering logic in src/editor.ts (lines 50-84)
- [X] T006 Review classValuesMap structure and initialization in src/main.ts
- [X] T007 Review CSV loading logic in src-tauri/src/csv_engine.rs (understand empty value handling)
- [X] T008 Review existing undo/redo implementation in src/editor.ts (lines 188-269)
- [X] T009 Document current auto-selection bug behavior in research notes

**Checkpoint**: ✅ Foundational understanding complete - ready to implement fix

---

## Phase 3: User Story 1 - View Empty Class Fields (Priority: P1) 🎯 MVP

**Goal**: Users can view CSV rows with empty class fields without auto-population occurring

**Independent Test**: Load CSV with empty class fields, navigate to rows, verify dropdowns show blank (not first value)

**Acceptance Criteria** (from spec.md):
1. Empty ANIMAL_CLASS field displays empty/blank in dropdown (no value selected)
2. Row with both populated and empty fields displays correctly (Cat + blank)
3. Empty field remains empty when navigating away and returning

### Implementation for User Story 1

- [X] T010 [US1] Add empty option creation logic to renderEditorForm() in src/editor.ts (lines 50-67)
- [X] T011 [US1] Mark empty option as selected when field value is empty string in src/editor.ts
- [X] T012 [US1] Ensure non-empty options only selected when value matches and is not empty in src/editor.ts
- [X] T013 [US1] Add explanatory comments for empty option handling in src/editor.ts

### Manual Testing for User Story 1

- [X] T014 [US1] Create test CSV file with empty class fields (test-empty.csv)
- [X] T015 [US1] Manual test: Load CSV and verify empty fields show blank dropdown
- [X] T016 [US1] Manual test: Verify mixed populated/empty fields display correctly
- [X] T017 [US1] Manual test: Navigate away and back, verify empty fields stay empty

**Checkpoint**: ✅ User Story 1 implementation complete - empty fields will display correctly

---

## Phase 4: User Story 2 - Edit While Preserving Empty (Priority: P1)

**Goal**: Users can edit non-class fields without accidentally populating empty class fields

**Independent Test**: Load row with empty class field, edit Notes field, save, verify class field stayed empty

**Acceptance Criteria** (from spec.md):
1. Edit Notes field with empty ANIMAL_CLASS, save, class remains empty in CSV
2. Navigate to next row without touching dropdown, empty class preserved
3. Edit multiple rows with mixed empty/populated, only explicitly changed classes modified

### Implementation for User Story 2

**Note**: Core implementation already complete in User Story 1 (empty option preserves state automatically)

- [X] T018 [US2] Verify getFieldValues() returns empty string for empty dropdown in src/editor.ts
- [X] T019 [US2] Verify form re-render preserves empty selection after editing text fields in src/editor.ts

### Manual Testing for User Story 2

- [X] T020 [US2] Manual test: Edit text field with empty class field, verify class stays empty
- [X] T021 [US2] Manual test: Save row with empty class, reload CSV, verify still empty
- [X] T022 [US2] Manual test: Edit multiple rows, verify only explicit changes applied

**Checkpoint**: User Story 2 fully functional - editing preserves empty class fields

---

## Phase 5: User Story 3 - Explicitly Clear Values (Priority: P2)

**Goal**: Users can explicitly set a class field to empty by selecting blank option

**Independent Test**: Load row with populated class field, select blank option, save, verify field is empty in CSV

**Acceptance Criteria** (from spec.md):
1. Select blank option from dropdown to clear ANIMAL_CLASS="Dog"
2. Save cleared field and reload CSV, field remains empty
3. Clear one class field while leaving others populated

### Implementation for User Story 3

**Note**: Core implementation already complete in User Story 1 (empty option is selectable)

- [X] T023 [US3] Verify empty option is selectable (not disabled) in src/editor.ts
- [X] T024 [US3] Verify change listener fires when selecting empty option in src/editor.ts
- [X] T025 [US3] Verify undo/redo works with empty option selection in src/editor.ts

### Manual Testing for User Story 3

- [X] T026 [US3] Manual test: Select blank option to clear populated field
- [X] T027 [US3] Manual test: Save cleared field, reload CSV, verify empty
- [X] T028 [US3] Manual test: Clear one field while leaving others, verify selective clearing
- [X] T029 [US3] Manual test: Undo clearing operation, verify field returns to populated value

**Checkpoint**: User Story 3 fully functional - users can explicitly clear class values

---

## Phase 6: Automated Testing

**Purpose**: Comprehensive test coverage for all three user stories

### Test File Creation

- [X] T030 [P] Create tests/frontend/editor.test.ts with test suite structure
- [X] T031 [P] Setup JSDOM environment for editor tests in tests/frontend/editor.test.ts
- [X] T032 [P] Create mock metadata and classValuesMap fixtures in tests/frontend/editor.test.ts

### Tests for User Story 1 (View Empty Fields)

- [X] T033 [P] [US1] Test: Empty option present as first option in dropdown in tests/frontend/editor.test.ts
- [X] T034 [P] [US1] Test: Empty option selected when field value is empty in tests/frontend/editor.test.ts
- [X] T035 [P] [US1] Test: Correct option selected when field value is non-empty in tests/frontend/editor.test.ts
- [X] T036 [P] [US1] Test: Whitespace-only values preserved as distinct from empty in tests/frontend/editor.test.ts

### Tests for User Story 2 (Edit While Preserving)

- [X] T037 [P] [US2] Test: getFieldValues() returns empty string when empty option selected in tests/frontend/editor.test.ts
- [X] T038 [P] [US2] Test: Form re-render preserves empty field values in tests/frontend/editor.test.ts
- [X] T039 [P] [US2] Test: Multiple class columns handle empty independently in tests/frontend/editor.test.ts
- [X] T040 [P] [US2] Test: Completely empty row (all class fields empty) displays correctly in tests/frontend/editor.test.ts

### Tests for User Story 3 (Explicitly Clear)

- [X] T041 [P] [US3] Test: User can switch from populated value to empty in tests/frontend/editor.test.ts
- [X] T042 [P] [US3] Test: Undo/redo preserves empty values in tests/frontend/editor.test.ts

### Edge Case Tests

- [X] T043 [P] Test: Empty dropdown (no unique values) shows only blank option in tests/frontend/editor.test.ts
- [X] T044 [P] Test: Option ordering (empty first, then alphabetically sorted) in tests/frontend/editor.test.ts

### Test Execution

- [X] T045 Run all frontend tests via npm test
- [X] T046 Verify all 15+ new tests pass
- [X] T047 Run backend tests via cargo test (verify no regressions)
- [X] T048 Run performance test via cargo test --test performance_test (verify no regression)

**Checkpoint**: All automated tests passing, comprehensive coverage

---

## Phase 7: Polish & Validation

**Purpose**: Documentation, code quality, and final validation

### Code Quality

- [X] T049 [P] Run ESLint via npm run lint (verify zero warnings)
- [X] T050 [P] Run Prettier via npm run format:check (verify formatting)
- [X] T051 [P] Run Rustfmt via cargo fmt --check in src-tauri/ (verify formatting)
- [X] T052 [P] Run Clippy via cargo clippy in src-tauri/ (verify zero warnings)

### Documentation

- [X] T053 [P] Update CHANGELOG.md with bug fix entry
- [X] T054 [P] Add code comments explaining empty option logic in src/editor.ts
- [X] T055 [P] Update README.md if empty value behavior needs documentation

### Final Validation

- [X] T056 Execute full quickstart.md manual testing workflow (all 6 scenarios)
- [X] T057 Verify constitution compliance (all gates still pass)
- [X] T058 Create test-empty.csv example file for regression testing
- [X] T059 Final full test suite run (frontend + backend + performance)

**Checkpoint**: Feature complete, tested, documented, ready for commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all implementation
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - Core implementation that enables US2 and US3
- **User Story 2 (Phase 4)**: Depends on US1 implementation (T010-T013) - Validation only, no new code
- **User Story 3 (Phase 5)**: Depends on US1 implementation (T010-T013) - Validation only, no new code
- **Automated Testing (Phase 6)**: Depends on US1 implementation complete
- **Polish (Phase 7)**: Depends on all testing complete

### User Story Dependencies

**Critical Understanding**: This is a bug fix where ONE code change (adding empty option) solves ALL THREE user stories:

- **User Story 1 (P1)**: Core implementation - add empty option to dropdowns
  - **Implementation Tasks**: T010-T013 (4 tasks)
  - **Manual Testing**: T014-T017 (4 tasks)
  - **Automated Testing**: T033-T036 (4 tests)

- **User Story 2 (P1)**: Validation that US1 fix works during editing
  - **Implementation Tasks**: T018-T019 (2 verification tasks, no new code)
  - **Manual Testing**: T020-T022 (3 tasks)
  - **Automated Testing**: T037-T040 (4 tests)

- **User Story 3 (P2)**: Validation that US1 fix allows explicit clearing
  - **Implementation Tasks**: T023-T025 (3 verification tasks, no new code)
  - **Manual Testing**: T026-T029 (4 tasks)
  - **Automated Testing**: T041-T042 (2 tests)

**Key Insight**: Once T010-T013 are complete (add empty option), all three user stories are functionally complete. Remaining tasks are validation and testing.

### Within Each Phase

**Phase 3 (US1 - Core Implementation)**:
- T010 → T011 → T012 (sequential - same file, same function)
- T013 (comments) can happen anytime
- Manual testing (T014-T017) after implementation

**Phase 4 (US2 - Validation)**:
- T018-T019 (verification only, can be parallel)
- Manual testing (T020-T022) after verification

**Phase 5 (US3 - Validation)**:
- T023-T025 (verification only, can be parallel)
- Manual testing (T026-T029) after verification

**Phase 6 (Automated Testing)**:
- T030-T032 (setup) must complete first
- T033-T044 (all test cases) can run in parallel after setup
- T045-T048 (execution) sequential at end

**Phase 7 (Polish)**:
- T049-T052 (code quality) can run in parallel
- T053-T055 (documentation) can run in parallel
- T056-T059 (validation) sequential at end

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- T005-T009 can all be done in parallel (reading different files/sections)

**Within Phase 6 (Automated Testing)**:
- T030-T032 (test setup) can be done in parallel
- T033-T044 (all individual test cases) can be written in parallel
  - 4 US1 tests in parallel
  - 4 US2 tests in parallel
  - 2 US3 tests in parallel
  - 2 edge case tests in parallel

**Within Phase 7 (Polish)**:
- T049-T052 (all linting/formatting checks) in parallel
- T053-T055 (all documentation updates) in parallel

---

## Parallel Example: Automated Testing Phase

```bash
# After test setup (T030-T032) completes, launch all test writing in parallel:

# US1 tests:
Task: "Test: Empty option present as first option"
Task: "Test: Empty option selected when field is empty"
Task: "Test: Correct option selected when non-empty"
Task: "Test: Whitespace-only values preserved"

# US2 tests:
Task: "Test: getFieldValues() returns empty string"
Task: "Test: Form re-render preserves empty"
Task: "Test: Multiple class columns independent"
Task: "Test: Completely empty row displays correctly"

# US3 tests:
Task: "Test: User can switch to empty"
Task: "Test: Undo/redo preserves empty"

# Edge case tests:
Task: "Test: Empty dropdown shows only blank option"
Task: "Test: Option ordering correct"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Minimal Viable Product - Fastest path to value**:

1. Complete Phase 1: Setup (T001-T004) - 10 minutes
2. Complete Phase 2: Foundational (T005-T009) - 15 minutes
3. Complete Phase 3: User Story 1 Implementation (T010-T013) - 10 minutes
4. Complete Phase 3: User Story 1 Manual Testing (T014-T017) - 15 minutes
5. **STOP and VALIDATE**: Verify empty fields display correctly
6. Optionally skip to Phase 6: Automated Testing (T030-T036) - 20 minutes
7. **MVP COMPLETE** in ~70 minutes

**Result**: Core bug fixed, empty fields display correctly, ready for commit

### Incremental Validation (All User Stories)

**Full feature with all acceptance criteria validated**:

1. Complete Phases 1-3 (Setup + Foundational + US1) - ~50 minutes
2. Complete Phase 4 (US2 validation) - ~15 minutes
   - Test US2 independently (edit while preserving)
3. Complete Phase 5 (US3 validation) - ~15 minutes
   - Test US3 independently (explicit clearing)
4. Complete Phase 6 (Automated Testing) - ~30 minutes
5. Complete Phase 7 (Polish & Validation) - ~20 minutes
6. **FULL FEATURE COMPLETE** in ~130 minutes (2 hours)

**Result**: All user stories validated, comprehensive test coverage, ready for PR

### Parallel Team Strategy

With 2 developers (not recommended for this small fix, but possible):

1. **Developer A** (Main implementation):
   - Phase 1: Setup
   - Phase 2: Foundational
   - Phase 3: US1 implementation (T010-T013)

2. **Developer B** (Documentation & Test Prep):
   - Phase 7: Documentation tasks (T053-T055) can start early
   - Phase 6: Test setup (T030-T032) while Dev A implements

3. **Both Together**:
   - Manual testing (Phases 3-5)
   - Automated test writing (Phase 6, tests can be split)
   - Final validation (Phase 7)

**Time Saved**: ~20 minutes vs sequential

---

## Task Summary

### Total Task Count: 59 tasks

**By Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 5 tasks
- Phase 3 (US1): 8 tasks (4 implementation + 4 manual testing)
- Phase 4 (US2): 5 tasks (2 verification + 3 manual testing)
- Phase 5 (US3): 6 tasks (3 verification + 4 manual testing - includes undo test)
- Phase 6 (Automated Testing): 19 tasks (3 setup + 12 test cases + 4 execution)
- Phase 7 (Polish): 12 tasks (4 code quality + 3 docs + 4 validation + 1 compliance)

**By User Story**:
- User Story 1: 16 tasks (4 impl + 4 manual + 4 auto tests + 4 shared setup)
- User Story 2: 9 tasks (2 verify + 3 manual + 4 auto tests)
- User Story 3: 8 tasks (3 verify + 4 manual + 2 auto tests - includes undo)
- Shared/Setup: 26 tasks (setup, foundational, test infrastructure, polish)

**Parallel Opportunities**: 25 tasks marked [P] can run in parallel within their phase

**Critical Path** (minimum for MVP):
- Phase 1 (4 tasks) → Phase 2 (5 tasks) → Phase 3 Implementation (4 tasks) → Phase 3 Manual Testing (4 tasks)
- **Total: 17 tasks for MVP**

**Independent Test Criteria Met**:
- ✅ User Story 1: Load CSV with empty fields, verify blank dropdowns
- ✅ User Story 2: Edit text field, verify class field stays empty
- ✅ User Story 3: Select blank option, verify field clears

---

## Notes

- **[P] tasks**: Different files or independent sections, can run in parallel
- **[Story] label**: Maps task to user story for traceability and independent testing
- **Shared Implementation**: T010-T013 solve all three user stories simultaneously
- **Verification vs Implementation**: US2 and US3 have verification tasks (ensure US1 fix works for their scenarios) rather than new implementation
- **Testing Strategy**: Manual testing validates each story independently, automated testing provides regression coverage
- **Commit Strategy**: Commit after Phase 3 (US1 core fix), then after Phase 6 (tests added), then after Phase 7 (polish)
- **MVP Focus**: Phases 1-3 deliver core value (empty fields display correctly)
- **Constitution Compliance**: All code quality, testing, UX, and performance requirements met per plan.md
