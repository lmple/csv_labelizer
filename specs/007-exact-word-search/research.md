# Research: Exact Match in Advanced Search

**Feature**: 007-exact-word-search
**Date**: 2026-04-02

## Decision 1: Match Mode Representation

**Decision**: Add an `exact` boolean field to `SearchFilter` (both Rust struct and TypeScript interface) rather than introducing a new enum type.

**Rationale**: A boolean is the simplest representation for a two-state toggle (substring vs exact). It keeps the existing struct shape minimal, serializes cleanly over the Tauri IPC boundary, and defaults to `false` (substring) for backward compatibility. An enum (`MatchType::Contains | MatchType::Exact`) would be more extensible but adds unnecessary complexity for a binary choice.

**Alternatives considered**:
- `MatchType` enum: More extensible but over-engineered for two states. Can be refactored later if regex or other modes are needed.
- Separate command: A new `exact_search_rows` command would duplicate logic. Rejected in favor of extending the existing command.

## Decision 2: Matching Logic Change

**Decision**: In `execute_advanced_search`, check the `exact` flag per filter. When true, compare with trimmed equality (`field.trim() == query.trim()`); when false, use existing `.contains()` logic.

**Rationale**: The change is localized to one branch in the matching closure. Trimming both sides handles whitespace inconsistencies in CSV data. Case-insensitive comparison is already applied (both sides lowercased).

**Alternatives considered**:
- Trim only field, not query: Rejected because user input may also have accidental whitespace.
- No trimming at all: Rejected per spec requirement (whitespace-trimmed matching).

## Decision 3: UI Control for Exact Match Toggle

**Decision**: Add a small toggle button (with a lock/unlock icon or "=" symbol) in each filter row, between the text input and the remove button.

**Rationale**: A toggle button is compact, doesn't take significant horizontal space, and provides clear visual feedback (active/inactive state via CSS class). A checkbox with label would be wider and break the filter row's visual rhythm.

**Alternatives considered**:
- Checkbox with "Exact" label: Takes more horizontal space, breaks visual consistency with the compact filter row design.
- Dropdown (Contains/Exact): Overkill for a binary option, adds a click to toggle.

## Decision 4: Backward Compatibility

**Decision**: The `exact` field defaults to `false` in both frontend state and Rust deserialization (`#[serde(default)]`). Existing behavior is completely preserved.

**Rationale**: Using `serde(default)` means old frontend code (if any) that doesn't send the `exact` field will still work. New filter rows initialize with `exact: false`.

**Alternatives considered**: None needed -- `serde(default)` is the standard Rust pattern for backward-compatible struct evolution.
