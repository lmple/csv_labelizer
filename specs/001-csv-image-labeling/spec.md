# Feature Specification: CSV Image Labeling Application

**Feature Branch**: `001-csv-image-labeling`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Build an application that can help me update CSV files with different separator and a header. The files can be huge and the application should show the associated image and the possibility to toggle some classes and let the user change other text. All columns containing "CLASS" should be treated as a class column and data could be toggle from a set of possible values from the file. Also, a new class can be added too. The column named "IMG_PATH" contains the image associated and the application needs to showthe image, using the relative path from the CSV file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load CSV and View Image Labels (Priority: P1)

A data annotator needs to open a CSV file containing image paths and labels, view the first image, and understand the current label values to begin their annotation work.

**Why this priority**: This is the absolute minimum viable functionality - without the ability to load CSV files and view images with their labels, no annotation work can be done. This forms the foundation for all other features.

**Independent Test**: Can be fully tested by opening a CSV file, verifying the image displays correctly, and confirming all column data is visible. Delivers immediate value by allowing users to review existing annotations.

**Acceptance Scenarios**:

1. **Given** a CSV file with semicolon separator and headers, **When** user opens the file and specifies semicolon as separator, **Then** the file loads successfully and displays the first row's data with the associated image
2. **Given** a CSV file is loaded, **When** the IMG_PATH column contains a relative path to an image, **Then** the image displays in the viewer using the path relative to the CSV file location
3. **Given** a CSV file with columns named "OBJECT_CLASS" and "SCENE_CLASS", **When** the file loads, **Then** both columns are identified as class columns and displayed with appropriate UI controls
4. **Given** a CSV file is opened, **When** the file contains a header row, **Then** column names are extracted from the header and displayed to the user

---

### User Story 2 - Toggle Class Values (Priority: P2)

A data annotator needs to quickly change class labels by toggling between existing values that appear in the dataset, without typing, to maintain consistency and speed up annotation.

**Why this priority**: This is the core labeling workflow - toggling between predefined class values is faster and less error-prone than manual text entry. This is what makes the tool productive for annotation tasks.

**Independent Test**: Can be tested by loading a CSV, identifying all unique values in a class column, and verifying the user can click/toggle between these values for the current row.

**Acceptance Scenarios**:

1. **Given** a CSV with a CLASS column containing values ["cat", "dog", "bird"], **When** user views a row, **Then** the class field displays the current value and allows toggling through all three options
2. **Given** a class column with current value "cat", **When** user clicks the toggle control, **Then** the value cycles to the next available class value in the list
3. **Given** multiple class columns in a single row, **When** user toggles one class column, **Then** only that column's value changes and other columns remain unchanged
4. **Given** a class column value is toggled, **When** user navigates to a different row without saving, **Then** the system prompts to save or discard changes

---

### User Story 3 - Add New Class Values (Priority: P3)

A data annotator discovers a new category that doesn't exist in the predefined class list and needs to add it to the available options to properly label edge cases.

**Why this priority**: While toggling existing values handles 80% of cases, the ability to add new classes is essential for handling novel categories and evolving annotation schemas.

**Independent Test**: Can be tested by adding a new class value to a class column and verifying it becomes available for toggling in future rows.

**Acceptance Scenarios**:

1. **Given** a class column with existing values ["cat", "dog"], **When** user selects "Add New Class" and enters "bird", **Then** "bird" is added to the available class values for that column
2. **Given** a new class value is added, **When** user navigates to other rows, **Then** the new class value appears in the toggle options
3. **Given** user adds a new class value, **When** the value contains special characters or spaces, **Then** the system validates and sanitizes the input before adding

---

### User Story 4 - Edit Non-Class Text Fields (Priority: P4)

A data annotator needs to edit text in non-class columns (notes, descriptions, metadata) to add context or correct errors in the dataset.

**Why this priority**: While class columns are the primary focus, other text fields often need corrections or additions. This is lower priority because class labeling is the main use case.

**Independent Test**: Can be tested by editing a non-class column's text value and verifying the change persists when saved.

**Acceptance Scenarios**:

1. **Given** a CSV with a column named "NOTES" (not containing "CLASS"), **When** user clicks the field, **Then** a text input appears allowing free-form text entry
2. **Given** user edits a non-class text field, **When** user saves changes, **Then** the CSV file is updated with the new text value
3. **Given** a non-class field is empty, **When** user clicks to edit, **Then** user can enter new text from scratch

---

### User Story 5 - Navigate Large Datasets Efficiently (Priority: P5)

A data annotator working with a dataset of 10,000+ rows needs to navigate through the dataset without the application freezing or consuming excessive memory.

**Why this priority**: Essential for real-world use cases where datasets are "huge" (as specified), but can be implemented after core labeling functionality is working.

**Independent Test**: Can be tested by loading a CSV with 50,000+ rows and verifying the user can navigate to any row within 2 seconds without memory issues.

**Acceptance Scenarios**:

1. **Given** a CSV file with 50,000 rows, **When** user opens the file, **Then** the application loads and displays the first row within 5 seconds
2. **Given** a large dataset is loaded, **When** user navigates to row 25,000, **Then** the row and its associated image display within 2 seconds
3. **Given** user is viewing any row, **When** user presses "Next" or "Previous" controls, **Then** navigation happens instantly (<100ms) with smooth image loading
4. **Given** a large CSV file, **When** the application loads the file, **Then** memory usage stays below 500MB regardless of dataset size

---

### Edge Cases

- What happens when IMG_PATH points to a non-existent image file?
  - System displays a "missing image" placeholder and allows user to continue editing other fields
- What happens when IMG_PATH is an absolute path instead of relative?
  - System attempts to load using the absolute path as a fallback, warns user about portability issues
- What happens when a CSV has no columns containing "CLASS"?
  - System loads the file successfully and treats all columns as regular text fields
- What happens when the user specifies the wrong separator?
  - System displays malformed data, user can re-open the file with a different separator without losing work
- What happens when two users edit the same CSV file simultaneously?
  - System detects file modification on save and prompts user to reload or force-save (overwrite)
- What happens when a class column has 100+ unique values?
  - System provides a searchable dropdown or autocomplete interface instead of simple toggle
- What happens when an image file is very large (>50MB)?
  - System displays a loading indicator and loads the image asynchronously, with option to skip image loading
- What happens when saving fails due to permissions or disk space?
  - System displays error message, preserves in-memory changes, and offers retry or save-as options

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support loading CSV files with user-specified separators (comma, semicolon, tab, pipe, space)
- **FR-002**: System MUST detect and parse header row to extract column names
- **FR-003**: System MUST identify all columns containing the text "CLASS" (case-insensitive) as class columns
- **FR-004**: System MUST identify the column named "IMG_PATH" (case-insensitive) as the image path column
- **FR-005**: System MUST display images using relative paths resolved from the CSV file's directory location
- **FR-006**: System MUST extract all unique values from each class column to create a list of toggleable options
- **FR-007**: Users MUST be able to toggle class column values through all available options for that column
- **FR-008**: Users MUST be able to add new values to a class column's list of options
- **FR-009**: Users MUST be able to edit text in non-class columns using free-form text input
- **FR-010**: System MUST display one row at a time with its associated image
- **FR-011**: Users MUST be able to navigate to the next row, previous row, or jump to a specific row number
- **FR-012**: System MUST save changes back to the original CSV file preserving the original separator and format
- **FR-013**: System MUST handle large CSV files (100,000+ rows) without loading all data into memory simultaneously
- **FR-014**: System MUST preserve data types and formatting when saving (no unintended conversions)
- **FR-015**: System MUST support undo/redo for changes made to the current row before saving
- **FR-016**: System MUST prompt user to save or discard changes when navigating away from a modified row
- **FR-017**: System MUST display clear error messages when images cannot be loaded, files cannot be saved, or CSV parsing fails

### Key Entities

- **CSV Dataset**: The file being edited, containing headers, multiple rows of data, and columns of different types (class columns vs. text columns)
- **Row**: A single record in the CSV dataset, containing values for each column and associated with one image
- **Class Column**: A column whose name contains "CLASS", with a finite set of allowed values that can be toggled
- **Image Reference**: The IMG_PATH column value, stored as a relative path to an image file
- **Class Value Set**: The collection of unique values found in a specific class column, which can be extended by the user

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load a CSV file and view the first image with labels within 10 seconds
- **SC-002**: Users can toggle between class values and see the change reflected in under 200 milliseconds
- **SC-003**: Users can annotate at least 100 images per hour using the toggle interface (compared to ~30/hour with manual text entry)
- **SC-004**: System handles CSV files with 100,000 rows without crashing or exceeding 500MB memory usage
- **SC-005**: 95% of navigation actions (next/previous row) complete within 1 second including image loading
- **SC-006**: Zero data loss when saving - all original CSV data is preserved exactly, with only edited fields modified
- **SC-007**: Users can successfully open CSV files with any common separator (comma, semicolon, tab) on first attempt 90% of the time
- **SC-008**: Image loading success rate is above 95% for valid relative paths

## Assumptions

- Users have read access to the CSV file and write access to save changes
- Image files are stored in the same directory or subdirectories relative to the CSV file location
- CSV files follow standard formatting (quoted fields, escaped quotes, consistent separators)
- Users are familiar with basic file operations (open, save) and understand CSV file structure
- The application will be used on desktop/laptop computers with sufficient disk space for image files
- Internet connection is not required - all files are local

## Out of Scope

- Cloud storage integration or remote file access
- Collaborative editing with real-time synchronization
- Image manipulation or annotation beyond labeling (drawing boxes, polygons, etc.)
- Export to formats other than CSV (JSON, XML, database export)
- Batch operations or automated labeling suggestions
- Version history or change tracking beyond basic undo/redo
- Multi-file project management or dataset merging
