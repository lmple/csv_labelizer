import { RowData, CsvMetadata, ClassValuesMap } from './types';

let currentMetadata: CsvMetadata | null = null;
let currentRowIndex: number = 0;
let classValuesMap: ClassValuesMap = {};
let hasUnsavedChanges: boolean = false;

export function initializeEditor(metadata: CsvMetadata, classValues: ClassValuesMap) {
    currentMetadata = metadata;
    classValuesMap = classValues;
    currentRowIndex = 0;
    hasUnsavedChanges = false;
}

export function renderEditorForm(rowData: RowData) {
    if (!currentMetadata) {
        console.error('Editor not initialized');
        return;
    }

    const formContainer = document.getElementById('editor-form');
    if (!formContainer) {
        console.error('Editor form container not found');
        return;
    }

    formContainer.innerHTML = '';

    currentMetadata.headers.forEach((header, index) => {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'field-container';

        const label = document.createElement('label');
        label.textContent = header;
        label.htmlFor = `field-${index}`;
        fieldContainer.appendChild(label);

        const value = rowData.fields[index] || '';
        const isClassColumn = classValuesMap.hasOwnProperty(index);

        if (isClassColumn) {
            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'class-field-wrapper';

            const select = document.createElement('select');
            select.id = `field-${index}`;
            select.className = 'class-field';

            const classValues = classValuesMap[index] || [];
            classValues.forEach((optionValue) => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                if (optionValue === value) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            select.addEventListener('change', () => {
                hasUnsavedChanges = true;
                updateUnsavedIndicator();
            });

            selectWrapper.appendChild(select);

            const addButton = document.createElement('button');
            addButton.textContent = '+ Add New';
            addButton.className = 'add-class-btn';
            addButton.type = 'button';
            addButton.addEventListener('click', () => addNewClassValue(index));
            selectWrapper.appendChild(addButton);

            fieldContainer.appendChild(selectWrapper);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `field-${index}`;
            input.className = 'text-field';
            input.value = value;

            input.addEventListener('input', () => {
                hasUnsavedChanges = true;
                updateUnsavedIndicator();
            });

            fieldContainer.appendChild(input);
        }

        formContainer.appendChild(fieldContainer);
    });

    currentRowIndex = rowData.row_index;
}

export function getFieldValues(): string[] {
    if (!currentMetadata) {
        return [];
    }

    const values: string[] = [];

    currentMetadata.headers.forEach((_, index) => {
        const field = document.getElementById(`field-${index}`) as
            | HTMLInputElement
            | HTMLSelectElement
            | null;

        if (field) {
            values.push(field.value);
        } else {
            values.push('');
        }
    });

    return values;
}

async function addNewClassValue(columnIndex: number) {
    const newValue = prompt('Enter new class value:');

    if (!newValue || newValue.trim() === '') {
        return;
    }

    const trimmedValue = newValue.trim();

    try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('add_class_value', {
            columnIndex,
            newValue: trimmedValue,
        });

        if (!classValuesMap[columnIndex]) {
            classValuesMap[columnIndex] = [];
        }

        if (!classValuesMap[columnIndex].includes(trimmedValue)) {
            classValuesMap[columnIndex].push(trimmedValue);
            classValuesMap[columnIndex].sort();
        }

        const currentValues = getFieldValues();
        renderEditorForm({
            fields: currentValues,
            row_index: currentRowIndex,
        });

        showToast(`Added new class value: ${trimmedValue}`);
    } catch (error) {
        console.error('Failed to add class value:', error);
        alert(`Failed to add class value: ${error}`);
    }
}

function updateUnsavedIndicator() {
    const indicator = document.getElementById('unsaved-indicator');
    if (indicator) {
        indicator.style.display = hasUnsavedChanges ? 'inline' : 'none';
    }
}

export function markAsSaved() {
    hasUnsavedChanges = false;
    updateUnsavedIndicator();
}

export function hasChanges(): boolean {
    return hasUnsavedChanges;
}

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
