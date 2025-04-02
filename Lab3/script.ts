// ==================== CANVAS SETUP AND GLOBAL VARIABLES ====================
const canvas = document.getElementById('canvas-System') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

const height = 650;  
const width = 1250;
const gridSize = 25;
const scaleFactor = window.devicePixelRatio || 1; 
canvas.width = width * scaleFactor;
canvas.height = height * scaleFactor;
canvas.style.width = width + "px";
canvas.style.height = height + "px";
ctx!.scale(scaleFactor, scaleFactor);

// Variables for panning
let panOffsetX = 0;
let panOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// Variables for zooming
let zoomLevel = 1;
const minZoom = 0.1;
const maxZoom = 10;

// Scale factors for grid values - smoother transitions with 0.1 increments
const scaleFactors = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];
let currentScaleFactorIndex = 9; // Start with scale factor 1 (index 9)

// Sample object for demonstration
const sampleObject = {
    x: 3, // World coordinates
    y: 2,
    width: 1,
    height: 1,
    color: 'rgba(255, 0, 0, 0.5)'
};

const originX = width / 2;
const originY = height / 2;

const canvasColorPicker = document.getElementById('canvasColorPicker') as HTMLInputElement;
canvasColorPicker.addEventListener('input', () => {
    canvas.style.backgroundColor = canvasColorPicker.value;
    drawCoordinateSystem();
});

canvas.style.backgroundColor = canvasColorPicker.value;

// ==================== COORDINATE SYSTEM FUNCTIONS ====================

function drawGrid() {
    if (!ctx) return;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    const transformedOriginX = originX + panOffsetX;
    const transformedOriginY = originY + panOffsetY;
    
    // Get current scale factor
    const currentScaleFactor = scaleFactors[currentScaleFactorIndex];
    const baseScaleFactor = scaleFactors[9]; // Value 1
    
    // Calculate grid density factor for better visibility at small scales
    let gridDensityFactor = 1;
    if (currentScaleFactor <= 0.1) gridDensityFactor = 10;
    else if (currentScaleFactor <= 0.2) gridDensityFactor = 5;
    else if (currentScaleFactor <= 0.5) gridDensityFactor = 2;
    else if (currentScaleFactor < 1) gridDensityFactor = 1 + (1 - currentScaleFactor) * 2;
    
    // Adjust visual grid size based on both scale and density factors
    const visualGridSize = gridSize * (currentScaleFactor / baseScaleFactor) * gridDensityFactor;
    
    // Calculate the starting positions for grid lines
    // Ensure they're aligned with the transformed origin
    const startX = transformedOriginX - Math.floor(transformedOriginX / visualGridSize) * visualGridSize;
    const startY = transformedOriginY - Math.floor(transformedOriginY / visualGridSize) * visualGridSize;
    
    // Draw vertical grid lines
    for (let x = startX; x < width; x += visualGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = startY; y < height; y += visualGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawAxes() {
    if (!ctx) return;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Apply pan offset to axes
    const transformedOriginX = originX + panOffsetX;
    const transformedOriginY = originY + panOffsetY;
    
    ctx.beginPath();
    ctx.moveTo(0, transformedOriginY);
    ctx.lineTo(width, transformedOriginY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(transformedOriginX, 0);
    ctx.lineTo(transformedOriginX, height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(width - 10, transformedOriginY - 5);
    ctx.lineTo(width, transformedOriginY);
    ctx.lineTo(width - 10, transformedOriginY + 5);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(transformedOriginX - 5, 10);
    ctx.lineTo(transformedOriginX, 0);
    ctx.lineTo(transformedOriginX + 5, 10);
    ctx.stroke();
}

function drawLabels() {
    if (!ctx) return;
    
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const transformedOriginX = originX + panOffsetX;
    const transformedOriginY = originY + panOffsetY;
    
    // Get current scale factor
    const currentScaleFactor = scaleFactors[currentScaleFactorIndex];
    const baseScaleFactor = scaleFactors[9]; // Value 1
    
    // Calculate grid density factor for better visibility at small scales
    let gridDensityFactor = 1;
    if (currentScaleFactor <= 0.1) gridDensityFactor = 10;
    else if (currentScaleFactor <= 0.2) gridDensityFactor = 5;
    else if (currentScaleFactor <= 0.5) gridDensityFactor = 2;
    else if (currentScaleFactor < 1) gridDensityFactor = 1 + (1 - currentScaleFactor) * 2;
    
    // Adjust visual grid size based on both scale and density factors
    const visualGridSize = gridSize * (currentScaleFactor / baseScaleFactor) * gridDensityFactor;
    
    // Calculate value per grid unit, ensuring proper values at all scales
    const valuePerGridUnit = (1 / currentScaleFactor) * gridDensityFactor;
    
    // Calculate the number of grid cells from origin to the edges
    const gridCellsToLeftEdge = Math.ceil(transformedOriginX / visualGridSize);
    const gridCellsToRightEdge = Math.ceil((width - transformedOriginX) / visualGridSize);
    const gridCellsToTopEdge = Math.ceil(transformedOriginY / visualGridSize);
    const gridCellsToBottomEdge = Math.ceil((height - transformedOriginY) / visualGridSize);
    
    // Draw X-axis labels
    for (let i = -gridCellsToLeftEdge; i <= gridCellsToRightEdge; i++) {
        const xPos = transformedOriginX + (i * visualGridSize);
        if (xPos >= 0 && xPos <= width && xPos !== transformedOriginX) {
            const value = i * valuePerGridUnit;
            const formattedValue = Number.isInteger(value) ? value : value.toFixed(1);
            ctx.fillText(`${formattedValue}`, xPos, transformedOriginY + 16);
        }
    }
    
    // Y-axis labels
    for (let i = -gridCellsToBottomEdge; i <= gridCellsToTopEdge; i++) {
        const yPos = transformedOriginY - (i * visualGridSize);
        if (yPos >= 0 && yPos <= height && yPos !== transformedOriginY) {
            const value = i * valuePerGridUnit;
            const formattedValue = Number.isInteger(value) ? value : value.toFixed(1);
            ctx.fillText(`${formattedValue}`, transformedOriginX - 16, yPos);
        }
    }
    
    // Origin label
    if (transformedOriginX > 0 && transformedOriginX < width && 
        transformedOriginY > 0 && transformedOriginY < height) {
        ctx.fillText("0", transformedOriginX - 10, transformedOriginY + 16);
    }
    
    // Axis labels
    if (transformedOriginY > 0 && transformedOriginY < height) {
        ctx.fillText("X", width - 10, transformedOriginY - 20);
    }
    
    if (transformedOriginX > 0 && transformedOriginX < width) {
        ctx.fillText("Y", transformedOriginX + 20, 10);
    }
    
    // Update scale display to include grid density factor information
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(width - 200, 10, 190, 30);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    
    // Format the scale display with 1 decimal place
    const formattedScaleFactor = currentScaleFactor.toFixed(1);
    const formattedValuePerGrid = Math.round(valuePerGridUnit); // Round to whole number for cleaner display
    ctx.fillText(`Scale: ${formattedScaleFactor}x (${formattedValuePerGrid} units/grid)`, width - 190, 25);
}

// Function to draw a sample object that scales with zoom
function drawSampleObject() {
    if (!ctx) return;
    
    const transformedOriginX = originX + panOffsetX;
    const transformedOriginY = originY + panOffsetY;
    
    // Get current scale factor
    const currentScaleFactor = scaleFactors[currentScaleFactorIndex];
    const baseScaleFactor = scaleFactors[9];
    
    // Update grid density factor calculation to match the other functions
    let gridDensityFactor = 1;
    if (currentScaleFactor <= 0.1) gridDensityFactor = 10;
    else if (currentScaleFactor <= 0.2) gridDensityFactor = 5;
    else if (currentScaleFactor <= 0.5) gridDensityFactor = 2;
    else if (currentScaleFactor < 1) gridDensityFactor = 1 + (1 - currentScaleFactor) * 2;
    
    // Calculate scaled grid size
    const scaledGridSize = gridSize * (currentScaleFactor / baseScaleFactor);
    
    // Convert world coordinates to screen coordinates with adjusted scale
    const screenX = transformedOriginX + sampleObject.x * scaledGridSize;
    const screenY = transformedOriginY - sampleObject.y * scaledGridSize;
    
    // Scale width and height
    const screenWidth = sampleObject.width * scaledGridSize;
    const screenHeight = sampleObject.height * scaledGridSize;
    
    // Draw the object
    ctx.fillStyle = sampleObject.color;
    ctx.fillRect(screenX, screenY - screenHeight, screenWidth, screenHeight);
    
    // Add border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, screenY - screenHeight, screenWidth, screenHeight);
}

function drawCoordinateSystem() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    drawGrid();
    drawAxes();
    drawLabels();
    drawSampleObject(); // Draw sample object
}

// ==================== PAN FUNCTIONALITY ====================

// Handle mouse drag for panning
canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        
        panOffsetX += deltaX;
        panOffsetY += deltaY;
        
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        
        drawCoordinateSystem();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

// Set initial cursor style
canvas.style.cursor = 'grab';

// Add reset button to restore the original view
const resetButtonContainer = document.createElement('div');
resetButtonContainer.style.position = 'absolute';
resetButtonContainer.style.top = '10px';
resetButtonContainer.style.left = '10px';

const resetButton = document.createElement('button');
resetButton.textContent = 'Reset View';
resetButton.style.padding = '5px 10px';
resetButton.style.cursor = 'pointer';

resetButton.addEventListener('click', () => {
    panOffsetX = 0;
    panOffsetY = 0;
    currentScaleFactorIndex = 9; // Reset to scale factor 1 (index 9 in the new array)
    drawCoordinateSystem();
});

resetButtonContainer.appendChild(resetButton);
document.body.appendChild(resetButtonContainer);

// ==================== ZOOM FUNCTIONALITY ====================

// Handle mouse wheel for zooming
canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Determine zoom direction
    const zoomDirection = event.deltaY > 0 ? -1 : 1;
    
    // Update scale factor index based on zoom direction
    let newScaleFactorIndex = currentScaleFactorIndex + zoomDirection;
    
    // Ensure the scale factor index stays within bounds
    if (newScaleFactorIndex >= 0 && newScaleFactorIndex < scaleFactors.length) {
        // Get current scale factor and calculate density factors
        const currentScaleFactor = scaleFactors[currentScaleFactorIndex];
        const baseScaleFactor = scaleFactors[9];
        
        // Update grid density factor calculation to match above
        let currentGridDensityFactor = 1;
        if (currentScaleFactor <= 0.1) currentGridDensityFactor = 10;
        else if (currentScaleFactor <= 0.2) currentGridDensityFactor = 5;
        else if (currentScaleFactor <= 0.5) currentGridDensityFactor = 2;
        else if (currentScaleFactor < 1) currentGridDensityFactor = 1 + (1 - currentScaleFactor) * 2;
        
        // Calculate new scale factor
        const newScaleFactor = scaleFactors[newScaleFactorIndex];
        
        // Calculate new grid density factor with the same logic
        let newGridDensityFactor = 1;
        if (newScaleFactor <= 0.1) newGridDensityFactor = 10;
        else if (newScaleFactor <= 0.2) newGridDensityFactor = 5;
        else if (newScaleFactor <= 0.5) newGridDensityFactor = 2;
        else if (newScaleFactor < 1) newGridDensityFactor = 1 + (1 - newScaleFactor) * 2;
        
        // Calculate world position under mouse before zoom
        const scaledGridSize = gridSize * (currentScaleFactor / baseScaleFactor);
        const worldX = (mouseX - (originX + panOffsetX)) / scaledGridSize;
        const worldY = ((originY + panOffsetY) - mouseY) / scaledGridSize;
        
        // Update the scale factor index
        currentScaleFactorIndex = newScaleFactorIndex;
        
        // Calculate new scaled grid size
        const newScaledGridSize = gridSize * (newScaleFactor / baseScaleFactor);
        
        // Calculate new screen position for the same world coordinates
        const newScreenX = worldX * newScaledGridSize + (originX + panOffsetX);
        const newScreenY = (originY + panOffsetY) - worldY * newScaledGridSize;
        
        // Adjust pan to keep the point under mouse fixed
        panOffsetX += (mouseX - newScreenX);
        panOffsetY += (mouseY - newScreenY);
        
        drawCoordinateSystem();
    }
});

drawCoordinateSystem();