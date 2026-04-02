# Feature Specification: Exact Match in Advanced Search

**Feature Branch**: `007-exact-word-search`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "The advanced search should allow to lock to search the exact word put in fields not only search in it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle Exact Match on a Filter (Priority: P1)

A user working with a CSV file needs to find rows where a specific column contains exactly a given value, not just rows where the column contains it as a substring. For example, when searching for "cat" in an animal column, the user wants to find only rows with "cat" and not "catfish" or "concatenate". The user opens the advanced search panel, types their search term, and toggles on an "exact match" option for that filter. The search results now only include rows where the field value matches the search term exactly (case-insensitive).

**Why this priority**: This is the core feature request. Without the ability to toggle exact matching, users cannot distinguish between substring and whole-value matches, leading to noisy search results when working with data that has similar-looking values.

**Independent Test**: Can be fully tested by opening any CSV, activating advanced search, entering a term, enabling exact match, and verifying only exact matches appear in results.

**Acceptance Scenarios**:

1. **Given** a CSV is loaded and the advanced search panel is open, **When** the user enters "cat" in a filter field and enables exact match for that filter, **Then** only rows where the selected column's value is exactly "cat" (case-insensitive) are returned -- rows containing "catfish" or "my cat" are excluded.
2. **Given** the advanced search panel is open with exact match disabled (default), **When** the user enters "cat" in a filter field, **Then** the search behaves as it does today, returning all rows where the column contains "cat" as a substring.
3. **Given** exact match is enabled for a filter, **When** the field value has leading or trailing whitespace (e.g., " cat "), **Then** the match still succeeds because whitespace is trimmed before comparison.

---

### User Story 2 - Mix Exact and Substring Filters (Priority: P2)

A user needs to combine multiple filters where some require exact matching and others use substring matching. For example, the user wants rows where the "Status" column is exactly "Active" AND the "Notes" column contains the word "review". Each filter row independently controls whether it uses exact or substring matching.

**Why this priority**: Real-world usage often requires mixing match types across different columns. This builds on P1 by enabling flexible multi-filter searches.

**Independent Test**: Can be tested by creating two filters -- one with exact match on, one with exact match off -- and verifying each filter applies its own match mode independently.

**Acceptance Scenarios**:

1. **Given** two filters are configured -- filter A with exact match enabled on column "Status" for value "Active", and filter B with substring match on column "Notes" for value "review", with AND logic, **When** the user searches, **Then** only rows where Status is exactly "Active" AND Notes contains "review" are returned.
2. **Given** two filters with OR logic -- filter A exact match on "Status" = "Done", filter B substring match on "Status" containing "Pend", **When** the user searches, **Then** rows where Status is exactly "Done" OR Status contains "Pend" (e.g., "Pending", "Pending review") are returned.

---

### User Story 3 - Exact Match Persists Across Search Sessions (Priority: P3)

When a user toggles exact match on a filter row, that setting is preserved as long as the filter row exists. If the user adds a new filter row, it defaults to substring matching (the current behavior). This ensures users don't lose their filter configuration while navigating results.

**Why this priority**: Quality-of-life improvement that ensures the feature feels polished and predictable.

**Independent Test**: Can be tested by enabling exact match on a filter, navigating through results, then verifying the toggle is still enabled when returning to the search panel.

**Acceptance Scenarios**:

1. **Given** a filter with exact match enabled, **When** the user navigates through search results using Previous/Next, **Then** the exact match toggle remains enabled on that filter.
2. **Given** the user adds a new filter row, **When** the filter row appears, **Then** exact match is disabled by default (substring matching).

---

### Edge Cases

- What happens when exact match is enabled but the search term is empty? The filter should be ignored (same as current behavior for empty filters).
- What happens when exact match is enabled and the field value is empty in the CSV? An empty search term with exact match should match empty fields.
- What happens when exact match is used with the simple search mode (not advanced)? Exact match is only available in advanced search mode; simple search continues to use substring matching.
- How does exact match interact with fields containing special characters (commas, quotes)? The comparison is a straightforward string equality check on the parsed field value, so special characters are handled naturally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each advanced search filter row MUST have an independently toggleable "exact match" option.
- **FR-002**: When exact match is enabled, the system MUST only return rows where the selected column's entire cell value equals the search term (full field equality, case-insensitive, whitespace-trimmed). Partial or word-boundary matches are excluded.
- **FR-003**: When exact match is disabled (default), the system MUST continue to use substring matching as it does today.
- **FR-004**: The exact match toggle MUST default to off (disabled) for all new filter rows, preserving backward compatibility.
- **FR-005**: The exact match option MUST work correctly with both AND and OR filter logic.
- **FR-006**: The exact match toggle state MUST be visually distinct so the user can easily see which filters use exact matching and which use substring matching.
- **FR-007**: The exact match option MUST be communicated from the frontend to the backend as part of each individual filter's configuration.

### Key Entities

- **Search Filter**: A single search criterion consisting of a column selection, a search term, and now a match mode (exact or substring). Multiple filters combine using AND/OR logic.
- **Match Mode**: A per-filter setting that determines whether the search term must match the field value exactly (after trimming and case normalization) or can appear as a substring.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can toggle exact match on any advanced search filter and receive only rows with exact value matches, with zero false positives from substring matches.
- **SC-002**: Existing substring search behavior is fully preserved when exact match is not enabled -- no regressions in current search functionality.
- **SC-003**: Users can distinguish at a glance which filters are set to exact match versus substring match through clear visual indicators.
- **SC-004**: Search with exact match enabled returns results with the same responsiveness as the current substring search (no perceptible delay increase).

## Clarifications

### Session 2026-04-02

- Q: Does "exact match" mean full field equality (entire cell value must equal search term) or whole-word boundary matching (search term appears as a standalone word within the field)? → A: Full field equality -- the entire cell value must equal the search term (after trim and case normalization).

## Assumptions

- The exact match comparison is case-insensitive, consistent with the existing substring search behavior.
- Leading and trailing whitespace in field values is trimmed before exact comparison, as CSV data often contains incidental whitespace.
- This feature applies only to the advanced search panel. The simple search bar retains its current substring-only behavior.
- The exact match toggle is a simple on/off control (e.g., a checkbox or lock icon button) placed within each filter row, requiring no additional screen space beyond the filter row itself.
