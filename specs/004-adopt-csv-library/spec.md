# Feature Specification: Adopt Verified CSV Library

**Feature Branch**: `004-adopt-csv-library`
**Created**: 2026-03-28
**Status**: Draft
**Input**: User description: "This project need to use existing and verified library instead of implement too much by manually. For example, the csv part."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable CSV Parsing with Standard Library (Priority: P1)

As a user labeling CSV files, I want the application to correctly parse all valid CSV files (including edge cases like multiline quoted fields, various encodings, and different delimiters) so that I can trust the data displayed and saved is accurate.

**Why this priority**: Correct CSV parsing is the foundation of the entire application. Replacing the manual parser with a battle-tested library eliminates an entire category of potential data corruption bugs and reduces maintenance burden.

**Independent Test**: Can be fully tested by opening a variety of CSV files (with different delimiters, quoting styles, encodings, and edge cases) and verifying that all data is displayed and saved correctly.

**Acceptance Scenarios**:

1. **Given** a CSV file with standard comma delimiters, **When** the user opens the file, **Then** all rows and columns are parsed correctly, identical to current behavior.
2. **Given** a CSV file with quoted fields containing delimiters, **When** the user opens the file, **Then** fields are parsed correctly without data corruption.
3. **Given** a CSV file with a UTF-8 BOM, **When** the user opens the file, **Then** the BOM is handled transparently and headers are clean.
4. **Given** a CSV file with semicolon or tab delimiters, **When** the user opens the file, **Then** the delimiter is auto-detected and the file is parsed correctly.

---

### User Story 2 - Correct CSV Writing with Standard Library (Priority: P1)

As a user editing labels, I want my changes to be saved in properly formatted CSV so that the output file is valid and compatible with other tools.

**Why this priority**: Data integrity on write is equally critical. A library-backed writer ensures proper quoting, escaping, and formatting without manual implementation risks.

**Independent Test**: Can be tested by editing fields containing special characters (quotes, delimiters, newlines), saving, and reopening the file to verify correctness.

**Acceptance Scenarios**:

1. **Given** the user edits a field value, **When** they save, **Then** the row is written with correct CSV formatting (proper quoting and escaping).
2. **Given** the user edits a field to contain the delimiter character, **When** they save, **Then** the field is properly quoted in the output.
3. **Given** a large CSV file (100,000+ rows), **When** the user saves a single row edit, **Then** only the modified row is rewritten without corrupting the rest of the file.

---

### User Story 3 - Maintained Performance for Large Files (Priority: P2)

As a user working with large CSV files, I want the application to remain fast and memory-efficient after switching to library-based CSV handling, so that my workflow is not disrupted.

**Why this priority**: The current manual implementation has specific performance optimizations (offset indexing, streaming writes). These must be preserved or replicated when adopting a library.

**Independent Test**: Can be tested by opening a 100,000+ row CSV file and verifying that load time, navigation speed, and memory usage remain comparable to the current implementation.

**Acceptance Scenarios**:

1. **Given** a CSV file with 100,000 rows, **When** the user opens it, **Then** the file loads within a comparable time to the current implementation.
2. **Given** a CSV file with 100,000 rows, **When** the application is running, **Then** memory usage for the index remains under 2 MB.

---

### Edge Cases

- What happens when the CSV file has inconsistent column counts across rows?
- How does the system handle a file with only headers and no data rows?
- What happens when the file contains mixed line endings (CRLF and LF)?
- How does the system handle extremely long fields (multi-KB single cell)?
- What happens when a quoted field contains escaped quotes (doubled `""`)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use a verified, widely-adopted CSV library for all CSV reading and parsing operations, replacing the manual `parse_csv_line` implementation.
- **FR-002**: The system MUST use a verified CSV library for all CSV writing and formatting operations, replacing the manual `format_csv_row` implementation.
- **FR-003**: The system MUST preserve the offset-based indexing approach for O(1) random row access, integrating it with the library's reader. The one-line-per-row assumption is maintained; multiline quoted fields are not supported.
- **FR-004**: The system MUST preserve automatic delimiter detection for CSV files with non-comma delimiters.
- **FR-005**: The system MUST preserve UTF-8 BOM detection and transparent handling.
- **FR-006**: The system MUST preserve the streaming write strategy for very large files.
- **FR-007**: The system MUST preserve all existing application behavior and interfaces to avoid cascading changes to other modules.
- **FR-008**: All existing tests MUST continue to pass after the migration with no behavioral regressions. For edge cases not covered by existing tests, the library's behavior becomes the new standard.
- **FR-009**: This feature is scoped exclusively to the CSV engine; no changes to frontend editor, search, navigation, or other manual implementations.

### Key Entities

- **CSV File**: A delimited text file on the local filesystem, the primary data source for the application. Key attributes: file path, delimiter, headers, row offsets.
- **Row**: A single record in the CSV file, accessed by its byte offset. Key attributes: field values, byte offset, byte length.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing integration and unit tests pass without modification (zero regressions).
- **SC-002**: Manual CSV parsing and formatting functions (`parse_csv_line`, `format_csv_row`, `count_delimiter_occurrences`) are reduced by at least 50% in combined line count through library adoption.
- **SC-003**: Files with 100,000+ rows load and navigate with performance comparable to the current implementation (within 10% variance).
- **SC-004**: Memory usage for the row offset index remains under 2 MB for 100,000 rows.
- **SC-005**: CSV files produced by other tools (Excel, LibreOffice, Python pandas) are correctly parsed without data loss.

## Clarifications

### Session 2026-03-28

- Q: Should this feature cover only CSV handling or also other manual implementations (frontend editor, search, navigation)? → A: CSV engine only; other areas become separate future features.
- Q: Should adopting the CSV library add multiline quoted field support (changing offset indexing) or keep the current one-line-per-row assumption? → A: Keep one-line-per-row assumption; no multiline field support.
- Q: When library handles edge cases differently from current manual code, which behavior takes precedence? → A: Adopt library's behavior as the new standard, except where existing tests assert specific output.
- Q: How should SC-002 (50% line reduction) be measured? → A: Against parsing/formatting functions only (parse_csv_line, format_csv_row, count_delimiter_occurrences), not the entire csv_engine.rs file.

## Assumptions

- The `csv` crate (already listed as a dependency in Cargo.toml but currently unused) is the intended library to adopt, given it is the de facto standard for CSV handling in Rust.
- The offset-based indexing pattern (for O(1) random access) is a custom optimization that standard CSV libraries do not provide out-of-the-box; the implementation will integrate library parsing with custom offset tracking.
- The existing delimiter auto-detection logic may need to remain custom, as the standard library does not natively support multi-delimiter detection. However, once detected, the delimiter can be passed to the library's reader configuration.
- No changes to the frontend (TypeScript) are required; this is a backend-only refactor.
