import { invoke } from '@tauri-apps/api/core';
import { RowData } from './types';
import { renderEditorForm } from './editor';
import { loadImage } from './image-preview';

let currentRowIndex: number = 0;
let totalRows: number = 0;

export function initializeNavigation(rowCount: number) {
    totalRows = rowCount;
    currentRowIndex = 0;

    setupNavigationButtons();
    setupKeyboardShortcuts();
    updateNavigationUI();
}

export function getCurrentRowIndex(): number {
    return currentRowIndex;
}

function setupNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const jumpBtn = document.getElementById('jump-btn');
    const jumpInput = document.getElementById('jump-input') as HTMLInputElement;

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
            } else {
                alert(`Please enter a row number between 1 and ${totalRows}`);
            }
        });

        jumpInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const value = parseInt(jumpInput.value);
                if (!isNaN(value) && value >= 1 && value <= totalRows) {
                    await jumpToRow(value - 1);
                    jumpInput.value = '';
                } else {
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
        } else if (e.ctrlKey && e.key === 'ArrowRight') {
            e.preventDefault();
            await navigateNext();
        }
    });
}

async function navigateNext() {
    if (currentRowIndex < totalRows - 1) {
        currentRowIndex++;
        await loadCurrentRow();
        updateNavigationUI();
    }
}

async function navigatePrevious() {
    if (currentRowIndex > 0) {
        currentRowIndex--;
        await loadCurrentRow();
        updateNavigationUI();
    }
}

async function jumpToRow(index: number) {
    if (index >= 0 && index < totalRows) {
        currentRowIndex = index;
        await loadCurrentRow();
        updateNavigationUI();
    }
}

async function loadCurrentRow() {
    try {
        const rowData: RowData = await invoke('get_row', { index: currentRowIndex });
        renderEditorForm(rowData);
        await loadImage(rowData);
    } catch (error) {
        console.error('Failed to load row:', error);
        alert(`Failed to load row: ${error}`);
    }
}

function updateNavigationUI() {
    const rowCounter = document.getElementById('row-counter');
    const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;

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
