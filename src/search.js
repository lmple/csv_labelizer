import { invoke } from '@tauri-apps/api/core';
let searchResults = [];
let currentSearchIndex = -1;
let isSearchActive = false;
let isAdvancedMode = false;
let advancedFilters = [];
let filterLogic = 'AND';
let cachedHeaders = [];
let jumpToRowCb = null;
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
    // Advanced search toggle
    const advancedToggleBtn = document.getElementById('advanced-toggle-btn');
    if (advancedToggleBtn) {
        advancedToggleBtn.addEventListener('click', () => {
            toggleAdvancedSearch();
        });
    }
    // Add filter button
    const addFilterBtn = document.getElementById('add-filter-btn');
    if (addFilterBtn) {
        addFilterBtn.addEventListener('click', () => {
            addFilterRow();
        });
    }
    // Advanced search button
    const advancedSearchBtn = document.getElementById('advanced-search-btn');
    if (advancedSearchBtn) {
        advancedSearchBtn.addEventListener('click', async () => {
            await performAdvancedSearch();
        });
    }
    // Logic toggle radio buttons
    const logicRadios = document.querySelectorAll('input[name="filter-logic"]');
    logicRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            filterLogic = e.target.value;
        });
    });
    // Store headers and callback for filter row creation
    cachedHeaders = metadata.headers;
    jumpToRowCb = jumpToRowCallback;
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
function toggleAdvancedSearch() {
    isAdvancedMode = !isAdvancedMode;
    const advancedPanel = document.getElementById('advanced-search-panel');
    const toggleBtn = document.getElementById('advanced-toggle-btn');
    const simpleSearchInput = document.getElementById('search-input');
    const simpleSearchColumn = document.getElementById('search-column');
    const simpleSearchBtn = document.getElementById('search-btn');
    if (isAdvancedMode) {
        // Show advanced panel, disable simple search
        if (advancedPanel)
            advancedPanel.style.display = 'block';
        if (toggleBtn)
            toggleBtn.classList.add('active');
        if (simpleSearchInput)
            simpleSearchInput.disabled = true;
        if (simpleSearchColumn)
            simpleSearchColumn.disabled = true;
        if (simpleSearchBtn)
            simpleSearchBtn.disabled = true;
        // Initialize with 2 empty filter rows
        advancedFilters = [];
        renderFilterRows();
        addFilterRow();
        addFilterRow();
    }
    else {
        // Hide advanced panel, re-enable simple search
        if (advancedPanel)
            advancedPanel.style.display = 'none';
        if (toggleBtn)
            toggleBtn.classList.remove('active');
        if (simpleSearchInput)
            simpleSearchInput.disabled = false;
        if (simpleSearchColumn)
            simpleSearchColumn.disabled = false;
        if (simpleSearchBtn)
            simpleSearchBtn.disabled = false;
        advancedFilters = [];
    }
    // Clear results when switching modes
    clearSearch();
}
function addFilterRow() {
    advancedFilters.push({ column_index: 0, query: '', exact: false });
    renderFilterRows();
}
function removeFilterRow(index) {
    if (advancedFilters.length <= 1)
        return;
    advancedFilters.splice(index, 1);
    renderFilterRows();
}
function renderFilterRows() {
    const container = document.getElementById('filter-rows-container');
    if (!container)
        return;
    container.innerHTML = '';
    advancedFilters.forEach((filter, index) => {
        const row = document.createElement('div');
        row.className = 'filter-row';
        const select = document.createElement('select');
        cachedHeaders.forEach((header, colIdx) => {
            const option = document.createElement('option');
            option.value = colIdx.toString();
            option.textContent = header;
            if (colIdx === filter.column_index)
                option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', () => {
            advancedFilters[index].column_index = parseInt(select.value);
        });
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Search in ${cachedHeaders[filter.column_index] || 'column'}...`;
        input.value = filter.query;
        input.addEventListener('input', () => {
            advancedFilters[index].query = input.value;
        });
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await performAdvancedSearch();
            }
        });
        const exactBtn = document.createElement('button');
        exactBtn.className = 'btn-exact-filter' + (filter.exact ? ' active' : '');
        exactBtn.textContent = '=';
        exactBtn.title = filter.exact ? 'Exact match (click to switch to contains)' : 'Contains match (click to switch to exact)';
        exactBtn.addEventListener('click', () => {
            advancedFilters[index].exact = !advancedFilters[index].exact;
            exactBtn.classList.toggle('active');
            exactBtn.title = advancedFilters[index].exact
                ? 'Exact match (click to switch to contains)'
                : 'Contains match (click to switch to exact)';
        });
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove-filter';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove filter';
        removeBtn.addEventListener('click', () => {
            removeFilterRow(index);
        });
        row.appendChild(select);
        row.appendChild(input);
        row.appendChild(exactBtn);
        row.appendChild(removeBtn);
        container.appendChild(row);
    });
}
async function performAdvancedSearch() {
    // Collect non-empty filters
    const activeFilters = advancedFilters.filter(f => f.query.trim() !== '');
    if (activeFilters.length === 0) {
        showSearchToast('No search query');
        clearSearch();
        return;
    }
    try {
        const results = await invoke('advanced_search_rows', {
            filters: activeFilters,
            logic: filterLogic,
        });
        searchResults = results;
        currentSearchIndex = results.length > 0 ? 0 : -1;
        isSearchActive = true;
        updateSearchUI();
        showSearchToast(`Found ${results.length} matching row(s)`);
        if (results.length > 0 && jumpToRowCb) {
            jumpToRowCb(results[0]);
        }
    }
    catch (error) {
        console.error('Advanced search failed:', error);
        alert(`Search failed: ${error}`);
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
    // Reset to simple mode if in advanced
    if (isAdvancedMode) {
        toggleAdvancedSearch();
    }
    clearSearch();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
}
