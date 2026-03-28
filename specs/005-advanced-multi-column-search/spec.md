# Feature Specification: Advanced Multi-Column Search

**Feature Branch**: `005-advanced-multi-column-search`
**Created**: 2026-03-28
**Status**: Draft
**Input**: User description: "The application should allow Advanced search to target multiples columns filter. Possibility to have 'Column A = XXX AND Column B = YYY' or 'Column A = AAA or Column B = BBB or Column C = CCC'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AND Search Across Multiple Columns (Priority: P1)

As a user labeling images, I want to search for rows where multiple column conditions are met simultaneously (AND logic) so that I can find specific rows matching a precise combination of criteria — for example, all rows where the animal is "Cat" AND the scene is "Indoor".

**Why this priority**: AND filtering is the most common multi-column search pattern. Users need to narrow down large datasets by combining criteria to find exactly the rows they want to review or edit.

**Independent Test**: Can be fully tested by opening a CSV file, entering two or more column filters with AND logic, executing the search, and verifying only rows matching ALL conditions are returned.

**Acceptance Scenarios**:

1. **Given** a CSV file is open, **When** the user adds two column filters (Column A = "Cat" AND Column B = "Indoor") and searches, **Then** only rows where Column A contains "Cat" AND Column B contains "Indoor" are returned.
2. **Given** a CSV file is open, **When** the user adds three column filters with AND logic, **Then** only rows matching all three conditions are returned.
3. **Given** a CSV file is open and AND filters are set, **When** no rows match all conditions simultaneously, **Then** the system displays "No results" and the result count shows 0.
4. **Given** search results are displayed, **When** the user navigates through results with previous/next, **Then** navigation works the same as the existing single-column search.

---

### User Story 2 - OR Search Across Multiple Columns (Priority: P1)

As a user labeling images, I want to search for rows where any one of multiple column conditions is met (OR logic) so that I can find all rows matching any of several criteria — for example, all rows where the animal is "Cat" OR the scene is "Outdoor".

**Why this priority**: OR filtering is equally important for broad searches. Users often need to find rows matching any of several possible values across different columns to batch-review or batch-edit them.

**Independent Test**: Can be fully tested by opening a CSV file, entering two or more column filters with OR logic, executing the search, and verifying rows matching ANY condition are returned.

**Acceptance Scenarios**:

1. **Given** a CSV file is open, **When** the user adds two column filters (Column A = "Cat" OR Column B = "Outdoor") and searches, **Then** rows where Column A contains "Cat" OR Column B contains "Outdoor" (or both) are returned.
2. **Given** a CSV file is open, **When** the user adds three column filters with OR logic, **Then** rows matching any one of the three conditions are returned.
3. **Given** a CSV file is open with OR filters, **When** some rows match multiple conditions, **Then** those rows appear only once in the results (no duplicates).

---

### User Story 3 - Switching Between Simple and Advanced Search (Priority: P2)

As a user, I want to easily switch between the existing simple search (single query, optional single column) and the new advanced multi-column search so that I can use whichever mode fits my current need without losing my workflow.

**Why this priority**: The existing simple search is still valuable for quick lookups. Users should not be forced to use the advanced mode for simple queries.

**Independent Test**: Can be tested by toggling between simple and advanced search modes, performing searches in each mode, and verifying both work correctly and independently.

**Acceptance Scenarios**:

1. **Given** the search area is visible, **When** the user activates advanced search mode, **Then** the interface shows multi-column filter controls with an AND/OR toggle.
2. **Given** the user is in advanced search mode, **When** they switch back to simple search mode, **Then** the original single-query search is restored and functional.
3. **Given** the user has active search results in one mode, **When** they switch to the other mode, **Then** the previous results are cleared.

---

### Edge Cases

- What happens when the user selects the same column in multiple filters?
- How does the system handle a filter where the column is selected but the search value is empty?
- What happens when the user removes all advanced filters and clicks search?
- How does advanced search interact with a CSV file that has only one column?
- What happens when the user adds more filters than there are columns in the file?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to define multiple column-specific search filters, each consisting of a column selection and a search value.
- **FR-002**: The system MUST support AND logic, where all filters must match for a row to appear in results.
- **FR-003**: The system MUST support OR logic, where any filter matching is sufficient for a row to appear in results.
- **FR-004**: The system MUST provide a visible toggle or selector for the user to choose between AND and OR logic for their filters.
- **FR-005**: The system MUST allow the user to add and remove individual filters dynamically.
- **FR-006**: The system MUST preserve the existing simple search (single text query, optional single column filter) as the default search mode.
- **FR-007**: The system MUST provide a clear way to switch between simple search and advanced search modes.
- **FR-008**: Search matching MUST be case-insensitive, consistent with the existing search behavior.
- **FR-009**: Search matching MUST use substring matching (partial match), consistent with the existing search behavior.
- **FR-010**: The system MUST display the number of matching rows and support navigating through results (previous/next), reusing the existing result navigation pattern.
- **FR-011**: The system MUST not return duplicate rows in OR mode when a row matches multiple filters.

### Key Entities

- **Search Filter**: A single condition in an advanced search. Key attributes: target column (by index), search value (text), match type (substring, case-insensitive).
- **Filter Group**: A collection of search filters combined with a logic operator. Key attributes: list of filters, logic operator (AND or OR).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can define and execute a multi-column AND search in under 30 seconds.
- **SC-002**: Users can define and execute a multi-column OR search in under 30 seconds.
- **SC-003**: Advanced search returns correct results for datasets with 100,000+ rows within 5 seconds.
- **SC-004**: Switching between simple and advanced search modes takes less than 1 second with no data loss.
- **SC-005**: 100% of existing simple search functionality remains unchanged and accessible.

## Assumptions

- The existing search backend (`search_rows` command) performs a full scan across all rows. The advanced search will extend this pattern rather than introducing a new search architecture.
- Users will combine at most a handful of filters (2-5 typically). The UI should support an arbitrary number but does not need to optimize for dozens of filters.
- Mixed AND/OR logic (e.g., "A AND B OR C") is out of scope. Users select either AND or OR for all filters in a single search. This avoids the complexity of expression builders.
- The search value input is free-text (not restricted to known values from the column), matching existing behavior.
