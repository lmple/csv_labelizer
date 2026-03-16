# Quickstart: Implementing the Pagination Bug Fix

**Feature**: Fix Pagination Navigation Bug (002-fix-pagination-skip)
**Date**: 2026-03-16
**Time to Implement**: 30-45 minutes

## Overview

This guide walks you through implementing the pagination bug fix that prevents page skipping caused by double-clicks. The fix adds debounce logic to ignore subsequent navigation requests while one is already in progress.

## Prerequisites

Before starting, ensure you have:
- ✅ Read [spec.md](spec.md) - Feature specification
- ✅ Read [research.md](research.md) - Problem analysis and solution approach
- ✅ Read [data-model.md](data-model.md) - State management details
- ✅ Development environment set up:
  ```bash
  npm install          # Install frontend dependencies
  npm run tauri dev    # Verify app runs
  npm test             # Verify tests pass (20/20)
  ```

## Implementation Steps

### Step 1: Add Debounce Flag (2 minutes)

**File**: `src/navigation.ts`
**Location**: Module-level variables (around line 6)

**Add this variable**:
```typescript
let currentRowIndex: number = 0;
let totalRows: number = 0;
let isNavigating = false; // ⬅️ ADD THIS LINE
let saveCurrentRowCallback: (() => Promise<void>) | null = null;
```

**Verification**: TypeScript compilation should succeed (`npm run build`)

---

### Step 2: Add Guard Clause to navigateNext() (5 minutes)

**File**: `src/navigation.ts`
**Function**: `navigateNext()` (around line 109)

**Current code**:
```typescript
async function navigateNext() {
    if (currentRowIndex < totalRows - 1) {
        const canProceed = await checkUnsavedChanges();
        if (canProceed) {
            currentRowIndex++;
            await loadCurrentRow();
            updateNavigationUI();
        }
    }
}
```

**Updated code**:
```typescript
async function navigateNext() {
    if (currentRowIndex < totalRows - 1) {
        // Guard clause: ignore if navigation already in progress
        if (isNavigating) return;

        isNavigating = true;
        try {
            const canProceed = await checkUnsavedChanges();
            if (canProceed) {
                currentRowIndex++;
                await loadCurrentRow();
                updateNavigationUI();
            }
        } finally {
            // Always reset flag, even if user cancels or error occurs
            isNavigating = false;
        }
    }
}
```

**Key Points**:
- Guard clause AFTER boundary check (cheap check first)
- Guard clause BEFORE any async operations
- Flag cleared in `finally` block (handles all paths: success, cancel, error)

---

### Step 3: Add Guard Clause to navigatePrevious() (5 minutes)

**File**: `src/navigation.ts`
**Function**: `navigatePrevious()` (around line 120)

**Current code**:
```typescript
async function navigatePrevious() {
    if (currentRowIndex > 0) {
        const canProceed = await checkUnsavedChanges();
        if (canProceed) {
            currentRowIndex--;
            await loadCurrentRow();
            updateNavigationUI();
        }
    }
}
```

**Updated code**:
```typescript
async function navigatePrevious() {
    if (currentRowIndex > 0) {
        // Guard clause: ignore if navigation already in progress
        if (isNavigating) return;

        isNavigating = true;
        try {
            const canProceed = await checkUnsavedChanges();
            if (canProceed) {
                currentRowIndex--;
                await loadCurrentRow();
                updateNavigationUI();
            }
        } finally {
            // Always reset flag, even if user cancels or error occurs
            isNavigating = false;
        }
    }
}
```

**Same pattern as navigateNext()** - copy the structure exactly.

---

### Step 4: Add Guard Clause to jumpToRow() (5 minutes)

**File**: `src/navigation.ts`
**Function**: `jumpToRow()` (around line 131)

**Current code**:
```typescript
export async function jumpToRow(index: number) {
    if (index >= 0 && index < totalRows) {
        const canProceed = await checkUnsavedChanges();
        if (canProceed) {
            currentRowIndex = index;
            await loadCurrentRow();
            updateNavigationUI();
        }
    }
}
```

**Updated code**:
```typescript
export async function jumpToRow(index: number) {
    if (index >= 0 && index < totalRows) {
        // Guard clause: ignore if navigation already in progress
        if (isNavigating) return;

        isNavigating = true;
        try {
            const canProceed = await checkUnsavedChanges();
            if (canProceed) {
                currentRowIndex = index;
                await loadCurrentRow();
                updateNavigationUI();
            }
        } finally {
            // Always reset flag, even if user cancels or error occurs
            isNavigating = false;
        }
    }
}
```

**Note**: `jumpToRow()` is public (exported), so guard clause is especially important here.

---

### Step 5: Manual Testing (10 minutes)

**Test the fix manually before writing automated tests**:

1. **Start development server**:
   ```bash
   npm run tauri dev
   ```

2. **Test Scenario 1: Rapid Next Button Clicks**
   - Open a CSV file with multiple rows
   - Double-click "Next" button rapidly
   - ✅ Expected: Move to row 2 (not row 3)
   - ✅ Expected: Button briefly disabled during navigation

3. **Test Scenario 2: Rapid Previous Button Clicks**
   - Navigate to row 5
   - Double-click "Previous" button rapidly
   - ✅ Expected: Move to row 4 (not row 3)

4. **Test Scenario 3: Keyboard Shortcuts**
   - Navigate to row 10
   - Press Ctrl+→ twice rapidly
   - ✅ Expected: Move to row 11 (not row 12)

5. **Test Scenario 4: Boundary Buttons**
   - Navigate to row 1 (first row)
   - ✅ Expected: "Previous" button disabled
   - Navigate to last row
   - ✅ Expected: "Next" button disabled

6. **Test Scenario 5: Save Prompt Cancellation**
   - Make an edit (change a field)
   - Click "Next" button
   - Click "Cancel" on save prompt
   - ✅ Expected: Stay on same row
   - Click "Next" button again
   - ✅ Expected: Navigate works (flag was cleared)

**If any test fails**: Check `finally` blocks are present and flag is being cleared.

---

### Step 6: Add Automated Tests (15-20 minutes)

**File**: `tests/frontend/navigation.test.ts`

**Add these test cases** at the end of the existing test suite:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Pagination Bug Fix - Debouncing', () => {
    it('should prevent double-click from incrementing index twice', async () => {
        // This test verifies the core bug fix
        // Setup: Initialize at row 5 of 100
        const initialIndex = 5;
        // Mock navigation state

        // Act: Simulate rapid double-click
        const promise1 = navigateNext();
        const promise2 = navigateNext(); // Immediate second call
        await Promise.all([promise1, promise2]);

        // Assert: Index should only increment once
        expect(getCurrentRowIndex()).toBe(initialIndex + 1);
    });

    it('should disable previous button at first row', () => {
        // Setup: Navigate to first row
        initializeNavigation(100);

        // Assert: Previous button should be disabled
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        expect(prevBtn.disabled).toBe(true);
    });

    it('should disable next button at last row', async () => {
        // Setup: Navigate to last row
        initializeNavigation(100);
        await jumpToRow(99); // 0-based, so 99 is last of 100

        // Assert: Next button should be disabled
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
        expect(nextBtn.disabled).toBe(true);
    });

    it('should allow sequential navigation after first completes', async () => {
        // This verifies flag cleanup works correctly
        // Setup: Start at row 5
        initializeNavigation(100);
        await jumpToRow(5);

        // Act: Navigate twice sequentially (not simultaneously)
        await navigateNext(); // Should succeed
        await navigateNext(); // Should also succeed (flag was cleared)

        // Assert: Should be at row 7 (5 + 1 + 1)
        expect(getCurrentRowIndex()).toBe(7);
    });

    it('should clear navigation flag after save prompt cancellation', async () => {
        // Setup: Make changes and navigate
        // Mock hasChanges() to return true
        // Mock confirm() to return false (user cancels)

        // Act: Click next (should prompt), user cancels
        await navigateNext();

        // Assert: Flag should be cleared, allowing next navigation
        // (This is tested implicitly by next test succeeding)
        await navigateNext();
        expect(getCurrentRowIndex()).toBe(/* expected value */);
    });
});
```

**Note**: These are **pseudo-code test templates**. You'll need to:
- Add proper mocking for `invoke()`, `checkUnsavedChanges()`, etc.
- Match the existing test patterns in the file
- Ensure DOM elements are properly mocked

**Run tests**:
```bash
npm test
```

**Expected**: All tests pass (20 existing + 5 new = 25 total)

---

### Step 7: Run Full Test Suite (5 minutes)

**Frontend Tests**:
```bash
npm test
```
Expected: ✅ 25 tests passing (20 existing + 5 new)

**Backend Tests**:
```bash
cd src-tauri && cargo test
```
Expected: ✅ 2 integration tests passing (no changes to backend)

**Performance Test**:
```bash
cd src-tauri && cargo test --test performance_test -- --nocapture
```
Expected: ✅ All performance targets met (< 0.1ms navigation, < 200MB memory)

**Linting**:
```bash
npm run lint
npm run format:check
```
Expected: ✅ No errors

---

### Step 8: Update Documentation (5 minutes)

**Update CHANGELOG** (if exists):
```markdown
### Fixed
- Pagination buttons now correctly navigate one page at a time (fixes double-click page skipping bug)
```

**Update Comments** in `src/navigation.ts`:
- Add comment above `isNavigating` flag explaining its purpose
- Ensure guard clause comments are clear and concise

---

## Verification Checklist

Before considering the fix complete, verify:

- ✅ All 3 navigation functions have guard clauses (`navigateNext`, `navigatePrevious`, `jumpToRow`)
- ✅ All 3 functions use `try-finally` blocks
- ✅ Flag is reset in **finally** block (not in try or catch)
- ✅ Manual testing passed all 5 scenarios
- ✅ Automated tests added (minimum 3-5 new tests)
- ✅ All tests pass (frontend + backend)
- ✅ No linting errors
- ✅ Performance test shows no regression
- ✅ Documentation updated (comments, CHANGELOG)

## Troubleshooting

### Problem: Flag Appears Stuck (Buttons Stay Disabled)

**Symptom**: After navigation, buttons remain disabled forever

**Cause**: `isNavigating` flag not being cleared

**Fix**: Ensure flag is in **finally** block, not inside try:
```typescript
try {
    // navigation logic
} finally {
    isNavigating = false; // ✅ Correct placement
}

// NOT like this:
try {
    // navigation logic
    isNavigating = false; // ❌ Wrong - won't run if error/return
}
```

---

### Problem: Double-Clicks Still Process

**Symptom**: Rapid clicks still increment index by 2

**Cause**: Guard clause is after async operations, not before

**Fix**: Place guard clause IMMEDIATELY after boundary check:
```typescript
if (currentRowIndex < totalRows - 1) {
    if (isNavigating) return; // ✅ Must be first async guard
    isNavigating = true;
    // ... rest of function
}
```

---

### Problem: Tests Fail Due to Timing Issues

**Symptom**: Intermittent test failures, especially in CI

**Cause**: Tests not properly awaiting async operations

**Fix**: Ensure all navigation calls are awaited:
```typescript
await navigateNext(); // ✅ Correct
navigateNext();       // ❌ Wrong - doesn't wait for completion
```

---

## Next Steps

After implementation:

1. **Create PR**:
   ```bash
   git add src/navigation.ts tests/frontend/navigation.test.ts
   git commit -m "fix(navigation): prevent page skipping from double-clicks

   - Add isNavigating debounce flag to prevent concurrent navigation
   - Add guard clauses to navigateNext, navigatePrevious, jumpToRow
   - Add 5 new tests covering debouncing and boundary behavior
   - Fixes #XXX (replace with issue number)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

2. **Push branch**:
   ```bash
   git push origin 002-fix-pagination-skip
   ```

3. **Create Pull Request** on GitHub with:
   - Link to spec.md
   - Manual testing results (screenshots/video optional)
   - Test coverage report
   - Performance test results

4. **Request Review** from maintainer

## Time Breakdown

| Step | Estimated Time |
|------|---------------|
| Add debounce flag | 2 minutes |
| Update navigateNext() | 5 minutes |
| Update navigatePrevious() | 5 minutes |
| Update jumpToRow() | 5 minutes |
| Manual testing | 10 minutes |
| Write automated tests | 15-20 minutes |
| Run full test suite | 5 minutes |
| Update documentation | 5 minutes |
| **Total** | **30-45 minutes** |

## Summary

The pagination bug fix is a straightforward implementation that:
- ✅ Adds 1 boolean flag (`isNavigating`)
- ✅ Adds guard clauses to 3 functions
- ✅ Uses try-finally for reliable cleanup
- ✅ Maintains 100% backward compatibility
- ✅ Requires 3-5 new tests

**Complexity**: Low - Standard debounce pattern with clear guard clauses

**Risk**: Very Low - Isolated change, existing functionality preserved, comprehensive tests

**Impact**: High - Fixes critical UX bug affecting all users
