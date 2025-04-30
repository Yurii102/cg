"use strict";
var _a, _b, _c, _d, _e, _f;
// ==================== CANVAS SETUP AND GLOBAL VARIABLES ====================
const canvasOriginal = document.getElementById('canvas-original');
const ctxOriginal = canvasOriginal.getContext('2d');
const canvasConverted = document.getElementById('canvas-converted');
const ctxConverted = canvasConverted.getContext('2d');
// Initial canvas dimensions - will be updated based on image
let canvasWidth = 700;
let canvasHeight = 500;
const scaleFactor = window.devicePixelRatio || 1;
// Initial canvas setup
function setupCanvas(canvas, ctx) {
    if (!ctx)
        return;
    canvas.width = canvasWidth * scaleFactor;
    canvas.height = canvasHeight * scaleFactor;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    ctx.scale(scaleFactor, scaleFactor);
}
// Setup initial canvas dimensions
setupCanvas(canvasOriginal, ctxOriginal);
setupCanvas(canvasConverted, ctxConverted);
// Image upload functionality
const uploadButton = document.getElementById('uploadImage');
const imageInput = document.getElementById('imageInput');
// Store the original image data
let originalImage = null;
// Store the converted image data
let convertedImageData = null;
/**
 * Resize both canvases based on the uploaded image dimensions
 */
function resizeCanvasesToImage() {
    if (!originalImage)
        return;
    // Get image dimensions
    const imgWidth = originalImage.naturalWidth;
    const imgHeight = originalImage.naturalHeight;
    // Set max dimensions for display
    const maxWidth = window.innerWidth * 0.45; // 45% of window width for each canvas
    const maxHeight = window.innerHeight * 0.7; // 70% of window height
    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = imgWidth;
    let newHeight = imgHeight;
    // Scale down if image is too large
    if (newWidth > maxWidth) {
        const ratio = maxWidth / newWidth;
        newWidth = maxWidth;
        newHeight = newHeight * ratio;
    }
    if (newHeight > maxHeight) {
        const ratio = maxHeight / newHeight;
        newHeight = maxHeight;
        newWidth = newWidth * ratio;
    }
    // Update global canvas dimensions
    canvasWidth = Math.round(newWidth);
    canvasHeight = Math.round(newHeight);
    // Reset both canvases with new dimensions
    resetCanvas(canvasOriginal, ctxOriginal);
    resetCanvas(canvasConverted, ctxConverted);
}
/**
 * Reset a canvas with the current global dimensions
 */
function resetCanvas(canvas, ctx) {
    if (!ctx)
        return;
    // Reset canvas transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Update canvas dimensions
    canvas.width = canvasWidth * scaleFactor;
    canvas.height = canvasHeight * scaleFactor;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    // Apply scale factor
    ctx.scale(scaleFactor, scaleFactor);
}
// ==================== COLOR CONVERSION FUNCTIONS ====================
/**
 * Convert RGB to XYZ color space
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns XYZ values as [X, Y, Z]
 */
function rgbToXyz(r, g, b) {
    // Normalize RGB values to [0,1]
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    // Apply gamma correction (sRGB to Linear RGB)
    const rLinear = rNorm <= 0.04045 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4);
    const gLinear = gNorm <= 0.04045 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4);
    const bLinear = bNorm <= 0.04045 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4);
    // Convert Linear RGB to XYZ using the standard matrix
    // More precise calculation, keeping full precision
    const X = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805;
    const Y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722;
    const Z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505;
    return [X, Y, Z];
}
/**
 * Convert XYZ to RGB color space
 * @param X X value
 * @param Y Y value
 * @param Z Z value
 * @returns RGB values as [r, g, b] in 0-255 range
 */
function xyzToRgb(X, Y, Z) {
    // Convert XYZ to Linear RGB using the inverse matrix
    const rLinear = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
    const gLinear = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
    const bLinear = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
    // Convert Linear RGB to sRGB (apply inverse gamma correction)
    const rNorm = rLinear <= 0.0031308 ? 12.92 * rLinear : 1.055 * Math.pow(rLinear, 1 / 2.4) - 0.055;
    const gNorm = gLinear <= 0.0031308 ? 12.92 * gLinear : 1.055 * Math.pow(gLinear, 1 / 2.4) - 0.055;
    const bNorm = bLinear <= 0.0031308 ? 12.92 * bLinear : 1.055 * Math.pow(bLinear, 1 / 2.4) - 0.055;
    // Use proper rounding for more accurate results
    const r = Math.max(0, Math.min(255, Math.round(rNorm * 255)));
    const g = Math.max(0, Math.min(255, Math.round(gNorm * 255)));
    const b = Math.max(0, Math.min(255, Math.round(bNorm * 255)));
    return [r, g, b];
}
/**
 * Process image through RGB->XYZ->RGB conversion
 */
function processImageRgbXyzRgb() {
    if (!originalImage)
        return;
    // Draw the original image on the first canvas
    ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    // Get image data from the original canvas
    const imageData = ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.getImageData(0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    if (!imageData)
        return;
    // Create a new ImageData object for the converted image
    const newConvertedImageData = new ImageData(imageData.width, imageData.height);
    // Process each pixel
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        // Convert RGB to XYZ
        const [X, Y, Z] = rgbToXyz(r, g, b);
        // Convert XYZ back to RGB
        const [newR, newG, newB] = xyzToRgb(X, Y, Z);
        // Set the pixel values in the new image data
        newConvertedImageData.data[i] = newR;
        newConvertedImageData.data[i + 1] = newG;
        newConvertedImageData.data[i + 2] = newB;
        newConvertedImageData.data[i + 3] = a;
    }
    // Store the converted image data for later use
    convertedImageData = newConvertedImageData;
    // Draw the converted image on the second canvas
    ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.putImageData(convertedImageData, 0, 0, 0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
}
/**
 * Calculate the difference between two RGB colors
 */
function colorDifference(r1, g1, b1, r2, g2, b2) {
    // Euclidean distance in RGB space
    return Math.sqrt(Math.pow(r2 - r1, 2) +
        Math.pow(g2 - g1, 2) +
        Math.pow(b2 - b1, 2));
}
/**
 * Analyze the difference between original and converted images
 */
function analyzeImageDifference() {
    if (!originalImage) {
        alert('Please upload and convert an image first!');
        return;
    }
    // Make sure we have both images
    ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    const originalImageData = ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.getImageData(0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    const convertedImageData = ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.getImageData(0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    // Process RGB->XYZ->RGB conversion if converted canvas is empty
    if (!convertedImageData) {
        processImageRgbXyzRgb();
    }
    else {
        // Use existing converted data
        ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.clearRect(0, 0, canvasWidth, canvasHeight);
        ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.putImageData(convertedImageData, 0, 0, 0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    }
    // Get image data from both canvases
    if (!originalImageData || !convertedImageData)
        return;
    // Analyze differences
    const totalPixels = originalImageData.width * originalImageData.height;
    let identicalPixels = 0;
    let nearIdenticalPixels = 0; // Pixels with very small differences (0-1)
    let acceptableDifferencePixels = 0; // Pixels with acceptable differences (1-5)
    let totalDifference = 0;
    let maxDifference = 0;
    // Counters for difference ranges
    const diffRanges = {
        '0': 0,
        '0-1': 0,
        '1-5': 0,
        '5-20': 0,
        '>20': 0
    };
    for (let i = 0; i < originalImageData.data.length; i += 4) {
        const r1 = originalImageData.data[i];
        const g1 = originalImageData.data[i + 1];
        const b1 = originalImageData.data[i + 2];
        const r2 = convertedImageData.data[i];
        const g2 = convertedImageData.data[i + 1];
        const b2 = convertedImageData.data[i + 2];
        const diff = colorDifference(r1, g1, b1, r2, g2, b2);
        // Update statistics
        totalDifference += diff;
        maxDifference = Math.max(maxDifference, diff);
        // Count identical and different pixels
        if (diff === 0) {
            identicalPixels++;
            diffRanges['0']++;
        }
        else if (diff <= 1) {
            nearIdenticalPixels++;
            diffRanges['0-1']++;
        }
        else if (diff <= 5) {
            acceptableDifferencePixels++;
            diffRanges['1-5']++;
        }
        else if (diff <= 20) {
            diffRanges['5-20']++;
        }
        else {
            diffRanges['>20']++;
        }
    }
    // Calculate statistics with more nuanced interpretation
    const identicalPercent = (identicalPixels / totalPixels) * 100;
    const nearIdenticalPercent = (nearIdenticalPixels / totalPixels) * 100;
    const acceptableDiffPercent = (acceptableDifferencePixels / totalPixels) * 100;
    // Combined percentage for effectively identical pixels (0 and 0-1)
    const effectivelyIdenticalPercent = ((identicalPixels + nearIdenticalPixels) / totalPixels) * 100;
    // Acceptable quality includes identical, near-identical and acceptable difference
    const acceptableQualityPercent = ((identicalPixels + nearIdenticalPixels + acceptableDifferencePixels) / totalPixels) * 100;
    const averageDifference = totalDifference / totalPixels;
    // Format output with more nuanced analysis
    const results = `Загальна кількість пікселів: ${totalPixels}
Ідентичні пікселі (різниця = 0): ${identicalPixels} (${identicalPercent.toFixed(2)}%)
Майже ідентичні пікселі (різниця ≤ 1): ${nearIdenticalPixels} (${nearIdenticalPercent.toFixed(2)}%)
Ефективно ідентичні пікселі (різниця ≤ 1): ${identicalPixels + nearIdenticalPixels} (${effectivelyIdenticalPercent.toFixed(2)}%)
Пікселі з прийнятною різницею (1 < різниця ≤ 5): ${acceptableDifferencePixels} (${acceptableDiffPercent.toFixed(2)}%)
Загальна якість зображення: ${acceptableQualityPercent.toFixed(2)}%
Середня різниця: ${averageDifference.toFixed(2)} (діапазон 0-${maxDifference.toFixed(2)})
Максимальна різниця: ${maxDifference.toFixed(2)}

Розподіл різниць:
0: ${diffRanges['0']} (${(diffRanges['0'] / totalPixels * 100).toFixed(2)}%)
0-1: ${diffRanges['0-1']} (${(diffRanges['0-1'] / totalPixels * 100).toFixed(2)}%)
1-5: ${diffRanges['1-5']} (${(diffRanges['1-5'] / totalPixels * 100).toFixed(2)}%)
5-20: ${diffRanges['5-20']} (${(diffRanges['5-20'] / totalPixels * 100).toFixed(2)}%)
>20: ${diffRanges['>20']} (${(diffRanges['>20'] / totalPixels * 100).toFixed(2)}%)

Примітка: При конверсії кольорів невеликі відмінності (≤1) є візуально непомітними.

${effectivelyIdenticalPercent > 95 ? "Добре. Незначна втрата інформації при перетворенні." :
        acceptableQualityPercent > 95 ? "Задовільно. Помітна, але прийнятна втрата інформації." :
            "Погано. Значна втрата інформації при перетворенні."}`;
    // Display results
    const analysisResults = document.getElementById('analysisResults');
    const analysisContent = document.getElementById('analysisContent');
    if (analysisResults && analysisContent) {
        analysisContent.textContent = results;
        analysisResults.style.display = 'block';
    }
}
// ==================== EVENT LISTENERS ====================
// Upload image event
uploadButton.addEventListener('click', () => {
    imageInput.click();
});
imageInput.addEventListener('change', (e) => {
    var _a;
    const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            var _a;
            originalImage = new Image();
            originalImage.onload = () => {
                // Resize canvases based on the uploaded image
                resizeCanvasesToImage();
                // Draw the image on the original canvas
                ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.clearRect(0, 0, canvasWidth, canvasHeight);
                ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
                // Reset converted image data
                convertedImageData = null;
                // Clear the converted canvas
                ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.clearRect(0, 0, canvasWidth, canvasHeight);
            };
            originalImage.src = (_a = event.target) === null || _a === void 0 ? void 0 : _a.result;
        };
        reader.readAsDataURL(file);
    }
});
// RGB -> XYZ -> RGB conversion event
(_a = document.getElementById('rgbXyzRgbConversion')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
    if (originalImage) {
        processImageRgbXyzRgb();
    }
    else {
        alert('Please upload an image first!');
    }
});
// Save image event
(_b = document.getElementById('saveImage')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
    if (ctxConverted) {
        const link = document.createElement('a');
        link.download = 'converted-image.png';
        link.href = canvasConverted.toDataURL('image/png');
        link.click();
    }
});
// Open modal for color modifications
(_c = document.getElementById('modifyColor')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
    if (!originalImage) {
        alert('Please upload an image first!');
        return;
    }
    if (!hasSelection) {
        alert('Please select a region on the image first!');
        return;
    }
    const modal = document.getElementById('modifyColorModal');
    if (modal) {
        modal.style.display = 'block';
    }
});
// Close modal
(_d = document.getElementById('closeModifyColorModal')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
    const modal = document.getElementById('modifyColorModal');
    if (modal) {
        modal.style.display = 'none';
    }
});
// Analyze image event
(_e = document.getElementById('analyzeImage')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', analyzeImageDifference);
// Variables for selection
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let selectionRect = { x: 0, y: 0, width: 0, height: 0 };
let hasSelection = false;
// Color modification
const colorValue = document.getElementById('colorValue');
// ==================== COLOR MODELS FUNCTIONS ====================
/**
 * Convert RGB to HSV color model
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns HSV as [h, s, v] where h is 0-360, s is 0-1, v is 0-1
 */
function rgbToHsv(r, g, b) {
    // Normalize RGB values to [0,1]
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    // Calculate hue
    let h = 0;
    if (delta === 0) {
        h = 0; // No color, achromatic (gray)
    }
    else if (max === rNorm) {
        h = ((gNorm - bNorm) / delta) % 6;
    }
    else if (max === gNorm) {
        h = (bNorm - rNorm) / delta + 2;
    }
    else { // max === bNorm
        h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0)
        h += 360;
    // Calculate saturation and value
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    return [h, s, v];
}
/**
 * Convert HSV to RGB color model
 * @param h Hue (0-360)
 * @param s Saturation (0-1)
 * @param v Value (0-1)
 * @returns RGB as [r, g, b] in 0-255 range
 */
function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
    }
    else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
    }
    else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
    }
    else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
    }
    else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
    }
    else if (h >= 300 && h < 360) {
        r = c;
        g = 0;
        b = x;
    }
    // Convert to 0-255 range
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}
/**
 * Check if a color is dark green
 * @param r Red channel (0-255)
 * @param g Green channel (0-255)
 * @param b Blue channel (0-255)
 * @returns True if the color is dark green
 */
function isDarkGreen(r, g, b) {
    const [h, s, v] = rgbToHsv(r, g, b);
    // ==================== DARK GREEN DETECTION START ====================
    // Improved dark green detection
    // Green hue is typically between 60-180, but dark green is often 90-150
    // Dark green has higher g value than r and b values
    return (h >= 80 && h <= 160 &&
        s > 0.3 &&
        v < 0.5 &&
        (g - Math.max(r, b)) > 30);
    // ==================== DARK GREEN DETECTION END ====================
}
/**
 * Modify value of dark green colors in a region
 */
function modifyDarkGreenValue(value) {
    if (!originalImage || !hasSelection) {
        alert('Please upload an image and select a region first!');
        return;
    }
    // Reset both canvases to original state
    ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    if (convertedImageData) {
        ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.clearRect(0, 0, canvasWidth, canvasHeight);
        ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.putImageData(convertedImageData, 0, 0, 0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    }
    else {
        ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.clearRect(0, 0, canvasWidth, canvasHeight);
        ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    }
    // Get selected region data with correct scaling
    const selectedRegion = {
        x: Math.min(selectionRect.x, selectionRect.x + selectionRect.width) * scaleFactor,
        y: Math.min(selectionRect.y, selectionRect.y + selectionRect.height) * scaleFactor,
        width: Math.abs(selectionRect.width) * scaleFactor,
        height: Math.abs(selectionRect.height) * scaleFactor
    };
    // Get image data from the region for both canvases
    const originalRegionData = ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.getImageData(selectedRegion.x, selectedRegion.y, selectedRegion.width, selectedRegion.height);
    const convertedRegionData = ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.getImageData(selectedRegion.x, selectedRegion.y, selectedRegion.width, selectedRegion.height);
    if (!originalRegionData || !convertedRegionData)
        return;
    // Use value as a brightness adjustment factor instead of absolute value
    // If value is 128, no change; if >128, brighten; if <128, darken
    const brightnessAdjustment = (value - 128) / 128; // Range: -1 to +1
    // Create modified region data for each canvas
    const modifiedOriginalData = new ImageData(new Uint8ClampedArray(originalRegionData.data), originalRegionData.width, originalRegionData.height);
    const modifiedConvertedData = new ImageData(new Uint8ClampedArray(convertedRegionData.data), convertedRegionData.width, convertedRegionData.height);
    // Process each pixel in the selected region
    for (let i = 0; i < originalRegionData.data.length; i += 4) {
        const r = originalRegionData.data[i];
        const g = originalRegionData.data[i + 1];
        const b = originalRegionData.data[i + 2];
        // Check if this pixel is dark green
        if (isDarkGreen(r, g, b)) {
            // Convert to HSV
            const [h, s, v] = rgbToHsv(r, g, b);
            // Adjust the value (brightness) while preserving hue and saturation
            // and maintaining relative differences between pixels
            let newV;
            if (brightnessAdjustment >= 0) {
                // Brighten: Scale the remaining brightness space
                newV = v + (1 - v) * brightnessAdjustment;
            }
            else {
                // Darken: Scale the current brightness
                newV = v * (1 + brightnessAdjustment);
            }
            // Ensure value stays in 0-1 range
            newV = Math.max(0, Math.min(1, newV));
            // Convert back to RGB with adjusted brightness
            const [newR, newG, newB] = hsvToRgb(h, s, newV);
            // Update original image data
            modifiedOriginalData.data[i] = newR;
            modifiedOriginalData.data[i + 1] = newG;
            modifiedOriginalData.data[i + 2] = newB;
            // Apply the same modification to converted image
            modifiedConvertedData.data[i] = newR;
            modifiedConvertedData.data[i + 1] = newG;
            modifiedConvertedData.data[i + 2] = newB;
        }
    }
    // Put the modified image data back to both canvases
    ctxOriginal.putImageData(modifiedOriginalData, selectedRegion.x, selectedRegion.y);
    ctxConverted.putImageData(modifiedConvertedData, selectedRegion.x, selectedRegion.y);
    // Redraw selection rectangle
    drawSelectionRect();
}
/**
 * Draw the selection rectangle on both canvases
 */
function drawSelectionRect() {
    if (!hasSelection)
        return;
    // Draw on original canvas
    if (ctxOriginal) {
        ctxOriginal.strokeStyle = 'red';
        ctxOriginal.lineWidth = 2;
        ctxOriginal.setLineDash([5, 5]);
        ctxOriginal.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
        ctxOriginal.setLineDash([]);
    }
    // Draw on converted canvas
    if (ctxConverted) {
        ctxConverted.strokeStyle = 'red';
        ctxConverted.lineWidth = 2;
        ctxConverted.setLineDash([5, 5]);
        ctxConverted.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
        ctxConverted.setLineDash([]);
    }
}
/**
 * Handle selection events on canvas
 */
function setupCanvasSelection() {
    // Mouse down - start selection
    canvasOriginal.addEventListener('mousedown', (e) => {
        const rect = canvasOriginal.getBoundingClientRect();
        selectionStart.x = e.clientX - rect.left;
        selectionStart.y = e.clientY - rect.top;
        isSelecting = true;
    });
    // Mouse move - update selection
    canvasOriginal.addEventListener('mousemove', (e) => {
        if (!isSelecting)
            return;
        const rect = canvasOriginal.getBoundingClientRect();
        selectionEnd.x = e.clientX - rect.left;
        selectionEnd.y = e.clientY - rect.top;
        // Calculate selection rectangle
        selectionRect = {
            x: Math.min(selectionStart.x, selectionEnd.x),
            y: Math.min(selectionStart.y, selectionEnd.y),
            width: Math.abs(selectionEnd.x - selectionStart.x),
            height: Math.abs(selectionEnd.y - selectionStart.y)
        };
        // Redraw both canvases
        if (originalImage) {
            ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.clearRect(0, 0, canvasWidth, canvasHeight);
            ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.clearRect(0, 0, canvasWidth, canvasHeight);
            ctxOriginal === null || ctxOriginal === void 0 ? void 0 : ctxOriginal.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
            ctxConverted === null || ctxConverted === void 0 ? void 0 : ctxConverted.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
            drawSelectionRect();
        }
    });
    // Mouse up - finish selection
    canvasOriginal.addEventListener('mouseup', () => {
        isSelecting = false;
        hasSelection = selectionRect.width > 5 && selectionRect.height > 5;
    });
}
/**
 * Handle pixel click events and display color information
 */
function setupPixelInfoDisplay() {
    // Function to handle canvas click
    const handleCanvasClick = (canvas, ctx, source) => {
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) * scaleFactor);
            const y = Math.floor((e.clientY - rect.top) * scaleFactor);
            if (ctx) {
                // Get pixel data at clicked position
                const pixelData = ctx.getImageData(x, y, 1, 1).data;
                const r = pixelData[0];
                const g = pixelData[1];
                const b = pixelData[2];
                const a = pixelData[3];
                // Convert RGB to XYZ
                const [X, Y, Z] = rgbToXyz(r, g, b);
                // Convert RGB to HSL (for display purposes)
                const [h, s, v] = rgbToHsv(r, g, b);
                const l = v * (1 - s / 2);
                const hslS = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
                // Format the pixel information
                const pixelInfo = `Джерело:    ${source}
Координати: (${Math.round(x / scaleFactor)}, ${Math.round(y / scaleFactor)})
RGB:        (${r}, ${g}, ${b}, ${a})
HSL:        (${Math.round(h)}°, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)
XYZ:        (${X.toFixed(2)}, ${Y.toFixed(2)}, ${Z.toFixed(2)})`;
                // Display the pixel information
                const pixelInfoPanel = document.getElementById('pixelInfoPanel');
                const pixelInfoContent = document.getElementById('pixelInfoContent');
                if (pixelInfoPanel && pixelInfoContent) {
                    pixelInfoContent.textContent = pixelInfo;
                    pixelInfoPanel.style.display = 'block';
                }
            }
        });
    };
    // Set up click handlers for both canvases
    if (ctxOriginal) {
        handleCanvasClick(canvasOriginal, ctxOriginal, 'Оригінальне');
    }
    if (ctxConverted) {
        handleCanvasClick(canvasConverted, ctxConverted, 'Оброблене');
    }
}
// Initialize canvas selection and pixel info display
document.addEventListener('DOMContentLoaded', () => {
    setupCanvasSelection();
    setupPixelInfoDisplay();
});
// Apply color modification
(_f = document.getElementById('applyColorModification')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
    const value = parseInt(colorValue.value);
    modifyDarkGreenValue(value);
    // Close modal
    const modal = document.getElementById('modifyColorModal');
    if (modal) {
        modal.style.display = 'none';
    }
});
// Initialize canvas selection
document.addEventListener('DOMContentLoaded', () => {
    setupCanvasSelection();
});
