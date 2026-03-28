# Quickstart: Adopt Verified CSV Library

**Date**: 2026-03-28 | **Branch**: `004-adopt-csv-library`

## Overview

Replace manual CSV parsing (`parse_csv_line`) and formatting (`format_csv_row`) in `src-tauri/src/csv_engine.rs` with the `csv` crate (v1.3, already in Cargo.toml). Keep all custom logic: offset indexing, BOM detection, delimiter detection, file write strategies.

## Key Files

| File | Change |
|------|--------|
| `src-tauri/src/csv_engine.rs` | Replace `parse_csv_line`, `format_csv_row`, `count_delimiter_occurrences` with csv crate calls |
| `src-tauri/src/commands.rs` | No changes (public API unchanged) |
| `src-tauri/src/state.rs` | No changes |
| `src-tauri/tests/integration_test.rs` | No changes expected (same behavior) |
| `src-tauri/tests/performance_test.rs` | No changes expected (same behavior) |

## Implementation Pattern

### Parsing (replace `parse_csv_line`)

```rust
use csv::ReaderBuilder;

fn parse_csv_line(line: &str, delimiter: u8) -> Vec<String> {
    let mut reader = ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(false)
        .from_reader(line.as_bytes());

    match reader.records().next() {
        Some(Ok(record)) => record.iter().map(String::from).collect(),
        _ => vec![line.to_string()], // fallback for malformed lines
    }
}
```

### Formatting (replace `format_csv_row`)

```rust
use csv::WriterBuilder;

fn format_csv_row(fields: &[String], delimiter: u8) -> String {
    let mut writer = WriterBuilder::new()
        .delimiter(delimiter)
        .from_writer(Vec::new());

    writer.write_record(fields).expect("write to Vec cannot fail");
    let bytes = writer.into_inner().expect("flush Vec cannot fail");
    String::from_utf8(bytes).expect("csv output is valid UTF-8")
}
```

## Verification

```bash
cargo test                # All 22 tests must pass
cargo clippy              # Zero warnings
```

## What NOT to Change

- `build_offset_index` structure (line-by-line offset tracking)
- `detect_encoding_and_bom` (csv crate doesn't handle BOM)
- `detect_delimiter` algorithm (csv crate doesn't sniff delimiters)
- `write_row_at_offset` file manipulation logic
- `write_tail_streamed` large file handling
- `detect_image_column`, `detect_class_columns` (domain logic)
- Any function signatures in the public API
