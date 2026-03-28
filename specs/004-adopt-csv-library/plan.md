# Implementation Plan: Adopt Verified CSV Library

**Branch**: `004-adopt-csv-library` | **Date**: 2026-03-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-adopt-csv-library/spec.md`

## Summary

Replace manual CSV parsing and formatting in `csv_engine.rs` with the `csv` crate (v1.3, already a dependency). Keep all custom optimizations: offset indexing, BOM detection, delimiter auto-detection, streaming writes. This reduces maintenance burden and improves correctness for edge cases while preserving performance characteristics.

## Technical Context

**Language/Version**: Rust 1.94 (backend), TypeScript 5.6 (frontend — no changes)
**Primary Dependencies**: Tauri v2.0, csv 1.3, serde 1.0
**Storage**: CSV files on local filesystem
**Testing**: cargo test (22 existing tests: integration + performance)
**Target Platform**: Desktop (Linux/macOS/Windows via Tauri)
**Project Type**: Desktop application (Tauri)
**Performance Goals**: <100ms row navigation, <5s file open for 100K rows
**Constraints**: <2MB memory for offset index at 100K rows, streaming writes for >500MB files
**Scale/Scope**: Single file open at a time, up to 100K+ rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality First | PASS | Replacing manual code with battle-tested library improves quality |
| II. Testing Standards | PASS | All 22 existing tests must pass unchanged; edge case coverage improves via library |
| III. User Experience Consistency | PASS | No user-facing changes; backend-only refactor |
| IV. Performance Requirements | PASS | Offset indexing and streaming writes preserved; performance within 10% variance |

**Post-Phase 1 Re-check**: All gates still pass. No new entities, no new dependencies (csv crate already in Cargo.toml), no API changes.

## Project Structure

### Documentation (this feature)

```text
specs/004-adopt-csv-library/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src-tauri/
├── src/
│   ├── main.rs              # Tauri setup (no changes)
│   ├── csv_engine.rs        # PRIMARY TARGET: replace parse/format functions
│   ├── commands.rs           # IPC handlers (no changes)
│   └── state.rs              # State management (no changes)
├── tests/
│   ├── integration_test.rs   # Must pass unchanged
│   └── performance_test.rs   # Must pass unchanged
└── Cargo.toml                # csv = "1.3" already present
```

**Structure Decision**: No structural changes. This is a targeted refactor within a single file (`csv_engine.rs`). The csv crate dependency already exists in Cargo.toml.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
