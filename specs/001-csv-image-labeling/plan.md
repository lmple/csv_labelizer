# Implementation Plan: CSV In-Place Editor with Image Preview

> Feature: Desktop application for editing large CSV files in-place, one row at a time, with associated image preview from the same directory.

## Technical Context

| Field                | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| Language/Version     | Rust (latest stable) for backend, TypeScript for frontend    |
| Framework            | Tauri v2                                                     |
| Frontend             | Vanilla TypeScript + HTML/CSS (no framework)                 |
| Storage              | Direct filesystem read/write (no database)                   |
| Testing              | `cargo test` (Rust), Vitest (frontend)                       |
| Target Platform      | Linux (CachyOS native, WSL2 Ubuntu)                          |
| Project Type         | Desktop application (single-window)                          |
| Performance Goals    | Open CSV files >1GB, <100ms navigation between rows          |
| Constraints          | <200MB RAM for a 1GB CSV, no network required, no data copy  |
| Scale/Scope          | Single user, single CSV open at a time                       |

## Constitution Check

- **No data transfer**: All operations happen on the local filesystem. No server, no cloud, no copy.
- **In-place editing**: The CSV file is modified directly where it lives. No temp copies to another location.
- **Minimal dependencies**: Vanilla TS frontend, no React/Vue/Svelte. Keep the bundle tiny.
- **Image locality**: Images are resolved relative to the CSV file's directory. No external URLs.
- **Rust backend**: All CSV parsing, indexing, and writing happens in Rust via Tauri commands.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Tauri Window                     │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │           Frontend (webview)                 │ │
│  │                                               │ │
│  │  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │ Image Preview │  │   Row Editor Form    │ │ │
│  │  │  (displays    │  │   (one row at a time │ │ │
│  │  │   local img)  │  │    with column names │ │ │
│  │  │               │  │    as labels)        │ │ │
│  │  └──────────────┘  └──────────────────────┘ │ │
│  │                                               │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │  Navigation Bar                          │ │ │
│  │  │  [◀ Prev] [Row 42 / 100000] [Next ▶]    │ │ │
│  │  │  [Save] [Jump to row...] [Open CSV...]   │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │         Rust Backend (Tauri commands)        │ │
│  │                                               │ │
│  │  • open_csv(path) → headers + row_count      │ │
│  │  • get_row(index) → row data                 │ │
│  │  • save_row(index, data) → result            │ │
│  │  • get_image_path(filename) → asset URL      │ │
│  │  • search_rows(query, column) → indices      │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Execution Flow

### 1. Opening a CSV

1. User clicks "Open CSV" → native file dialog (Tauri dialog plugin)
2. Rust backend receives file path
3. Backend scans CSV line by line, building an **offset index**: `Vec<u64>` mapping row number → byte offset in file
4. Backend extracts headers from first line
5. Returns `{ headers: string[], row_count: usize, csv_dir: string }` to frontend
6. Frontend renders the editor form with column labels and navigates to row 0

### 2. Navigating Rows

1. Frontend calls `get_row(index)` Tauri command
2. Backend seeks to `offsets[index]` in the file, reads one line, parses CSV fields
3. Returns `{ fields: string[], row_index: usize }`
4. Frontend populates each form input with the field value
5. If one field contains an image filename (configurable column), frontend requests the image via `convertFileSrc(csv_dir + "/" + filename)`

### 3. Editing and Saving

1. User modifies field(s) in the form
2. User clicks "Save" (or Ctrl+S)
3. Frontend sends `save_row(index, fields)` to backend
4. Backend strategy for in-place save:
   - If new row byte length == old row byte length → overwrite in place
   - If different → rewrite file from the modified row onward (streaming: read tail into buffer, seek back, write new row + tail)
   - Update offset index after write
5. Returns success/failure to frontend
6. Frontend shows a brief toast notification

### 4. Image Preview

1. Image column is auto-detected (column name contains "image", "img", "photo", "picture") or manually set by user
2. The value in that column is treated as a relative path from the CSV directory
3. Image is loaded via Tauri's `convertFileSrc()` to create an `asset://` URL
4. Supported formats: PNG, JPG, JPEG, WEBP, BMP, GIF
5. If image not found, show a placeholder with the expected path

## Data Model

### CsvState (Rust, held in `tauri::State<Mutex<CsvState>>`)

```rust
struct CsvState {
    file_path: Option<PathBuf>,
    csv_dir: Option<PathBuf>,
    headers: Vec<String>,
    offsets: Vec<u64>,        // byte offset of each row start
    row_count: usize,
    image_column: Option<usize>,  // index of the image column
    delimiter: u8,            // auto-detected: comma, semicolon, tab
    has_unsaved_changes: bool,
}
```

### Tauri Commands (API Contract)

```rust
#[tauri::command]
fn open_csv(path: String) -> Result<CsvMetadata, String>;

#[tauri::command]
fn get_row(index: usize) -> Result<RowData, String>;

#[tauri::command]
fn save_row(index: usize, fields: Vec<String>) -> Result<(), String>;

#[tauri::command]
fn set_image_column(column_index: usize) -> Result<(), String>;

#[tauri::command]
fn search_rows(query: String, column_index: Option<usize>) -> Result<Vec<usize>, String>;

#[tauri::command]
fn get_csv_stats() -> Result<CsvMetadata, String>;
```

### Frontend Types

```typescript
interface CsvMetadata {
  headers: string[];
  row_count: number;
  csv_dir: string;
  image_column: number | null;
  delimiter: string;
}

interface RowData {
  fields: string[];
  row_index: number;
}
```

## Directory Structure

```
csv-editor/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── commands.rs          # All Tauri command handlers
│   │   ├── csv_engine.rs        # CSV parsing, indexing, read/write
│   │   └── state.rs             # CsvState struct and management
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── index.html               # Single page
│   ├── main.ts                  # App entry, Tauri invoke calls
│   ├── style.css                # All styles
│   ├── editor.ts                # Row editor form logic
│   ├── navigation.ts            # Row navigation (prev/next/jump)
│   └── image-preview.ts         # Image loading and display
├── tests/
│   ├── csv_engine_test.rs       # Rust unit tests for CSV engine
│   └── frontend/
│       └── editor.test.ts       # Frontend logic tests
├── package.json
└── README.md
```

## Key Implementation Details

### CSV Offset Indexing (critical for performance)

The core technique for handling large files without loading them into memory:

```
File:    header\nrow1\nrow2\nrow3\n...
Offsets: [len(header)+1, len(header)+1+len(row1)+1, ...]
```

- On `open_csv`: scan file byte by byte counting newlines, store each offset
- On `get_row(n)`: `File::seek(SeekFrom::Start(offsets[n]))`, read until next `\n`
- Memory usage: 8 bytes per row (u64 offset) → 1M rows = 8MB index

### In-Place Write Strategy

For rows where the byte length changes after edit:

1. Read everything from `offsets[index+1]` to EOF into a buffer
2. Seek to `offsets[index]`
3. Write new row bytes
4. Write the buffered tail
5. If file got shorter, truncate; if longer, it's already extended
6. Recalculate offsets from `index` onward (delta shift)

For very large files (>500MB tail), use a streaming approach with a temp buffer file in the same directory.

### Delimiter Auto-Detection

On file open, read the first 5 lines and count occurrences of `,`, `;`, `\t`. The character with the most consistent count across lines wins.

## Dependency Analysis

### Rust (Cargo.toml)

| Crate              | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `tauri`            | Application framework                      |
| `tauri-plugin-dialog` | Native file open dialog                 |
| `tauri-plugin-fs`  | Filesystem access for asset serving        |
| `csv`              | CSV parsing (used for field splitting only) |
| `serde`            | Serialization for Tauri commands           |
| `serde_json`       | JSON serialization                         |

### Frontend (package.json)

| Package            | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `@tauri-apps/api`  | Tauri JS API bindings                      |
| `@tauri-apps/plugin-dialog` | File dialog JS bindings           |
| `typescript`       | Type safety                                |
| `vite`             | Dev server and bundler (Tauri default)     |
| `vitest`           | Frontend testing                           |

No UI framework. No CSS framework. Vanilla only.

## Validation Strategy

### Rust Unit Tests

- `csv_engine::test_offset_indexing` — verify offsets match actual line starts
- `csv_engine::test_read_row_at_offset` — verify correct field parsing
- `csv_engine::test_write_row_same_length` — verify in-place overwrite
- `csv_engine::test_write_row_different_length` — verify tail-shift write
- `csv_engine::test_delimiter_detection` — verify auto-detection for `,`, `;`, `\t`
- `csv_engine::test_quoted_fields` — verify handling of quoted CSV fields with commas/newlines
- `csv_engine::test_utf8_content` — verify UTF-8 content preservation

### Frontend Tests

- `editor.test.ts` — form population from row data, field extraction on save
- `navigation.test.ts` — boundary checks (row 0, last row), jump-to validation

### Integration Tests

- Open a known CSV, navigate to specific row, verify content matches
- Edit a row, save, reopen file, verify edit persisted
- Test with CSV >100MB to verify memory stays bounded

## Implementation Phases

### Phase 1: CSV Engine (Rust) [P]
Build the core CSV read/write engine with offset indexing. No UI yet.
- Offset index builder
- Single row reader by index
- Row writer (both same-length and different-length)
- Delimiter auto-detection
- All Rust unit tests passing

### Phase 2: Tauri Shell + Commands [P]
Wire up Tauri app with commands exposing the CSV engine.
- Tauri project scaffolding
- State management (`Mutex<CsvState>`)
- All `#[tauri::command]` functions
- File dialog integration
- Asset protocol config for local images

### Phase 3: Frontend — Editor UI
Build the single-page editor interface.
- HTML form generated dynamically from headers
- Row navigation (prev/next/jump)
- Save button with keyboard shortcut
- Status bar (current row, total rows, file path)
- Toast notifications for save success/error

### Phase 4: Image Preview
Add image display alongside the editor.
- Image column detection (auto + manual override)
- `convertFileSrc()` integration
- Placeholder for missing images
- Responsive layout (image + form side by side)

### Phase 5: Search & Polish
- Text search across rows (or within a column)
- Keyboard navigation (arrow keys for prev/next)
- Unsaved changes warning on navigate/close
- Dark/light theme following system preference
- CSV encoding detection (UTF-8, Latin-1)

## Review & Acceptance Checklist

- [ ] Can open a CSV file >1GB without crash or excessive memory use
- [ ] Displays exactly one row at a time with all column values editable
- [ ] Shows associated image from the CSV's directory
- [ ] Saves edits directly to the original file (no copy)
- [ ] Navigation between rows takes <100ms
- [ ] Memory usage stays <200MB for a 1GB file
- [ ] Handles quoted CSV fields correctly (commas, newlines in values)
- [ ] Auto-detects delimiter (comma, semicolon, tab)
- [ ] Works on Linux (CachyOS and WSL2 Ubuntu)
- [ ] All Rust unit tests pass
- [ ] All frontend tests pass
- [ ] Keyboard shortcuts work (Ctrl+S save, arrow keys navigate)
- [ ] Unsaved changes prompt before closing or navigating away
