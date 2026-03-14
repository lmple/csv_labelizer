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
        const fullPath = `${currentCsvDir}/${imagePath}`;
        const assetUrl = convertFileSrc(fullPath);
        const img = document.createElement('img');
        img.src = assetUrl;
        img.alt = imagePath;
        img.onload = () => {
            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);
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
