const canvas = document.getElementById('coordinateSystem') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

const displaySize = 550;  
const gridSize = 25;
const scaleFactor = window.devicePixelRatio || 1; 
canvas.width = displaySize * scaleFactor;
canvas.height = displaySize * scaleFactor;
canvas.style.width = displaySize + "px";
canvas.style.height = displaySize + "px";
ctx!.scale(scaleFactor, scaleFactor);

let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let startX = 0;
let startY = 0;

type Square = {
    points: [[number, number], [number, number]],
    hasCircle: boolean
    color: string
};
const squares: Square[] = [];

canvas.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;

    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    drawCoordinateSystem();
    drawAllShapes();

});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

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

drawCoordinateSystem();

function drawAllShapes() {
    squares.forEach(square => {
        const [x1, y1] = square.points[0];
        const [x2, y2] = square.points[1];
        const color = square.color; 

        drawSquare(x1, y1, x2, y2, color);
        if (square.hasCircle) {
            drawCircle(x1, y1, x2, y2, square.color);
        }
    });
}

const drawButton = document.getElementById('drawButton');
const circleButton = document.getElementById('circleButton');
const deleteButton = document.getElementById('deleteButton');

if (drawButton && circleButton && deleteButton) {
    drawButton.addEventListener('click', () => {
        const x1 = parseInt((document.getElementById('x1') as HTMLInputElement).value, 10);
        const y1 = parseInt((document.getElementById('y1') as HTMLInputElement).value, 10);
        const x2 = parseInt((document.getElementById('x2') as HTMLInputElement).value, 10);
        const y2 = parseInt((document.getElementById('y2') as HTMLInputElement).value, 10);
        const color = (document.getElementById('lineColor') as HTMLInputElement).value;

        if (x2 <= x1 || y2 >= y1) {
            alert("Перша точка має бути верхньою лівою (x1,y1), а друга - нижньою правою (x2,y2). Тобто x2 > x1 та y2 < y1.");
            return;
        }else{
            squares.push({
                points: [[x1, y1], [x2, y2]],
                hasCircle: false,
                color: color
            });
            drawSquare(x1, y1, x2, y2, color);
        }
        
    });

    circleButton.addEventListener('click', () => {
        const lastSquare = squares[squares.length - 1];
        if (lastSquare) {
            const x1 = lastSquare.points[0][0];
            const y1 = lastSquare.points[0][1];
            const x2 = lastSquare.points[1][0];
            const y2 = lastSquare.points[1][1];
            squares[squares.length - 1].hasCircle = true;
            drawCircle(x1, y1, x2, y2, lastSquare.color);
        }
    });

    deleteButton.addEventListener('click', () => {
        ctx!.strokeStyle = '#000';
        ctx!.clearRect(0, 0, displaySize, displaySize);
        squares.splice(0, squares.length);
        drawCoordinateSystem();
        drawGrid();
        drawNumber();
    });
}

function drawCircle(x1: number, y1: number, x2: number, y2: number, color: string) {
    
    const screenX1 = displaySize / 2 + x1 * gridSize + offsetX;
    const screenY1 = displaySize / 2 - y1 * gridSize + offsetY;
    const screenX2 = displaySize / 2 + x2 * gridSize + offsetX;
    const screenY2 = displaySize / 2 - y2 * gridSize + offsetY;
    
    const centerX = (screenX1 + screenX2) / 2;
    const centerY = (screenY1 + screenY2) / 2;

    const diagX = screenX2 - screenX1;
    const diagY = screenY2 - screenY1;
    
    const diagLength = Math.sqrt(diagX * diagX + diagY * diagY);
    
    const squareSide = diagLength / Math.sqrt(2);
    const radius = squareSide / 2;
    
    ctx!.beginPath();
    ctx!.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx!.strokeStyle = color;
    ctx!.stroke();
}

function lightenColor(color: string, alpha: number = 0.5): string {
    if (color.startsWith("#")) {
        color = color.replace("#", "");
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith("rgb")) {
        return color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
    }
    return color;
}
function drawSquare(x1: number, y1: number, x2: number, y2: number, color: string) {
    // Переводимо координати з математичної системи в екранну
    const screenX1 = displaySize / 2 + x1 * gridSize + offsetX;
    const screenY1 = displaySize / 2 - y1 * gridSize + offsetY;
    const screenX2 = displaySize / 2 + x2 * gridSize + offsetX;
    const screenY2 = displaySize / 2 - y2 * gridSize + offsetY;
    
    // Знаходимо центр діагоналі
    const centerX = (screenX1 + screenX2) / 2;
    const centerY = (screenY1 + screenY2) / 2;
    
    // Вектор діагоналі
    const diagX = screenX2 - screenX1;
    const diagY = screenY2 - screenY1;
    
    // Довжина діагоналі
    const diagLength = Math.sqrt(diagX * diagX + diagY * diagY);
    
    // Нормалізований перпендикулярний вектор
    // Для повороту вектора (x, y) на 90° використовуємо (-y, x)
    const perpX = -diagY / diagLength;
    const perpY = diagX / diagLength;
    
    // Відстань від центру до вершини квадрата = половина діагоналі
    const halfDiag = diagLength / 2;
    
    // Обчислюємо всі чотири вершини квадрата
    const vertices = [
        // Перша вершина (верхня ліва в оригінальних координатах)
        {
            x: screenX1,
            y: screenY1
        },
        // Друга вершина (обчислюємо від першої, повертаючи діагональ на 90°)
        {
            x: centerX + perpX * halfDiag,
            y: centerY + perpY * halfDiag
        },
        // Третя вершина (нижня права в оригінальних координатах)
        {
            x: screenX2,
            y: screenY2
        },
        // Четверта вершина (обчислюємо від третьої, повертаючи діагональ на 90°)
        {
            x: centerX - perpX * halfDiag,
            y: centerY - perpY * halfDiag
        }
    ];
    
    // Малюємо контур квадрата
    ctx!.strokeStyle = color;
    ctx!.lineWidth = 2;
    ctx!.beginPath();
    ctx!.moveTo(vertices[0].x, vertices[0].y);
    ctx!.lineTo(vertices[1].x, vertices[1].y);
    ctx!.lineTo(vertices[2].x, vertices[2].y);
    ctx!.lineTo(vertices[3].x, vertices[3].y);
    ctx!.closePath();
    ctx!.stroke();
    
    // Додаємо штриховку
    const lighterColor = lightenColor(color, 0.2);
    ctx!.strokeStyle = lighterColor;
    ctx!.lineWidth = 1;
    
    // Горизонтальна штриховка (відносно орієнтації квадрата)
    const linesCount = Math.ceil(diagLength / 2 / (gridSize / 2));
    
    for (let i = 1; i < linesCount; i++) {
        const t = i / linesCount;
        
        // Інтерполяція між протилежними сторонами
        const startX = vertices[0].x * (1 - t) + vertices[3].x * t;
        const startY = vertices[0].y * (1 - t) + vertices[3].y * t;
        const endX = vertices[1].x * (1 - t) + vertices[2].x * t;
        const endY = vertices[1].y * (1 - t) + vertices[2].y * t;
        
        ctx!.beginPath();
        ctx!.moveTo(startX, startY);
        ctx!.lineTo(endX, endY);
        ctx!.stroke();
    }
    
    // Вертикальна штриховка (відносно орієнтації квадрата)
    for (let i = 1; i < linesCount; i++) {
        const t = i / linesCount;
        
        // Інтерполяція між протилежними сторонами
        const startX = vertices[0].x * (1 - t) + vertices[1].x * t;
        const startY = vertices[0].y * (1 - t) + vertices[1].y * t;
        const endX = vertices[3].x * (1 - t) + vertices[2].x * t;
        const endY = vertices[3].y * (1 - t) + vertices[2].y * t;
        
        ctx!.beginPath();
        ctx!.moveTo(startX, startY);
        ctx!.lineTo(endX, endY);
        ctx!.stroke();
    }
}

if (ctx) {
    
    ctx!.imageSmoothingEnabled = false;
    drawCoordinateSystem();

    
} else{
    console.error('Canvas context не знайдено!');   
}

