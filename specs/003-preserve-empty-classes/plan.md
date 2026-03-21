# Implementation Plan: Preserve Empty Class Values

**Branch**: `003-preserve-empty-classes` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-preserve-empty-classes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix class dropdown fields that auto-select the first value when a field is empty. Users need to view and edit CSV rows with empty classification fields without those fields being automatically populated. The current implementation only renders options from unique column values, causing browsers to auto-select the first option when no match exists. The solution adds a blank/empty first option to all class dropdowns, preserves whitespace-only values as distinct from empty, and prevents new values from auto-applying to empty fields during add operations.

## Technical Context

**Language/Version**: Rust 1.94 (backend) + TypeScript 5.6 (frontend)
**Primary Dependencies**: Tauri v2.0, Vite 6.0
**Storage**: CSV files on local filesystem
**Testing**: Vitest (frontend), Cargo test (backend)
**Target Platform**: Desktop (Linux, macOS, Windows via Tauri)
**Project Type**: Desktop application (Tauri-based)
**Performance Goals**: < 100ms rendering for dropdown population (currently 0.003ms for typical 10-50 options)
**Constraints**: < 200MB memory usage, maintain existing undo/redo functionality
**Scale/Scope**: Handles CSV files with 100,000+ rows, 50+ columns, 1000+ unique class values per column

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality First ✅ PASS
- **Requirements**: Self-documenting code, clear naming, SRP, zero linter warnings, minimal dependencies
- **Analysis**: Bug fix in existing dropdown rendering logic (`editor.ts` lines 50-84). Will maintain existing code quality standards (ESLint + Prettier configured). Change scope is isolated to dropdown option generation in `renderEditorForm()` function.
- **Action**: Ensure fix follows existing patterns, add explanatory comments for empty option handling

### II. Testing Standards (NON-NEGOTIABLE) ✅ PASS
- **Requirements**: Automated tests mandatory, 80% coverage for critical paths, edge case coverage
- **Analysis**:
  - Frontend has existing editor tests that need extension
  - Must add tests for:
    - Empty dropdown rendering (blank option present)
    - Empty value selection (blank option selected when value is '')
    - Whitespace preservation (whitespace-only values distinct from empty)
    - New value addition (doesn't auto-apply to empty fields)
    - CSV loading normalization (empty string, null, missing field all become empty)
- **Action**: Add 8-10 new test cases covering FR-001 through FR-010

### III. User Experience Consistency ✅ PASS
- **Requirements**: Consistent UI patterns, clear feedback, accessibility, user-friendly errors
- **Analysis**:
  - Fix improves UX by preventing unexpected auto-population
  - Blank option provides clear visual feedback for empty state
  - Maintains existing keyboard navigation functionality
  - Preserves existing undo/redo behavior
- **Action**: Ensure blank option styling is consistent with existing dropdown patterns

### IV. Performance Requirements ✅ PASS
- **Requirements**: < 100ms interactive operations, profiled performance, no regressions
- **Analysis**:
  - Current dropdown rendering is 0.003ms for typical datasets
  - Adding one blank option per dropdown will have negligible performance impact (<0.001ms)
  - No database queries or heavy computation involved
- **Action**: Verify no performance regression in dropdown population

### Quality Gates Compliance

**Automated Checks**:
- ✅ All tests passing (will add 8-10 new tests, ensure all pass)
- ✅ Code coverage maintained (editor module already covered, extending coverage)
- ✅ Static analysis (ESLint + Prettier + Rustfmt/Clippy)
- ✅ Performance benchmarks (existing performance test validates <100ms target)
- ✅ Security scanning (no security implications for dropdown rendering)

**Code Review Requirements**:
- Must verify blank option is always first in dropdown
- Must verify empty values don't trigger auto-selection
- Must verify whitespace-only values preserved
- Must verify new value addition doesn't change empty fields
- Documentation updated in editor.ts with clear comments

**Pre-Merge Checklist**:
- Conventional commit format: `fix(editor): preserve empty class values in dropdowns`
- Branch up-to-date with main
- CHANGELOG updated (user-facing bug fix)

### Gate Result: ✅ ALL GATES PASS - Proceed to Phase 0

No constitutional violations. This is a straightforward bug fix that improves data integrity, maintains code quality, and requires proper test coverage per standards.

## Project Structure

### Documentation (this feature)

```text
specs/003-preserve-empty-classes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
csv_labelizer/
├── src/                          # Frontend (TypeScript)
│   ├── main.ts                  # App initialization
│   ├── editor.ts                # ⚠️ PRIMARY FIX LOCATION - Form editor with dropdown rendering
│   ├── navigation.ts            # Row navigation logic
│   ├── search.ts                # Search functionality
│   ├── image-preview.ts         # Image display
│   ├── types.ts                 # TypeScript definitions
│   ├── index.html               # Main HTML (contains editor form)
│   └── style.css                # Styling (dropdown styling)
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── commands.rs          # Tauri commands (add_class_value may need update)
│   │   ├── csv_engine.rs        # CSV operations (normalization logic may be needed)
│   │   └── state.rs             # Application state
│   └── tests/
│       ├── integration_test.rs  # Workflow tests (verify fix doesn't break workflows)
│       └── performance_test.rs  # Performance validation (verify no regression)
├── tests/
│   └── frontend/
│       ├── editor.test.ts       # ⚠️ ADD NEW TESTS HERE - Editor tests
│       └── navigation.test.ts   # Navigation tests (existing)
├── package.json                  # Frontend dependencies
└── vite.config.ts                # Vitest configuration
```

**Structure Decision**: Standard Tauri application structure (separate frontend/backend). The bug fix is primarily isolated to frontend dropdown rendering logic (`src/editor.ts` lines 50-84) with potential minor backend updates for CSV normalization in `src-tauri/src/csv_engine.rs`. Tests will be added to `tests/frontend/editor.test.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations - this section is intentionally empty.

---

## Post-Phase 1 Constitution Re-Check

*Required after Phase 1 design artifacts are complete*

### Design Review Against Constitution

#### I. Code Quality First ✅ PASS (Confirmed)
**Design Review**:
- [data-model.md](data-model.md): Clear state machine diagrams, well-defined invariants for dropdown rendering
- [quickstart.md](quickstart.md): Step-by-step implementation guide with clear code examples
- [contracts/dropdown-interface.md](contracts/dropdown-interface.md): Documents backward compatibility guarantees and behavior contracts
- **Conclusion**: Design supports self-documenting code with clear patterns

#### II. Testing Standards ✅ PASS (Confirmed)
**Design Review**:
- [quickstart.md](quickstart.md): Includes 12 specific test cases to add
- [data-model.md](data-model.md): Documents testable state assertions and invariants
- [contracts/dropdown-interface.md](contracts/dropdown-interface.md): Defines 7 behavior contracts with test examples
- Test coverage explicitly planned: empty option rendering, value selection, whitespace preservation, new value addition
- **Conclusion**: Design ensures comprehensive test coverage per constitution

#### III. User Experience Consistency ✅ PASS (Confirmed)
**Design Review**:
- [contracts/dropdown-interface.md](contracts/dropdown-interface.md): All public interfaces preserved (renderEditorForm, getFieldValues)
- [research.md](research.md): Empty option pattern follows standard HTML select UX (Nielsen Norman Group best practices)
- Keyboard navigation maintained (Home key to empty option, arrow keys work)
- Undo/redo preserved for empty values
- **Conclusion**: Design improves UX without breaking existing patterns

#### IV. Performance Requirements ✅ PASS (Confirmed)
**Design Review**:
- [research.md](research.md): Empty option adds ~0.0001ms (negligible impact, total <0.01ms)
- [data-model.md](data-model.md): No additional memory overhead (1 option per dropdown = ~100 bytes)
- [contracts/dropdown-interface.md](contracts/dropdown-interface.md): Performance contracts defined (<10ms rendering)
- **Conclusion**: Design maintains performance guarantees

### Final Gate Result: ✅ ALL GATES PASS

After completing Phase 0 (research) and Phase 1 (design), the implementation plan:
- ✅ **Aligns with all constitution principles**
- ✅ **Introduces no new violations**
- ✅ **Maintains all quality standards**
- ✅ **Provides clear implementation path**

**Status**: Ready to proceed to Phase 2 (`/speckit.tasks`)

---

## Phase 0 Deliverables ✅ COMPLETE

- ✅ [research.md](research.md) - Root cause analysis, solution approach, best practices
  - Identified browser auto-selection as root cause
  - Selected empty first option pattern
  - Documented 5 research questions with decisions and rationale
  - No new dependencies required

## Phase 1 Deliverables ✅ COMPLETE

- ✅ [data-model.md](data-model.md) - State variables, transitions, validation rules
  - Documented ClassFieldValue and DropdownOption entities
  - Defined state machines for dropdown rendering and new value addition
  - Provided validation rules and edge case handling

- ✅ [contracts/dropdown-interface.md](contracts/dropdown-interface.md) - Interface contracts
  - Confirmed 100% backward compatibility (except buggy auto-selection)
  - Documented 7 behavior contracts with test examples
  - Defined performance and security contracts

- ✅ [quickstart.md](quickstart.md) - Implementation guide
  - 5-step implementation guide (45-60 minutes)
  - Code samples for all changes
  - 6 manual test scenarios and 12 automated test cases
  - Troubleshooting guide

- ✅ [CLAUDE.md](../../../CLAUDE.md) - Agent context updated
  - Added Rust 1.94 + TypeScript 5.6 + Tauri v2.0 + Vite 6.0 to active technologies
  - Updated project structure and technologies

## Ready for Next Phase

All Phase 0 and Phase 1 deliverables are complete. The implementation plan is fully specified with:
- Clear technical context (Tauri desktop app, TypeScript dropdown rendering)
- Validated solution approach (empty first option in all class dropdowns)
- Comprehensive design artifacts (state machines, contracts, quickstart)
- Constitutional compliance verified (all principles satisfied)

**Next Command**: `/speckit.tasks` - Generate actionable task breakdown for implementation
