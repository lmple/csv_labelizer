# Navigation Interface Contract

**Date**: 2026-03-16
**Feature**: Fix Pagination Navigation Bug (002-fix-pagination-skip)
**Module**: `src/navigation.ts`

## Overview

This bug fix **preserves the existing navigation interface contract**. All public functions maintain their signatures and behavior. The fix is entirely internal (adding debounce logic) and does not change how the navigation module is consumed.

## Public Interface (Unchanged)

### Exported Functions

#### `initializeNavigation(rowCount: number): void`
**Purpose**: Initialize navigation system with total row count
**Contract**:
- **Input**: `rowCount` (number) - Total rows in CSV file
- **Output**: None (void)
- **Side Effects**:
  - Sets `totalRows` module variable
  - Resets `currentRowIndex` to 0
  - Sets up button event listeners
  - Sets up keyboard shortcuts
  - Updates UI to reflect initial state
- **Preconditions**: Must be called after CSV file is loaded
- **Postconditions**: Navigation buttons functional, row counter displays "Row 1 of {rowCount}"

**Changes**: None - behavior identical before and after fix

---

#### `getCurrentRowIndex(): number`
**Purpose**: Get current row index (0-based)
**Contract**:
- **Input**: None
- **Output**: Current row index (0-based integer)
- **Guarantees**: `0 <= result < totalRows`

**Changes**: None - behavior identical before and after fix

---

#### `setSaveCallback(callback: () => Promise<void>): void`
**Purpose**: Register callback for saving current row before navigation
**Contract**:
- **Input**: `callback` - Async function to save current row
- **Output**: None (void)
- **Usage**: Called by main.ts to provide save functionality to navigation module

**Changes**: None - behavior identical before and after fix

---

#### `jumpToRow(index: number): Promise<void>`
**Purpose**: Navigate directly to specified row index
**Contract**:
- **Input**: `index` (0-based row index)
- **Output**: Promise<void> (async operation)
- **Preconditions**: `0 <= index < totalRows`
- **Behavior**:
  - Checks for unsaved changes (prompts user if needed)
  - Navigates to specified row if user confirms
  - Updates UI to reflect new position
- **Side Effects**: May show save prompt dialog

**Changes**:
- ✅ **Internal Only**: Adds debounce guard clause
- ✅ **Contract Preserved**: Same inputs, outputs, and observable behavior
- ✅ **Enhancement**: Now prevents rapid jumps from processing twice

---

### Internal Functions (Not Part of Public Contract)

These functions are module-private and can be modified without breaking contract:

- `navigateNext()` - Adds debounce guard clause
- `navigatePrevious()` - Adds debounce guard clause
- `checkUnsavedChanges()` - No changes
- `loadCurrentRow()` - No changes
- `setNavigationEnabled()` - No changes
- `updateNavigationUI()` - No changes
- `setupNavigationButtons()` - No changes
- `setupKeyboardShortcuts()` - No changes

## User-Facing Behavior Contract

### Navigation Buttons

#### Previous Button (`#prev-btn`)
**Contract**:
- **Enabled When**: `currentRowIndex > 0` AND not currently navigating
- **Disabled When**: `currentRowIndex === 0` OR navigation in progress
- **Click Behavior**: Navigate to previous row (index - 1)
- **Guarantee**: Single click only changes index by 1 (never -2, -3, etc.)

**Changes**:
- ✅ **Enhancement**: Rapid clicks now properly ignored (debounce)
- ✅ **Contract Preserved**: Single-click behavior unchanged

---

#### Next Button (`#next-btn`)
**Contract**:
- **Enabled When**: `currentRowIndex < totalRows - 1` AND not currently navigating
- **Disabled When**: `currentRowIndex === totalRows - 1` OR navigation in progress
- **Click Behavior**: Navigate to next row (index + 1)
- **Guarantee**: Single click only changes index by 1 (never +2, +3, etc.)

**Changes**:
- ✅ **Bug Fix**: Now properly prevents double-click page skipping
- ✅ **Contract Preserved**: Single-click behavior unchanged

---

### Keyboard Shortcuts

#### Ctrl+← (Previous)
**Contract**: Same as clicking Previous button

**Changes**: None - behavior identical, debounce applies equally

---

#### Ctrl+→ (Next)
**Contract**: Same as clicking Next button

**Changes**: None - behavior identical, debounce applies equally

---

### Jump to Row

#### Jump Input + Button/Enter
**Contract**:
- **Input**: User types 1-based row number (1 to totalRows)
- **Validation**: Must be valid integer in range
- **Behavior**: Navigate to specified row (converted to 0-based index)
- **Error Handling**: Alert shown if input invalid

**Changes**:
- ✅ **Enhancement**: Now prevents rapid jump commands from processing twice
- ✅ **Contract Preserved**: Same validation and behavior

## Backward Compatibility

### ✅ 100% Backward Compatible

This bug fix is **fully backward compatible**:

1. **No API Changes**: All exported function signatures identical
2. **No Breaking Behavior Changes**: All observable behavior preserved or improved
3. **No New Dependencies**: Pure TypeScript, no new libraries
4. **No Configuration Required**: Fix activates automatically
5. **No Migration Needed**: Existing code works without modification

### Consumers of Navigation Module

**Main Application** (`src/main.ts`):
- **Current Usage**:
  ```typescript
  initializeNavigation(totalRows);
  setSaveCallback(async () => { await saveRow(); });
  ```
- **After Fix**: Identical usage, no changes required

**Search Module** (`src/search.ts`):
- **Current Usage**:
  ```typescript
  await jumpToRow(searchResultIndex);
  ```
- **After Fix**: Identical usage, no changes required

**Editor Module** (`src/editor.ts`):
- **Current Usage**:
  ```typescript
  const currentIndex = getCurrentRowIndex();
  ```
- **After Fix**: Identical usage, no changes required

## Testing Contract

### Existing Tests Must Pass

All 20 existing tests in `tests/frontend/navigation.test.ts` must continue to pass without modification.

**Guarantee**: The fix does not break any existing test expectations.

### New Tests Added

Additional tests added to verify debounce behavior:
- Rapid click scenarios (verify single increment)
- Boundary button states (verify disabled at edges)
- Flag cleanup (verify no stuck states)
- Sequential navigation after debounce (verify subsequent navigation works)

**Note**: These tests validate the fix without changing existing test contracts.

## Error Handling Contract

### Promise Rejections
**Contract**: Navigation functions return `Promise<void>` that rejects on errors

**Changes**:
- ✅ **Enhanced**: Debounce flag cleared in finally block (even on error)
- ✅ **Contract Preserved**: Promise rejection behavior unchanged

### User Cancellations
**Contract**: If user cancels save prompt, navigation is canceled

**Changes**:
- ✅ **Enhanced**: Debounce flag properly cleared on cancellation
- ✅ **Contract Preserved**: Cancellation behavior unchanged

## Performance Contract

### Response Time Guarantees
**Contract**: Navigation operations complete in < 100ms

**Changes**:
- ✅ **Performance**: Debounce check adds ~0.001ms (negligible)
- ✅ **Contract Preserved**: Still well under 100ms target (currently 0.022ms)

### Memory Guarantees
**Contract**: Navigation module uses minimal memory (< 1MB for 100K rows)

**Changes**:
- ✅ **Memory**: Boolean flag adds 1 byte to module state
- ✅ **Contract Preserved**: Negligible impact on memory usage

## Summary

The pagination bug fix:
- ✅ **Preserves all public interfaces** - No API changes
- ✅ **Maintains all contracts** - Same inputs, outputs, and guarantees
- ✅ **Enhances behavior** - Fixes double-click bug without breaking changes
- ✅ **100% backward compatible** - No migration or code changes required
- ✅ **Improves UX** - Prevents unexpected page skipping

**Contract Status**: ✅ **STABLE** - All existing contracts preserved and enhanced
