# Data Model: Pagination Navigation Bug Fix

**Date**: 2026-03-16
**Feature**: Fix Pagination Navigation Bug (002-fix-pagination-skip)

## Overview

This bug fix does not introduce new data entities. It modifies the state management and control flow within the existing navigation module. This document describes the state variables and their relationships relevant to the fix.

## State Variables

### Navigation State (Module-Level)

These variables exist at the module level in `src/navigation.ts`:

#### `currentRowIndex: number`
- **Purpose**: Tracks which row the user is currently viewing
- **Range**: `0` to `totalRows - 1` (0-indexed)
- **Constraints**:
  - Must be within valid range
  - Updated only after successful navigation
- **Usage**: Read by UI update functions, incremented/decremented by navigation functions

#### `totalRows: number`
- **Purpose**: Total number of rows in the CSV file
- **Source**: Set once during initialization from backend
- **Constraints**: Must be > 0 for valid CSV file
- **Usage**: Determines boundary conditions for navigation

#### `isNavigating: boolean` ⚠️ NEW
- **Purpose**: Debounce flag to prevent concurrent navigation operations
- **Initial Value**: `false`
- **State Transitions**:
  ```
  false → true   : When navigation starts (guard clause passes)
  true → false   : When navigation completes (finally block)
  true → true    : When rapid click is ignored (no transition)
  ```
- **Critical Behavior**: Must be cleared in `finally` block to prevent stuck states
- **Scope**: Module-level, shared across all navigation functions

#### `saveCurrentRowCallback: (() => Promise<void>) | null`
- **Purpose**: Callback function to save current row before navigating
- **Usage**: Called by `checkUnsavedChanges()` if user has unsaved edits
- **Relationship**: Async operation that `isNavigating` flag must protect

## State Transition Diagrams

### Navigation State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVIGATION LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

                            [IDLE]
                      isNavigating = false
                             │
                             │ User clicks button/
                             │ presses keyboard shortcut
                             ▼
                   ┌──────────────────┐
                   │ Boundary Check   │
                   └──────────────────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
              (in range)           (out of range)
                   │                   │
                   ▼                   ▼
         ┌──────────────────┐    [Return Early]
         │  Guard Clause    │
         │ if (isNavigating)│
         │     return       │
         └──────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
    (already navigating)  (not navigating)
         │                    │
         ▼                    ▼
   [Ignore Click]    isNavigating = true
                             │
                             ▼
                   ┌──────────────────┐
                   │ Check Unsaved    │
                   │    Changes       │
                   └──────────────────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
              (save/discard)        (cancel)
                   │                   │
                   ▼                   │
         currentRowIndex ± 1           │
                   │                   │
                   ▼                   │
         ┌──────────────────┐          │
         │  Load Current    │          │
         │      Row         │          │
         └──────────────────┘          │
                   │                   │
                   ▼                   │
         ┌──────────────────┐          │
         │  Update UI       │          │
         └──────────────────┘          │
                   │                   │
                   └─────────┬─────────┘
                             │
                             ▼
                      [FINALLY BLOCK]
                   isNavigating = false
                             │
                             ▼
                          [IDLE]
```

### Button State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                       BUTTON STATES                          │
└─────────────────────────────────────────────────────────────┘

Previous Button State:
  ┌─────────────────────────────────────────┐
  │ Enabled Conditions:                     │
  │  - currentRowIndex > 0                  │
  │  - NOT navigating (isNavigating=false)  │
  │                                         │
  │ Disabled Conditions:                    │
  │  - currentRowIndex === 0 (boundary)     │
  │  - OR isNavigating === true             │
  └─────────────────────────────────────────┘

Next Button State:
  ┌─────────────────────────────────────────┐
  │ Enabled Conditions:                     │
  │  - currentRowIndex < totalRows - 1      │
  │  - NOT navigating (isNavigating=false)  │
  │                                         │
  │ Disabled Conditions:                    │
  │  - currentRowIndex === totalRows - 1    │
  │  - OR isNavigating === true             │
  └─────────────────────────────────────────┘
```

## Validation Rules

### Navigation Invariants

These conditions must ALWAYS be true:

1. **Single Navigation Constraint**:
   ```typescript
   // Only one navigation operation can be in-flight at a time
   isNavigating === true  ⟹  No other navigation can start
   ```

2. **Boundary Constraints**:
   ```typescript
   0 <= currentRowIndex < totalRows
   ```

3. **Button State Consistency**:
   ```typescript
   prevBtn.disabled === (currentRowIndex === 0 || isNavigating)
   nextBtn.disabled === (currentRowIndex === totalRows - 1 || isNavigating)
   ```

4. **Flag Cleanup Guarantee**:
   ```typescript
   // After any navigation attempt (success, cancel, error)
   // isNavigating MUST be reset to false
   finally { isNavigating = false; }
   ```

## Edge Cases Handling

### 1. Rapid Button Clicks
**Scenario**: User clicks "next" twice rapidly (< 50ms apart)

**State Behavior**:
- First click: `isNavigating` → `true`, navigation proceeds
- Second click: Guard clause returns early (no-op)
- After completion: `isNavigating` → `false`

**Expected Result**: Only first click processes, index increments by 1

### 2. Save Prompt Cancellation
**Scenario**: User has unsaved changes, clicks "next", cancels save prompt

**State Behavior**:
- `isNavigating` → `true` (before save prompt)
- User cancels → `canProceed = false`
- Finally block executes → `isNavigating` → `false`
- `currentRowIndex` unchanged

**Expected Result**: Navigation canceled, index unchanged, flag cleared

### 3. Loading Error
**Scenario**: Backend command fails during `loadCurrentRow()`

**State Behavior**:
- `isNavigating` → `true`
- `invoke('get_row')` throws error
- Catch block shows error alert
- Finally block executes → `isNavigating` → `false`

**Expected Result**: Error shown to user, flag cleared, index may be inconsistent (but further navigation is unblocked)

### 4. Keyboard Shortcut During Load
**Scenario**: User clicks "next", then immediately presses Ctrl+→ before load completes

**State Behavior**:
- Button click: `isNavigating` → `true`
- Keyboard shortcut calls `navigateNext()`
- Guard clause returns early (no-op)

**Expected Result**: Keyboard shortcut ignored, only button click processes

## Dependencies Between State Variables

```
┌──────────────────┐
│  totalRows       │────────┐
│  (read-only)     │        │
└──────────────────┘        │
                            │ Determines
                            │ boundaries
                            ▼
┌──────────────────┐   ┌────────────────┐
│ currentRowIndex  │──>│ Button States  │
│                  │   │ (prevBtn/next) │
└──────────────────┘   └────────────────┘
        │                      ▲
        │ Modified by          │ Depends on
        │                      │
        ▼                      │
┌──────────────────┐           │
│ isNavigating     │───────────┘
│ (debounce flag)  │   Disables during
└──────────────────┘   navigation
```

## Testing Implications

### State Assertions for Tests

1. **Initial State**:
   ```typescript
   expect(isNavigating).toBe(false)
   expect(currentRowIndex).toBe(0)
   ```

2. **During Navigation** (if mockable):
   ```typescript
   // After guard clause passes
   expect(isNavigating).toBe(true)
   ```

3. **After Navigation**:
   ```typescript
   expect(isNavigating).toBe(false)
   expect(currentRowIndex).toBe(expectedValue)
   ```

4. **Rapid Click Scenario**:
   ```typescript
   const initialIndex = currentRowIndex
   await navigateNext()  // First call
   await navigateNext()  // Second call (should be ignored)
   expect(currentRowIndex).toBe(initialIndex + 1) // Only +1, not +2
   ```

## Summary

The data model for this bug fix consists of:
- **1 new state variable** (`isNavigating` boolean flag)
- **3 existing state variables** (`currentRowIndex`, `totalRows`, `saveCurrentRowCallback`)
- **Clear state transitions** with guard clauses and finally blocks
- **Strict invariants** to prevent race conditions
- **Comprehensive edge case handling** for cancellations and errors

The debounce flag (`isNavigating`) is the critical addition that prevents concurrent navigation operations and resolves the page-skipping bug.
