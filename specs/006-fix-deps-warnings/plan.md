# Implementation Plan: Fix Dependency Vulnerabilities and Compiler Warnings

**Branch**: `006-fix-deps-warnings` | **Date**: 2026-03-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-fix-deps-warnings/spec.md`

## Summary

Resolve 5 moderate npm audit vulnerabilities (esbuild/vite/vitest chain) by upgrading vitest to v4.x, and eliminate ~9 Rust compiler warnings in test files (unused imports, variables, dead code).

## Technical Context

**Language/Version**: Rust 1.94 (backend) + TypeScript 5.6 (frontend)
**Primary Dependencies**: Tauri v2.0, Vite 6.0, vitest (upgrading to 4.x), csv 1.3
**Storage**: N/A (no changes)
**Testing**: `cargo test`, `cargo clippy`, `npm audit`
**Target Platform**: Desktop (Linux, macOS, Windows via Tauri)
**Project Type**: Desktop application (Tauri)
**Performance Goals**: N/A (maintenance task)
**Constraints**: All existing tests must continue to pass; no behavioral changes
**Scale/Scope**: ~9 Rust warnings in test files; 5 npm vulnerabilities in vitest dependency chain

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality First | ✅ PASS | Eliminating warnings improves code quality |
| II. Testing Standards | ✅ PASS | All tests must pass after changes |
| III. User Experience Consistency | ✅ PASS | No user-facing changes |
| IV. Performance Requirements | ✅ PASS | No performance impact |

**Post-Design Re-Check**: All gates still pass. Pure maintenance — no architectural changes.

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-deps-warnings/
├── plan.md              # This file
├── research.md          # Phase 0 output
└── checklists/
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
src-tauri/
├── tests/
│   ├── integration_test.rs   # Fix unused imports, variables
│   └── performance_test.rs   # Fix unused import

package.json                   # Update vitest version
```

**Structure Decision**: Only test files and package.json are modified. No source code changes.

## Complexity Tracking

No constitution violations to justify.
