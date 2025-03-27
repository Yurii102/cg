// ==================== CANVAS SETUP AND GLOBAL VARIABLES ====================
const canvas = document.getElementById('coordinateSystem') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

const displaySize = 650;  
const gridSize = 25;
const scaleFactor = window.devicePixelRatio || 1; 
canvas.width = displaySize * scaleFactor;
canvas.height = displaySize * scaleFactor;
canvas.style.width = displaySize + "px";
canvas.style.height = displaySize + "px";
ctx!.scale(scaleFactor, scaleFactor);

// Add input variable declarations at the top with other globals
const numPointsInput = document.getElementById('numPoints') as HTMLInputElement;
const rangeStartInput = document.getElementById('rangeStart') as HTMLInputElement;
const rangeEndInput = document.getElementById('rangeEnd') as HTMLInputElement;

let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let startX = 0;
let startY = 0;
let isMovingPoint = false;
let selectedPointIndex = -1;
let wasCanvasMoved = false; 
let editingPointIndex = -1;
let pointToDelete = -1;
let bezierCurvePoints: { x: number, y: number }[] = [];
let bezierMatrix: number[][] = [];
let showControlPolygon = true;

interface Point {
  x: number;
  y: number;
  radius: number;
  selected: boolean;
}

let points: Point[] = [];

// ==================== POINT OPERATIONS ====================
function getPointAtPosition(canvasX: number, canvasY: number): number {
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const pointCanvasX = displaySize / 2 + offsetX + point.x * gridSize;
        const pointCanvasY = displaySize / 2 + offsetY - point.y * gridSize;
        
        const distance = Math.sqrt((canvasX - pointCanvasX) ** 2 + (canvasY - pointCanvasY) ** 2);
        if (distance <= point.radius) {
            return i;
        }
    }
    return -1;
}

function createPointFromCoordinates(x: number, y: number) {
    points.push({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(2)),
        radius: 10,
        selected: false
    });
    
    console.log(`Додано точку в координатах (${x.toFixed(2)}, ${y.toFixed(2)})`);
    updateBezierCurve(); 
    drawCoordinateSystem();
    updatePointsList(); 
}

function deletePoint(index: number) {
    if(index >= 0 && index < points.length) {
        const point = points[index];
        points.splice(index, 1);
        console.log(`Видалено точку ${index}: (${point.x}, ${point.y})`);
        updateBezierCurve(); 
        drawCoordinateSystem();
        updatePointsList(); 
    }
}

function updatePointsList() {
    const pointsList = document.getElementById('pointsContainer');
    if (!pointsList) return;
    
    pointsList.innerHTML = '';
    
    points.forEach((point, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `Точка ${index}: (${point.x}, ${point.y})`;
        listItem.style.cursor = 'pointer';
        
        listItem.addEventListener('click', () => openEditModal(index));
        
        pointsList.appendChild(listItem);
    });
}

function openEditModal(index: number) {
    const modal = document.getElementById('editForm') as HTMLElement;
    const closeBtn = modal.querySelector('.close') as HTMLElement;
    const saveBtn = document.getElementById('savePointBtn') as HTMLButtonElement;
    const editX = document.getElementById('editX') as HTMLInputElement;
    const editY = document.getElementById('editY') as HTMLInputElement;
    const overlay = document.querySelector(".modal-overlay") as HTMLElement;
    
    overlay.style.display = "block";
    
    if (index >= 0 && index < points.length) {
        
        editingPointIndex = index;
        
        editX.value = points[index].x.toString();
        editY.value = points[index].y.toString();
        
        modal.style.display = 'block';
        
        closeBtn.onclick = function() {
            overlay.style.display = "";
            modal.style.display = 'none';
        };
        
        window.onclick = function(event: MouseEvent) {
            if (event.target === modal) {
                overlay.style.display = "none";
                modal.style.display = 'none';
            }
        };
        
        saveBtn.onclick = function() {
            savePointChanges();
            overlay.style.display = "none";
            modal.style.display = 'none';
        };
    }
}

function savePointChanges() {
    const modal = document.getElementById('editForm') as HTMLElement;
    const editX = document.getElementById('editX') as HTMLInputElement;
    const editY = document.getElementById('editY') as HTMLInputElement;
    
    if (editingPointIndex >= 0 && editingPointIndex < points.length) {
        const newX = parseFloat(editX.value);
        const newY = parseFloat(editY.value);
        
        if (!isNaN(newX) && !isNaN(newY)) {
            points[editingPointIndex].x = parseFloat(newX.toFixed(2));
            points[editingPointIndex].y = parseFloat(newY.toFixed(2));
            
            console.log(`Точку ${editingPointIndex} змінено на координати (${points[editingPointIndex].x}, ${points[editingPointIndex].y})`);
            
            modal.style.display = 'none';
            
            updateBezierCurve();
            drawCoordinateSystem();
            updatePointsList();
        }
    }
}

// ==================== DRAWING FUNCTIONS ====================
function drawCoordinateSystem() {
    ctx!.clearRect(0, 0, displaySize, displaySize);
    ctx!.strokeStyle = '#000';
    ctx!.lineWidth = 2;

    // Вісь X
    ctx!.beginPath();
    ctx!.moveTo(0, displaySize / 2 + offsetY);
    ctx!.lineTo(displaySize, displaySize / 2 + offsetY);
    ctx!.stroke();

    // Вісь Y
    ctx!.beginPath();
    ctx!.moveTo(displaySize / 2 + offsetX, 0);
    ctx!.lineTo(displaySize / 2 + offsetX, displaySize);
    ctx!.stroke();

    drawGrid();
    drawNumber();
    if (showControlPolygon) drawControlPolygon(); 
    drawBezierCurve(); 
    drawPoints(); 
}

// Малювання сітки
function drawGrid() {
    ctx!.strokeStyle = '#c0c0c082';
    ctx!.lineWidth = 1;

    for (let x = 0; x < displaySize * 2; x += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(x + offsetX % gridSize, 0);
        ctx!.lineTo(x + offsetX % gridSize, displaySize);
        ctx!.stroke();
    }

    for (let y = 0; y < displaySize * 2; y += gridSize) {
        ctx!.beginPath();
        ctx!.moveTo(0, y + offsetY % gridSize);
        ctx!.lineTo(displaySize, y + offsetY % gridSize);
        ctx!.stroke();
    }
}

function drawNumber() {
    const centerX = displaySize / 2 + offsetX;
    const centerY = displaySize / 2 + offsetY;

    ctx!.font = '12px Arial';
    ctx!.fillStyle = '#000';
    ctx!.textAlign = 'center';
    ctx!.textBaseline = 'middle';

    ctx!.fillText('0', centerX - 8, centerY + 12);

    for (let x = Math.floor(-centerX / gridSize); x <= Math.ceil((displaySize - centerX) / gridSize); x++) {
        if (x === 0) continue;
        const canvasX = centerX + x * gridSize;
        ctx!.fillText(x.toString(), canvasX, centerY + 10);
    }

    for (let y = Math.floor(-centerY / gridSize); y <= Math.ceil((displaySize - centerY) / gridSize); y++) {
        if (y === 0) continue;
        const canvasY = centerY + y * gridSize;
        const num = y * (-1);
        ctx!.fillText(num.toString(), centerX + 10, canvasY);
    }
}

function drawPoints() {
    points.forEach((point, index) => {
        const canvasX = displaySize / 2 + offsetX + point.x * gridSize;
        const canvasY = displaySize / 2 + offsetY - point.y * gridSize;
        
        ctx!.fillStyle = point.selected ? 'blue' : 'red';
        
        ctx!.beginPath();
        ctx!.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
        ctx!.fill();
        
        ctx!.fillStyle = 'black';
        ctx!.font = '10px Arial';
        ctx!.fillText(`${index}: (${point.x}, ${point.y})`, canvasX + 8, canvasY - 8);
    });
}

function drawBezierCurve() {
    if (bezierCurvePoints.length === 0) return;
    
    const curveColorInput = document.getElementById('colorCurve') as HTMLInputElement;
    const curveColor = curveColorInput ? curveColorInput.value : '#000000';
    
    ctx!.beginPath();
    ctx!.strokeStyle = curveColor;
    ctx!.lineWidth = 2;
    
    const startPoint = bezierCurvePoints[0];
    ctx!.moveTo(
        displaySize / 2 + offsetX + startPoint.x * gridSize,
        displaySize / 2 + offsetY - startPoint.y * gridSize
    );
    
    for (let i = 1; i < bezierCurvePoints.length; i++) {
        const point = bezierCurvePoints[i];
        ctx!.lineTo(
            displaySize / 2 + offsetX + point.x * gridSize,
            displaySize / 2 + offsetY - point.y * gridSize
        );
    }
    
    ctx!.stroke();
}

function drawControlPolygon() {
    if (points.length < 2) return;
    
    const segmentsColorInput = document.getElementById('colorSegments') as HTMLInputElement;
    const segmentsColor = segmentsColorInput ? segmentsColorInput.value : '#ff0000';
    
    const otherSegmentsColorInput = document.getElementById('colorOtherSegments') as HTMLInputElement;
    const otherSegmentsColor = otherSegmentsColorInput ? otherSegmentsColorInput.value : '#0000ff';
    
    for (let i = 0; i < points.length - 1; i++) {
        const isTangent = (i === 0 || i === points.length - 2);
        
        ctx!.beginPath();
        ctx!.strokeStyle = isTangent ? segmentsColor : otherSegmentsColor;
        ctx!.lineWidth = 1.5;
        
        ctx!.moveTo(
            displaySize / 2 + offsetX + points[i].x * gridSize,
            displaySize / 2 + offsetY - points[i].y * gridSize
        );
        ctx!.lineTo(
            displaySize / 2 + offsetX + points[i + 1].x * gridSize,
            displaySize / 2 + offsetY - points[i + 1].y * gridSize
        );
        
        ctx!.stroke();
    }
}

// ==================== BEZIER CURVE - COMMON FUNCTIONS ====================
function updateBezierCurve() {
    if (points.length >= 2) {
        const numPointsInput = document.getElementById('numPoints') as HTMLInputElement;
        const rangeStartInput = document.getElementById('rangeStart') as HTMLInputElement;
        const rangeEndInput = document.getElementById('rangeEnd') as HTMLInputElement;
        const methodSelect = document.getElementById('methodSelect') as HTMLSelectElement;
        
        let numPoints = 100; 
        if (numPointsInput && numPointsInput.value && !isNaN(parseInt(numPointsInput.value))) {
            numPoints = parseInt(numPointsInput.value);
            numPoints--;
        }
        
        let xStart = null;
        let xEnd = null;
        
        if (rangeStartInput && rangeStartInput.value && !isNaN(parseFloat(rangeStartInput.value)) &&
            rangeEndInput && rangeEndInput.value && !isNaN(parseFloat(rangeEndInput.value))) {
            xStart = parseFloat(rangeStartInput.value);
            xEnd = parseFloat(rangeEndInput.value);
        }
        
        const method = methodSelect ? methodSelect.value : 'parametric';
        
        if (method === 'parametric') {
            bezierCurvePoints = buildBezierCurveParametric(numPoints, xStart, xEnd);
        } else if (method === 'matrix') {
            // Матричний метод
            bezierCurvePoints = buildBezierCurveMatrix(numPoints,points, xStart, xEnd);
        } else {
            alert("Невідомий метод!");
            return;
        }
        
        console.log(`Автоматично оновлено криву Безьє з ${bezierCurvePoints.length} точок`);
    } else {
        bezierCurvePoints = []; 
    }
}

// ==================== BEZIER CURVE - PARAMETRIC METHOD ====================
function binomialCoefficient(n: number, k: number): number {
    if (k === 0 || k === n) return 1;
    if (k > n) return 0;
    if (k > n - k) k = n - k; // C(n,k) = C(n,n-k)
    
    let coefficient = 1;
    
    // Обчислюємо C(n,k) = n*(n-1)*...*(n-k+1) / (k*(k-1)*...*1)
    for (let i = 0; i < k; i++) {
        coefficient *= (n - i);
        coefficient /= (i + 1);
    }
    
    return coefficient;
}

function bernsteinPolynomial(i: number, n: number, t: number): number {
    // B_i,n(t) = C(n,i) * t^i * (1-t)^(n-i)
    const binomCoef = binomialCoefficient(n, i);
    return binomCoef * Math.pow(t, i) * Math.pow(1 - t, n - i);
}

function bezierPointParametric(t: number, controlPoints: Point[]): { x: number, y: number } {
    const n = controlPoints.length - 1; // Степінь кривої Безьє
    let x = 0;
    let y = 0;
    
    // Застосовуємо формулу B(t) = Sum(i=0 to n) [ P_i * B_i,n(t) ]
    for (let i = 0; i <= n; i++) {
        const bernstein = bernsteinPolynomial(i, n, t);
        x += controlPoints[i].x * bernstein;
        y += controlPoints[i].y * bernstein;
    }
    
    return { x, y };
}

function findTForX(targetX: number, controlPoints: Point[], eps: number = 0.0001): number | null {
    const firstPoint = bezierPointParametric(0, controlPoints);
    const lastPoint = bezierPointParametric(1, controlPoints);
    const minX = Math.min(firstPoint.x, lastPoint.x);
    const maxX = Math.max(firstPoint.x, lastPoint.x);
    
    if (targetX < minX - eps || targetX > maxX + eps) {
        return null;
    }
    
    let left = 0;
    let right = 1;
    let iterations = 0;
    const maxIterations = 100; 
    
    while (right - left > eps && iterations < maxIterations) {
        const mid = (left + right) / 2;
        const point = bezierPointParametric(mid, controlPoints);
        
        if (Math.abs(point.x - targetX) < eps) {
            return mid;
        }
        
        if (point.x < targetX) {
            left = mid;
        } else {
            right = mid;
        }
        
        iterations++;
    }
    
    return (left + right) / 2;
}

function buildBezierCurveParametric(numPoints: number = 100, xStart: number | null = null, xEnd: number | null = null): { x: number, y: number }[] {
    if (points.length < 2) {
        alert("Для побудови кривої Безьє потрібно як мінімум 2 точки!");
        return [];
    }
    
    if (xStart === null || xEnd === null) {
        const curvePoints: { x: number, y: number }[] = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const point = bezierPointParametric(t, points);
            curvePoints.push(point);
        }
        return curvePoints;
    }
    
    const tStart = findTForX(xStart, points);
    const tEnd = findTForX(xEnd, points);
    
    if (tStart === null || tEnd === null) {
        console.warn(`Не вдалося знайти точки з x = ${xStart} або x = ${xEnd} на кривій.`);
        return [];
    }
    
    const curvePoints: { x: number, y: number }[] = [];
    for (let i = 0; i <= numPoints; i++) {
        const t = tStart + (i / numPoints) * (tEnd - tStart);
        const point = bezierPointParametric(t, points);
        curvePoints.push(point);
    }
    
    console.log(`Побудовано криву Безьє з рівно ${curvePoints.length} точками на проміжку x від ${xStart} до ${xEnd}`);
    return curvePoints;
}

// ==================== BEZIER CURVE - MATRIX METHOD ====================
function getBezierMatrix(n: number): number[][] {
    const matrix = Array(n + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= i; j++) {
            let coefficient = Math.pow(-1, i - j) * binomialCoefficient(n, i) * binomialCoefficient(i, j);
            matrix[j][n - i] = coefficient;
        }
    }
    
    return matrix;
}

function multiplyVectorMatrix(vector: number[], matrix: number[][]): number[] {
    const result = Array(matrix[0].length).fill(0);
    
    for (let j = 0; j < matrix[0].length; j++) {
        for (let i = 0; i < vector.length; i++) {
            result[j] += vector[i] * matrix[i][j];
        }
    }
    
    return result;
}

function multiplyVectorPoints(vector: number[], points: Point[]): { x: number, y: number } {
    let x = 0, y = 0;
    
    for (let i = 0; i < vector.length; i++) {
        x += vector[i] * points[i].x;
        y += vector[i] * points[i].y;
    }
    
    return { x, y };
}

function bezierPointMatrix(t: number, controlPoints: Point[]): { x: number, y: number } {
    const n = controlPoints.length - 1; // Степінь кривої Безьє
    
    // Створюємо вектор параметра [t^n, t^(n-1), ..., t, 1]
    const paramVector = Array(n + 1).fill(0);
    for (let i = 0; i <= n; i++) {
        paramVector[i] = Math.pow(t, n - i);
    }
    
    // Отримуємо матрицю коефіцієнтів Безьє
    const matrix = getBezierMatrix(n);
    bezierMatrix = matrix; // Зберігаємо матрицю для аналізу
    
    // Обчислюємо T * M
    const coefficients = multiplyVectorMatrix(paramVector, matrix);
    
    // Обчислюємо (T * M) * P
    return multiplyVectorPoints(coefficients, controlPoints);
}

function findTForXMatrix(targetX: number, controlPoints: Point[], eps: number = 0.0001): number | null {
    const firstPoint = bezierPointMatrix(0, controlPoints);
    const lastPoint = bezierPointMatrix(1, controlPoints);
    const minX = Math.min(firstPoint.x, lastPoint.x);
    const maxX = Math.max(firstPoint.x, lastPoint.x);
    
    if (targetX < minX - eps || targetX > maxX + eps) {
        return null;
    }
    
    let left = 0;
    let right = 1;
    let iterations = 0;
    const maxIterations = 100; 
    
    while (right - left > eps && iterations < maxIterations) {
        const mid = (left + right) / 2;
        const point = bezierPointMatrix(mid, controlPoints);
        
        if (Math.abs(point.x - targetX) < eps) {
            return mid;
        }
        
        if (point.x < targetX) {
            left = mid;
        } else {
            right = mid;
        }
        
        iterations++;
    }
    
    return (left + right) / 2;
}

function buildBezierCurveMatrix(numPoints: number = 100, controlPoints: Point[], xStart: number | null = null, xEnd: number | null = null): { x: number, y: number }[] {
    if (points.length < 2) {
        alert("Для побудови кривої Безьє потрібно як мінімум 2 точки!");
        return [];
    }
    
    const n = controlPoints.length - 1;
    const matrix = getBezierMatrix(n);
    console.log(matrix);
    if (xStart === null || xEnd === null) {
        const curvePoints: { x: number, y: number }[] = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const point = bezierPointMatrix(t, points);
            curvePoints.push(point);
        }
        
        // Видаляємо автоматичний аналіз матриці
        // analyzeMatrixOnDemand(); 
        
        return curvePoints;
    }
    
    const tStart = findTForXMatrix(xStart, points);
    const tEnd = findTForXMatrix(xEnd, points);
    
    if (tStart === null || tEnd === null) {
        console.warn(`Не вдалося знайти точки з x = ${xStart} або x = ${xEnd} на кривій.`);
        return [];
    }
    
    const curvePoints: { x: number, y: number }[] = [];
    for (let i = 0; i <= numPoints; i++) {
        const t = tStart + (i / numPoints) * (tEnd - tStart);
        const point = bezierPointMatrix(t, points);
        curvePoints.push(point);
    }
    
    // analyzeMatrixOnDemand();
    
    console.log(`Побудовано криву Безьє за матричним методом з ${curvePoints.length} точками на проміжку x від ${xStart} до ${xEnd}`);
    return curvePoints;
}

// ==================== EVENT HANDLERS ====================
canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    
    wasCanvasMoved = false; 
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    selectedPointIndex = getPointAtPosition(canvasX, canvasY);
    
    if (selectedPointIndex !== -1) {
        isMovingPoint = true;
        points[selectedPointIndex].selected = true;
        console.log(`Точка ${selectedPointIndex} вибрана для переміщення`);
        drawCoordinateSystem();
    } else {
        isDragging = true;
        startX = e.clientX - offsetX;
        startY = e.clientY - offsetY;
    }
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    if (isMovingPoint && selectedPointIndex !== -1) {
        const gridX = (canvasX - displaySize / 2 - offsetX) / gridSize;
        const gridY = -(canvasY - displaySize / 2 - offsetY) / gridSize;
        
        points[selectedPointIndex].x = parseFloat(gridX.toFixed(2));
        points[selectedPointIndex].y = parseFloat(gridY.toFixed(2));
        
        updateBezierCurve();
        drawCoordinateSystem();
    } else if (isDragging) {
        const newOffsetX = e.clientX - startX;
        const newOffsetY = e.clientY - startY;
        
        if (Math.abs(newOffsetX - offsetX) > 0.5 || Math.abs(newOffsetY - offsetY) > 0.5) {
            wasCanvasMoved = true;
        }
        
        offsetX = newOffsetX;
        offsetY = newOffsetY;
        drawCoordinateSystem();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isMovingPoint && selectedPointIndex !== -1) {
        points[selectedPointIndex].selected = false;
        console.log(`Точку ${selectedPointIndex} переміщено в (${points[selectedPointIndex].x}, ${points[selectedPointIndex].y})`);
        
        updateBezierCurve();
        
        isMovingPoint = false;
        selectedPointIndex = -1;
        drawCoordinateSystem();
        updatePointsList(); 
    }
    
    isDragging = false;
});

canvas.addEventListener('click', (e: MouseEvent) => {
    if (isDragging || isMovingPoint || wasCanvasMoved) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    if (getPointAtPosition(canvasX, canvasY) !== -1) {
        return; 
    }
    
    const gridX = (canvasX - displaySize / 2 - offsetX) / gridSize;
    const gridY = -(canvasY - displaySize / 2 - offsetY) / gridSize;
    
    points.push({ 
        x: parseFloat(gridX.toFixed(2)), 
        y: parseFloat(gridY.toFixed(2)),
        radius: 10,
        selected: false
    });
    
    updateBezierCurve();
    
    // Redraw everything
    drawCoordinateSystem();
    updatePointsList(); 
    
    console.log(`Додано точку в координатах (${gridX.toFixed(2)}, ${gridY.toFixed(2)})`);
});

canvas.addEventListener('dblclick', (e: MouseEvent) => {
    // Поки нічого не робимо при подвійному кліку
});

canvas.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    pointToDelete = getPointAtPosition(canvasX, canvasY);
    
    if(pointToDelete !== -1) {
        deletePoint(pointToDelete);
    }
});

const addPointButton = document.getElementById('addPointButton');
if (addPointButton) {
    addPointButton.addEventListener('click', () => {
        const xInput = document.getElementById('x') as HTMLInputElement;
        const yInput = document.getElementById('y') as HTMLInputElement;
        
        if(xInput.value && yInput.value) {
            const x = parseFloat(xInput.value);
            const y = parseFloat(yInput.value);
            
            if(!isNaN(x) && !isNaN(y)) {
                createPointFromCoordinates(x, y);
                
                xInput.value = '';
                yInput.value = '';
            }
        }
    });
}

const clearCanvasButton = document.getElementById('clearCanvasButton');
if (clearCanvasButton) {
    clearCanvasButton.addEventListener('click', () => {
        if(confirm('Ви впевнені, що хочете видалити всі точки?')) {
            points = []; 
            bezierCurvePoints = []; 
            drawCoordinateSystem(); 
            updatePointsList(); 
            console.log('Всі точки видалено, координатну площину перемальовано');
        }
    });
}

const outputColnButton = document.getElementById('outputColnButton');
if (outputColnButton) {
    outputColnButton.addEventListener('click', () => {
        const methodSelect = document.getElementById('methodSelect') as HTMLSelectElement;
        
        if (methodSelect && methodSelect.value === 'matrix') {
            if (bezierMatrix.length === 0 && points.length >= 2) {
                bezierPointMatrix(0, points);
            }
            
            analyzeMatrixOnDemand();
        } else {
            alert("Для аналізу матриці коефіцієнтів потрібно вибрати матричний метод побудови кривої.");
        }
    });
}

if (document.getElementById('methodSelect')) {
    document.getElementById('methodSelect')!.addEventListener('change', () => {
        updateBezierCurve();
        drawCoordinateSystem();
    });
}

// ==================== INITIALIZATION ====================
if (ctx) {
    ctx!.imageSmoothingEnabled = false;
    updateBezierCurve(); 
    drawCoordinateSystem();
    updatePointsList();
    addParameterChangeListeners(); 
} else{
    console.error('Canvas context не знайдено!');   
}

function analyzeMatrixOnDemand() {
    if (bezierMatrix.length === 0) {
        console.log("Матриця коефіцієнтів не ініціалізована.");
        return;
    }
    
    let zeroCount = 0;
    for (let i = 0; i < bezierMatrix.length; i++) {
        for (let j = 0; j < bezierMatrix[i].length; j++) {
            if (bezierMatrix[i][j] === 0) {
                zeroCount++;
            }
        }
    }
    
    const columnIndex = parseInt(prompt("Введіть номер стовпця матриці для виведення (починаючи з 0):", "0") || "0");
    
    if (isNaN(columnIndex) || columnIndex < 0 || columnIndex >= bezierMatrix[0].length) {
        alert(`Неправильний номер стовпця. Має бути від 0 до ${bezierMatrix[0].length - 1}.`);
        return;
    }
    
    let columnValues = `Елементи стовпця ${columnIndex} матриці коефіцієнтів:\n`;
    for (let i = 0; i < bezierMatrix.length; i++) {
        columnValues += `${bezierMatrix[i][columnIndex]}\n`;
    }
    
    const analysisResult = `${columnValues}\nЗагальна кількість нульових елементів у матриці: ${zeroCount}`;
    alert(analysisResult);
    console.log(analysisResult);
}

function addParameterChangeListeners() {
    if (numPointsInput) {
        numPointsInput.addEventListener('change', () => {
            updateBezierCurve();
            drawCoordinateSystem();
        });
    }
    
    if (rangeStartInput) {
        rangeStartInput.addEventListener('change', () => {
            updateBezierCurve();
            drawCoordinateSystem();
        });
    }
    
    if (rangeEndInput) {
        rangeEndInput.addEventListener('change', () => {
            updateBezierCurve();
            drawCoordinateSystem();
        });
    }
}