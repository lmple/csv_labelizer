# Data Model: Preserve Empty Class Values

**Feature**: 003-preserve-empty-classes
**Date**: 2026-03-16
**Status**: Complete

## Overview

This document defines the data structures, state transitions, and validation rules for preserving empty class values in dropdown fields.

## Core Entities

### ClassFieldValue

Represents the current value of a classification column field.

**Properties**:
- `value`: `string` - The field value from CSV
  - Empty: `""` (zero-length string)
  - Whitespace-only: `"  "`, `"\t"`, etc. (non-zero length, all whitespace)
  - Populated: `"Cat"`, `"Dog"`, etc. (contains non-whitespace characters)

**States**:
```
┌─────────────────────────────────────────────────────────────┐
│                    ClassFieldValue States                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────┐      User selects value       ┌────────────┐   │
│  │ Empty  │──────────────────────────────▶ │ Populated  │   │
│  │ ("")   │                                │ ("Cat")    │   │
│  └────────┘                                └────────────┘   │
│      ▲                                            │          │
│      │                                            │          │
│      │       User selects blank option            │          │
│      └────────────────────────────────────────────┘          │
│                                                              │
│  ┌─────────────────┐                                        │
│  │ Whitespace-Only │  (Distinct state - preserved as-is)    │
│  │ ("  ")          │                                        │
│  └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Invariants**:
1. Value is always a string (never null or undefined in TypeScript)
2. Empty state (`""`) must be explicitly preserved (no auto-population)
3. Whitespace-only values are distinct from empty (no trimming)

**Validation**:
- No validation required (all string values are valid, including empty)

---

### DropdownOption

Represents a selectable option in the class dropdown.

**Properties**:
- `value`: `string` - The option value (matches CSV field value)
- `textContent`: `string` - The displayed text (same as value)
- `selected`: `boolean` - Whether this option is currently selected
- `isEmptyOption`: `boolean` (derived) - True if `value === ""`

**Collection**:
```typescript
interface DropdownOptions {
    emptyOption: DropdownOption;           // Always first, value = ""
    uniqueValues: DropdownOption[];        // Sorted unique values from column
}
```

**Ordering**:
1. Empty option (always first)
2. Unique values from column (alphabetically sorted)

**Example**:
```typescript
// Column has values: ["Cat", "Dog", "", "Cat", "  ", "Dog"]
// Dropdown options:
[
    { value: "", textContent: "", selected: false, isEmptyOption: true },
    { value: "  ", textContent: "  ", selected: false, isEmptyOption: false },
    { value: "Cat", textContent: "Cat", selected: false, isEmptyOption: false },
    { value: "Dog", textContent: "Dog", selected: false, isEmptyOption: false }
]
```

**Invariants**:
1. Empty option (`value=""`) is always first in the list
2. Exactly one option has `selected: true` at any time
3. If field value is empty (`""`), empty option is selected
4. Unique values are sorted alphabetically

---

## State Management

### Editor State

**File**: `src/editor.ts` (module-level variables)

```typescript
interface EditorState {
    currentMetadata: CsvMetadata | null;
    currentRowIndex: number;
    classValuesMap: ClassValuesMap;        // Map of column index → unique values
    hasUnsavedChanges: boolean;
    fieldHistory: string[][];               // Undo/redo history
    historyIndex: number;
}
```

**ClassValuesMap Structure**:
```typescript
type ClassValuesMap = {
    [columnIndex: number]: string[];  // Unique values for that class column
};

// Example:
{
    2: ["Cat", "Dog", "Bird"],       // Column 2 (ANIMAL_CLASS)
    5: ["Indoor", "Outdoor", "  "]   // Column 5 (SCENE_CLASS) - includes whitespace-only
}
```

**Important**: `ClassValuesMap` does NOT include the empty option (`""`). The empty option is added during dropdown rendering, not stored in the map.

---

### Dropdown Rendering State Machine

```
┌────────────────────────────────────────────────────────────────┐
│              renderEditorForm() State Transitions               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Start: renderEditorForm(rowData)]                            │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────────┐                                   │
│  │ For each column/field   │                                   │
│  └─────────────────────────┘                                   │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────────┐                                   │
│  │ Is class column?        │──No──▶ [Render text input]        │
│  └─────────────────────────┘                                   │
│            │ Yes                                                │
│            ▼                                                    │
│  ┌─────────────────────────┐                                   │
│  │ Create <select> element │                                   │
│  └─────────────────────────┘                                   │
│            │                                                    │
│            ▼                                                    │
│  ┌───────────────────────────────────────┐                     │
│  │ Add empty option (value="", first)    │                     │
│  │ - Set selected if fieldValue === ""   │                     │
│  └───────────────────────────────────────┘                     │
│            │                                                    │
│            ▼                                                    │
│  ┌───────────────────────────────────────┐                     │
│  │ For each value in classValuesMap:     │                     │
│  │ - Create option                       │                     │
│  │ - Set value = optionValue             │                     │
│  │ - Set selected if optionValue ===     │                     │
│  │   fieldValue                          │                     │
│  └───────────────────────────────────────┘                     │
│            │                                                    │
│            ▼                                                    │
│  ┌───────────────────────────────────────┐                     │
│  │ Add change listener:                  │                     │
│  │ - Mark hasUnsavedChanges = true       │                     │
│  │ - Save to history                     │                     │
│  └───────────────────────────────────────┘                     │
│            │                                                    │
│            ▼                                                    │
│  [End: Dropdown rendered with correct selection]              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

### New Value Addition State Machine

```
┌────────────────────────────────────────────────────────────────┐
│           addNewClassValue() State Transitions                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [User clicks "+ Add New" button]                              │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────────┐                                   │
│  │ Prompt for new value    │                                   │
│  └─────────────────────────┘                                   │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────────┐                                   │
│  │ User enters value?      │──Cancel──▶ [End: No change]       │
│  └─────────────────────────┘                                   │
│            │ Enter value                                        │
│            ▼                                                    │
│  ┌─────────────────────────┐                                   │
│  │ Trim value (trim())     │                                   │
│  └─────────────────────────┘                                   │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────────┐                                   │
│  │ Add to classValuesMap   │                                   │
│  │ (if not duplicate)      │                                   │
│  └─────────────────────────┘                                   │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────────────────────┐                      │
│  │ CRITICAL: Save current field values  │                      │
│  │ const currentValues = getFieldValues()│                     │
│  └──────────────────────────────────────┘                      │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────────────────────┐                      │
│  │ Re-render form with:                 │                      │
│  │ - fields: currentValues (preserves   │                      │
│  │   empty if it was empty)             │                      │
│  └──────────────────────────────────────┘                      │
│            │                                                    │
│            ▼                                                    │
│  [End: New value in dropdown, current field unchanged]        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Critical Behavior**: Current field value is preserved during re-render. If field was empty before adding new value, it remains empty after.

---

## CSV Data Normalization

### Loading (CSV → Memory)

**File**: `src-tauri/src/csv_engine.rs` (existing behavior)

```
CSV Field Representation    →    In-Memory Value
─────────────────────────────────────────────────
,,                                 "" (empty string)
,"",                               "" (empty string)
,  ,                               "  " (whitespace preserved if quoted)
,   ,                              "" (whitespace trimmed if unquoted)
<missing field at end>             "" (empty string)
```

**Normalization Rules** (handled by Rust `csv` crate):
1. Empty field (`,,`) becomes `""`
2. Quoted empty (`,"",`) becomes `""`
3. Quoted whitespace (`,"  ",`) preserves whitespace → `"  "`
4. Unquoted whitespace (`,  ,`) may be trimmed → `""` (crate default)
5. Missing field at end of row becomes `""`

**Result**: All "empty" representations become `""` in memory. Whitespace is preserved only if quoted.

---

### Saving (Memory → CSV)

**File**: `src-tauri/src/csv_engine.rs` (existing behavior)

```
In-Memory Value    →    CSV Output
─────────────────────────────────────
""                      ,"",
"  "                    ,"  ",
"Cat"                   ,"Cat",
```

**Quoting Rules** (handled by Rust `csv` crate):
1. Empty string (`""`) written as `,"",` (quoted)
2. Whitespace-only (`"  "`) written as `,"  ",` (quoted)
3. Normal values written as `,"Cat",` (quoted for safety)

**Result**: Round-trip preserves emptiness and whitespace (if originally quoted).

---

## Validation Rules

### Field Value Validation

**No validation required** - All string values are valid:
- Empty (`""`) is valid
- Whitespace-only (`"  "`) is valid
- Any printable characters are valid

**Rationale**: CSV Labelizer is a data correction tool. Users must be able to see and edit any values, including problematic ones.

---

### Dropdown State Validation

**Invariants to Maintain**:

1. **Empty Option Exists**: Every class dropdown MUST have an option with `value=""`
2. **Empty Option First**: Empty option MUST be first in the options list
3. **Exactly One Selected**: Exactly one option has `selected=true`
4. **Empty Selection Match**: If `fieldValue === ""`, empty option is selected
5. **No Auto-Population**: Empty field MUST NOT auto-select any non-empty option

**Test Assertions** (for each dropdown):
```typescript
describe('Dropdown State Validation', () => {
    it('should have empty option as first option', () => {
        const select = document.getElementById('field-2') as HTMLSelectElement;
        const firstOption = select.options[0];
        expect(firstOption.value).toBe('');
    });

    it('should select empty option when field is empty', () => {
        const select = document.getElementById('field-2') as HTMLSelectElement;
        expect(select.value).toBe('');
        expect(select.selectedIndex).toBe(0);
    });

    it('should have exactly one selected option', () => {
        const select = document.getElementById('field-2') as HTMLSelectElement;
        const selectedOptions = Array.from(select.options).filter(opt => opt.selected);
        expect(selectedOptions.length).toBe(1);
    });
});
```

---

## Edge Cases

### Empty Column (No Unique Values)

**Scenario**: All rows in a class column are empty

**ClassValuesMap**:
```typescript
{
    2: []  // No unique values detected
}
```

**Dropdown Rendering**:
```html
<select id="field-2">
    <option value="" selected></option>  <!-- Only option -->
</select>
```

**Behavior**:
- Dropdown shows only blank option
- User can still select blank (no change)
- User can add new value via "+ Add New" button
- After adding value, dropdown shows blank + new value

---

### All Fields Empty (Completely Unclassified Row)

**Scenario**: Row has empty values for all class columns

**Row Data**:
```typescript
{
    fields: ["image1.jpg", "", "", "Some notes", ""],
    //          ↑         ↑ANIMAL  ↑SCENE        ↑OTHER_CLASS
}
```

**Dropdowns Rendered**:
- ANIMAL_CLASS (index 1): Shows blank (selected) + unique values
- SCENE_CLASS (index 2): Shows blank (selected) + unique values
- OTHER_CLASS (index 4): Shows blank (selected) + unique values

**Behavior**:
- User can navigate to this row and view all blank dropdowns
- User can edit text fields (image path, notes) without affecting empty dropdowns
- User can explicitly select values if desired
- All dropdowns remain blank if user doesn't interact

---

### Whitespace-Only Column

**Scenario**: Column contains only whitespace-only values

**Column Values**: `["  ", "  ", "\t", "   "]`

**ClassValuesMap**:
```typescript
{
    2: ["  ", "\t", "   "]  // Three distinct whitespace values
}
```

**Dropdown Rendering**:
```html
<select id="field-2">
    <option value=""></option>         <!-- Empty option (not selected) -->
    <option value="  " selected></option>   <!-- Selected if row has "  " -->
    <option value="\t"></option>       <!-- Tab character -->
    <option value="   "></option>      <!-- Three spaces -->
</select>
```

**Behavior**:
- Whitespace values appear as blank-looking options (visually similar to empty)
- User can distinguish by selecting and seeing value in getFieldValues()
- User can add explicit non-whitespace values
- Whitespace values preserved on save

---

### New Value Addition During Empty Field View

**Scenario**: User views row with empty class field, adds new value "Zebra"

**Before Addition**:
```typescript
fieldValue = "";  // Empty
classValuesMap[2] = ["Cat", "Dog"];
```

**After Addition**:
```typescript
fieldValue = "";  // Still empty! (preserved)
classValuesMap[2] = ["Cat", "Dog", "Zebra"];
```

**Dropdown After Re-Render**:
```html
<select id="field-2">
    <option value="" selected></option>  <!-- Still selected! -->
    <option value="Cat"></option>
    <option value="Dog"></option>
    <option value="Zebra"></option>      <!-- New value available -->
</select>
```

**Behavior**:
- Field remains empty after adding new value
- New value appears in dropdown but is not selected
- User must explicitly select new value if desired

---

## Memory Model

### In-Memory Representation

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory Structure                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RowData (from CSV)                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ fields: ["image.jpg", "", "Cat", "  ", "Notes"]    │    │
│  │            ↑         ↑ANIMAL ↑SCENE ↑OTHER         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ClassValuesMap (unique values per column)                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1: ["Cat", "Dog", "Bird"]         ← ANIMAL_CLASS   │    │
│  │ 2: ["Indoor", "Outdoor"]          ← SCENE_CLASS    │    │
│  │ 3: ["  ", "Tag1", "Tag2"]         ← OTHER_CLASS    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  DOM Representation (rendered dropdowns)                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ <select id="field-1">  ← ANIMAL_CLASS              │    │
│  │   <option value="" selected></option>              │    │
│  │   <option value="Cat"></option>                    │    │
│  │   <option value="Dog"></option>                    │    │
│  │   <option value="Bird"></option>                   │    │
│  │ </select>                                           │    │
│  │                                                     │    │
│  │ <select id="field-2">  ← SCENE_CLASS               │    │
│  │   <option value=""></option>                       │    │
│  │   <option value="Cat" selected></option>           │    │
│  │   <option value="Indoor"></option>                 │    │
│  │   <option value="Outdoor"></option>                │    │
│  │ </select>                                           │    │
│  │                                                     │    │
│  │ <select id="field-3">  ← OTHER_CLASS               │    │
│  │   <option value=""></option>                       │    │
│  │   <option value="  " selected></option>            │    │
│  │   <option value="Tag1"></option>                   │    │
│  │   <option value="Tag2"></option>                   │    │
│  │ </select>                                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

**Dropdown Rendering Complexity**:
- Time: O(n) where n = number of unique values in column
- Space: O(n) for DOM elements (options)
- Typical n: 10-50 unique values
- Worst case n: 1000 unique values
- Performance: < 0.01ms for typical case

**Memory Overhead**:
- Empty option: +1 option per dropdown
- Whitespace-only values: No additional overhead (already stored)
- Total: ~100 bytes per dropdown (negligible)

---

## Summary

**Key Data Structures**:
1. `ClassFieldValue`: String value (empty, whitespace, or populated)
2. `DropdownOption`: Option element with value, text, selected state
3. `ClassValuesMap`: Map of column index to unique values (excludes empty)

**Critical Behaviors**:
1. Empty option (`value=""`) is always first in dropdown
2. Empty field (`value=""`) selects empty option (not first non-empty option)
3. Whitespace-only values preserved as distinct from empty
4. New value addition preserves current field state (no auto-apply)

**Validation**:
- No field value validation (all strings valid)
- Dropdown state invariants enforced during rendering

**Performance**:
- No impact on existing performance (< 0.01ms overhead)
- Memory overhead negligible (< 1KB per 10 dropdowns)
