// ==================== CANVAS SETUP AND GLOBAL VARIABLES ====================
const canvasOriginal = document.getElementById('canvas-original') as HTMLCanvasElement;
const ctxOriginal = canvasOriginal.getContext('2d');

const canvasConverted = document.getElementById('canvas-converted') as HTMLCanvasElement;
const ctxConverted = canvasConverted.getContext('2d');

let canvasWidth = 700; 
let canvasHeight = 500;

const scaleFactor = window.devicePixelRatio || 1; 

function setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null) {
    if (!ctx) return;
    
    canvas.width = canvasWidth * scaleFactor;
    canvas.height = canvasHeight * scaleFactor;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    ctx.scale(scaleFactor, scaleFactor);
}

setupCanvas(canvasOriginal, ctxOriginal);
setupCanvas(canvasConverted, ctxConverted);

const uploadButton = document.getElementById('uploadImage') as HTMLButtonElement;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;

let originalImage: HTMLImageElement | null = null;

let convertedImageData: ImageData | null = null;

function resizeCanvasesToImage() {
    if (!originalImage) return;
    
    const imgWidth = originalImage.naturalWidth;
    const imgHeight = originalImage.naturalHeight;
    
    const maxWidth = window.innerWidth * 0.45;
    const maxHeight = window.innerHeight * 0.7;
    
    let newWidth = imgWidth;
    let newHeight = imgHeight;
    
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
    
    canvasWidth = Math.round(newWidth);
    canvasHeight = Math.round(newHeight);
    
    resetCanvas(canvasOriginal, ctxOriginal);
    resetCanvas(canvasConverted, ctxConverted);
}

function resetCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null) {
    if (!ctx) return;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    canvas.width = canvasWidth * scaleFactor;
    canvas.height = canvasHeight * scaleFactor;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    
    ctx.scale(scaleFactor, scaleFactor);
}

// ==================== COLOR CONVERSION FUNCTIONS ====================

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const rLinear = rNorm <= 0.04045 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4);
    const gLinear = gNorm <= 0.04045 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4);
    const bLinear = bNorm <= 0.04045 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4);
    
    const X = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805;
    const Y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722;
    const Z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505;
    
    return [X, Y, Z];
}

function xyzToRgb(X: number, Y: number, Z: number): [number, number, number] {
    const rLinear = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
    const gLinear = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
    const bLinear = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
    
    const rNorm = rLinear <= 0.0031308 ? 12.92 * rLinear : 1.055 * Math.pow(rLinear, 1/2.4) - 0.055;
    const gNorm = gLinear <= 0.0031308 ? 12.92 * gLinear : 1.055 * Math.pow(gLinear, 1/2.4) - 0.055;
    const bNorm = bLinear <= 0.0031308 ? 12.92 * bLinear : 1.055 * Math.pow(bLinear, 1/2.4) - 0.055;
    
    const r = Math.max(0, Math.min(255, Math.round(rNorm * 255)));
    const g = Math.max(0, Math.min(255, Math.round(gNorm * 255)));
    const b = Math.max(0, Math.min(255, Math.round(bNorm * 255)));
    
    return [r, g, b];
}

function processImageRgbXyzRgb() {
    if (!originalImage) return;
    
    ctxOriginal?.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxOriginal?.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    
    const imageData = ctxOriginal?.getImageData(0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    if (!imageData) return;
    
    const newConvertedImageData = new ImageData(imageData.width, imageData.height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        
        const [X, Y, Z] = rgbToXyz(r, g, b);
        
        const [newR, newG, newB] = xyzToRgb(X, Y, Z);
        
        newConvertedImageData.data[i] = newR;
        newConvertedImageData.data[i + 1] = newG;
        newConvertedImageData.data[i + 2] = newB;
        newConvertedImageData.data[i + 3] = a;
    }
    
    convertedImageData = newConvertedImageData;
    
    ctxConverted?.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxConverted?.putImageData(convertedImageData, 0, 0, 0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
}

function colorDifference(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    return Math.sqrt(
        Math.pow(r2 - r1, 2) + 
        Math.pow(g2 - g1, 2) + 
        Math.pow(b2 - b1, 2)
    );
}

function analyzeImageDifference() {
    if (!originalImage) {
        alert('Please upload and convert an image first!');
        return;
    }
    
    ctxOriginal?.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxOriginal?.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    const originalImageData = ctxOriginal?.getImageData(0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    const convertedImageData = ctxConverted?.getImageData(0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    
    if (!convertedImageData) {
        processImageRgbXyzRgb();
    } else {
        ctxConverted?.clearRect(0, 0, canvasWidth, canvasHeight);
        ctxConverted?.putImageData(convertedImageData, 0, 0, 0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    }
    
    if (!originalImageData || !convertedImageData) return;
    
    const totalPixels = originalImageData.width * originalImageData.height;
    let identicalPixels = 0;
    let nearIdenticalPixels = 0;
    let acceptableDifferencePixels = 0;
    let totalDifference = 0;
    let maxDifference = 0;
    
    const diffRanges: {[key: string]: number} = {
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
        
        totalDifference += diff;
        maxDifference = Math.max(maxDifference, diff);
        
        if (diff === 0) {
            identicalPixels++;
            diffRanges['0']++;
        } else if (diff <= 1) {
            nearIdenticalPixels++;
            diffRanges['0-1']++;
        } else if (diff <= 5) {
            acceptableDifferencePixels++;
            diffRanges['1-5']++;
        } else if (diff <= 20) {
            diffRanges['5-20']++;
        } else {
            diffRanges['>20']++;
        }
    }
    
    const identicalPercent = (identicalPixels / totalPixels) * 100;
    const nearIdenticalPercent = (nearIdenticalPixels / totalPixels) * 100;
    const acceptableDiffPercent = (acceptableDifferencePixels / totalPixels) * 100;
    
    const effectivelyIdenticalPercent = ((identicalPixels + nearIdenticalPixels) / totalPixels) * 100;
    
    const acceptableQualityPercent = ((identicalPixels + nearIdenticalPixels + acceptableDifferencePixels) / totalPixels) * 100;
    
    const averageDifference = totalDifference / totalPixels;
    
    const results = `Загальна кількість пікселів: ${totalPixels}
Ідентичні пікселі (різниця = 0): ${identicalPixels} (${identicalPercent.toFixed(2)}%)
Майже ідентичні пікселі (різниця ≤ 1): ${nearIdenticalPixels} (${nearIdenticalPercent.toFixed(2)}%)
Ефективно ідентичні пікселі (різниця ≤ 1): ${identicalPixels + nearIdenticalPixels} (${effectivelyIdenticalPercent.toFixed(2)}%)
Пікселі з прийнятною різницею (1 < різниця ≤ 5): ${acceptableDifferencePixels} (${acceptableDiffPercent.toFixed(2)}%)
Загальна якість зображення: ${acceptableQualityPercent.toFixed(2)}%
Середня різниця: ${averageDifference.toFixed(2)} (діапазон 0-${maxDifference.toFixed(2)})
Максимальна різниця: ${maxDifference.toFixed(2)}

Розподіл різниць:
0: ${diffRanges['0']} (${(diffRanges['0']/totalPixels*100).toFixed(2)}%)
0-1: ${diffRanges['0-1']} (${(diffRanges['0-1']/totalPixels*100).toFixed(2)}%)
1-5: ${diffRanges['1-5']} (${(diffRanges['1-5']/totalPixels*100).toFixed(2)}%)
5-20: ${diffRanges['5-20']} (${(diffRanges['5-20']/totalPixels*100).toFixed(2)}%)
>20: ${diffRanges['>20']} (${(diffRanges['>20']/totalPixels*100).toFixed(2)}%)

Примітка: При конверсії кольорів невеликі відмінності (≤1) є візуально непомітними.

${effectivelyIdenticalPercent > 95 ? "Добре. Незначна втрата інформації при перетворенні." : 
  acceptableQualityPercent > 95 ? "Задовільно. Помітна, але прийнятна втрата інформації." : 
  "Погано. Значна втрата інформації при перетворенні."}`;
    
    const analysisResults = document.getElementById('analysisResults');
    const analysisContent = document.getElementById('analysisContent');
    
    if (analysisResults && analysisContent) {
        analysisContent.textContent = results;
        analysisResults.style.display = 'block';
    }
}

// ==================== EVENT LISTENERS ====================

uploadButton.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            originalImage = new Image();
            originalImage.onload = () => {
                resizeCanvasesToImage();
                
                ctxOriginal?.clearRect(0, 0, canvasWidth, canvasHeight);
                ctxOriginal?.drawImage(originalImage!, 0, 0, canvasWidth, canvasHeight);
                
                convertedImageData = null;
                
                ctxConverted?.clearRect(0, 0, canvasWidth, canvasHeight);
            };
            originalImage.src = event.target?.result as string;
        };
        
        reader.readAsDataURL(file);
    }
});

document.getElementById('rgbXyzRgbConversion')?.addEventListener('click', () => {
    if (originalImage) {
        processImageRgbXyzRgb();
    } else {
        alert('Please upload an image first!');
    }
});

document.getElementById('saveImage')?.addEventListener('click', () => {
    if (ctxConverted) {
        const link = document.createElement('a');
        link.download = 'converted-image.png';
        link.href = canvasConverted.toDataURL('image/png');
        link.click();
    }
});

document.getElementById('modifyColor')?.addEventListener('click', () => {
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

document.getElementById('closeModifyColorModal')?.addEventListener('click', () => {
    const modal = document.getElementById('modifyColorModal');
    if (modal) {
        modal.style.display = 'none';
    }
});

document.getElementById('analyzeImage')?.addEventListener('click', analyzeImageDifference);

let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let selectionRect = { x: 0, y: 0, width: 0, height: 0 };
let hasSelection = false;

const colorValue = document.getElementById('colorValue') as HTMLInputElement;

// ==================== COLOR MODELS FUNCTIONS ====================

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    
    let h = 0;
    if (delta === 0) {
        h = 0;
    } else if (max === rNorm) {
        h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
        h = (bNorm - rNorm) / delta + 2;
    } else {
        h = (rNorm - gNorm) / delta + 4;
    }
    
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    
    return [h, s, v];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
        r = c; g = 0; b = x;
    }
    
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

function isDarkGreen(r: number, g: number, b: number): boolean {
    const [h, s, v] = rgbToHsv(r, g, b);
    
    // ==================== DARK GREEN DETECTION START ====================
    return (
        h >= 80 && h <= 160 &&
        s > 0.3 &&
        v < 0.5 &&
        (g - Math.max(r, b)) > 30
    );
    // ==================== DARK GREEN DETECTION END ====================
}

function modifyDarkGreenValue(value: number) {
    if (!originalImage || !hasSelection) {
        alert('Please upload an image and select a region first!');
        return;
    }
    
    ctxOriginal?.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxOriginal?.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    
    if (convertedImageData) {
        ctxConverted?.clearRect(0, 0, canvasWidth, canvasHeight);
        ctxConverted?.putImageData(convertedImageData, 0, 0, 0, 0, canvasWidth * scaleFactor, canvasHeight * scaleFactor);
    } else {
        ctxConverted?.clearRect(0, 0, canvasWidth, canvasHeight);
        ctxConverted?.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
    }
    
    const selectedRegion = {
        x: Math.min(selectionRect.x, selectionRect.x + selectionRect.width) * scaleFactor,
        y: Math.min(selectionRect.y, selectionRect.y + selectionRect.height) * scaleFactor,
        width: Math.abs(selectionRect.width) * scaleFactor,
        height: Math.abs(selectionRect.height) * scaleFactor
    };
    
    const originalRegionData = ctxOriginal?.getImageData(
        selectedRegion.x, 
        selectedRegion.y, 
        selectedRegion.width, 
        selectedRegion.height
    );
    
    const convertedRegionData = ctxConverted?.getImageData(
        selectedRegion.x, 
        selectedRegion.y, 
        selectedRegion.width, 
        selectedRegion.height
    );
    
    if (!originalRegionData || !convertedRegionData) return;
    
    const brightnessAdjustment = (value - 128) / 128;
    
    const modifiedOriginalData = new ImageData(
        new Uint8ClampedArray(originalRegionData.data),
        originalRegionData.width,
        originalRegionData.height
    );
    
    const modifiedConvertedData = new ImageData(
        new Uint8ClampedArray(convertedRegionData.data),
        convertedRegionData.width,
        convertedRegionData.height
    );
    
    for (let i = 0; i < originalRegionData.data.length; i += 4) {
        const r = originalRegionData.data[i];
        const g = originalRegionData.data[i + 1];
        const b = originalRegionData.data[i + 2];
        
        if (isDarkGreen(r, g, b)) {
            const [h, s, v] = rgbToHsv(r, g, b);
            
            let newV;
            if (brightnessAdjustment >= 0) {
                newV = v + (1 - v) * brightnessAdjustment;
            } else {
                newV = v * (1 + brightnessAdjustment);
            }
            
            newV = Math.max(0, Math.min(1, newV));
            
            const [newR, newG, newB] = hsvToRgb(h, s, newV);
            
            modifiedOriginalData.data[i] = newR;
            modifiedOriginalData.data[i + 1] = newG;
            modifiedOriginalData.data[i + 2] = newB;
            
            modifiedConvertedData.data[i] = newR;
            modifiedConvertedData.data[i + 1] = newG;
            modifiedConvertedData.data[i + 2] = newB;
        }
    }
    
    ctxOriginal!.putImageData(
        modifiedOriginalData, 
        selectedRegion.x, 
        selectedRegion.y
    );
    
    ctxConverted!.putImageData(
        modifiedConvertedData, 
        selectedRegion.x, 
        selectedRegion.y
    );
    
    drawSelectionRect();
}

function drawSelectionRect() {
    if (!hasSelection) return;
    
    if (ctxOriginal) {
        ctxOriginal.strokeStyle = 'red';
        ctxOriginal.lineWidth = 2;
        ctxOriginal.setLineDash([5, 5]);
        ctxOriginal.strokeRect(
            selectionRect.x,
            selectionRect.y,
            selectionRect.width,
            selectionRect.height
        );
        ctxOriginal.setLineDash([]);
    }
    
    if (ctxConverted) {
        ctxConverted.strokeStyle = 'red';
        ctxConverted.lineWidth = 2;
        ctxConverted.setLineDash([5, 5]);
        ctxConverted.strokeRect(
            selectionRect.x,
            selectionRect.y,
            selectionRect.width,
            selectionRect.height
        );
        ctxConverted.setLineDash([]);
    }
}

function setupCanvasSelection() {
    canvasOriginal.addEventListener('mousedown', (e) => {
        const rect = canvasOriginal.getBoundingClientRect();
        selectionStart.x = e.clientX - rect.left;
        selectionStart.y = e.clientY - rect.top;
        isSelecting = true;
    });
    
    canvasOriginal.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        
        const rect = canvasOriginal.getBoundingClientRect();
        selectionEnd.x = e.clientX - rect.left;
        selectionEnd.y = e.clientY - rect.top;
        
        selectionRect = {
            x: Math.min(selectionStart.x, selectionEnd.x),
            y: Math.min(selectionStart.y, selectionEnd.y),
            width: Math.abs(selectionEnd.x - selectionStart.x),
            height: Math.abs(selectionEnd.y - selectionStart.y)
        };
        
        if (originalImage) {
            ctxOriginal?.clearRect(0, 0, canvasWidth, canvasHeight);
            ctxConverted?.clearRect(0, 0, canvasWidth, canvasHeight);
            
            ctxOriginal?.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
            ctxConverted?.drawImage(originalImage, 0, 0, canvasWidth, canvasHeight);
            
            drawSelectionRect();
        }
    });
    
    canvasOriginal.addEventListener('mouseup', () => {
        isSelecting = false;
        hasSelection = selectionRect.width > 5 && selectionRect.height > 5;
    });
}

function setupPixelInfoDisplay() {
    const handleCanvasClick = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null, source: string) => {
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) * scaleFactor);
            const y = Math.floor((e.clientY - rect.top) * scaleFactor);
            
            if (ctx) {
                const pixelData = ctx.getImageData(x, y, 1, 1).data;
                const r = pixelData[0];
                const g = pixelData[1];
                const b = pixelData[2];
                const a = pixelData[3];
                
                const [X, Y, Z] = rgbToXyz(r, g, b);
                
                const [h, s, v] = rgbToHsv(r, g, b);
                const l = v * (1 - s/2);
                const hslS = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
                
                const pixelInfo = `Джерело:    ${source}
Координати: (${Math.round(x/scaleFactor)}, ${Math.round(y/scaleFactor)})
RGB:        (${r}, ${g}, ${b}, ${a})
HSL:        (${Math.round(h)}°, ${(s*100).toFixed(1)}%, ${(l*100).toFixed(1)}%)
XYZ:        (${X.toFixed(2)}, ${Y.toFixed(2)}, ${Z.toFixed(2)})`;
                
                const pixelInfoPanel = document.getElementById('pixelInfoPanel');
                const pixelInfoContent = document.getElementById('pixelInfoContent');
                
                if (pixelInfoPanel && pixelInfoContent) {
                    pixelInfoContent.textContent = pixelInfo;
                    pixelInfoPanel.style.display = 'block';
                }
            }
        });
    };
    
    if (ctxOriginal) {
        handleCanvasClick(canvasOriginal, ctxOriginal, 'Оригінальне');
    }
    
    if (ctxConverted) {
        handleCanvasClick(canvasConverted, ctxConverted, 'Оброблене');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupCanvasSelection();
    setupPixelInfoDisplay();
});

document.getElementById('applyColorModification')?.addEventListener('click', () => {
    const value = parseInt(colorValue.value);
    modifyDarkGreenValue(value);
    
    const modal = document.getElementById('modifyColorModal');
    if (modal) {
        modal.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setupCanvasSelection();
});
