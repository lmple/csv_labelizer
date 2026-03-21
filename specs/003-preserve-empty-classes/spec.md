# Feature Specification: Preserve Empty Class Values

**Feature Branch**: `003-preserve-empty-classes`
**Created**: 2026-03-16
**Status**: Draft
**Input**: User description: "If a class is empty, it needs to remain empty it the list. There is no need to the first choice of the list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Rows with Empty Class Fields (Priority: P1)

Users need to view CSV rows that have empty classification fields without those fields being auto-populated with default values from the dropdown list.

**Why this priority**: Core data integrity issue. If empty class fields are automatically filled with the first dropdown choice, users lose the original data state and cannot distinguish between intentionally classified items and unclassified items. This corrupts the dataset.

**Independent Test**: Can be fully tested by loading a CSV file with some rows having empty class fields, navigating to those rows, and verifying the class dropdown shows blank/empty instead of auto-selecting the first option.

**Acceptance Scenarios**:

1. **Given** CSV file has a row with an empty ANIMAL_CLASS field, **When** user navigates to that row, **Then** the ANIMAL_CLASS dropdown displays empty/blank (no value selected)
2. **Given** CSV file has a row with populated ANIMAL_CLASS="Cat" and empty SCENE_CLASS, **When** user views that row, **Then** ANIMAL_CLASS shows "Cat" and SCENE_CLASS shows empty/blank
3. **Given** user is viewing a row with empty class field, **When** user does not interact with the dropdown, **Then** the field remains empty when navigating away

---

### User Story 2 - Edit Other Fields While Preserving Empty Classes (Priority: P1)

Users need to edit non-class fields (like notes, confidence scores) on rows that have empty class fields without accidentally populating those empty class fields.

**Why this priority**: Data integrity during editing. Users should be able to make corrections to other fields without being forced to classify unclassified items or losing the empty state of class fields.

**Independent Test**: Can be fully tested by loading a row with empty class field, editing a text field (like "Notes"), saving, and verifying the class field remained empty.

**Acceptance Scenarios**:

1. **Given** row has empty ANIMAL_CLASS and user edits the Notes field, **When** user saves the row, **Then** ANIMAL_CLASS remains empty in the saved CSV
2. **Given** row has empty class field, **When** user navigates to next row without touching the dropdown, **Then** the empty class value is preserved
3. **Given** multiple rows with mix of empty and populated classes, **When** user edits various rows, **Then** only the classes user explicitly changes are modified

---

### User Story 3 - Explicitly Clear Class Values (Priority: P2)

Users need the ability to explicitly set a class field to empty/blank if they want to remove a classification.

**Why this priority**: Enables users to declassify items that were incorrectly classified (either manually or by LLM). This is important for data cleanup workflows but less critical than preserving existing empty values.

**Independent Test**: Can be fully tested by loading a row with populated class field, selecting an "empty" or "none" option from the dropdown, saving, and verifying the class field is empty in the CSV.

**Acceptance Scenarios**:

1. **Given** row has ANIMAL_CLASS="Dog", **When** user selects empty/blank option from dropdown, **Then** ANIMAL_CLASS becomes empty
2. **Given** user has cleared a class field to empty, **When** user saves and reloads the CSV, **Then** the class field remains empty
3. **Given** row has multiple populated class fields, **When** user clears one class field but leaves others, **Then** only the cleared field becomes empty

---

### Edge Cases

- What happens when all class fields in a row are empty (completely unclassified row)? → All dropdowns show blank/empty, user can navigate and edit normally
- Users can save rows where all class fields are empty (completely unclassified rows are valid)

## Clarifications

### Session 2026-03-16

- Q: How should the system handle CSV cells that contain only whitespace (spaces, tabs) in class columns? → A: Preserve whitespace-only as distinct values (maintain data fidelity, allows users to see/fix whitespace issues)
- Q: How should the empty/unclassified option be displayed in the dropdown menu? → A: Blank/empty first option in dropdown (clean UI, matches standard select behavior)
- Q: How should the system behave when a class column has no unique values to populate the dropdown? → A: Show only the empty option (consistent UX, dropdown still works)
- Q: How should the system normalize different types of empty representations when loading a CSV? → A: Treat empty string, null, missing field as same (all = empty)
- Q: When a user adds a new class value to the dropdown while viewing a row with an empty class field, should the new value be automatically applied to the current row? → A: Add to dropdown list only, keep field empty (preserves empty state, user maintains control)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display empty class fields as blank/unselected in dropdown menus (no auto-selection of first value), using a blank/empty first option in the dropdown
- **FR-002**: System MUST preserve empty class field values when user edits other fields in the same row
- **FR-003**: System MUST save empty class fields as empty strings in the CSV file
- **FR-004**: System MUST distinguish between truly empty values and values containing whitespace (whitespace-only values like "  " are preserved as distinct from empty values)
- **FR-005**: System MUST provide a way for users to explicitly set a class field to empty (clear an existing classification) by selecting the blank/empty option
- **FR-006**: System MUST maintain empty class state across navigation (viewing different rows and returning should not populate the field)
- **FR-007**: Dropdown menus for class columns MUST include a blank/empty first option representing "no classification"
- **FR-008**: System MUST normalize CSV loading by treating empty strings, null values, and missing fields as the same empty value (whitespace-only values remain distinct)
- **FR-009**: When class column has no unique values, dropdown MUST show only the empty option (remain functional)
- **FR-010**: Adding new class values to dropdown MUST NOT auto-apply them to the current row if the field is empty

### Key Entities

- **Class Field Value**: Represents the current value of a classification column
  - Can be populated (string value like "Cat", "Dog", "Indoor")
  - Can be empty (no classification assigned, represented as empty string in CSV)
  - Can be whitespace-only (distinct from empty, preserved as-is)
  - Must preserve original state from CSV file (empty/whitespace distinction maintained)

- **Dropdown Option**: Represents a selectable choice in the class dropdown
  - First option is always blank/empty (for no classification)
  - Unique values extracted from the class column (including whitespace-only values)
  - If no unique values exist, dropdown shows only the blank option
  - Selected state (reflects current field value)
  - Adding new values to dropdown does not auto-apply them to empty fields

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load and view CSV files with empty class fields without any auto-population occurring (100% of empty fields remain empty)
- **SC-002**: Users can edit non-class fields on rows with empty class fields without accidentally populating the class field (0% accidental classification rate)
- **SC-003**: Saved CSV files accurately reflect empty class fields (100% fidelity between loaded and saved empty values)
- **SC-004**: Users can explicitly clear/remove classifications from populated class fields (feature works in 100% of attempts)

## Assumptions

- The system currently auto-selects the first dropdown value when a class field is empty (this is the bug being fixed)
- Empty class fields are a valid and intentional state in the CSV files (not all rows need to be classified)
- Users are using CSV Labelizer to correct LLM-generated classifications, which may include rows the LLM did not classify
- Empty class fields are represented as empty strings in the CSV file (standard CSV convention)
- CSV parsers may represent emptiness as empty string, null, or missing field - all are normalized to empty on load
- Whitespace-only values (spaces, tabs) are preserved as distinct from truly empty values to maintain data fidelity
- The dropdown UI uses a blank/empty first option to make it obvious when a field is empty versus when a value is selected
- Dropdowns remain functional even when no unique values exist in the column (showing only the empty option)

## Dependencies

- None - this is a bug fix/enhancement to existing class dropdown functionality

## Out of Scope

- Automatically detecting which rows should be classified vs unclassified
- Bulk operations to clear all class values in a column
- Validation rules that require certain rows to have classifications
- Different empty representations for different class columns (all use same empty logic)
- Undo/redo for clearing class values (existing undo/redo should handle this if present)
