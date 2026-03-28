# Research: Adopt Verified CSV Library

**Date**: 2026-03-28 | **Branch**: `004-adopt-csv-library`

## R1: csv Crate Suitability for Parsing

**Decision**: Use the `csv` crate (v1.3, already in Cargo.toml) for parsing individual CSV records, replacing `parse_csv_line`.

**Rationale**:
- De facto standard CSV library for Rust (BurntSushi/rust-csv)
- Full RFC 4180 compliance: proper quoting, escaped quotes (`""`), delimiter handling
- `ReaderBuilder::delimiter(u8)` supports configurable delimiter — matches our auto-detection flow
- Can parse a single record from a `&[u8]` slice via `csv::ReaderBuilder::from_reader(slice)`
- Battle-tested with extensive edge case coverage

**Alternatives considered**:
- Keep manual `parse_csv_line`: Works but is a maintenance liability; any CSV edge case bug requires manual fix
- `polars`: Overkill for single-record parsing; designed for DataFrames, not row-level access

## R2: csv Crate Suitability for Writing

**Decision**: Use `csv::WriterBuilder` for formatting individual CSV records, replacing `format_csv_row`.

**Rationale**:
- `WriterBuilder::delimiter(u8)` supports configurable delimiter
- `Writer::from_writer(Vec<u8>)` allows writing a single record to an in-memory buffer
- Handles quoting rules correctly (quotes fields containing delimiter, quotes, newlines)
- `.into_inner()` extracts the buffer after flushing

**Alternatives considered**:
- Keep manual `format_csv_row`: Simple but duplicates what the library does with more test coverage

## R3: BOM Detection

**Decision**: Keep custom BOM detection (`detect_encoding_and_bom`).

**Rationale**:
- The `csv` crate does NOT handle UTF-8 BOM detection (confirmed via GitHub issues #81, #163)
- Current implementation is 14 lines, simple, and correct
- BOM offset is needed for accurate byte position tracking in offset indexing

**Alternatives considered**:
- `encoding_rs` crate: Overkill for BOM-only detection; adds unnecessary dependency

## R4: Delimiter Auto-Detection

**Decision**: Keep custom `detect_delimiter` implementation.

**Rationale**:
- The `csv` crate requires a delimiter to be set upfront via `ReaderBuilder::delimiter()`; it has no built-in delimiter sniffing
- Current implementation (54 lines) uses a variance-based scoring algorithm across 5 candidate delimiters
- This is domain-specific logic that no standard library provides

**Alternatives considered**:
- `csv-sniffer` crate: Exists but is unmaintained (last update 2020) and adds an extra dependency
- Simplify to comma-only: Would break semicolon/tab CSV files that users work with

## R5: Offset Indexing Integration

**Decision**: Keep custom offset indexing in `build_offset_index`, but use `csv` crate for header parsing.

**Rationale**:
- The offset index requires tracking byte positions line-by-line — this is inherently a `BufReader::read_line` loop, not a csv-reader iteration
- The `csv` crate's `Reader::position()` tracks byte offsets but is designed for sequential reading, not building a random-access index
- However, the header line (first line) can be parsed with the `csv` crate instead of manual parsing
- Row reading (`read_row_at_offset`) can use the `csv` crate to parse the line content after seeking to the offset

**Alternatives considered**:
- Rewrite offset indexing using `csv::Reader::position()`: Would require sequential reading and position capture, but adds complexity without benefit since we already track offsets via `read_line` byte counts

## R6: Row Writing Strategy

**Decision**: Keep custom `write_row_at_offset` file manipulation logic; use `csv` crate only for formatting the row bytes.

**Rationale**:
- The write strategy (in-place overwrite, tail-shift, streaming for >500MB) is file-manipulation logic, not CSV formatting
- The `csv` crate handles record formatting but has no concept of in-place file editing
- Replacement scope: only the `format_csv_row` function (row serialization) is replaced by the library

**Alternatives considered**:
- Full file rewrite on each save: Would destroy the performance characteristics for large files

## Summary: What Gets Replaced vs Kept

| Function | Action | Reason |
|----------|--------|--------|
| `parse_csv_line` | **Replace** with `csv::ReaderBuilder` | Core parsing — library is better tested |
| `format_csv_row` | **Replace** with `csv::WriterBuilder` | Core formatting — library handles quoting correctly |
| `count_delimiter_occurrences` | **Replace** with `csv::ReaderBuilder` | Can use csv reader to count fields per delimiter |
| `detect_encoding_and_bom` | **Keep** | csv crate doesn't handle BOM |
| `detect_delimiter` | **Keep** (refactor to use csv crate internally) | No library support for multi-delimiter sniffing |
| `build_offset_index` | **Keep** structure, use csv for header parsing | Offset tracking is custom by nature |
| `read_row_at_offset` | **Keep** seek logic, use csv for line parsing | Seek + parse pattern unchanged |
| `write_row_at_offset` | **Keep** file manipulation, use csv for formatting | File strategy is not CSV-specific |
| `write_tail_streamed` | **Keep** | Pure file I/O, not CSV-related |
| `detect_image_column` | **Keep** | Domain logic, not CSV parsing |
| `detect_class_columns` | **Keep** | Domain logic, not CSV parsing |
| `extract_unique_values` | **Keep** | Uses read_row_at_offset (which gets csv crate internally) |
| `calculate_index_memory_usage` | **Keep** | Simple math, no CSV involvement |
| `verify_memory_budget` | **Keep** | Simple math, no CSV involvement |
