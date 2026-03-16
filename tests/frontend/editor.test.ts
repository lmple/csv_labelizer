import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Editor Integration Tests
 * Tests for class dropdown empty value preservation
 */

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><div id="editor-form"></div><div id="unsaved-indicator"></div>');
global.document = dom.window.document as unknown as Document;
global.HTMLElement = dom.window.HTMLElement as unknown as typeof HTMLElement;
global.Event = dom.window.Event as unknown as typeof Event;

// Import after DOM setup
import { initializeEditor, renderEditorForm, getFieldValues } from '../../src/editor';
import type { CsvMetadata, ClassValuesMap, RowData } from '../../src/types';

describe('Class Dropdown Empty Value Preservation', () => {
    let mockMetadata: CsvMetadata;
    let mockClassValuesMap: ClassValuesMap;

    beforeEach(() => {
        // Reset DOM
        const formContainer = document.getElementById('editor-form');
        if (formContainer) {
            formContainer.innerHTML = '';
        }

        // Setup metadata
        mockMetadata = {
            headers: ['IMAGE_PATH', 'ANIMAL_CLASS', 'SCENE_CLASS', 'NOTES'],
            row_count: 5,
            csv_dir: '/test',
            image_column: 0,
            delimiter: ','
        };

        // Setup class values
        mockClassValuesMap = {
            1: ['Cat', 'Dog', 'Bird'],       // ANIMAL_CLASS
            2: ['Indoor', 'Outdoor']         // SCENE_CLASS
        };

        initializeEditor(mockMetadata, mockClassValuesMap);
    });

    it('should add empty option as first option in class dropdown', () => {
        const rowData: RowData = {
            fields: ['img1.jpg', 'Cat', 'Indoor', 'Notes'],
            row_index: 0
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const firstOption = animalSelect.options[0];

        expect(firstOption.value).toBe('');
        expect(firstOption.textContent).toBe('');
    });

    it('should select empty option when field value is empty', () => {
        const rowData: RowData = {
            fields: ['img2.jpg', '', 'Outdoor', 'Notes'],  // Empty ANIMAL_CLASS
            row_index: 1
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.value).toBe('');
        expect(animalSelect.selectedIndex).toBe(0);  // First option (empty)
        expect(animalSelect.options[animalSelect.selectedIndex].textContent).toBe('');
    });

    it('should select correct option when field value is non-empty', () => {
        const rowData: RowData = {
            fields: ['img1.jpg', 'Cat', 'Indoor', 'Notes'],
            row_index: 0
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.value).toBe('Cat');
        expect(animalSelect.options[animalSelect.selectedIndex].textContent).toBe('Cat');
    });

    it('should preserve whitespace-only values as distinct from empty', () => {
        // Add whitespace-only value to classValuesMap
        mockClassValuesMap[1] = ['  ', 'Cat', 'Dog'];  // Two spaces

        const rowData: RowData = {
            fields: ['img5.jpg', '  ', 'Indoor', 'Notes'],  // Two spaces
            row_index: 4
        };

        initializeEditor(mockMetadata, mockClassValuesMap);
        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.value).toBe('  ');  // Not '' (empty)
        expect(animalSelect.value.length).toBe(2);
        expect(animalSelect.selectedIndex).not.toBe(0);  // Not the empty option
    });

    it('should render dropdown with only empty option when no unique values', () => {
        // Empty classValuesMap for ANIMAL_CLASS
        mockClassValuesMap[1] = [];

        const rowData: RowData = {
            fields: ['img1.jpg', '', 'Indoor', 'Notes'],
            row_index: 0
        };

        initializeEditor(mockMetadata, mockClassValuesMap);
        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        expect(animalSelect.options.length).toBe(1);  // Only empty option
        expect(animalSelect.options[0].value).toBe('');
        expect(animalSelect.value).toBe('');
    });

    it('should order options with empty first, then alphabetically sorted', () => {
        // Values in mockClassValuesMap (Cat, Dog, Bird)
        const rowData: RowData = {
            fields: ['img1.jpg', '', 'Indoor', 'Notes'],
            row_index: 0
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const optionValues = Array.from(animalSelect.options).map(opt => opt.value);

        // Verify empty is first
        expect(optionValues[0]).toBe('');  // Empty first
        // Remaining options appear in the order they're stored in classValuesMap
        expect(optionValues.slice(1)).toEqual(['Cat', 'Dog', 'Bird']);
    });

    it('should return empty string from getFieldValues when empty option selected', () => {
        const rowData: RowData = {
            fields: ['img2.jpg', '', 'Outdoor', 'Notes'],
            row_index: 1
        };

        renderEditorForm(rowData);

        const values = getFieldValues();

        expect(values[1]).toBe('');  // ANIMAL_CLASS field
        expect(values[1]).not.toBeNull();
        expect(values[1]).not.toBeUndefined();
    });

    it('should allow user to switch from populated value to empty', () => {
        const rowData: RowData = {
            fields: ['img1.jpg', 'Cat', 'Indoor', 'Notes'],
            row_index: 0
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;

        // Initial state
        expect(animalSelect.value).toBe('Cat');

        // Simulate user selecting empty option
        animalSelect.value = '';
        animalSelect.dispatchEvent(new Event('change'));

        // Verify change
        expect(animalSelect.value).toBe('');
        expect(getFieldValues()[1]).toBe('');
    });

    it('should handle multiple class columns independently', () => {
        const rowData: RowData = {
            fields: ['img3.jpg', '', 'Outdoor', 'Notes'],  // Empty ANIMAL, Outdoor SCENE
            row_index: 2
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const sceneSelect = document.getElementById('field-2') as HTMLSelectElement;

        // ANIMAL_CLASS should be empty
        expect(animalSelect.value).toBe('');
        expect(animalSelect.selectedIndex).toBe(0);

        // SCENE_CLASS should be "Outdoor"
        expect(sceneSelect.value).toBe('Outdoor');
        expect(sceneSelect.selectedIndex).not.toBe(0);  // Not empty option
    });

    it('should handle completely empty row (all class fields empty)', () => {
        const rowData: RowData = {
            fields: ['img4.jpg', '', '', 'Notes'],  // Both class columns empty
            row_index: 3
        };

        renderEditorForm(rowData);

        const animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        const sceneSelect = document.getElementById('field-2') as HTMLSelectElement;

        // Both should be empty
        expect(animalSelect.value).toBe('');
        expect(sceneSelect.value).toBe('');
        expect(animalSelect.selectedIndex).toBe(0);
        expect(sceneSelect.selectedIndex).toBe(0);
    });

    it('should preserve empty field value after form re-render', () => {
        // Render with empty ANIMAL_CLASS
        const rowData1: RowData = {
            fields: ['img1.jpg', '', 'Indoor', 'Notes'],
            row_index: 0
        };
        renderEditorForm(rowData1);

        // Verify empty
        let animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        expect(animalSelect.value).toBe('');

        // Simulate adding new value to classValuesMap (what addNewClassValue does)
        mockClassValuesMap[1] = ['Bird', 'Cat', 'Dog', 'Zebra'];

        // Get current values (what addNewClassValue does before re-render)
        const currentValues = getFieldValues();

        // Re-render with same values (what addNewClassValue does)
        const rowData2: RowData = {
            fields: currentValues,
            row_index: 0
        };
        initializeEditor(mockMetadata, mockClassValuesMap);
        renderEditorForm(rowData2);

        // Verify field still empty (not auto-selected to "Bird" which is now first)
        animalSelect = document.getElementById('field-1') as HTMLSelectElement;
        expect(animalSelect.value).toBe('');

        // Verify "Zebra" is in dropdown
        const optionValues = Array.from(animalSelect.options).map(opt => opt.value);
        expect(optionValues).toContain('Zebra');
    });
});
