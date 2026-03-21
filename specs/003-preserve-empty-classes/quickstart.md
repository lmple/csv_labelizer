# Quickstart: Implementing Empty Class Value Preservation

**Feature**: Preserve Empty Class Values (003-preserve-empty-classes)
**Date**: 2026-03-16
**Time to Implement**: 45-60 minutes

## Overview

This guide walks you through implementing the dropdown empty option fix that prevents auto-selection of the first value when a class field is empty. The fix adds a blank first option to all class dropdowns and ensures empty values are preserved during editing and navigation.

## Prerequisites

Before starting, ensure you have:
- ✅ Read [spec.md](spec.md) - Feature specification
- ✅ Read [research.md](research.md) - Problem analysis and solution approach
- ✅ Read [data-model.md](data-model.md) - State management details
- ✅ Read [contracts/dropdown-interface.md](contracts/dropdown-interface.md) - Interface contracts
- ✅ Development environment set up:
  ```bash
  npm install          # Install frontend dependencies
  npm run tauri dev    # Verify app runs
  npm test             # Verify tests pass
  ```

## Implementation Steps

### Step 1: Add Empty Option to Dropdown (10 minutes)

**File**: `src/editor.ts`
**Location**: `renderEditorForm()` function (around line 50)

**Current code** (lines 50-67):
```typescript
if (isClassColumn) {
    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'class-field-wrapper';

    const select = document.createElement('select');
    select.id = `field-${index}`;
    select.className = 'class-field';

    const classValues = classValuesMap[index] || [];
    classValues.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        if (optionValue === value) {
            option.selected = true;
        }
        select.appendChild(option);
    });
```

**Updated code**:
```typescript
if (isClassColumn) {
    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'class-field-wrapper';

    const select = document.createElement('select');
    select.id = `field-${index}`;
    select.className = 'class-field';

    // Add empty option FIRST (always first in dropdown)
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '';
    if (value === '') {
        emptyOption.selected = true;
    }
    select.appendChild(emptyOption);

    // Then add unique values from classValuesMap
    const classValues = classValuesMap[index] || [];
    classValues.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        // Only mark as selected if value matches AND value is not empty
        if (optionValue === value && value !== '') {
            option.selected = true;
        }
        select.appendChild(option);
    });
```

**Key Changes**:
1. Add empty option BEFORE the loop
2. Mark empty option as selected when `value === ''`
3. Ensure non-empty options are only selected when `value !== ''` (prevents double selection)

**Verification**: TypeScript compilation should succeed (`npm run build`)

---

### Step 2: Manual Testing (15 minutes)

**Test the fix manually before writing automated tests**:

1. **Start development server**:
   ```bash
   npm run tauri dev
   ```

2. **Prepare Test CSV**:
   Create `test-empty.csv`:
   ```csv
   IMAGE_PATH,ANIMAL_CLASS,SCENE_CLASS,NOTES
   img1.jpg,Cat,Indoor,Test note
   img2.jpg,,Outdoor,Empty animal
   img3.jpg,Dog,,Empty scene
   img4.jpg,,,All empty
   img5.jpg,  ,  ,Whitespace only
   ```

3. **Test Scenario 1: Load CSV with Empty Fields**
   - Open `test-empty.csv`
   - Navigate to row 2 (img2.jpg)
   - ✅ Expected: ANIMAL_CLASS dropdown shows blank (not "Cat" or first value)
   - ✅ Expected: SCENE_CLASS shows "Outdoor"

4. **Test Scenario 2: Navigate to Completely Empty Row**
   - Navigate to row 4 (img4.jpg)
   - ✅ Expected: Both ANIMAL_CLASS and SCENE_CLASS dropdowns show blank
   - ✅ Expected: Can edit NOTES field without affecting empty dropdowns

5. **Test Scenario 3: Edit and Save Empty Fields**
   - Navigate to row 2 (empty ANIMAL_CLASS)
   - Edit NOTES field
   - Click Save (Ctrl+S)
   - Reload CSV
   - Navigate to row 2 again
   - ✅ Expected: ANIMAL_CLASS still empty (not auto-populated)

6. **Test Scenario 4: Explicitly Select Empty**
   - Navigate to row 1 (ANIMAL_CLASS = "Cat")
   - Click ANIMAL_CLASS dropdown
   - Select the blank option (first option)
   - ✅ Expected: Field becomes empty
   - Save and reload
   - ✅ Expected: Field remains empty

7. **Test Scenario 5: Whitespace Preservation**
   - Navigate to row 5 (whitespace-only values)
   - ✅ Expected: ANIMAL_CLASS dropdown shows selected option (not blank, even though it looks blank)
   - Check field value via browser DevTools: `document.getElementById('field-1').value`
   - ✅ Expected: Value is `"  "` (two spaces), not `""`

8. **Test Scenario 6: Add New Value While Field Empty**
   - Navigate to row 2 (empty ANIMAL_CLASS)
   - Click "+ Add New" button
   - Enter "Zebra"
   - ✅ Expected: Dropdown now contains "Zebra" option
   - ✅ Expected: Field remains blank (empty option still selected)
   - ✅ Expected: "Zebra" is available to select manually

**If any test fails**: Review the code changes and ensure:
- Empty option is added FIRST (before loop)
- Empty option selected when `value === ''`
- Non-empty options only selected when `value !== ''`

---

### Step 3: Add Automated Tests (20-25 minutes)

**File**: Create `tests/frontend/editor.test.ts` (new file)

**Full test suite**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Editor Integration Tests
 * Tests for class dropdown empty value preservation
 */

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><div id="editor-form"></div>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

// Import after DOM setup
import { initializeEditor, renderEditorForm, getFieldValues } from '../../src/editor';
import type { CsvMetadata, ClassValuesMap, RowData } from '../../src/types';

describe('Class Dropdown Empty Value Preservation', () => {
    let mockMetadata: CsvMetadata;
    let mockClassValuesMap: ClassValuesMap;

    beforeEach(() => {
        // Reset DOM
        document.getElementById('editor-form')!.innerHTML = '';

        // Setup metadata
        mockMetadata = {
            headers: ['IMAGE_PATH', 'ANIMAL_CLASS', 'SCENE_CLASS', 'NOTES'],
            total_rows: 5,
            class_columns: {
                1: 'ANIMAL_CLASS',
                2: 'SCENE_CLASS'
            }
        };

        // Setup class values
        mockClassValuesMap = {
            1: ['Cat', 'Dog', 'Bird'],       // ANIMAL_CLASS
            2: ['Indoor', 'Outdoor']         // SCENE_CLASS
        };

        initializeEditor(mockMetadata, mockClassValuesMap);
    });

    it('should add empty option as first option in class dropdown', () => {
        const rowData: RowData = {
            fields: ['img1.jpg', 'Cat', 'Indoor', 'Notes'],
            row_index: 0
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const firstOption = animalSelect.options[0];

        expect(firstOption.value).toBe('');
        expect(firstOption.textContent).toBe('');
    });

    it('should select empty option when field value is empty', () => {
        const rowData: RowData = {
            fields: ['img2.jpg', '', 'Outdoor', 'Notes'],  // Empty ANIMAL_CLASS
            row_index: 1
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.value).toBe('');
        expect(animalSelect.selectedIndex).toBe(0);  // First option (empty)
        expect(animalSelect.options[animalSelect.selectedIndex].textContent).toBe('');
    });

    it('should select correct option when field value is non-empty', () => {
        const rowData: RowData = {
            fields: ['img1.jpg', 'Cat', 'Indoor', 'Notes'],
            row_index: 0
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.value).toBe('Cat');
        expect(animalSelect.options[animalSelect.selectedIndex].textContent).toBe('Cat');
    });

    it('should preserve whitespace-only values as distinct from empty', () => {
        // Add whitespace-only value to classValuesMap
        mockClassValuesMap[1] = ['  ', 'Cat', 'Dog'];  // Two spaces

        const rowData: RowData = {
            fields: ['img5.jpg', '  ', 'Indoor', 'Notes'],  // Two spaces
            row_index: 4
        };

        initializeEditor(mockMetadata, mockClassValuesMap);
        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.value).toBe('  ');  // Not '' (empty)
        expect(animalSelect.value.length).toBe(2);
        expect(animalSelect.selectedIndex).not.toBe(0);  // Not the empty option
    });

    it('should render dropdown with only empty option when no unique values', () => {
        // Empty classValuesMap for ANIMAL_CLASS
        mockClassValuesMap[1] = [];

        const rowData: RowData = {
            fields: ['img1.jpg', '', 'Indoor', 'Notes'],
            row_index: 0
        };

        initializeEditor(mockMetadata, mockClassValuesMap);
        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.options.length).toBe(1);  // Only empty option
        expect(animalSelect.options[0].value).toBe('');
        expect(animalSelect.value).toBe('');
    });

    it('should order options with empty first, then alphabetically sorted', () => {
        // Unsorted values
        mockClassValuesMap[1] = ['Zebra', 'Cat', 'Dog', 'Aardvark'];

        const rowData: RowData = {
            fields: ['img1.jpg', '', 'Indoor', 'Notes'],
            row_index: 0
        };

        initializeEditor(mockMetadata, mockClassValuesMap);
        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const optionValues = Array.from(animalSelect.options).map(opt => opt.value);

        // Note: classValuesMap values are already sorted in main.ts during initialization
        // But verify empty is first
        expect(optionValues[0]).toBe('');  // Empty first
        expect(optionValues.slice(1)).toEqual(['Aardvark', 'Cat', 'Dog', 'Zebra']);
    });

    it('should return empty string from getFieldValues when empty option selected', () => {
        const rowData: RowData = {
            fields: ['img2.jpg', '', 'Outdoor', 'Notes'],
            row_index: 1
        };

        renderEditorForm(rowData);

        const values = getFieldValues();

        expect(values[1]).toBe('');  // ANIMAL_CLASS field
        expect(values[1]).not.toBeNull();
        expect(values[1]).not.toBeUndefined();
    });

    it('should allow user to switch from populated value to empty', () => {
        const rowData: RowData = {
            fields: ['img1.jpg', 'Cat', 'Indoor', 'Notes'],
            row_index: 0
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        // Initial state
        expect(animalSelect.value).toBe('Cat');

        // Simulate user selecting empty option
        animalSelect.value = '';
        animalSelect.dispatchEvent(new Event('change'));

        // Verify change
        expect(animalSelect.value).toBe('');
        expect(getFieldValues()[1]).toBe('');
    });

    it('should handle multiple class columns independently', () => {
        const rowData: RowData = {
            fields: ['img3.jpg', '', 'Outdoor', 'Notes'],  // Empty ANIMAL, Outdoor SCENE
            row_index: 2
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const sceneSelect = document.getElementById('field-2') as HTMLSelectElement;

        // ANIMAL_CLASS should be empty
        expect(animalSelect.value).toBe('');
        expect(animalSelect.selectedIndex).toBe(0);

        // SCENE_CLASS should be "Outdoor"
        expect(sceneSelect.value).toBe('Outdoor');
        expect(sceneSelect.selectedIndex).not.toBe(0);  // Not empty option
    });

    it('should handle completely empty row (all class fields empty)', () => {
        const rowData: RowData = {
            fields: ['img4.jpg', '', '', 'Notes'],  // Both class columns empty
            row_index: 3
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const sceneSelect = document.getElementById('field-2') as HTMLSelectElement;

        // Both should be empty
        expect(animalSelect.value).toBe('');
        expect(sceneSelect.value).toBe('');
        expect(animalSelect.selectedIndex).toBe(0);
        expect(sceneSelect.selectedIndex).toBe(0);
    });
});

describe('Add New Value Behavior', () => {
    // Note: Full testing of addNewClassValue() requires mocking Tauri invoke
    // These tests verify the re-render preserves empty state

    it('should preserve empty field value after form re-render', () => {
        const mockMetadata: CsvMetadata = {
            headers: ['IMAGE_PATH', 'ANIMAL_CLASS', 'NOTES'],
            total_rows: 2,
            class_columns: { 1: 'ANIMAL_CLASS' }
        };

        const mockClassValuesMap: ClassValuesMap = {
            1: ['Cat', 'Dog']
        };

        initializeEditor(mockMetadata, mockClassValuesMap);

        // Render with empty ANIMAL_CLASS
        const rowData1: RowData = {
            fields: ['img1.jpg', '', 'Notes'],
            row_index: 0
        };
        renderEditorForm(rowData1);

        // Verify empty
        let animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        expect(animalSelect.value).toBe('');

        // Simulate adding new value to classValuesMap (what addNewClassValue does)
        mockClassValuesMap[1] = ['Cat', 'Dog', 'Zebra'];

        // Get current values (what addNewClassValue does before re-render)
        const currentValues = getFieldValues();

        // Re-render with same values (what addNewClassValue does)
        const rowData2: RowData = {
            fields: currentValues,
            row_index: 0
        };
        renderEditorForm(rowData2);

        // Verify field still empty (not auto-selected to "Zebra")
        animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        expect(animalSelect.value).toBe('');

        // Verify "Zebra" is in dropdown
        const optionValues = Array.from(animalSelect.options).map(opt => opt.value);
        expect(optionValues).toContain('Zebra');
    });
});
```

**Run tests**:
```bash
npm test
```

**Expected**: All 12 new tests pass

---

### Step 4: Run Full Test Suite (5 minutes)

**Frontend Tests**:
```bash
npm test
```
Expected: ✅ All tests passing (existing + 12 new = ~45 total)

**Backend Tests** (verify no regressions):
```bash
cd src-tauri && cargo test
```
Expected: ✅ 2 integration tests passing (no changes to backend)

**Linting**:
```bash
npm run lint
npm run format:check
```
Expected: ✅ No errors

---

### Step 5: Update Documentation (5 minutes)

**Update CHANGELOG** (if exists, create if not):

Create or update `CHANGELOG.md`:
```markdown
# Changelog

## [Unreleased]

### Fixed
- Class dropdown fields now preserve empty values instead of auto-selecting the first option
- Users can now view and edit CSV rows with empty classification fields without accidental data corruption
- Whitespace-only values in class fields are now preserved as distinct from empty values
- Adding new class values no longer auto-applies them to empty fields

### Technical
- Added empty option as first option in all class dropdowns
- Added 12 new test cases for empty value handling
```

**Update Comments** in `src/editor.ts`:

Add comment above empty option code (around line 60):
```typescript
// Add empty option FIRST (always first in dropdown)
// This allows empty class fields to remain empty instead of auto-selecting first value
// See: specs/003-preserve-empty-classes/spec.md FR-001, FR-007
const emptyOption = document.createElement('option');
```

---

## Verification Checklist

Before considering the fix complete, verify:

- ✅ Empty option added as first option in class dropdowns
- ✅ Empty option selected when `value === ''`
- ✅ Non-empty options only selected when value matches and is not empty
- ✅ Manual testing passed all 6 scenarios
- ✅ Automated tests added (minimum 10 new tests)
- ✅ All tests pass (frontend + backend)
- ✅ No linting errors
- ✅ Documentation updated (comments, CHANGELOG)

## Troubleshooting

### Problem: Dropdown Still Auto-Selects First Value

**Symptom**: Empty fields still show "Cat" or first alphabetical value

**Cause**: Empty option not being created or not being selected

**Fix**: Ensure empty option code is BEFORE the forEach loop:
```typescript
// ✅ Correct order
const emptyOption = document.createElement('option');
emptyOption.value = '';
if (value === '') {
    emptyOption.selected = true;
}
select.appendChild(emptyOption);

// Then loop through classValues
classValues.forEach((optionValue) => {
```

---

### Problem: Two Options Selected (Empty + Another)

**Symptom**: Both empty option and another option marked as selected

**Cause**: Condition in forEach loop doesn't exclude empty value

**Fix**: Add `&& value !== ''` to the selection condition:
```typescript
classValues.forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    // Only mark as selected if value matches AND value is not empty
    if (optionValue === value && value !== '') {  // ← Add this check
        option.selected = true;
    }
    select.appendChild(option);
});
```

---

### Problem: Whitespace Values Appear as Empty

**Symptom**: `"  "` (two spaces) renders as empty option

**Cause**: Whitespace-only values not being added to classValuesMap

**Fix**: Verify CSV file quotes whitespace values:
```csv
IMAGE_PATH,ANIMAL_CLASS
img1.jpg,"  "   ← Quoted, whitespace preserved
img2.jpg,       ← Unquoted, may be trimmed to empty
```

**Recommendation**: Use quoted fields in CSV for whitespace preservation

---

### Problem: Tests Fail in JSDOM Environment

**Symptom**: Tests fail with "document is not defined" or "HTMLElement is not defined"

**Cause**: DOM mocking not set up correctly

**Fix**: Ensure JSDOM setup is before imports:
```typescript
import { JSDOM } from 'jsdom';

// Setup DOM BEFORE importing editor
const dom = new JSDOM('<!DOCTYPE html><div id="editor-form"></div>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;

// NOW import editor (after DOM setup)
import { renderEditorForm } from '../../src/editor';
```

---

## Next Steps

After implementation:

1. **Create Commit**:
   ```bash
   git add src/editor.ts tests/frontend/editor.test.ts CHANGELOG.md
   git commit -m "fix(editor): preserve empty class values in dropdowns

   - Add empty option as first option in all class dropdowns
   - Mark empty option selected when field value is empty
   - Preserve whitespace-only values as distinct from empty
   - Prevent new value addition from auto-applying to empty fields
   - Add 12 new test cases for empty value handling
   - Fixes data corruption issue where empty fields auto-selected first value

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

2. **Push Branch**:
   ```bash
   git push origin 003-preserve-empty-classes
   ```

3. **Create Pull Request** on GitHub with:
   - Link to spec.md
   - Manual testing results (screenshots/video showing empty dropdowns)
   - Test coverage report
   - Before/After comparison

4. **Request Review** from maintainer

## Time Breakdown

| Step | Estimated Time |
|------|-----------------|
| Add empty option code | 10 minutes |
| Manual testing | 15 minutes |
| Write automated tests | 20-25 minutes |
| Run full test suite | 5 minutes |
| Update documentation | 5 minutes |
| **Total** | **45-60 minutes** |

## Summary

The empty class value preservation fix is a straightforward implementation that:
- ✅ Adds 1 empty option creation (6 lines of code)
- ✅ Modifies 1 condition (adds `&& value !== ''` check)
- ✅ Maintains 100% backward compatibility (except buggy auto-selection)
- ✅ Requires 10-12 new tests

**Complexity**: Low - Standard HTML select pattern with empty first option

**Risk**: Very Low - Isolated change in one function, existing functionality preserved, comprehensive tests

**Impact**: High - Fixes critical data integrity bug affecting all users with empty class fields
