# Data Model: Adopt Verified CSV Library

**Date**: 2026-03-28 | **Branch**: `004-adopt-csv-library`

## Entities

This feature is a refactor of internal CSV engine logic. No new entities are introduced. The existing data model is preserved unchanged.

### CSV File (unchanged)

| Attribute | Type | Description |
|-----------|------|-------------|
| file_path | PathBuf | Absolute path to the CSV file on disk |
| delimiter | u8 | Detected delimiter character (`,`, `;`, `\t`, `\|`, ` `) |
| headers | Vec\<String\> | Column names from the first row |
| offsets | Vec\<u64\> | Byte offset of each data row start |
| bom_offset | u64 | 0 or 3 (UTF-8 BOM length) |

### Row (unchanged)

| Attribute | Type | Description |
|-----------|------|-------------|
| fields | Vec\<String\> | Parsed field values for the row |
| offset | u64 | Byte position in file |
| byte_length | usize | Length of the row in bytes (including newline) |

### CsvState (unchanged)

No structural changes to the application state. All fields in `state.rs` remain as-is.

## Data Flow Changes

The only change is *internal* to `csv_engine.rs`:

```
Before: raw line bytes → manual parse_csv_line() → Vec<String>
After:  raw line bytes → csv::ReaderBuilder → csv::StringRecord → Vec<String>

Before: Vec<String> → manual format_csv_row() → String
After:  Vec<String> → csv::WriterBuilder → Vec<u8> → String
```

All external interfaces (function signatures, return types, state structure) remain identical.
