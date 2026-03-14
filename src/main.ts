import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { CsvMetadata, RowData, ClassValuesMap } from './types';
import { initializeEditor, renderEditorForm, getFieldValues, markAsSaved } from './editor';
import {
    initializeImagePreview,
    loadImage,
} from './image-preview';
import { initializeNavigation, getCurrentRowIndex } from './navigation';

console.log('CSV Labelizer starting...');

let isFileOpen = false;

/**
 * Initialize the application
 */
async function initialize() {
    console.log('Initializing CSV Labelizer...');

    const openBtn = document.getElementById('open-csv-btn');
    const openBtnWelcome = document.getElementById('open-csv-btn-welcome');
    const saveBtn = document.getElementById('save-btn');

    if (openBtn) {
        openBtn.addEventListener('click', openCsvFile);
        console.log('Header open button listener attached');
    } else {
        console.error('Header open button not found!');
    }

    // Handle welcome screen button directly
    if (openBtnWelcome) {
        openBtnWelcome.addEventListener('click', openCsvFile);
        console.log('Welcome open button listener attached');
    } else {
        console.error('Welcome open button not found!');
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentRow);
    }

    // Keyboard shortcut for save (Ctrl+S)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (isFileOpen) {
                saveCurrentRow();
            }
        }
    });

    console.log('Application initialized successfully');
}

/**
 * Open CSV file dialog and load the file
 */
async function openCsvFile() {
    console.log('openCsvFile() called!');

    try {
        console.log('Showing file picker dialog...');

        // Show file picker
        const selected = await open({
            multiple: false,
            filters: [
                {
                    name: 'CSV Files',
                    extensions: ['csv', 'txt'],
                },
            ],
        });

        console.log('File picker returned:', selected);

        if (!selected || typeof selected !== 'string') {
            console.log('No file selected or invalid selection');
            return;
        }

        console.log('Opening CSV file:', selected);

        // Show loading state
        showLoading('Loading CSV file...');

        // Call Tauri command to open CSV
        const metadata: CsvMetadata = await invoke('open_csv', { path: selected });

        console.log('CSV opened:', metadata);

        // Get class columns data
        const classValues: ClassValuesMap = await invoke('get_class_columns');

        // Initialize components
        initializeEditor(metadata, classValues);
        initializeImagePreview(metadata);
        initializeNavigation(metadata.row_count);

        // Update status bar
        updateStatusBar(selected, metadata);

        // Load first row
        const firstRow: RowData = await invoke('get_row', { index: 0 });
        renderEditorForm(firstRow);
        await loadImage(firstRow);

        isFileOpen = true;

        // Enable save button
        const saveBtn = document.getElementById('save-btn') as HTMLButtonElement | null;
        if (saveBtn) {
            saveBtn.disabled = false;
        }

        // Hide loading, show main UI
        hideLoading();
        showMainUI();

        // Hide welcome screen
        const welcomeScreen = document.querySelector('.welcome-screen') as HTMLElement | null;
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }

        showToast('CSV file loaded successfully');
    } catch (error) {
        console.error('Failed to open CSV:', error);
        console.error('Error details:', error);
        hideLoading();
        alert(`Failed to open CSV file: ${error}`);
    }
}

// Add a test function that can be called from console
(window as any).testOpenFile = openCsvFile;

/**
 * Save the current row
 */
async function saveCurrentRow() {
    if (!isFileOpen) {
        return;
    }

    try {
        const fields = getFieldValues();
        const index = getCurrentRowIndex();

        await invoke('save_row', { index, fields });

        markAsSaved();
        showToast('Row saved successfully');
    } catch (error) {
        console.error('Failed to save row:', error);
        alert(`Failed to save row: ${error}`);
    }
}

/**
 * Update the status bar
 */
function updateStatusBar(filePath: string, metadata: CsvMetadata) {
    const filePathEl = document.getElementById('status-file-path');
    const rowCountEl = document.getElementById('status-row-count');
    const delimiterEl = document.getElementById('status-delimiter');

    if (filePathEl) {
        filePathEl.textContent = filePath;
    }

    if (rowCountEl) {
        rowCountEl.textContent = `${metadata.row_count} rows`;
    }

    if (delimiterEl) {
        const delimiterName =
            metadata.delimiter === ','
                ? 'Comma'
                : metadata.delimiter === ';'
                ? 'Semicolon'
                : metadata.delimiter === '\t'
                ? 'Tab'
                : metadata.delimiter;
        delimiterEl.textContent = `Delimiter: ${delimiterName}`;
    }
}

/**
 * Show loading screen
 */
function showLoading(message: string) {
    // Hide welcome screen
    const welcomeScreen = document.querySelector('.welcome-screen') as HTMLElement;
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Create or show loading overlay
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.className = 'loading-screen';
        document.body.appendChild(loadingOverlay);
    }

    loadingOverlay.innerHTML = `
        <div class="spinner"></div>
        <p>${message}</p>
    `;
    loadingOverlay.style.display = 'flex';
}

/**
 * Hide loading screen and show main UI
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Show main UI
 */
function showMainUI() {
    const editorSection = document.getElementById('editor-section');
    if (editorSection) {
        editorSection.style.display = 'flex';
    }
}

/**
 * Show a toast notification
 */
function showToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
