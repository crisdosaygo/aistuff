// Imports, constants, then state
const ICON_CACHE = new Map(); // Cache for modified (selected) icon data URLs

// Logic (top-level function calls)
// No top-level calls needed; functions will be called by desktop-icons.js

// Functions, then Helper functions
function applyBlueDitherEffect(iconSrc, callback) {
    // Check if already cached
    if (ICON_CACHE.has(iconSrc)) {
        callback(ICON_CACHE.get(iconSrc));
        return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous"; // For loading external images
    img.src = iconSrc;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the original icon
        ctx.drawImage(img, 0, 0);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply dithered blue pattern to non-transparent pixels
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                const alpha = data[idx + 3]; // Alpha channel

                if (alpha > 0) { // Only apply to non-transparent pixels
                    // Create a 2x2 dither pattern
                    const isBluePixel = (x % 2 === 0 && y % 2 === 0) || (x % 2 === 1 && y % 2 === 1);
                    if (isBluePixel) {
                        data[idx] = 0;     // R
                        data[idx + 1] = 0; // G
                        data[idx + 2] = 255; // B
                        // Alpha remains unchanged
                    }
                }
            }
        }

        // Put the modified pixels back
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL and cache
        const dataUrl = canvas.toDataURL('image/png');
        ICON_CACHE.set(iconSrc, dataUrl);
        callback(dataUrl);
    };

    img.onerror = () => {
        console.error(`Failed to load icon: ${iconSrc}`);
        callback(iconSrc); // Fallback to original on error
    };
}

function getSelectedIconSrc(originalSrc, callback) {
    applyBlueDitherEffect(originalSrc, callback);
}

function getOriginalIconSrc(iconElement) {
    return iconElement.dataset.originalSrc || iconElement.src;
}

function applySelectionEffect(iconElement) {
    const originalSrc = getOriginalIconSrc(iconElement);
    getSelectedIconSrc(originalSrc, (selectedSrc) => {
        iconElement.src = selectedSrc;
        iconElement.dataset.originalSrc = originalSrc; // Ensure original is stored
    });
}

function removeSelectionEffect(iconElement) {
    const originalSrc = getOriginalIconSrc(iconElement);
    iconElement.src = originalSrc;
}

// Export functions for use in desktop-icons.js
window.IconSelectionEffect = {
    applySelectionEffect,
    removeSelectionEffect
};
