# Implementation Plan: Advanced Multi-Column Search

**Branch**: `005-advanced-multi-column-search` | **Date**: 2026-03-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-advanced-multi-column-search/spec.md`

## Summary

Add an advanced search mode that allows users to define multiple column-specific filters combined with AND or OR logic. A new `advanced_search_rows` Tauri command handles backend filtering, while the frontend adds a collapsible panel with dynamic filter rows and a logic toggle below the existing search bar.

## Technical Context

**Language/Version**: Rust 1.94 (backend) + TypeScript 5.6 (frontend)
**Primary Dependencies**: Tauri v2.0, Vite 6.0, csv crate 1.3, csv-core 0.1
**Storage**: CSV files on local filesystem with offset-based indexing
**Testing**: `cargo test` (Rust), manual testing (frontend)
**Target Platform**: Desktop (Linux, macOS, Windows via Tauri)
**Project Type**: Desktop application (Tauri)
**Performance Goals**: Advanced search returns results within 5 seconds for 100K+ row files
**Constraints**: Must preserve existing simple search unchanged (FR-006); offset-based row access pattern
**Scale/Scope**: Typical 2-5 filters per search; arbitrary number supported

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality First | ✅ PASS | New command follows existing patterns; self-documenting names |
| II. Testing Standards | ✅ PASS | Rust unit tests for `advanced_search_rows`; edge case coverage planned |
| III. User Experience Consistency | ✅ PASS | Reuses existing search navigation; consistent dropdown/button patterns |
| IV. Performance Requirements | ✅ PASS | Same scan pattern as existing search; targets <5s for 100K rows |

**Post-Design Re-Check**: All gates still pass. The advanced search panel follows existing UI patterns (dropdowns from headers, same nav controls). Backend command reuses the same offset-scan approach.

## Project Structure

### Documentation (this feature)

```text
specs/005-advanced-multi-column-search/
├── plan.md              # This file
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
src-tauri/
├── src/
│   ├── commands.rs      # Add advanced_search_rows command
│   ├── csv_engine.rs    # No changes needed (row reading reused)
│   ├── main.rs          # Register new command
│   └── state.rs         # No changes needed
├── Cargo.toml           # No new dependencies needed

src/
├── index.html           # Add advanced search panel HTML, toggle button
├── search.ts            # Add advanced search mode, filter management, mode toggle
├── types.ts             # Add SearchFilter, FilterGroup interfaces
├── style.css            # Add styles for advanced search panel
├── main.ts              # No changes needed
└── navigation.ts        # No changes needed
```

**Structure Decision**: Extends the existing single-project Tauri structure. No new files created — all changes are additions to existing files except types.ts which gets new interfaces.

## Complexity Tracking

No constitution violations to justify.
