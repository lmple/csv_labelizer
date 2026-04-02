# Implementation Plan: Exact Match in Advanced Search

**Branch**: `007-exact-word-search` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-exact-word-search/spec.md`

## Summary

Add a per-filter "exact match" toggle to the existing advanced search. When enabled, a filter uses full field equality (case-insensitive, whitespace-trimmed) instead of substring matching. The change extends the existing `SearchFilter` type with a boolean `exact` field, modifies the Rust matching logic to branch on it, and adds a toggle button to each filter row in the UI.

## Technical Context

**Language/Version**: Rust 1.94 (backend) + TypeScript 5.6 (frontend)
**Primary Dependencies**: Tauri v2.0, csv crate 1.3, serde 1.0, Vite 6.0
**Storage**: CSV files on local filesystem with offset-based indexing
**Testing**: `cargo test` (Rust), `vitest` (TypeScript)
**Target Platform**: Desktop (Tauri — Linux, macOS, Windows)
**Project Type**: Desktop application (Tauri)
**Performance Goals**: Search results in < 100ms for typical datasets (interactive operation per constitution)
**Constraints**: No perceptible delay increase vs current substring search
**Scale/Scope**: Datasets up to 100MB per constitution performance requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality First | Pass | Single boolean field addition, self-documenting. Matching logic is a clean branch. |
| II. Testing Standards | Pass | Plan includes unit tests for exact matching (AND/OR, mixed modes, edge cases), integration coverage. |
| III. UX Consistency | Pass | Toggle button follows existing filter row pattern. Visual feedback for active state. Default off preserves existing behavior. |
| IV. Performance | Pass | Equality check (`==`) is cheaper than substring (`.contains()`). No performance regression possible. |

**Post-Phase 1 re-check**: All gates still pass. No additional dependencies, no architectural complexity, no new data storage.

## Project Structure

### Documentation (this feature)

```text
specs/007-exact-word-search/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── tauri-commands.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src-tauri/src/
├── commands.rs          # SearchFilter struct + execute_advanced_search (MODIFY)
├── csv_engine.rs        # CSV parsing (NO CHANGE)
├── state.rs             # App state (NO CHANGE)
└── main.rs              # Tauri setup (NO CHANGE)

src/
├── types.ts             # SearchFilter interface (MODIFY)
├── search.ts            # Filter row UI + search invocation (MODIFY)
├── style.css            # Filter row styles (MODIFY)
├── index.html           # (NO CHANGE - filter rows are dynamically rendered)
├── main.ts              # (NO CHANGE)
├── editor.ts            # (NO CHANGE)
└── navigation.ts        # (NO CHANGE)

tests/
└── frontend/
    └── search.test.ts   # (NEW - exact match toggle tests)
```

**Structure Decision**: No new files needed in the backend. One new test file for frontend search tests. All changes are modifications to existing files.
