import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { initializeEditor, renderEditorForm, getFieldValues, markAsSaved, /* hasChanges, */ undo, redo, canUndo, canRedo } from './editor';
import { initializeImagePreview, loadImage, } from './image-preview';
import { initializeNavigation, getCurrentRowIndex, setSaveCallback, jumpToRow } from './navigation';
import { initializeSearch, clearSearchOnNewFile } from './search';
console.log('CSV Labelizer starting...');
let isFileOpen = false;
let currentFilePath = '';
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
    }
    else {
        console.error('Header open button not found!');
    }
    // Handle welcome screen button directly
    if (openBtnWelcome) {
        openBtnWelcome.addEventListener('click', openCsvFile);
        console.log('Welcome open button listener attached');
    }
    else {
        console.error('Welcome open button not found!');
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentRow);
    }
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (isFileOpen) {
                saveCurrentRow();
            }
        }
        // Ctrl+Z - Undo
        else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (isFileOpen && canUndo()) {
                undo();
                showToast('Undo');
            }
        }
        // Ctrl+Y or Ctrl+Shift+Z - Redo
        else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            if (isFileOpen && canRedo()) {
                redo();
                showToast('Redo');
            }
        }
    });
    // Prevent window close with unsaved changes
    // TODO: Re-enable after fixing
    // setupCloseWarning();
    console.log('Application initialized successfully');
}
/**
 * Setup window close warning for unsaved changes
 * TODO: Fix and re-enable this feature - currently disabled due to close handler issues
 */
/* async function setupCloseWarning() {
    try {
        const appWindow = getCurrentWindow();

        await appWindow.onCloseRequested((event) => {
            if (isFileOpen && hasChanges()) {
                // Show confirmation dialog - this will block
                const shouldClose = confirm(
                    'You have unsaved changes. Do you want to close anyway?\n\n' +
                    'Click "OK" to close without saving, or "Cancel" to go back and save your changes.'
                );

                if (!shouldClose) {
                    // User wants to cancel - prevent close
                    event.preventDefault();
                }
                // If user clicked OK, we don't prevent - window will close
            }
            // If no unsaved changes or no file open, allow close to proceed
        });
    } catch (error) {
        console.error('Failed to setup close warning:', error);
    }
} */
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
        // Store the current file path
        currentFilePath = selected;
        // Show loading state
        showLoading('Loading CSV file...');
        // Call Tauri command to open CSV
        const metadata = await invoke('open_csv', { path: selected });
        console.log('CSV opened:', metadata);
        // Get class columns data
        const classValues = await invoke('get_class_columns');
        // Initialize components
        initializeEditor(metadata, classValues);
        initializeImagePreview(metadata);
        initializeNavigation(metadata.row_count);
        setSaveCallback(saveCurrentRow);
        initializeSearch(metadata, jumpToRow);
        clearSearchOnNewFile();
        // Update status bar
        updateStatusBar(selected, metadata);
        // Load first row
        const firstRow = await invoke('get_row', { index: 0 });
        renderEditorForm(firstRow);
        await loadImage(firstRow);
        isFileOpen = true;
        // Enable save button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
        // Hide loading, show main UI
        hideLoading();
        showMainUI();
        // Hide welcome screen
        const welcomeScreen = document.querySelector('.welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
        showToast('CSV file loaded successfully');
    }
    catch (error) {
        console.error('Failed to open CSV:', error);
        console.error('Error details:', error);
        hideLoading();
        // Better error messages
        let errorMessage = 'Failed to open CSV file';
        if (error instanceof Error) {
            if (error.message.includes('permission')) {
                errorMessage = 'Permission denied. Please check file permissions.';
            }
            else if (error.message.includes('not found')) {
                errorMessage = 'File not found. Please verify the file path.';
            }
            else if (error.message.includes('delimiter')) {
                errorMessage = 'Could not detect CSV delimiter. Please check file format.';
            }
            else {
                errorMessage = `Failed to open CSV file: ${error.message}`;
            }
        }
        alert(errorMessage);
        showToast(`Error: ${errorMessage}`);
    }
}
// Add a test function that can be called from console
window.testOpenFile = openCsvFile;
/**
 * Save the current row with retry logic
 */
async function saveCurrentRow() {
    if (!isFileOpen) {
        return;
    }
    const fields = getFieldValues();
    const index = getCurrentRowIndex();
    let retryCount = 0;
    const maxRetries = 3;
    while (retryCount <= maxRetries) {
        try {
            await invoke('save_row', { index, fields });
            markAsSaved();
            showToast('Row saved successfully');
            return; // Success, exit
        }
        catch (error) {
            console.error(`Save attempt ${retryCount + 1} failed:`, error);
            // Determine error type
            let errorType = 'unknown';
            let errorMessage = 'Failed to save changes';
            if (error instanceof Error) {
                if (error.message.includes('permission') || error.message.includes('denied')) {
                    errorType = 'permission';
                    errorMessage = 'Permission denied. The file may be read-only or locked by another program.';
                }
                else if (error.message.includes('disk') || error.message.includes('space')) {
                    errorType = 'disk_space';
                    errorMessage = 'Insufficient disk space. Please free up some space and try again.';
                }
                else if (error.message.includes('locked') || error.message.includes('in use')) {
                    errorType = 'file_locked';
                    errorMessage = 'File is temporarily locked by another process.';
                }
                else if (error.message.includes('modified')) {
                    errorType = 'file_modified';
                    errorMessage = 'File was modified by another program. Please reload and try again.';
                }
                else {
                    errorMessage = `Failed to save: ${error.message}`;
                }
            }
            // For permanent errors, don't retry
            if (errorType === 'permission') {
                // Offer "Save As" option for permission errors
                const shouldSaveAs = confirm(`${errorMessage}\n\nWould you like to save to a different location instead?`);
                if (shouldSaveAs) {
                    const success = await saveAsCurrentRow(fields, index);
                    if (success) {
                        showToast('File saved to new location');
                        return;
                    }
                }
                showToast(`Error: ${errorMessage}`);
                return;
            }
            if (errorType === 'file_modified') {
                alert(errorMessage);
                showToast(`Error: ${errorMessage}`);
                return;
            }
            // For disk space, don't retry automatically but allow user choice
            if (errorType === 'disk_space') {
                const shouldRetry = confirm(`${errorMessage}\n\nDo you want to retry after freeing up disk space?`);
                if (!shouldRetry) {
                    showToast(`Error: ${errorMessage}`);
                    return;
                }
                retryCount++;
                continue;
            }
            // For transient errors (file_locked, unknown), offer retry
            if (retryCount < maxRetries) {
                const shouldRetry = confirm(`${errorMessage}\n\nAttempt ${retryCount + 1} of ${maxRetries + 1} failed.\n\nDo you want to retry?`);
                if (!shouldRetry) {
                    showToast(`Error: ${errorMessage}`);
                    return;
                }
                retryCount++;
                // Small delay before retry (500ms)
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            else {
                // Max retries reached
                alert(`${errorMessage}\n\nFailed after ${maxRetries + 1} attempts. Please check the file and try again later.`);
                showToast(`Error: Save failed after ${maxRetries + 1} attempts`);
                return;
            }
        }
    }
}
/**
 * Save current row to a new file location
 */
async function saveAsCurrentRow(fields, index) {
    try {
        // Show save dialog
        const newPath = await save({
            filters: [
                {
                    name: 'CSV Files',
                    extensions: ['csv'],
                },
            ],
        });
        if (!newPath || typeof newPath !== 'string') {
            return false; // User cancelled
        }
        // Copy the file and save the row to the new location
        await invoke('copy_and_save', {
            sourcePath: currentFilePath,
            destPath: newPath,
            rowIndex: index,
            fields: fields,
        });
        // Reload the CSV from the new location
        const metadata = await invoke('open_csv', { path: newPath });
        const classValues = await invoke('get_class_columns');
        // Update current file path
        currentFilePath = newPath;
        initializeEditor(metadata, classValues);
        initializeImagePreview(metadata);
        updateStatusBar(newPath, metadata);
        markAsSaved();
        return true;
    }
    catch (error) {
        console.error('Save As failed:', error);
        alert(`Failed to save to new location: ${error}`);
        return false;
    }
}
/**
 * Update the status bar
 */
function updateStatusBar(filePath, metadata) {
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
        const delimiterName = metadata.delimiter === ','
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
function showLoading(message) {
    // Hide welcome screen
    const welcomeScreen = document.querySelector('.welcome-screen');
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
function showToast(message) {
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
// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('An unexpected error occurred. Please check the console for details.');
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred. Please check the console for details.');
});
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
}
else {
    initialize();
}
