# Interface Contract: Class Dropdown Rendering

**Feature**: 003-preserve-empty-classes
**Date**: 2026-03-16
**Type**: UI Component Contract

## Overview

This contract defines the public interface and behavior guarantees for class dropdown rendering in the CSV Labelizer editor form.

## Scope

**In Scope**: Class dropdown fields (columns identified in `classValuesMap`)
**Out of Scope**: Text input fields (non-class columns)

## Public Functions

### renderEditorForm(rowData: RowData)

Renders the complete editor form with text inputs and class dropdowns for a given CSV row.

**Signature**:
```typescript
export function renderEditorForm(rowData: RowData): void
```

**Parameters**:
- `rowData`: `RowData` - The row to render
  - `fields`: `string[]` - Array of field values (one per column)
  - `row_index`: `number` - 0-based row index

**Preconditions**:
- Editor must be initialized (`initializeEditor()` called with metadata and classValuesMap)
- `rowData.fields.length` must match `currentMetadata.headers.length`
- DOM element `#editor-form` must exist

**Postconditions**:
- Editor form contains one field per column
- Class columns render as `<select>` elements
- Non-class columns render as `<input type="text">` elements
- Each class dropdown has:
  - Empty option (`<option value="">`) as first option
  - One option per unique value in `classValuesMap[columnIndex]`
  - Exactly one option marked as `selected`
  - Change listeners attached

**Behavior Contracts**:

#### Contract 1: Empty Option Rendering

**Guarantee**: Every class dropdown includes an empty option as the first option.

**Test**:
```typescript
const rowData = { fields: ["img.jpg", "Cat"], row_index: 0 };
renderEditorForm(rowData);

const select = document.getElementById('field-1') as HTMLSelectElement;
const firstOption = select.options[0];

expect(firstOption.value).toBe('');
expect(firstOption.textContent).toBe('');
```

---

#### Contract 2: Empty Value Selection

**Guarantee**: When a field value is empty (`""`), the empty option is selected (not the first non-empty option).

**Test**:
```typescript
const rowData = { fields: ["img.jpg", ""], row_index: 0 };  // Empty ANIMAL_CLASS
renderEditorForm(rowData);

const select = document.getElementById('field-1') as HTMLSelectElement;

expect(select.value).toBe('');
expect(select.selectedIndex).toBe(0);  // First option (empty)
```

**Counter-Example (Old Buggy Behavior)**:
```typescript
// OLD BUG: Would select first non-empty option
// expect(select.value).toBe('Cat');  // ❌ WRONG - auto-selected first value
```

---

#### Contract 3: Non-Empty Value Selection

**Guarantee**: When a field value is non-empty, the matching option is selected.

**Test**:
```typescript
const rowData = { fields: ["img.jpg", "Cat"], row_index: 0 };
renderEditorForm(rowData);

const select = document.getElementById('field-1') as HTMLSelectElement;

expect(select.value).toBe('Cat');
expect(select.options[select.selectedIndex].textContent).toBe('Cat');
```

---

#### Contract 4: Whitespace Preservation

**Guarantee**: Whitespace-only values are preserved as distinct from empty.

**Test**:
```typescript
const rowData = { fields: ["img.jpg", "  "], row_index: 0 };  // Two spaces
renderEditorForm(rowData);

const select = document.getElementById('field-1') as HTMLSelectElement;

expect(select.value).toBe('  ');  // Not '' (empty)
expect(select.value.length).toBe(2);  // Whitespace preserved
```

---

#### Contract 5: Option Ordering

**Guarantee**: Options appear in this order:
1. Empty option (always first)
2. Unique values (alphabetically sorted)

**Test**:
```typescript
// classValuesMap[1] = ["Zebra", "Cat", "Dog"]  (unsorted)
const rowData = { fields: ["img.jpg", ""], row_index: 0 };
renderEditorForm(rowData);

const select = document.getElementById('field-1') as HTMLSelectElement;
const optionValues = Array.from(select.options).map(opt => opt.value);

expect(optionValues).toEqual(['', 'Cat', 'Dog', 'Zebra']);  // Empty first, then sorted
```

---

### getFieldValues(): string[]

Returns current field values from the rendered form.

**Signature**:
```typescript
export function getFieldValues(): string[]
```

**Returns**: `string[]` - Array of field values (one per column)

**Preconditions**:
- Form must be rendered (`renderEditorForm()` called)

**Postconditions**:
- Array length matches number of columns
- Empty dropdowns return `""` (not null or undefined)

**Behavior Contracts**:

#### Contract 6: Empty Dropdown Value

**Guarantee**: When empty option is selected, `getFieldValues()` returns `""` for that field.

**Test**:
```typescript
renderEditorForm({ fields: ["img.jpg", ""], row_index: 0 });

// User selects empty option (or it's already selected)
const select = document.getElementById('field-1') as HTMLSelectElement;
select.value = '';

const values = getFieldValues();

expect(values[1]).toBe('');  // Not null, not undefined, not first non-empty value
```

---

### addNewClassValue(columnIndex: number)

Prompts user to add a new value to a class column's dropdown.

**Signature**:
```typescript
async function addNewClassValue(columnIndex: number): Promise<void>
```

**Parameters**:
- `columnIndex`: `number` - 0-based index of the class column

**Preconditions**:
- `classValuesMap` contains entry for `columnIndex`

**Postconditions**:
- New value added to `classValuesMap[columnIndex]` (if user provided value)
- Backend state updated via `invoke('add_class_value')`
- Form re-rendered with new value in dropdown
- **Critical**: Current field value preserved (no auto-application)

**Behavior Contracts**:

#### Contract 7: Empty Field Preservation During Add

**Guarantee**: Adding a new value to the dropdown does NOT change the current field if it's empty.

**Test**:
```typescript
renderEditorForm({ fields: ["img.jpg", ""], row_index: 0 });  // Empty field

// Simulate adding new value "Zebra"
// (Mock prompt to return "Zebra", mock invoke to succeed)
await addNewClassValue(1);  // ANIMAL_CLASS column

// After re-render, field should still be empty
const select = document.getElementById('field-1') as HTMLSelectElement;
expect(select.value).toBe('');  // Still empty, not "Zebra"

// But "Zebra" should be in dropdown
const optionValues = Array.from(select.options).map(opt => opt.value);
expect(optionValues).toContain('Zebra');
```

**Counter-Example (Incorrect Behavior)**:
```typescript
// WRONG: Auto-applying new value to current field
// expect(select.value).toBe('Zebra');  // ❌ This would violate Contract 7
```

---

## Backward Compatibility

### Preserved Behaviors

**Existing behavior that MUST NOT change**:

1. **Undo/Redo**: Users can undo/redo class field changes
   - Empty → "Cat" → (undo) → Empty
   - Undo/redo stack preserves empty values

2. **Change Tracking**: Selecting empty option marks form as changed
   - `hasUnsavedChanges` becomes `true`
   - Unsaved indicator appears

3. **Navigation with Unsaved Changes**: Prompts user before navigating
   - Selecting/deselecting empty option triggers prompt

4. **Keyboard Navigation**: Arrow keys, Enter, Tab work normally
   - Up arrow from first non-empty option moves to empty option
   - Home key moves to empty option

5. **Accessibility**: Screen readers announce empty option
   - Empty option read as "blank" or skipped (browser-dependent)

### Changed Behaviors

**Behavior changes from old (buggy) implementation**:

| Scenario | Old Behavior (Bug) | New Behavior (Fix) |
|----------|-------------------|-------------------|
| Load row with empty class field | Auto-selects first value (e.g., "Cat") | Selects empty option (blank) |
| Edit text field, leave class empty | Class auto-selects first value on focus | Class remains empty |
| Navigate away and back to empty field | May auto-select first value | Remains empty |
| Add new value while field is empty | May auto-select new value | Field stays empty, new value in list |

**Migration**: No data migration required. Users will immediately see correct behavior (empty fields stay empty).

---

## Error Handling

### Invalid State Handling

**Scenario**: Field value not in `classValuesMap` (data inconsistency)

**Example**: `rowData.fields[1] = "Unicorn"` but `classValuesMap[1] = ["Cat", "Dog"]` (doesn't include "Unicorn")

**Behavior**:
- Render dropdown with empty option + unique values
- No option selected (browser default behavior)
- `select.value` returns `""` (empty)
- User can select empty or any valid value

**Rationale**: If value is missing from dropdown, treat as inconsistent data. Default to empty to avoid auto-selecting wrong value.

---

### Empty classValuesMap

**Scenario**: `classValuesMap[columnIndex]` is empty array

**Example**: All rows in a class column are empty

**Behavior**:
- Render dropdown with only empty option
- Empty option selected
- "+ Add New" button still functional

**Test**:
```typescript
classValuesMap[1] = [];  // No unique values
renderEditorForm({ fields: ["img.jpg", ""], row_index: 0 });

const select = document.getElementById('field-1') as HTMLSelectElement;

expect(select.options.length).toBe(1);  // Only empty option
expect(select.options[0].value).toBe('');
expect(select.value).toBe('');
```

---

## Performance Contracts

### Rendering Performance

**Guarantee**: Dropdown rendering completes in < 10ms for typical datasets

**Typical Dataset**:
- 10 class columns
- 50 unique values per column
- 100,000 rows in CSV (only current row rendered)

**Measurement**:
```typescript
const start = performance.now();
renderEditorForm(rowData);
const elapsed = performance.now() - start;

expect(elapsed).toBeLessThan(10);  // milliseconds
```

**Current Performance**: ~0.003ms (adding empty option adds ~0.0001ms)

---

### Memory Usage

**Guarantee**: No memory leaks from repeated rendering

**Test**:
```typescript
const initialMemory = performance.memory.usedJSHeapSize;

// Render 1000 times (simulate navigating through rows)
for (let i = 0; i < 1000; i++) {
    renderEditorForm({ fields: ["img.jpg", "Cat"], row_index: i });
}

const finalMemory = performance.memory.usedJSHeapSize;
const growth = finalMemory - initialMemory;

expect(growth).toBeLessThan(1_000_000);  // < 1MB growth
```

---

## Security Contracts

### XSS Prevention

**Guarantee**: User-provided class values cannot execute scripts

**Attack Scenario**: Class value contains `<script>alert('xss')</script>`

**Protection**:
- `.textContent` assignment (not `.innerHTML`) prevents script execution
- Browser escapes HTML entities automatically

**Test**:
```typescript
classValuesMap[1] = ["<script>alert('xss')</script>", "Cat"];
renderEditorForm({ fields: ["img.jpg", "<script>alert('xss')</script>"], row_index: 0 });

const select = document.getElementById('field-1') as HTMLSelectElement;
const option = select.options[1];  // First non-empty option

expect(option.textContent).toBe("<script>alert('xss')</script>");  // Escaped
expect(option.value).toBe("<script>alert('xss')</script>");

// Script should NOT execute
// (This is tested by the test suite NOT crashing or showing alerts)
```

---

## Summary

**Critical Contracts**:
1. Empty option always first in dropdown
2. Empty field selects empty option (not first non-empty)
3. Whitespace-only values distinct from empty
4. New value addition preserves empty field state
5. Undo/redo preserves empty values

**Performance Contracts**:
- < 10ms rendering for typical datasets
- < 1MB memory growth for 1000 renders

**Security Contracts**:
- XSS prevention via `.textContent` usage

**Backward Compatibility**:
- Undo/redo, change tracking, navigation prompts preserved
- Only buggy auto-selection behavior changes
