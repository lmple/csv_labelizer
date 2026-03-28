# csv_labelizer Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-28

## Active Technologies
- Rust 1.94 (backend) + TypeScript 5.6 (frontend) + Tauri v2.0, Vite 6.0 (003-preserve-empty-classes)
- CSV files on local filesystem (003-preserve-empty-classes)
- Rust 1.94 (backend), TypeScript 5.6 (frontend — no changes) + Tauri v2.0, csv 1.3, serde 1.0 (004-adopt-csv-library)
- Rust 1.94 (backend) + TypeScript 5.6 (frontend) + Tauri v2.0, Vite 6.0, csv crate 1.3, csv-core 0.1 (005-advanced-multi-column-search)
- CSV files on local filesystem with offset-based indexing (005-advanced-multi-column-search)
- Rust 1.94 (backend) + TypeScript 5.6 (frontend) + Tauri v2.0, Vite 6.0, vitest (upgrading to 4.x), csv 1.3 (006-fix-deps-warnings)
- N/A (no changes) (006-fix-deps-warnings)

- Rust (stable) + TypeScript 5.6 + Tauri v2.0, Vite (002-fix-pagination-skip)

## Project Structure

```text
src/
tests/
```

## Commands

cargo test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] cargo clippy

## Code Style

Rust (stable) + TypeScript 5.6: Follow standard conventions

## Recent Changes
- 006-fix-deps-warnings: Added Rust 1.94 (backend) + TypeScript 5.6 (frontend) + Tauri v2.0, Vite 6.0, vitest (upgrading to 4.x), csv 1.3
- 005-advanced-multi-column-search: Added Rust 1.94 (backend) + TypeScript 5.6 (frontend) + Tauri v2.0, Vite 6.0, csv crate 1.3, csv-core 0.1
- 004-adopt-csv-library: Added Rust 1.94 (backend), TypeScript 5.6 (frontend — no changes) + Tauri v2.0, csv 1.3, serde 1.0


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
