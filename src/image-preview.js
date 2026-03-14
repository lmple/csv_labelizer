import { convertFileSrc } from '@tauri-apps/api/core';
let currentCsvDir = '';
let imageColumnIndex = null;
export function initializeImagePreview(metadata) {
    currentCsvDir = metadata.csv_dir;
    imageColumnIndex = metadata.image_column;
}
export async function loadImage(rowData) {
    const imageContainer = document.getElementById('image-preview');
    if (!imageContainer) {
        console.error('Image preview container not found');
        return;
    }
    imageContainer.innerHTML = '';
    if (imageColumnIndex === null || imageColumnIndex === undefined) {
        imageContainer.innerHTML = '<p class="no-image">No image column detected</p>';
        return;
    }
    const imagePath = rowData.fields[imageColumnIndex];
    if (!imagePath || imagePath.trim() === '') {
        imageContainer.innerHTML = '<p class="no-image">No image path specified</p>';
        return;
    }
    imageContainer.innerHTML = '<p class="loading">Loading image...</p>';
    try {
        // Check if path is absolute (starts with / or C:\ etc)
        const isAbsolute = imagePath.startsWith('/') || /^[A-Z]:\\/i.test(imagePath);
        let fullPath;
        let warningMessage = '';
        if (isAbsolute) {
            fullPath = imagePath;
            warningMessage = '⚠️ Using absolute path (may not be portable across systems)';
            console.warn('Absolute image path detected:', imagePath);
        }
        else {
            fullPath = `${currentCsvDir}/${imagePath}`;
        }
        const assetUrl = convertFileSrc(fullPath);
        const img = document.createElement('img');
        img.src = assetUrl;
        img.alt = imagePath;
        img.onload = () => {
            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);
            // Show warning for absolute paths
            if (warningMessage) {
                const warning = document.createElement('p');
                warning.className = 'hint';
                warning.style.marginTop = '0.5rem';
                warning.style.color = 'var(--warning-color)';
                warning.textContent = warningMessage;
                imageContainer.appendChild(warning);
            }
        };
        img.onerror = () => {
            imageContainer.innerHTML = `
                <div class="image-error">
                    <p>⚠️ Image not found</p>
                    <p class="error-path">Expected: ${fullPath}</p>
                    <p class="hint">Make sure the image file exists relative to the CSV file location.</p>
                </div>
            `;
        };
    }
    catch (error) {
        console.error('Error loading image:', error);
        imageContainer.innerHTML = `
            <div class="image-error">
                <p>❌ Error loading image</p>
                <p class="error-details">${error}</p>
            </div>
        `;
    }
}
export function clearImagePreview() {
    const imageContainer = document.getElementById('image-preview');
    if (imageContainer) {
        imageContainer.innerHTML = '<p class="no-image">No image loaded</p>';
    }
}
