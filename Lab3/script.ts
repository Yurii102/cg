// ==================== CANVAS SETUP AND GLOBAL VARIABLES ====================
const canvas = document.getElementById('canvas-System') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

const height = 500;  
const width = 800;
const BASE_GRID_SIZE = 25; 
const scaleFactor = window.devicePixelRatio || 1; 
canvas.width = width * scaleFactor;
canvas.height = height * scaleFactor;
canvas.style.width = width + "px";
canvas.style.height = height + "px";
ctx!.scale(scaleFactor, scaleFactor);

let zoomLevel = 1;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 10;

let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

let gridScale = 1; 
let gridSize = BASE_GRID_SIZE; 

const toggleGrid = document.getElementById("toggleGrid") as HTMLInputElement;
const toggleCoordinates = document.getElementById("toggleCoordinates") as HTMLInputElement;
const typeFractal = document.getElementById("typeFractal") as HTMLSelectElement;
const saveBtn = document.getElementById("saveFractal") as HTMLButtonElement;
const clearBtn = document.getElementById("clearCanvas") as HTMLButtonElement;
const colorPicker = document.getElementById("canvasColorPicker") as HTMLInputElement;

colorPicker.addEventListener("input", () => {
    canvas.style.backgroundColor = colorPicker.value;
    redrawCanvas();
});

clearBtn.addEventListener("click", () => {
    clearCanvas();
    currentFractalType = null;
    currentFractalParams = {};
});

toggleGrid.addEventListener("change", redrawCanvas);
toggleCoordinates.addEventListener("change", redrawCanvas);

let currentFractalType: string | null = null;
let currentFractalParams: FractalParams = {};

function redrawCanvas() {
    clearCanvas();
    updateGridScale(); 
    if (toggleGrid.checked) {
        drawGrid();
    }
    if (toggleCoordinates.checked) {
        drawCoordinateSystem();
    }
    
    if (currentFractalType) {
        drawFractal(currentFractalType, currentFractalParams, false);
    }
}

function updateGridScale() {
    if (zoomLevel >= 2) {
        gridScale = 1;
        gridSize = BASE_GRID_SIZE * zoomLevel;
    } else if (zoomLevel >= 1) {
        gridScale = 1;
        gridSize = BASE_GRID_SIZE * zoomLevel;
    } else if (zoomLevel >= 0.5) {
        gridScale = 2;
        gridSize = BASE_GRID_SIZE * zoomLevel * 2;
    } else if (zoomLevel >= 0.2) {
        gridScale = 5;
        gridSize = BASE_GRID_SIZE * zoomLevel * 5;
    } else if (zoomLevel >= 0.1) {
        gridScale = 10;
        gridSize = BASE_GRID_SIZE * zoomLevel * 10;
    } else {
        gridScale = 20;
        gridSize = BASE_GRID_SIZE * zoomLevel * 20;
    }
}

canvas.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
    if (!isDragging) return;

    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;

    redrawCanvas();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('wheel', handleZoom);

function handleZoom(e: WheelEvent) {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const graphPoint = canvasToGraphCoords(mouseX, mouseY);
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomLevel *= zoomFactor;
    
    zoomLevel = Math.min(Math.max(zoomLevel, MIN_ZOOM), MAX_ZOOM);
    
    updateGridScale();
    
    const newCanvasPoint = graphToCanvasCoords(graphPoint.x, graphPoint.y);
    
    offsetX += mouseX - newCanvasPoint.x;
    offsetY += mouseY - newCanvasPoint.y;
    
    redrawCanvas();
}

function canvasToGraphCoords(canvasX: number, canvasY: number) {
    const centerX = width / 2 + offsetX;
    const centerY = height / 2 + offsetY;
    
    return {
        x: ((canvasX - centerX) / gridSize) * gridScale,
        y: ((centerY - canvasY) / gridSize) * gridScale
    };
}

function graphToCanvasCoords(graphX: number, graphY: number) {
    const centerX = width / 2 + offsetX;
    const centerY = height / 2 + offsetY;
    
    return {
        x: centerX + (graphX * gridSize) / gridScale,
        y: centerY - (graphY * gridSize) / gridScale
    };
}

function drawCoordinateSystem() {
    const centerX = width / 2 + offsetX;
    const centerY = height / 2 + offsetY;
    
    ctx!.strokeStyle = '#000';
    ctx!.lineWidth = 2;

    // Вісь X
    ctx!.beginPath();
    ctx!.moveTo(0, centerY);
    ctx!.lineTo(width, centerY);
    ctx!.stroke();

    // Вісь Y
    ctx!.beginPath();
    ctx!.moveTo(centerX, 0);
    ctx!.lineTo(centerX, height);
    ctx!.stroke();

    drawNumber();
}

function drawGrid() {
    const centerX = width / 2 + offsetX;
    const centerY = height / 2 + offsetY;
    
    ctx!.strokeStyle = '#c0c0c082';
    ctx!.lineWidth = 1;

    const startGridX = Math.ceil((0 - centerX) / gridSize) * gridSize + centerX;
    const startGridY = Math.ceil((0 - centerY) / gridSize) * gridSize + centerY;

    for (let x = startGridX; x < width; x += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, height);
        ctx!.stroke();
    }

    for (let y = startGridY; y < height; y += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(width, y);
        ctx!.stroke();
    }
}

function drawNumber() {
    const centerX = width / 2 + offsetX;
    const centerY = height / 2 + offsetY;
    
    ctx!.font = '12px Arial';
    ctx!.fillStyle = '#000';
    ctx!.textAlign = 'center';
    ctx!.textBaseline = 'middle';

    ctx!.fillText('0', centerX - 8, centerY + 15);

    const numXGridLines = Math.ceil(width / gridSize) + 1;
    const numYGridLines = Math.ceil(height / gridSize) + 1;
    
    const startGridX = Math.floor((0 - centerX) / gridSize) * gridSize;
    const startGridY = Math.floor((0 - centerY) / gridSize) * gridSize;

    for (let i = 0; i < numXGridLines; i++) {
        const x = startGridX + i * gridSize + centerX;
        const value = Math.round(((startGridX + i * gridSize) / gridSize) * gridScale);
        
        if (x >= 0 && x <= width && value !== 0) {
            ctx!.fillText(value.toString(), x, centerY + 15);
        }
    }

    for (let i = 0; i < numYGridLines; i++) {
        const y = startGridY + i * gridSize + centerY;
        const value = -Math.round(((startGridY + i * gridSize) / gridSize) * gridScale);
        
        if (y >= 0 && y <= height && value !== 0) {
            ctx!.fillText(value.toString(), centerX + 15, y);
        }
    }
}

function clearCanvas(): void {
    ctx!.clearRect(0, 0, width, height);
    canvas.style.backgroundColor = colorPicker.value;
}

function resetView() {
    zoomLevel = 1;
    offsetX = 0;
    offsetY = 0;
    updateGridScale();
    redrawCanvas();
}

type FractalParams = {
    depth?: number;
    iterations?: number;
    color?: string;
    fillColor?: string;
    borderColor?: string;
    size?: number;
    positionX?: number;
    positionY?: number;
    realC?: number;
    imaginaryC?: number;
};

const modal = document.getElementById("fractalModal") as HTMLDivElement;
const drawBtn = document.getElementById("drawFractal") as HTMLButtonElement;
const closeBtn = document.querySelector(".close-btn") as HTMLSpanElement;
const formContainer = document.getElementById("fractalFormContainer") as HTMLDivElement;
const typeSelect = document.getElementById("typeFractal") as HTMLSelectElement;
const applyBtn = document.getElementById("applyFractal") as HTMLButtonElement;

drawBtn.addEventListener("click", () => {
    const type = typeSelect.value;
    showFormForFractal(type);
    modal.style.display = "block";
});

closeBtn.onclick = () => {
    modal.style.display = "none";
};

window.onclick = (event: MouseEvent) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

function showFormForFractal(type: string): void {
    formContainer.innerHTML = ""; // Очистити

    if (type === "carpetSierpinski") {
        formContainer.innerHTML = `
            <label>Iterations:</label>
            <input type="number" id="iterations" min="1" max="4" value="1">
            <label>Fill Color:</label>
            <input type="color" id="fillColor" value="#1abc9c">
            <label>Border Color:</label>
            <input type="color" id="borderColor" value="#000000">
            <label>Size:</label>
            <input type="number" id="fractalSize" min="1" max="20" value="8" step="0.5">
            <label>Position X:</label>
            <input type="number" id="positionX" value="0" step="0.5">
            <label>Position Y:</label>
            <input type="number" id="positionY" value="0" step="0.5">
        `;
    } else if (type === "triangleSierpinski") {
        formContainer.innerHTML = `
            <label>Depth:</label>
            <input type="number" id="depth" min="1" max="8" value="4">
            <label>Fill Color:</label>
            <input type="color" id="fillColor" value="#ff5722">
            <label>Border Color:</label>
            <input type="color" id="borderColor" value="#000000">
            <label>Size:</label>
            <input type="number" id="fractalSize" min="1" max="20" value="8" step="0.5">
            <label>Position X:</label>
            <input type="number" id="positionX" value="0" step="0.5">
            <label>Position Y:</label>
            <input type="number" id="positionY" value="0" step="0.5">
        `;
    } else if (type === "myCustom") {
        formContainer.innerHTML = `
            <label>Iterations:</label>
            <input type="number" id="iterations" min="1" max="100" value="50">
            <label>Real part of c:</label>
            <input type="number" id="realC" value="-0.3" step="0.1">
            <label>Imaginary part of c:</label>
            <input type="number" id="imaginaryC" value="0.65" step="0.1">
            <label>Color:</label>
            <input type="color" id="customColor" value="#1abc9c">
        `;
    }
}

applyBtn.addEventListener("click", () => {
    const type = typeSelect.value;
    let params: FractalParams = {};

    if (type === "carpetSierpinski") {
        const iterationsInput = document.getElementById("iterations") as HTMLInputElement;
        const fillColorInput = document.getElementById("fillColor") as HTMLInputElement;
        const borderColorInput = document.getElementById("borderColor") as HTMLInputElement;
        const sizeInput = document.getElementById("fractalSize") as HTMLInputElement;
        const positionXInput = document.getElementById("positionX") as HTMLInputElement;
        const positionYInput = document.getElementById("positionY") as HTMLInputElement;
        
        // Convert iterations to depth: depth = iterations + 2
        const iterations = parseInt(iterationsInput.value);
        params.depth = iterations + 2;
        params.iterations = iterations; // Store iterations for later use
        params.fillColor = fillColorInput.value;
        params.borderColor = borderColorInput.value;
        params.size = parseFloat(sizeInput.value);
        params.positionX = parseFloat(positionXInput.value);
        params.positionY = parseFloat(positionYInput.value);
    } else if (type === "triangleSierpinski") {
        const depthInput = document.getElementById("depth") as HTMLInputElement;
        const fillColorInput = document.getElementById("fillColor") as HTMLInputElement;
        const borderColorInput = document.getElementById("borderColor") as HTMLInputElement;
        const sizeInput = document.getElementById("fractalSize") as HTMLInputElement;
        const positionXInput = document.getElementById("positionX") as HTMLInputElement;
        const positionYInput = document.getElementById("positionY") as HTMLInputElement;
        
        params.depth = parseInt(depthInput.value);
        params.fillColor = fillColorInput.value;
        params.borderColor = borderColorInput.value;
        params.size = parseFloat(sizeInput.value);
        params.positionX = parseFloat(positionXInput.value);
        params.positionY = parseFloat(positionYInput.value);
    } else if (type === "myCustom") {
        const iterationsInput = document.getElementById("iterations") as HTMLInputElement;
        const colorInput = document.getElementById("customColor") as HTMLInputElement;
        const realCInput = document.getElementById("realC") as HTMLInputElement;
        const imaginaryCInput = document.getElementById("imaginaryC") as HTMLInputElement;
        
        params.iterations = parseInt(iterationsInput.value);
        params.color = colorInput.value;
        params.realC = parseFloat(realCInput.value);
        params.imaginaryC = parseFloat(imaginaryCInput.value);
    }

    drawFractal(type, params);
    modal.style.display = "none";
});

function drawFractal(type: string, params: FractalParams, isNewDraw: boolean = true): void {
    if (isNewDraw) {
        redrawCanvas(); 
        
        currentFractalType = type;
        currentFractalParams = {...params};
    }
    
    if (type === "carpetSierpinski") {
        const depth = params.depth || 3;
        const fillColor = params.fillColor || "#1abc9c";
        const borderColor = params.borderColor || "#000000";
        const size = params.size || 8;
        const positionX = params.positionX || 0;
        const positionY = params.positionY || 0;
        
        drawSierpinskiCarpet(depth, fillColor, borderColor, size, positionX, positionY);
    } else if (type === "triangleSierpinski") {
        const depth = params.depth || 4;
        const fillColor = params.fillColor || "#ff5722";
        const borderColor = params.borderColor || "#000000";
        const size = params.size || 8;
        const positionX = params.positionX || 0;
        const positionY = params.positionY || 0;
        
        drawSierpinskiTriangle(depth, fillColor, borderColor, size, positionX, positionY);
    } else if (type === "myCustom") {
        const iterations = params.iterations || 50;
        const color = params.color || "#1abc9c";
        const realC = params.realC !== undefined ? params.realC : -0.3;
        const imaginaryC = params.imaginaryC !== undefined ? params.imaginaryC : 0.65;
        
        drawHyperbolicCosineFractal(iterations, color, realC, imaginaryC);
    }
}

function hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

class Complex {
    real: number;
    imag: number;
    
    constructor(real: number, imag: number) {
        this.real = real;
        this.imag = imag;
    }
    
    add(other: Complex): Complex {
        return new Complex(this.real + other.real, this.imag + other.imag);
    }
    
    multiply(other: Complex): Complex {
        return new Complex(
            this.real * other.real - this.imag * other.imag,
            this.real * other.imag + this.imag * other.real
        );
    }
    
    exp(): Complex {
        const expReal = Math.exp(this.real);
        return new Complex(
            expReal * Math.cos(this.imag),
            expReal * Math.sin(this.imag)
        );
    }
    
    magnitude(): number {
        return Math.sqrt(this.real * this.real + this.imag * this.imag);
    }
    
    hyperbolicCosine(): Complex {
        // ch(z) = (e^z + e^-z) / 2
        const exp_z = this.exp();
        const exp_minus_z = new Complex(this.real * -1, this.imag * -1).exp();
        
        return new Complex(
            (exp_z.real + exp_minus_z.real) / 2,
            (exp_z.imag + exp_minus_z.imag) / 2
        );
    }
}

function drawHyperbolicCosineFractal(
    maxIterations: number, 
    color: string,
    realC: number,
    imaginaryC: number
): void {
    // The constant c in the fractal formula z = ch(z) + c
    const c = new Complex(realC, imaginaryC);
    
    const physicalWidth = canvas.width;
    const physicalHeight = canvas.height;
    
    const imageData = ctx!.createImageData(physicalWidth, physicalHeight);
    const data = imageData.data;
    
    const baseColor = hexToRgb(color);
    
    const topLeft = canvasToGraphCoords(0, 0);
    const bottomRight = canvasToGraphCoords(width, height);
    
    const xMin = topLeft.x;
    const yMax = topLeft.y;
    const xMax = bottomRight.x;
    const yMin = bottomRight.y;
    
    for (let x = 0; x < physicalWidth; x++) {
        for (let y = 0; y < physicalHeight; y++) {
            
            const logicalX = x / scaleFactor;
            const logicalY = y / scaleFactor;
            
            
            const zx = xMin + (logicalX / width) * (xMax - xMin);
            const zy = yMax - (logicalY / height) * (yMax - yMin); 
            
            let z = new Complex(zx, zy);
            
            // Iterate the function z = ch(z) + c
            let iteration = 0;
            const escapeRadius = 10; 
            
            while (iteration < maxIterations && z.magnitude() < escapeRadius) {
                z = z.hyperbolicCosine().add(c);
                iteration++;
            }
            
            const pixelIndex = (y * physicalWidth + x) * 4;
            
            if (iteration === maxIterations) {
                
                const setColor = {
                    r: Math.floor(baseColor.r * 0.2),
                    g: Math.floor(baseColor.g * 0.2),
                    b: Math.floor(baseColor.b * 0.2)
                };
                
                data[pixelIndex] = setColor.r;
                data[pixelIndex + 1] = setColor.g;
                data[pixelIndex + 2] = setColor.b;
                data[pixelIndex + 3] = 255; // Alpha
            } else {
                const smooth = iteration + 1 - Math.log(Math.log(z.magnitude())) / Math.log(2);
                const hue = (smooth / maxIterations * 360) % 360;
                const sat = 0.7;
                const val = 1.0;
                
                const rgb = hsvToRgb(hue, sat, val);
                
                data[pixelIndex] = rgb.r;
                data[pixelIndex + 1] = rgb.g;
                data[pixelIndex + 2] = rgb.b;
                data[pixelIndex + 3] = 255; // Alpha
            }
        }
    }
    
    ctx!.save();
    
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    
    ctx!.putImageData(imageData, 0, 0);
    
    ctx!.restore();
}

function hsvToRgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
    let r = 0, g = 0, b = 0;
    
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    
    return {
        r: Math.round(r * 255), 
        g: Math.round(g * 255), 
        b: Math.round(b * 255)
    };
}

function drawSierpinskiCarpet(
    depth: number, 
    fillColor: string, 
    borderColor: string, 
    size: number = 8, 
    posX: number = 0, 
    posY: number = 0
): void {
    drawCarpetAtPosition(posX - size/2, posY - size/2, size, depth, fillColor, borderColor);
}

function drawCarpetAtPosition(x: number, y: number, size: number, depth: number, fillColor: string, borderColor: string): void {
    if (depth <= 0) return;

    const topLeft = graphToCanvasCoords(x, y);
    const bottomRight = graphToCanvasCoords(x + size, y + size);
    const canvasWidth = bottomRight.x - topLeft.x;
    const canvasHeight = bottomRight.y - topLeft.y;
    
    ctx!.fillStyle = fillColor;
    ctx!.fillRect(topLeft.x, topLeft.y, canvasWidth, canvasHeight);
    
    ctx!.strokeStyle = borderColor;
    ctx!.lineWidth = 1;
    ctx!.strokeRect(topLeft.x, topLeft.y, canvasWidth, canvasHeight);

    const newSize = size / 3;
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            // Skip the center square (i=1, j=1)
            if (i === 1 && j === 1) continue;
            
            const newX = x + i * newSize;
            const newY = y + j * newSize;
            
            drawCarpetAtPosition(newX, newY, newSize, depth - 1, fillColor, borderColor);
        }
    }
}

function drawSierpinskiTriangle(
    depth: number, 
    fillColor: string, 
    borderColor: string, 
    size: number = 8, 
    posX: number = 0, 
    posY: number = 0
): void {
    const halfSize = size / 2;
    const height = size * Math.sin(Math.PI / 3); 
    
    const point1 = { x: posX, y: posY + height/2 };                   // Top point
    const point2 = { x: posX - halfSize, y: posY - height/2 };        // Bottom left
    const point3 = { x: posX + halfSize, y: posY - height/2 };        // Bottom right
    
    drawTriangle(point1, point2, point3, depth, fillColor, borderColor);
}

function drawTriangle(
    p1: {x: number, y: number}, 
    p2: {x: number, y: number}, 
    p3: {x: number, y: number}, 
    depth: number, 
    fillColor: string, 
    borderColor: string
): void {
    if (depth <= 0) {
        const p1Canvas = graphToCanvasCoords(p1.x, p1.y);
        const p2Canvas = graphToCanvasCoords(p2.x, p2.y);
        const p3Canvas = graphToCanvasCoords(p3.x, p3.y);
        
        ctx!.beginPath();
        ctx!.moveTo(p1Canvas.x, p1Canvas.y);
        ctx!.lineTo(p2Canvas.x, p2Canvas.y);
        ctx!.lineTo(p3Canvas.x, p3Canvas.y);
        ctx!.closePath();
        
        ctx!.fillStyle = fillColor;
        ctx!.fill();
        
        ctx!.strokeStyle = borderColor;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        
        return;
    }
    
    const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };  // Between p1 and p2
    const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };  // Between p2 and p3
    const mid3 = { x: (p3.x + p1.x) / 2, y: (p3.y + p1.y) / 2 };  // Between p3 and p1
    
    drawTriangle(p1, mid1, mid3, depth - 1, fillColor, borderColor);      // Top triangle
    drawTriangle(mid1, p2, mid2, depth - 1, fillColor, borderColor);      // Bottom left
    drawTriangle(mid3, mid2, p3, depth - 1, fillColor, borderColor);      // Bottom right
}

saveBtn.addEventListener("click", () => {
    if (currentFractalType) {
        saveFractalToGallery();
    } else {
        alert("No fractal to save. Please draw a fractal first.");
    }
});

function saveFractalToGallery(): void {
    const thumbnail = document.createElement('canvas');
    const thumbCtx = thumbnail.getContext('2d');
    const THUMBNAIL_SIZE = 150;
    
    thumbnail.width = THUMBNAIL_SIZE;
    thumbnail.height = THUMBNAIL_SIZE;
    
    thumbCtx!.fillStyle = canvas.style.backgroundColor;
    thumbCtx!.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
    thumbCtx!.drawImage(canvas, 0, 0, canvas.width, canvas.height, 
                       0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
    
    const fractalId = `fractal_${Date.now()}`;
    
    const container = document.createElement('div');
    container.className = 'gallery-item';
    container.id = fractalId;
    
    container.appendChild(thumbnail);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'fractal-info';
    
    let fractalName = '';
    switch (currentFractalType) {
        case 'carpetSierpinski': fractalName = 'Sierpinski Carpet'; break;
        case 'triangleSierpinski': fractalName = 'Sierpinski Triangle'; break;
        case 'myCustom': fractalName = 'Custom Fractal'; break;
        default: fractalName = 'Unknown Fractal';
    }
    
    infoDiv.innerHTML = `
        <p>${fractalName}</p>
        <button class="download-btn" data-id="${fractalId}">Download</button>
    `;
    
    container.appendChild(infoDiv);
    
    const gallery = document.getElementById('galleryGrid');
    gallery!.appendChild(container);
    
    const fractalData = {
        type: currentFractalType,
        params: {...currentFractalParams},
        bgColor: canvas.style.backgroundColor,
        thumbnail: thumbnail.toDataURL('image/png')
    };
    
    localStorage.setItem(fractalId, JSON.stringify(fractalData));
    
    const downloadBtn = container.querySelector('.download-btn');
    downloadBtn!.addEventListener('click', (e) => {
        downloadFractal(fractalId);
        e.stopPropagation(); 
    });
    
    container.addEventListener('click', () => {
        restoreFractal(fractalId);
    });
}

function downloadFractal(fractalId: string): void {
    const link = document.createElement('a');
    
    link.download = `${fractalId}.png`;
    link.href = canvas.toDataURL('image/png');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function restoreFractal(fractalId: string): void {
    const savedFractalData = localStorage.getItem(fractalId);
    if (!savedFractalData) return;
    
    const fractalData = JSON.parse(savedFractalData);
    
    colorPicker.value = fractalData.bgColor;
    canvas.style.backgroundColor = fractalData.bgColor;
    
    drawFractal(fractalData.type, fractalData.params);
}

function loadSavedFractals(): void {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fractal_')) {
            try {
                const fractalData = JSON.parse(localStorage.getItem(key)!);
                
                const container = document.createElement('div');
                container.className = 'gallery-item';
                container.id = key;
                
                const thumbnailImg = document.createElement('img');
                thumbnailImg.src = fractalData.thumbnail;
                thumbnailImg.className = 'fractal-thumbnail';
                container.appendChild(thumbnailImg);
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'fractal-info';
                
                let fractalName = '';
                switch (fractalData.type) {
                    case 'carpetSierpinski': fractalName = 'Sierpinski Carpet'; break;
                    case 'triangleSierpinski': fractalName = 'Sierpinski Triangle'; break;
                    case 'myCustom': fractalName = 'Custom Fractal'; break;
                    default: fractalName = 'Unknown Fractal';
                }
                
                infoDiv.innerHTML = `
                    <p>${fractalName}</p>
                    <button class="download-btn" data-id="${key}">Download</button>
                `;
                
                container.appendChild(infoDiv);
                
                const gallery = document.getElementById('galleryGrid');
                gallery!.appendChild(container);
                
                const downloadBtn = container.querySelector('.download-btn');
                downloadBtn!.addEventListener('click', (e) => {
                    restoreFractal(key);
                    downloadFractal(key);
                    e.stopPropagation();
                });
                
                container.addEventListener('click', () => {
                    restoreFractal(key);
                });
            } catch (e) {
                console.error(`Error loading fractal ${key}:`, e);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', loadSavedFractals);

redrawCanvas();
