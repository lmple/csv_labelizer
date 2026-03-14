import { invoke } from '@tauri-apps/api/core';
let searchResults = [];
let currentSearchIndex = -1;
let isSearchActive = false;
export function initializeSearch(metadata, jumpToRowCallback) {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchColumnSelect = document.getElementById('search-column');
    const searchPrevBtn = document.getElementById('search-prev-btn');
    const searchNextBtn = document.getElementById('search-next-btn');
    // Populate column dropdown
    if (searchColumnSelect) {
        searchColumnSelect.innerHTML = '<option value="">All columns</option>';
        metadata.headers.forEach((header, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = header;
            searchColumnSelect.appendChild(option);
        });
    }
    // Search button click
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            await performSearch(searchInput, searchColumnSelect);
        });
    }
    // Search on Enter key
    if (searchInput) {
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await performSearch(searchInput, searchColumnSelect);
            }
        });
    }
    // Previous result
    if (searchPrevBtn) {
        searchPrevBtn.addEventListener('click', () => {
            navigateSearchResults(-1, jumpToRowCallback);
        });
    }
    // Next result
    if (searchNextBtn) {
        searchNextBtn.addEventListener('click', () => {
            navigateSearchResults(1, jumpToRowCallback);
        });
    }
}
async function performSearch(searchInput, searchColumnSelect) {
    const query = searchInput.value.trim();
    if (!query) {
        clearSearch();
        return;
    }
    const columnIndex = searchColumnSelect.value ? parseInt(searchColumnSelect.value) : null;
    try {
        const results = await invoke('search_rows', {
            query,
            columnIndex,
        });
        searchResults = results;
        currentSearchIndex = results.length > 0 ? 0 : -1;
        isSearchActive = true;
        updateSearchUI();
        // Show toast with result count
        showSearchToast(`Found ${results.length} matching row(s)`);
    }
    catch (error) {
        console.error('Search failed:', error);
        alert(`Search failed: ${error}`);
    }
}
function navigateSearchResults(direction, jumpToRowCallback) {
    if (!isSearchActive || searchResults.length === 0) {
        return;
    }
    currentSearchIndex += direction;
    // Wrap around
    if (currentSearchIndex < 0) {
        currentSearchIndex = searchResults.length - 1;
    }
    else if (currentSearchIndex >= searchResults.length) {
        currentSearchIndex = 0;
    }
    updateSearchUI();
    // Jump to the row
    const rowIndex = searchResults[currentSearchIndex];
    jumpToRowCallback(rowIndex);
}
function updateSearchUI() {
    const searchResultsDiv = document.getElementById('search-results');
    const searchResultCount = document.getElementById('search-result-count');
    const searchCurrent = document.getElementById('search-current');
    const searchPrevBtn = document.getElementById('search-prev-btn');
    const searchNextBtn = document.getElementById('search-next-btn');
    if (!searchResultsDiv)
        return;
    if (isSearchActive && searchResults.length > 0) {
        searchResultsDiv.style.display = 'flex';
        if (searchResultCount) {
            searchResultCount.textContent = `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`;
        }
        if (searchCurrent) {
            searchCurrent.textContent = `${currentSearchIndex + 1} of ${searchResults.length}`;
        }
        if (searchPrevBtn)
            searchPrevBtn.disabled = false;
        if (searchNextBtn)
            searchNextBtn.disabled = false;
    }
    else if (isSearchActive && searchResults.length === 0) {
        searchResultsDiv.style.display = 'flex';
        if (searchResultCount) {
            searchResultCount.textContent = 'No results';
        }
        if (searchCurrent) {
            searchCurrent.textContent = '-';
        }
        if (searchPrevBtn)
            searchPrevBtn.disabled = true;
        if (searchNextBtn)
            searchNextBtn.disabled = true;
    }
    else {
        searchResultsDiv.style.display = 'none';
    }
}
function clearSearch() {
    searchResults = [];
    currentSearchIndex = -1;
    isSearchActive = false;
    updateSearchUI();
}
function showSearchToast(message) {
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
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 2000);
}
export function clearSearchOnNewFile() {
    clearSearch();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
}
