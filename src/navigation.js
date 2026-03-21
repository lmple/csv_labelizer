import { invoke } from '@tauri-apps/api/core';
import { renderEditorForm, hasChanges, markAsSaved } from './editor';
import { loadImage } from './image-preview';
let currentRowIndex = 0;
let totalRows = 0;
let isNavigating = false; // Debounce flag to prevent concurrent navigation
let saveCurrentRowCallback = null;
export function initializeNavigation(rowCount) {
    totalRows = rowCount;
    currentRowIndex = 0;
    setupNavigationButtons();
    setupKeyboardShortcuts();
    updateNavigationUI();
}
export function getCurrentRowIndex() {
    return currentRowIndex;
}
export function setSaveCallback(callback) {
    saveCurrentRowCallback = callback;
}
async function checkUnsavedChanges() {
    if (!hasChanges()) {
        return true; // No changes, proceed
    }
    const choice = confirm('You have unsaved changes. Do you want to save before navigating?\n\n' +
        'Click "OK" to save and navigate, or "Cancel" to discard changes and navigate.');
    if (choice && saveCurrentRowCallback) {
        // User chose to save
        try {
            await saveCurrentRowCallback();
            return true;
        }
        catch (error) {
            alert(`Failed to save: ${error}`);
            return false; // Don't navigate if save failed
        }
    }
    // User chose to discard changes
    markAsSaved(); // Clear the unsaved flag
    return true;
}
function setupNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const jumpBtn = document.getElementById('jump-btn');
    const jumpInput = document.getElementById('jump-input');
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            await navigatePrevious();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            await navigateNext();
        });
    }
    if (jumpBtn && jumpInput) {
        jumpBtn.addEventListener('click', async () => {
            const value = parseInt(jumpInput.value);
            if (!isNaN(value) && value >= 1 && value <= totalRows) {
                await jumpToRow(value - 1);
                jumpInput.value = '';
            }
            else {
                alert(`Please enter a row number between 1 and ${totalRows}`);
            }
        });
        jumpInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const value = parseInt(jumpInput.value);
                if (!isNaN(value) && value >= 1 && value <= totalRows) {
                    await jumpToRow(value - 1);
                    jumpInput.value = '';
                }
                else {
                    alert(`Please enter a row number between 1 and ${totalRows}`);
                }
            }
        });
    }
}
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
        // Use Ctrl+Arrow keys to avoid interfering with input fields
        if (e.ctrlKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            await navigatePrevious();
        }
        else if (e.ctrlKey && e.key === 'ArrowRight') {
            e.preventDefault();
            await navigateNext();
        }
    });
}
async function navigateNext() {
    if (currentRowIndex < totalRows - 1) {
        // Guard clause: ignore if navigation already in progress (prevents double-click bug)
        if (isNavigating)
            return;
        isNavigating = true;
        try {
            const canProceed = await checkUnsavedChanges();
            if (canProceed) {
                currentRowIndex++;
                await loadCurrentRow();
                updateNavigationUI();
            }
        }
        finally {
            // Always reset flag, even if user cancels or error occurs
            isNavigating = false;
        }
    }
}
async function navigatePrevious() {
    if (currentRowIndex > 0) {
        // Guard clause: ignore if navigation already in progress (prevents double-click bug)
        if (isNavigating)
            return;
        isNavigating = true;
        try {
            const canProceed = await checkUnsavedChanges();
            if (canProceed) {
                currentRowIndex--;
                await loadCurrentRow();
                updateNavigationUI();
            }
        }
        finally {
            // Always reset flag, even if user cancels or error occurs
            isNavigating = false;
        }
    }
}
export async function jumpToRow(index) {
    if (index >= 0 && index < totalRows) {
        // Guard clause: ignore if navigation already in progress (prevents double-click bug)
        if (isNavigating)
            return;
        isNavigating = true;
        try {
            const canProceed = await checkUnsavedChanges();
            if (canProceed) {
                currentRowIndex = index;
                await loadCurrentRow();
                updateNavigationUI();
            }
        }
        finally {
            // Always reset flag, even if user cancels or error occurs
            isNavigating = false;
        }
    }
}
async function loadCurrentRow() {
    // Disable navigation during loading
    setNavigationEnabled(false);
    try {
        const rowData = await invoke('get_row', { index: currentRowIndex });
        renderEditorForm(rowData);
        await loadImage(rowData);
    }
    catch (error) {
        console.error('Failed to load row:', error);
        alert(`Failed to load row: ${error}`);
    }
    finally {
        // Re-enable navigation
        setNavigationEnabled(true);
    }
}
function setNavigationEnabled(enabled) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const jumpBtn = document.getElementById('jump-btn');
    const jumpInput = document.getElementById('jump-input');
    if (prevBtn)
        prevBtn.disabled = !enabled || currentRowIndex === 0;
    if (nextBtn)
        nextBtn.disabled = !enabled || currentRowIndex === totalRows - 1;
    if (jumpBtn)
        jumpBtn.disabled = !enabled;
    if (jumpInput)
        jumpInput.disabled = !enabled;
    // Show loading cursor
    document.body.style.cursor = enabled ? 'default' : 'wait';
}
function updateNavigationUI() {
    const rowCounter = document.getElementById('row-counter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (rowCounter) {
        rowCounter.textContent = `Row ${currentRowIndex + 1} of ${totalRows}`;
    }
    if (prevBtn) {
        prevBtn.disabled = currentRowIndex === 0;
    }
    if (nextBtn) {
        nextBtn.disabled = currentRowIndex === totalRows - 1;
    }
}
