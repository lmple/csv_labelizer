# Research: Fix Dependency Vulnerabilities and Compiler Warnings

**Feature**: 006-fix-deps-warnings | **Date**: 2026-03-28

## R1: npm Vulnerability Resolution Strategy

**Decision**: Upgrade vitest from current version to v4.x (latest stable)

**Rationale**: All 5 moderate vulnerabilities trace to `esbuild <=0.24.2` via the vitest→vite→esbuild dependency chain. `npm audit fix --force` recommends vitest 4.1.2+ which pulls in patched vite and esbuild versions. This is a dev dependency only, so the risk of breakage is limited to the test toolchain.

**Alternatives considered**:
- Override esbuild version only via `npm overrides` — fragile, may break vite/vitest compatibility
- Pin specific vite version — doesn't resolve the root cause in esbuild
- Ignore (dev-only) — violates FR-001 and constitution quality standards

## R2: Rust Warning Categories and Fixes

**Decision**: Fix each warning at its root cause

**Rationale**: The ~9 warnings fall into these categories:
1. **Unused imports** (`std::io::Write`, `std::path::PathBuf`, `std::sync::Mutex` in test files) — remove the imports
2. **Unused variables** (`headers` in integration_test.rs) — prefix with `_` or remove
3. **Dead code warnings** (`detect_image_column`, `verify_memory_budget`, `calculate_index_memory_usage`, `CsvState`, `CsvMetadata`, `RowData` in test compilation) — these are used by the main binary but appear unused when compiling test crates that include `src/` modules. Fix by using `#[cfg(not(test))]` or referencing them in tests.

**Alternatives considered**:
- `#[allow(dead_code)]` annotations — suppresses rather than fixes, violates FR-006
- Ignore test-only warnings — violates FR-004
