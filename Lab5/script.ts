let _currentPosition = { x: 0, y: 0 };
let _scale = 50;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

interface ShapeData {
    points: [number, number][];
    fillColor: string;
    shapeScale?: number;
}
let drawnShapes: ShapeData[] = [];

let isAnimating = false;
let animationFrameId: number | null = null;
let originalPoints: [number, number][] = [];
let currentAnimationTime = 0;
let animationStartTime: number | null = null;
let selectedShapeIndex = -1;
let mirrorVertexIndex = 0;
let isPaused = false;
let pausedProgress = 0;
let animationDuration = 0;

let drawReflectionLine: ((ctx: CanvasRenderingContext2D, width: number, height: number) => void) | null = null;

type Matrix3x3 = [[number, number, number], [number, number, number], [number, number, number]];

const identityMatrix: Matrix3x3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
];

// Операція множення матриць: результат[i][j] = Σ(m1[i][k] * m2[k][j])
function multiplyMatrices(m1: Matrix3x3, m2: Matrix3x3): Matrix3x3 {
    const result: Matrix3x3 = [[0,0,0], [0,0,0], [0,0,0]];
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                result[i][j] += m1[i][k] * m2[k][j];
            }
        }
    }
    
    return result;
}

// Створення матриці перенесення
function createTranslationMatrix(tx: number, ty: number): Matrix3x3 {
    return [
        [1, 0, tx],
        [0, 1, ty],
        [0, 0, 1]
    ];
}

// Створення матриці масштабування
function createScalingMatrix(sx: number, sy: number): Matrix3x3 {
    return [
        [sx, 0, 0],
        [0, sy, 0],
        [0, 0, 1]
    ];
}

// Створення матриці відображення відносно початку координат
function createMirrorMatrix(): Matrix3x3 {
    return [
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, 1]
    ];
}

// Створення матриці дзеркального відображення відносно точки з масштабуванням
function createMirrorScaleMatrixRelativeToPoint(px: number, py: number, scale: number): Matrix3x3 {
    // Комбінація: перенести точку в початок → дзеркально відобразити → масштабувати → перенести назад
    const T1 = createTranslationMatrix(-px, -py);
    const M = createMirrorMatrix();
    const S = createScalingMatrix(scale, scale);
    const T2 = createTranslationMatrix(px, py);
    
    // Результуюча матриця: T2 * S * M * T1
    let result = multiplyMatrices(M, T1);
    result = multiplyMatrices(S, result);
    result = multiplyMatrices(T2, result);
    return result;
}

// Створення матриці дзеркального відображення відносно точки
function createMirrorMatrixRelativeToPoint(px: number, py: number): Matrix3x3 {
    // Комбінація: перенести точку в початок → дзеркально відобразити → перенести назад
    const T1 = createTranslationMatrix(-px, -py);
    const M = createMirrorMatrix();
    const T2 = createTranslationMatrix(px, py);
    
    // Результуюча матриця: T2 * M * T1
    let result = multiplyMatrices(M, T1);
    result = multiplyMatrices(T2, result);
    return result;
}

// Створення матриці дзеркального відображення відносно лінії з масштабуванням
function createMirrorScaleMatrixRelativeToLine(
    px: number, py: number, // Точка на лінії
    dirX: number, dirY: number, // Напрямний вектор лінії (нормалізований)
    scale: number // Коефіцієнт масштабування
): Matrix3x3 {
    // 1. Перенесення точки на лінії до початку координат
    const T1 = createTranslationMatrix(-px, -py);
    
    // 2. Обертання, щоб вирівняти лінію з віссю X
    const angle = Math.atan2(dirY, dirX);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    const R1: Matrix3x3 = [
        [cosA, sinA, 0],
        [-sinA, cosA, 0],
        [0, 0, 1]
    ];
    
    // 3. Відображення відносно осі X (y → -y)
    const F: Matrix3x3 = [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 1]
    ];
    
    // 4. Масштабування
    const S = createScalingMatrix(scale, scale);
    
    // 5. Обертання назад
    const R2: Matrix3x3 = [
        [cosA, -sinA, 0],
        [sinA, cosA, 0],
        [0, 0, 1]
    ];
    
    // 6. Повернення до початкової позиції
    const T2 = createTranslationMatrix(px, py);
    
    // Об'єднуємо перетворення: T2 * R2 * S * F * R1 * T1
    let result = multiplyMatrices(R1, T1);
    result = multiplyMatrices(F, result);
    result = multiplyMatrices(S, result);
    result = multiplyMatrices(R2, result);
    result = multiplyMatrices(T2, result);
    
    return result;
}

// Створення матриці дзеркального відображення відносно лінії, що проходить через точку
// і має заданий напрямний вектор
function createMirrorMatrixRelativeToLine(
    px: number, py: number, // Точка на лінії
    dirX: number, dirY: number // Напрямний вектор лінії (нормалізований)
): Matrix3x3 {
    // 1. Перенесення точки на лінії до початку координат
    const T1 = createTranslationMatrix(-px, -py);
    
    // 2. Обертання, щоб вирівняти лінію з віссю X
    const angle = Math.atan2(dirY, dirX);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    const R1: Matrix3x3 = [
        [cosA, sinA, 0],
        [-sinA, cosA, 0],
        [0, 0, 1]
    ];
    
    // 3. Відображення відносно осі X (y → -y)
    const F: Matrix3x3 = [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 1]
    ];
    
    // 4. Обертання назад
    const R2: Matrix3x3 = [
        [cosA, -sinA, 0],
        [sinA, cosA, 0],
        [0, 0, 1]
    ];
    
    // 5. Повернення до початкової позиції
    const T2 = createTranslationMatrix(px, py);
    
    // Об'єднуємо перетворення: T2 * R2 * F * R1 * T1
    let result = multiplyMatrices(R1, T1);
    result = multiplyMatrices(F, result);
    result = multiplyMatrices(R2, result);
    result = multiplyMatrices(T2, result);
    
    return result;
}

// Застосування матриці перетворення до точки
function transformPoint(matrix: Matrix3x3, x: number, y: number): [number, number] {
    // Розширені координати точки
    const point = [x, y, 1];
    
    // Результат множення матриці на точку
    const resultX = matrix[0][0] * point[0] + matrix[0][1] * point[1] + matrix[0][2] * point[2];
    const resultY = matrix[1][0] * point[0] + matrix[1][1] * point[1] + matrix[1][2] * point[2];
    
    return [resultX, resultY];
}

// Функція для лінійної інтерполяції матриць
function interpolateMatrices(m1: Matrix3x3, m2: Matrix3x3, t: number): Matrix3x3 {
    const result: Matrix3x3 = [[0,0,0], [0,0,0], [0,0,0]];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i][j] = (1 - t) * m1[i][j] + t * m2[i][j];
        }
    }
    return result;
}

// Перетворення математичних координат у координати canvas
function transform(x: number, y: number, width: number, height: number): [number, number] {
    const cx = width / 2 - _currentPosition.x * _scale;
    const cy = height / 2 + _currentPosition.y * _scale;
    return [cx + x * _scale, cy - y * _scale];
}

// Малювання координатної площини
function drawPlane(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2 - _currentPosition.x * _scale;
    const cy = height / 2 + _currentPosition.y * _scale;

    const minGridPx = 50;
    const step = Math.ceil(minGridPx / _scale);

    const xStartMath = Math.floor(_currentPosition.x - (width / 2) / _scale);
    const xEndMath = Math.ceil(_currentPosition.x + (width / 2) / _scale);
    const yStartMath = Math.floor(_currentPosition.y - (height / 2) / _scale);
    const yEndMath = Math.ceil(_currentPosition.y + (height / 2) / _scale);

    const xStart = Math.floor(xStartMath / step) * step;
    const xEnd = Math.ceil(xEndMath / step) * step;    const yStart = Math.floor(yStartMath / step) * step;
    const yEnd = Math.ceil(yEndMath / step) * step;

    ctx.save();
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let x = xStart; x <= xEnd; x += step) {
        if (x % step !== 0) continue;
        const [px, _] = transform(x, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
    }
    for (let y = yStart; y <= yEnd; y += step) {
        if (y % step !== 0) continue;
        const [_, py] = transform(0, y, width, height);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 10, cy - 5);
    ctx.lineTo(width, cy);
    ctx.lineTo(width - 10, cy + 5);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5, 10);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx + 5, 10);
    ctx.stroke();
    ctx.restore();    ctx.save();
    ctx.font = "12px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const axisXVisible = cy >= 0 && cy <= height;
    const axisYVisible = cx >= 0 && cx <= width;
    
    const labelPosY = axisXVisible ? cy + 18 : (cy < 0 ? 18 : height - 18);
    const labelPosX = axisYVisible ? cx - 18 : (cx < 0 ? 18 : width - 18);

    for (let x = xStart; x <= xEnd; x += step) {
        if (x === 0) continue;
        
        const [px, _] = transform(x, 0, width, height);
        
        if (px >= 0 && px <= width) {
            ctx.fillText(x.toString(), px, labelPosY);
            
            const tickY1 = axisXVisible ? cy - 4 : (cy < 0 ? 0 : height);
            const tickY2 = axisXVisible ? cy + 4 : (cy < 0 ? 8 : height - 8);
            
            ctx.beginPath();
            ctx.moveTo(px, tickY1);
            ctx.lineTo(px, tickY2);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    for (let y = yStart; y <= yEnd; y += step) {        if (y === 0) continue;
        
        const [_, py] = transform(0, y, width, height);
        
        if (py >= 0 && py <= height) {
            ctx.fillText(y.toString(), labelPosX, py);
            
            const tickX1 = axisYVisible ? cx - 4 : (cx < 0 ? 0 : width);
            const tickX2 = axisYVisible ? cx + 4 : (cx < 0 ? 8 : width - 8);
            
            ctx.beginPath();
            ctx.moveTo(tickX1, py);
            ctx.lineTo(tickX2, py);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
        ctx.fillText("0", cx - 12, cy + 15);
    } else {
        const cornerX = cx < 0 ? 15 : width - 15;
        const cornerY = cy < 0 ? 15 : height - 15;
        ctx.fillText("0", cornerX, cornerY);
    }
    
    ctx.fillText("X", width - 15, cy >= 0 && cy <= height ? cy - 10 : (cy < 0 ? 15 : height - 10));
    ctx.fillText("Y", cx >= 0 && cx <= width ? cx + 15 : (cx < 0 ? 15 : width - 15), 10);
    
    ctx.restore();
}

// Малювання квадрата за чотирма точками з урахуванням заливки
function drawSquare(
    ctx: CanvasRenderingContext2D,
    points: [number, number][],
    fillColor: string,
    width: number, height: number,
    shapeScale?: number
) {
    const transformWithShapeScale = (x: number, y: number): [number, number] => {
        if (shapeScale === undefined) {
            return transform(x, y, width, height);
        } else {
            const cx = width / 2 - _currentPosition.x * _scale;
            const cy = height / 2 + _currentPosition.y * _scale;
            return [cx + x * shapeScale, cy - y * shapeScale];
        }
    };

    const transformedPoints = points.map(([x, y]) => transformWithShapeScale(x, y));

    ctx.save();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.fillStyle = fillColor;

    ctx.beginPath();
    ctx.moveTo(transformedPoints[0][0], transformedPoints[0][1]);
    
    for (let i = 1; i < transformedPoints.length; i++) {
        ctx.lineTo(transformedPoints[i][0], transformedPoints[i][1]);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function showError(msg: string) {
    const errDiv = document.getElementById("error");
    if (errDiv) errDiv.textContent = msg;
}

// Функція для оновлення селектора фігур
function updateShapeSelector() {
    const shapeSelector = document.getElementById("shapeSelector") as HTMLSelectElement;
    
    shapeSelector.innerHTML = '';
    
    const latestOption = document.createElement("option");
    latestOption.value = "-1";
    latestOption.textContent = "Latest Shape";
    shapeSelector.appendChild(latestOption);
    
    // Додаємо опції для кожної фігури
    drawnShapes.forEach((shape, index) => {
        const option = document.createElement("option");
        option.value = index.toString();
        option.textContent = `Shape ${index + 1}`;
        shapeSelector.appendChild(option);
    });
    
    // Вибираємо останню фігуру за замовчуванням
    if (drawnShapes.length > 0) {
        shapeSelector.value = (drawnShapes.length - 1).toString();
    }
}

// --- Функція для перемальовки всього на канвасі ---
function redrawCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
    drawPlane(ctx, width, height); // Малюємо координатну площину
    drawnShapes.forEach(shape => { // Малюємо всі збережені фігури
        drawSquare(ctx, shape.points, shape.fillColor, width, height, shape.shapeScale);
    });
    
    // Відключаємо малювання червоної лінії
    // if (isAnimating && selectedShapeIndex >= 0 && drawReflectionLine !== null) {
    //     drawReflectionLine(ctx, width, height);
    // }
}

// --- Функція для трансформації фігур під поточний масштаб ---
function transformShapesToCurrentScale() {
    drawnShapes.forEach(shape => {
        // Оновлюємо масштаб фігури до поточного масштабу canvas
        shape.shapeScale = _scale;
    });
    console.log("Фігури перетворено до поточного масштабу:", _scale);
}

window.onload = () => {
    const canvas = document.getElementById("plane") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const width = canvas.width;
    const height = canvas.height;

    redrawCanvas(ctx, width, height);

    document.getElementById("drawBtn")!.onclick = () => {
        showError("");

        const x1 = parseFloat((document.getElementById("x1") as HTMLInputElement).value);
        const y1 = parseFloat((document.getElementById("y1") as HTMLInputElement).value);
        const x2 = parseFloat((document.getElementById("x2") as HTMLInputElement).value);
        const y2 = parseFloat((document.getElementById("y2") as HTMLInputElement).value);
        
        const fillColor = (document.getElementById("fillColor") as HTMLInputElement).value;
        
        if (
            isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)
        ) {
            const errorMsg = "Будь ласка, введіть правильні числові значення для точок Top Left та Bottom Right.";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }

        if (x1 === x2 && y1 === y2) {
            const errorMsg = "Помилка: Точки Top Left та Bottom Right не можуть бути однаковими! Квадрат неможливо побудувати.";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }

        const diagonalLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (diagonalLength < 0.01) {
            const errorMsg = "Помилка: Діагональ занадто коротка! Точки знаходяться занадто близько одна до одної.";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }

        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
            const errorMsg = "Помилка: Некоректні значення координат (нескінченність або занадто великі числа).";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }

        const maxCoord = 10000;
        if (Math.abs(x1) > maxCoord || Math.abs(y1) > maxCoord || 
            Math.abs(x2) > maxCoord || Math.abs(y2) > maxCoord) {
            const errorMsg = `Помилка: Координати занадто великі! Максимальне значення: ±${maxCoord}.`;
            showError(errorMsg);
            alert(errorMsg);
            return;
        }

        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const halfDiagX = (x2 - x1) / 2;
        const halfDiagY = (y2 - y1) / 2;
        const x3 = centerX - halfDiagY;
        const y3 = centerY + halfDiagX;
        const x4 = centerX + halfDiagY;
        const y4 = centerY - halfDiagX;
        
        const newShapePoints: [number, number][] = [
            [x1, y1],
            [x3, y3],
            [x2, y2],
            [x4, y4]
        ];

        drawnShapes.push({ 
            points: newShapePoints, 
            fillColor: fillColor,
            shapeScale: _scale
        });

        isPaused = false;
        pausedProgress = 0;
        const animateBtn = document.getElementById("animateBtn")! as HTMLButtonElement;
        animateBtn.textContent = "Start Animation";

        originalPoints = [...newShapePoints];        updateShapeSelector();
        redrawCanvas(ctx, width, height);
        
        animateBtn.disabled = false;
    };

    document.getElementById("animateBtn")!.onclick = () => {
        if (drawnShapes.length === 0) {
            showError("Please draw a shape first.");
            return;
        }
        if (!isPaused) {
            const shapeSelector = document.getElementById("shapeSelector") as HTMLSelectElement;
            selectedShapeIndex = parseInt(shapeSelector.value);
                  if (selectedShapeIndex === -1) {
            selectedShapeIndex = drawnShapes.length - 1;
        }
        
        if (selectedShapeIndex < 0 || selectedShapeIndex >= drawnShapes.length) {
            showError("Invalid shape selected.");
            return;
        }
        
        originalPoints = [...drawnShapes[selectedShapeIndex].points];
        }

        const duration = parseFloat((document.getElementById("animDuration") as HTMLInputElement).value);
        const animationType = (document.getElementById("animationType") as HTMLSelectElement).value;
        mirrorVertexIndex = parseInt((document.getElementById("mirrorVertex") as HTMLSelectElement).value);

        if (isNaN(duration) || duration <= 0) {
            showError("Please enter valid animation duration.");
            return;
        }

        if (!isPaused) {
            isAnimating = true;
            animationStartTime = null;
            currentAnimationTime = 0;
            pausedProgress = 0;
            animationDuration = duration;
        } else {
            isAnimating = true;
            animationStartTime = null;
            currentAnimationTime = pausedProgress * duration;
            isPaused = false;
        }

        const animateBtn = document.getElementById("animateBtn")! as HTMLButtonElement;
        const stopBtn = document.getElementById("stopAnimBtn")! as HTMLButtonElement;
        animateBtn.disabled = true;
        stopBtn.disabled = false;

        const pivotVertex = originalPoints[mirrorVertexIndex];

        function animateStep(timestamp: number) {            if (!animationStartTime) animationStartTime = timestamp;
            currentAnimationTime = timestamp - animationStartTime + (pausedProgress * animationDuration);
            
            const progress = Math.min(currentAnimationTime / animationDuration, 1);
            
            const scaleFactor = parseFloat((document.getElementById("scaleFactor") as HTMLInputElement).value);
            if (isNaN(scaleFactor) || scaleFactor <= 0) {
                showError("Please enter valid scale factor.");
                return;
            }
            
            let transformedPoints: [number, number][] = [];
            
            if (animationType === "point") {
                const mirrorMatrix = createMirrorScaleMatrixRelativeToPoint(
                    pivotVertex[0], pivotVertex[1], scaleFactor
                );
                
                const mirroredPoints: [number, number][] = originalPoints.map((point, index) => {
                    if (index === mirrorVertexIndex) {
                        return [...point];
                    } else {
                        return transformPoint(mirrorMatrix, point[0], point[1]);
                    }
                });
                
                if (progress <= 0.5) {
                    const phaseProgress = progress / 0.5;
                    
                    transformedPoints = originalPoints.map((point, i) => {
                        if (i === mirrorVertexIndex) {
                            return [...point];
                        } else {
                            const x = point[0] + (mirroredPoints[i][0] - point[0]) * phaseProgress;
                            const y = point[1] + (mirroredPoints[i][1] - point[1]) * phaseProgress;
                            return [x, y];
                        }
                    });
                } else {
                    const phaseProgress = (progress - 0.5) / 0.5;
                    
                    transformedPoints = originalPoints.map((point, i) => {
                        if (i === mirrorVertexIndex) {
                            return [...point];
                        } else {
                            const x = mirroredPoints[i][0] + (point[0] - mirroredPoints[i][0]) * phaseProgress;
                            const y = mirroredPoints[i][1] + (point[1] - mirroredPoints[i][1]) * phaseProgress;
                            return [x, y];
                        }
                    });
                }
                
                // Очищуємо функцію малювання лінії для цього типу анімації
                drawReflectionLine = null;
                
            } else {
                
                
                const diagonalVertexIndex = (mirrorVertexIndex + 2) % 4; // Протилежна вершина
                
                // Отримаємо координати вершини на діагоналі
                const diagonalVertex = originalPoints[diagonalVertexIndex];
                
                // Вектор уздовж діагоналі від опорної точки
                const diagonalVector = [
                    diagonalVertex[0] - pivotVertex[0],
                    diagonalVertex[1] - pivotVertex[1]
                ];
                
                // Нормалізуємо вектор діагоналі
                const diagonalLength = Math.sqrt(diagonalVector[0] ** 2 + diagonalVector[1] ** 2);
                const normalizedDiagonal = [
                    diagonalVector[0] / diagonalLength,
                    diagonalVector[1] / diagonalLength
                ];
                
                // Вектор, перпендикулярний до діагоналі - це вісь для відображення
                // Повертаємо вектор діагоналі на 90 градусів
                const perpVector = [-normalizedDiagonal[1], normalizedDiagonal[0]];
                
                // Створюємо матрицю відображення з масштабуванням відносно лінії, перпендикулярної до діагоналі
                const mirrorMatrix = createMirrorScaleMatrixRelativeToLine(
                    pivotVertex[0], pivotVertex[1], // Опорна точка
                    perpVector[0], perpVector[1],   // Напрям перпендикуляра до діагоналі
                    scaleFactor                     // Коефіцієнт масштабування
                );
                  drawReflectionLine = function(ctx: CanvasRenderingContext2D, width: number, height: number) {
                    const lineLength = diagonalLength * 1.5;
                    
                    const lineStart = [
                        pivotVertex[0] - perpVector[0] * lineLength / 2,
                        pivotVertex[1] - perpVector[1] * lineLength / 2
                    ];
                    
                    const lineEnd = [
                        pivotVertex[0] + perpVector[0] * lineLength / 2,
                        pivotVertex[1] + perpVector[1] * lineLength / 2
                    ];
                    
                    const [startX, startY] = transform(lineStart[0], lineStart[1], width, height);
                    const [endX, endY] = transform(lineEnd[0], lineEnd[1], width, height);
                    
                    ctx.save();
                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                    ctx.restore();
                };
                
                const mirroredPoints: [number, number][] = originalPoints.map((point, index) => {
                    if (index === mirrorVertexIndex) {
                        return [...point];
                    } else {
                        return transformPoint(mirrorMatrix, point[0], point[1]);
                    }
                });
                
                if (progress <= 0.5) {
                    // Фаза 1: Лінійний рух до дзеркального відображення з масштабуванням (0-50%)
                    const phaseProgress = progress / 0.5; // 0 -> 1
                    
                    // Для кожної точки, лінійно інтерполюємо між оригінальною та дзеркальною з масштабуванням
                    transformedPoints = originalPoints.map((point, i) => {
                        if (i === mirrorVertexIndex) {
                            // Опорна точка не змінюється
                            return [...point];
                        } else {
                            const x = point[0] + (mirroredPoints[i][0] - point[0]) * phaseProgress;
                            const y = point[1] + (mirroredPoints[i][1] - point[1]) * phaseProgress;
                            return [x, y];
                        }
                    });                } else {
                    const phaseProgress = (progress - 0.5) / 0.5;
                    
                    transformedPoints = originalPoints.map((point, i) => {
                        if (i === mirrorVertexIndex) {
                            return [...point];
                        } else {
                            const x = mirroredPoints[i][0] + (point[0] - mirroredPoints[i][0]) * phaseProgress;
                            const y = mirroredPoints[i][1] + (point[1] - mirroredPoints[i][1]) * phaseProgress;
                            return [x, y];
                        }
                    });
                }
            }
            
            drawnShapes[selectedShapeIndex].points = transformedPoints;
            redrawCanvas(ctx, width, height);
            
            if (progress < 1 && isAnimating) {
                animationFrameId = requestAnimationFrame(animateStep);
            } else {
                isAnimating = false;
                isPaused = false;
                pausedProgress = 0;
                animationFrameId = null;
                drawReflectionLine = null;
                drawnShapes[selectedShapeIndex].points = [...originalPoints]; 
                redrawCanvas(ctx, width, height);
                
                const animateBtn = document.getElementById("animateBtn")! as HTMLButtonElement;
                const stopBtn = document.getElementById("stopAnimBtn")! as HTMLButtonElement;
                animateBtn.disabled = false;
                stopBtn.disabled = true;
                animateBtn.textContent = "Start Animation";
            }
        }
        
        animationFrameId = requestAnimationFrame(animateStep);
    };

    document.getElementById("stopAnimBtn")!.onclick = () => {
        if (isAnimating) {
            isAnimating = false;
            isPaused = true;
            pausedProgress = Math.min(currentAnimationTime / animationDuration, 1);
            
            drawReflectionLine = null;
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            const animateBtn = document.getElementById("animateBtn")! as HTMLButtonElement;
            const stopBtn = document.getElementById("stopAnimBtn")! as HTMLButtonElement;
            animateBtn.disabled = false;
            stopBtn.disabled = true;
            
            if (pausedProgress < 1) {
                animateBtn.textContent = "Continue Animation";
            }
        }
    };

    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        // Зсув у математичних координатах
        _currentPosition.x -= dx / _scale;
        _currentPosition.y += dy / _scale;
        redrawCanvas(ctx, width, height); // Перемальовуємо все
    });
    canvas.addEventListener("mouseup", () => {
        isDragging = false;
        canvas.style.cursor = "grab";
    });
    canvas.addEventListener("mouseleave", () => {
        isDragging = false;
        canvas.style.cursor = "grab";
    });

    // --- Масштабування колесиком ---
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        const prevScale = _scale;
        const SCALE_SPEED = 1.1;
        if (e.deltaY < 0) {
            _scale *= SCALE_SPEED;
        } else {
            _scale /= SCALE_SPEED;
        }
        // Zoom до позиції миші (як у прикладі)
        const currentCx = width / 2 - _currentPosition.x * prevScale; // Use current _currentPosition with prevScale
        const currentCy = height / 2 + _currentPosition.y * prevScale; // Use current _currentPosition with prevScale
        const mx = mouseX - currentCx;
        const my = mouseY - currentCy;        _currentPosition.x -= mx / prevScale - mx / _scale;
        _currentPosition.y += my / prevScale - my / _scale;
        redrawCanvas(ctx, width, height);
    }, { passive: false });

    canvas.style.cursor = "grab";
    
    const animationTypeSelect = document.getElementById("animationType") as HTMLSelectElement;
    const scaleGroup = document.getElementById("scaleGroup") as HTMLElement;
    
    animationTypeSelect.addEventListener("change", () => {
        const animationType = animationTypeSelect.value;
        if (animationType === "point") {
            scaleGroup.style.display = "block";
        } else {
            scaleGroup.style.display = "none";
        }
    });
    
    if (animationTypeSelect.value === "point") {
        scaleGroup.style.display = "block";
    } else {
        scaleGroup.style.display = "none";
    }
    
    const redrawBtn = document.getElementById("redrawBtn") as HTMLButtonElement;
    redrawBtn.addEventListener("click", () => {
        transformShapesToCurrentScale();
        redrawCanvas(ctx, width, height);
        console.log("Фігури перемальовано під поточний масштаб");
    });
      // Функція для покрокового множення матриць з поясненнями
    function explainMatrixMultiplication(m1: Matrix3x3, m2: Matrix3x3, m1Name: string, m2Name: string): string {
        let explanation = `\n=== ПОКРОКОВЕ МНОЖЕННЯ МАТРИЦЬ ===\n`;
        explanation += `Множимо матрицю ${m1Name} на матрицю ${m2Name}\n\n`;
        
        // Показуємо вихідні матриці
        explanation += `Матриця ${m1Name}:\n`;
        explanation += formatMatrixSimple(m1);
        explanation += `\nМатриця ${m2Name}:\n`;
        explanation += formatMatrixSimple(m2);
        
        explanation += `\nТеоретична основа множення матриць:\n`;
        explanation += `Результат[i][j] = Σ(k=0 to 2) ${m1Name}[i][k] * ${m2Name}[k][j]\n\n`;
        
        explanation += `Покрокові обчислення:\n`;
        
        const result: Matrix3x3 = [[0,0,0], [0,0,0], [0,0,0]];
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                explanation += `\nЕлемент результату[${i}][${j}]:\n`;
                let calculation = "";
                let sum = 0;
                
                for (let k = 0; k < 3; k++) {
                    const val1 = m1[i][k];
                    const val2 = m2[k][j];
                    const product = val1 * val2;
                    sum += product;
                    
                    if (k > 0) calculation += " + ";
                    calculation += `(${val1.toFixed(3)} * ${val2.toFixed(3)})`;
                    
                    explanation += `  ${m1Name}[${i}][${k}] * ${m2Name}[${k}][${j}] = ${val1.toFixed(3)} * ${val2.toFixed(3)} = ${product.toFixed(6)}\n`;
                }
                
                result[i][j] = sum;
                explanation += `  Сума: ${calculation} = ${sum.toFixed(6)}\n`;
            }
        }
        
        explanation += `\nРезультуюча матриця:\n`;
        explanation += formatMatrixSimple(result);
        
        return explanation;
    }

    // Функція для простого форматування матриці
    function formatMatrixSimple(matrix: Matrix3x3): string {
        let result = "";
        for (let i = 0; i < 3; i++) {
            result += `[${matrix[i][0].toFixed(6)}, ${matrix[i][1].toFixed(6)}, ${matrix[i][2].toFixed(6)}]\n`;
        }
        return result;
    }

    // Функція для збереження матриці перетворення з покроковим аналізом
    function saveTransformationMatrix() {
        if (drawnShapes.length === 0) {
            showError("Please draw a shape first.");
            return;
        }

        const animationType = (document.getElementById("animationType") as HTMLSelectElement).value;
        const mirrorVertexIndex = parseInt((document.getElementById("mirrorVertex") as HTMLSelectElement).value);
        const scaleFactor = parseFloat((document.getElementById("scaleFactor") as HTMLInputElement).value);

        if (isNaN(scaleFactor) || scaleFactor <= 0) {
            showError("Please enter valid scale factor.");
            return;
        }

        const shapeSelector = document.getElementById("shapeSelector") as HTMLSelectElement;
        let selectedShapeIndex = parseInt(shapeSelector.value);
        
        if (selectedShapeIndex === -1) {
            selectedShapeIndex = drawnShapes.length - 1;
        }
        
        if (selectedShapeIndex < 0 || selectedShapeIndex >= drawnShapes.length) {
            showError("Invalid shape selected.");
            return;
        }

        const selectedShape = drawnShapes[selectedShapeIndex];
        const pivotVertex = selectedShape.points[mirrorVertexIndex];

        let transformationMatrix: Matrix3x3;
        let detailedExplanation = "";

        if (animationType === "point") {
            // Покрокова побудова матриці для дзеркального відображення відносно точки
            detailedExplanation += `\n=== ПОБУДОВА МАТРИЦІ ТРАНСФОРМАЦІЇ ВІДНОСНО ТОЧКИ ===\n`;
            detailedExplanation += `Точка відображення: (${pivotVertex[0]}, ${pivotVertex[1]})\n`;
            detailedExplanation += `Коефіцієнт масштабування: ${scaleFactor}\n\n`;
            
            detailedExplanation += `Послідовність перетворень:\n`;
            detailedExplanation += `1. Перенесення точки в початок координат: T1\n`;
            detailedExplanation += `2. Дзеркальне відображення відносно початку: M\n`;
            detailedExplanation += `3. Масштабування: S\n`;
            detailedExplanation += `4. Повернення точки назад: T2\n\n`;
            detailedExplanation += `Результуюча матриця: T2 * S * M * T1\n\n`;
            
            // Створюємо матриці окремо для демонстрації
            const T1 = createTranslationMatrix(-pivotVertex[0], -pivotVertex[1]);
            const M = createMirrorMatrix();
            const S = createScalingMatrix(scaleFactor, scaleFactor);
            const T2 = createTranslationMatrix(pivotVertex[0], pivotVertex[1]);
            
            detailedExplanation += `Матриця перенесення T1 (переміщення на (-${pivotVertex[0]}, -${pivotVertex[1]})):\n`;
            detailedExplanation += formatMatrixSimple(T1);
            
            detailedExplanation += `\nМатриця дзеркального відображення M:\n`;
            detailedExplanation += formatMatrixSimple(M);
            
            detailedExplanation += `\nМатриця масштабування S (масштаб ${scaleFactor}):\n`;
            detailedExplanation += formatMatrixSimple(S);
            
            detailedExplanation += `\nМатриця перенесення T2 (переміщення на (${pivotVertex[0]}, ${pivotVertex[1]})):\n`;
            detailedExplanation += formatMatrixSimple(T2);
            
            // Покрокові множення
            detailedExplanation += explainMatrixMultiplication(M, T1, "M", "T1");
            
            let temp1 = multiplyMatrices(M, T1);
            detailedExplanation += explainMatrixMultiplication(S, temp1, "S", "(M * T1)");
            
            let temp2 = multiplyMatrices(S, temp1);            detailedExplanation += explainMatrixMultiplication(T2, temp2, "T2", "(S * M * T1)");
            
            transformationMatrix = createMirrorScaleMatrixRelativeToPoint(
                pivotVertex[0], pivotVertex[1], scaleFactor
            );
            
            // Додаємо приклад трансформації точки
            detailedExplanation += `\n=== ПРИКЛАД ТРАНСФОРМАЦІЇ ТОЧКИ ===\n`;
            const examplePoint = selectedShape.points[0]; // Використовуємо першу точку фігури
            detailedExplanation += `Візьмемо точку (${examplePoint[0]}, ${examplePoint[1]}) з нашої фігури.\n\n`;
            
            const transformedPoint = transformPoint(transformationMatrix, examplePoint[0], examplePoint[1]);
            detailedExplanation += `Трансформація точки через множення матриці:\n`;
            detailedExplanation += `[x']   [${transformationMatrix[0][0].toFixed(6)}  ${transformationMatrix[0][1].toFixed(6)}  ${transformationMatrix[0][2].toFixed(6)}]   [${examplePoint[0]}]\n`;
            detailedExplanation += `[y'] = [${transformationMatrix[1][0].toFixed(6)}  ${transformationMatrix[1][1].toFixed(6)}  ${transformationMatrix[1][2].toFixed(6)}] * [${examplePoint[1]}]\n`;
            detailedExplanation += `[1 ]   [${transformationMatrix[2][0].toFixed(6)}  ${transformationMatrix[2][1].toFixed(6)}  ${transformationMatrix[2][2].toFixed(6)}]   [1]\n\n`;
            
            const resultX = transformationMatrix[0][0] * examplePoint[0] + transformationMatrix[0][1] * examplePoint[1] + transformationMatrix[0][2] * 1;
            const resultY = transformationMatrix[1][0] * examplePoint[0] + transformationMatrix[1][1] * examplePoint[1] + transformationMatrix[1][2] * 1;
            
            detailedExplanation += `Обчислення:\n`;
            detailedExplanation += `x' = ${transformationMatrix[0][0].toFixed(6)} * ${examplePoint[0]} + ${transformationMatrix[0][1].toFixed(6)} * ${examplePoint[1]} + ${transformationMatrix[0][2].toFixed(6)} * 1\n`;
            detailedExplanation += `x' = ${(transformationMatrix[0][0] * examplePoint[0]).toFixed(6)} + ${(transformationMatrix[0][1] * examplePoint[1]).toFixed(6)} + ${transformationMatrix[0][2].toFixed(6)} = ${resultX.toFixed(6)}\n\n`;
            
            detailedExplanation += `y' = ${transformationMatrix[1][0].toFixed(6)} * ${examplePoint[0]} + ${transformationMatrix[1][1].toFixed(6)} * ${examplePoint[1]} + ${transformationMatrix[1][2].toFixed(6)} * 1\n`;
            detailedExplanation += `y' = ${(transformationMatrix[1][0] * examplePoint[0]).toFixed(6)} + ${(transformationMatrix[1][1] * examplePoint[1]).toFixed(6)} + ${transformationMatrix[1][2].toFixed(6)} = ${resultY.toFixed(6)}\n\n`;
            
            detailedExplanation += `Результат: точка (${examplePoint[0]}, ${examplePoint[1]}) → (${transformedPoint[0].toFixed(6)}, ${transformedPoint[1].toFixed(6)})\n`;
        } else {
            // Покрокова побудова матриці для дзеркального відображення відносно лінії
            detailedExplanation += `\n=== ПОБУДОВА МАТРИЦІ ТРАНСФОРМАЦІЇ ВІДНОСНО ЛІНІЇ ===\n`;
            
            const diagonalVertexIndex = (mirrorVertexIndex + 2) % 4;
            const diagonalVertex = selectedShape.points[diagonalVertexIndex];
            
            const diagonalVector = [
                diagonalVertex[0] - pivotVertex[0],
                diagonalVertex[1] - pivotVertex[1]
            ];
            
            const diagonalLength = Math.sqrt(diagonalVector[0] ** 2 + diagonalVector[1] ** 2);
            const normalizedDiagonal = [
                diagonalVector[0] / diagonalLength,
                diagonalVector[1] / diagonalLength
            ];
            
            const perpVector = [-normalizedDiagonal[1], normalizedDiagonal[0]];
            
            detailedExplanation += `Точка на лінії: (${pivotVertex[0]}, ${pivotVertex[1]})\n`;
            detailedExplanation += `Напрямний вектор лінії: (${perpVector[0].toFixed(6)}, ${perpVector[1].toFixed(6)})\n`;
            detailedExplanation += `Коефіцієнт масштабування: ${scaleFactor}\n\n`;
            
            detailedExplanation += `Послідовність перетворень:\n`;
            detailedExplanation += `1. Перенесення точки в початок: T1\n`;
            detailedExplanation += `2. Обертання для вирівнювання лінії з віссю: R1\n`;
            detailedExplanation += `3. Дзеркальне відображення: F\n`;
            detailedExplanation += `4. Масштабування: S\n`;
            detailedExplanation += `5. Зворотне обертання: R2\n`;
            detailedExplanation += `6. Повернення до початкової позиції: T2\n\n`;            detailedExplanation += `Результуюча матриця: T2 * R2 * S * F * R1 * T1\n\n`;
            
            transformationMatrix = createMirrorScaleMatrixRelativeToLine(
                pivotVertex[0], pivotVertex[1],
                perpVector[0], perpVector[1],
                scaleFactor
            );
            
            // Додаємо приклад трансформації точки для лінії
            detailedExplanation += `\n=== ПРИКЛАД ТРАНСФОРМАЦІЇ ТОЧКИ ===\n`;
            const examplePointLine = selectedShape.points[0];
            detailedExplanation += `Візьмемо точку (${examplePointLine[0]}, ${examplePointLine[1]}) з нашої фігури.\n\n`;
            
            const transformedPointLine = transformPoint(transformationMatrix, examplePointLine[0], examplePointLine[1]);
            detailedExplanation += `Трансформація точки через результуючу матриці:\n`;
            detailedExplanation += `[x']   [${transformationMatrix[0][0].toFixed(6)}  ${transformationMatrix[0][1].toFixed(6)}  ${transformationMatrix[0][2].toFixed(6)}]   [${examplePointLine[0]}]\n`;
            detailedExplanation += `[y'] = [${transformationMatrix[1][0].toFixed(6)}  ${transformationMatrix[1][1].toFixed(6)}  ${transformationMatrix[1][2].toFixed(6)}] * [${examplePointLine[1]}]\n`;
            detailedExplanation += `[1 ]   [${transformationMatrix[2][0].toFixed(6)}  ${transformationMatrix[2][1].toFixed(6)}  ${transformationMatrix[2][2].toFixed(6)}]   [1]\n\n`;
            
            const resultXLine = transformationMatrix[0][0] * examplePointLine[0] + transformationMatrix[0][1] * examplePointLine[1] + transformationMatrix[0][2] * 1;
            const resultYLine = transformationMatrix[1][0] * examplePointLine[0] + transformationMatrix[1][1] * examplePointLine[1] + transformationMatrix[1][2] * 1;
            
            detailedExplanation += `Обчислення:\n`;
            detailedExplanation += `x' = ${transformationMatrix[0][0].toFixed(6)} * ${examplePointLine[0]} + ${transformationMatrix[0][1].toFixed(6)} * ${examplePointLine[1]} + ${transformationMatrix[0][2].toFixed(6)} * 1\n`;
            detailedExplanation += `x' = ${(transformationMatrix[0][0] * examplePointLine[0]).toFixed(6)} + ${(transformationMatrix[0][1] * examplePointLine[1]).toFixed(6)} + ${transformationMatrix[0][2].toFixed(6)} = ${resultXLine.toFixed(6)}\n\n`;
            
            detailedExplanation += `y' = ${transformationMatrix[1][0].toFixed(6)} * ${examplePointLine[0]} + ${transformationMatrix[1][1].toFixed(6)} * ${examplePointLine[1]} + ${transformationMatrix[1][2].toFixed(6)} * 1\n`;
            detailedExplanation += `y' = ${(transformationMatrix[1][0] * examplePointLine[0]).toFixed(6)} + ${(transformationMatrix[1][1] * examplePointLine[1]).toFixed(6)} + ${transformationMatrix[1][2].toFixed(6)} = ${resultYLine.toFixed(6)}\n\n`;
            
            detailedExplanation += `Результат: точка (${examplePointLine[0]}, ${examplePointLine[1]}) → (${transformedPointLine[0].toFixed(6)}, ${transformedPointLine[1].toFixed(6)})\n`;
        }

        // Формування повного текстового представлення
        const matrixText = formatMatrix(transformationMatrix, animationType, mirrorVertexIndex, scaleFactor, pivotVertex, detailedExplanation);

        // Створення та завантаження файлу
        const blob = new Blob([matrixText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `detailed_transformation_matrix_${animationType}_vertex${mirrorVertexIndex}_scale${scaleFactor}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("Detailed transformation matrix saved successfully");
    }    // Функція для форматування матриці з детальним поясненням
    function formatMatrix(matrix: Matrix3x3, animationType: string, vertexIndex: number, scaleFactor: number, pivotVertex: [number, number], detailedExplanation?: string): string {
        const timestamp = new Date().toLocaleString();
        
        let matrixText = `Detailed Transformation Matrix Report\n`;
        matrixText += `Generated: ${timestamp}\n`;
        matrixText += `Animation Type: ${animationType === "point" ? "Mirror relative to point" : "Mirror relative to line"}\n`;
        matrixText += `Pivot Vertex Index: ${vertexIndex}\n`;
        matrixText += `Pivot Vertex Coordinates: (${pivotVertex[0].toFixed(3)}, ${pivotVertex[1].toFixed(3)})\n`;
        matrixText += `Scale Factor: ${scaleFactor}\n`;
        matrixText += `${"=".repeat(80)}\n`;
        
        // Додаємо детальне пояснення, якщо воно надано
        if (detailedExplanation) {
            matrixText += detailedExplanation;
            matrixText += `\n${"=".repeat(80)}\n`;
        }
        
        matrixText += `\nФІНАЛЬНА РЕЗУЛЬТУЮЧА МАТРИЦЯ ТРАНСФОРМАЦІЇ:\n\n`;
        matrixText += `Transformation Matrix (3x3) у програмному форматі:\n`;
        for (let i = 0; i < 3; i++) {
            matrixText += `[${matrix[i][0].toFixed(6)}, ${matrix[i][1].toFixed(6)}, ${matrix[i][2].toFixed(6)}]\n`;
        }
        
        matrixText += `\nMatrix in mathematical notation:\n`;
        matrixText += `┌                                          ┐\n`;
        for (let i = 0; i < 3; i++) {
            const val1 = matrix[i][0].toFixed(6);
            const val2 = matrix[i][1].toFixed(6);
            const val3 = matrix[i][2].toFixed(6);
            const padding = '          ';
            const pad1 = (padding + val1).slice(-10);
            const pad2 = (padding + val2).slice(-10);
            const pad3 = (padding + val3).slice(-10);
            matrixText += `│ ${pad1} ${pad2} ${pad3} │\n`;
        }
        matrixText += `└                                          ┘\n`;
        
        matrixText += `\n${"=".repeat(80)}\n`;
        matrixText += `\nПОЯСНЕННЯ ВИКОРИСТАННЯ:\n`;
        matrixText += `Ця матриця може бути використана для трансформації точок (x, y) наступним чином:\n`;
        matrixText += `[x']   [matrix[0][0]  matrix[0][1]  matrix[0][2]]   [x]\n`;
        matrixText += `[y'] = [matrix[1][0]  matrix[1][1]  matrix[1][2]] * [y]\n`;
        matrixText += `[1 ]   [matrix[2][0]  matrix[2][1]  matrix[2][2]]   [1]\n\n`;
        matrixText += `Де (x', y') - нові координати точки після трансформації.\n`;
        
        return matrixText;
    }// Функція для збереження зображення фігури
    function saveShapeImage() {
        if (drawnShapes.length === 0) {
            showError("Please draw a shape first.");
            return;
        }

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        const canvas = document.getElementById("plane") as HTMLCanvasElement;
        
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        const shapeSelector = document.getElementById("shapeSelector") as HTMLSelectElement;
        let selectedShapeIndex = parseInt(shapeSelector.value);
        
        if (selectedShapeIndex === -1) {
            selectedShapeIndex = drawnShapes.length - 1;
        }
        
        if (selectedShapeIndex < 0 || selectedShapeIndex >= drawnShapes.length) {
            showError("Invalid shape selected.");
            return;
        }

        drawPlane(tempCtx, tempCanvas.width, tempCanvas.height);
        
        const selectedShape = drawnShapes[selectedShapeIndex];
        drawSquare(tempCtx, selectedShape.points, selectedShape.fillColor, tempCanvas.width, tempCanvas.height, selectedShape.shapeScale);

        addShapeInfoToCanvas(tempCtx, selectedShape, selectedShapeIndex, tempCanvas.width, tempCanvas.height);

        tempCanvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `shape_${selectedShapeIndex + 1}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log("Shape image saved successfully");
            }
        }, 'image/png');
    }

    function addShapeInfoToCanvas(ctx: CanvasRenderingContext2D, shape: ShapeData, shapeIndex: number, width: number, height: number) {
        ctx.save();
        
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        
        const info = [
            `Shape ${shapeIndex + 1}`,
            `Fill Color: ${shape.fillColor}`,
            `Scale: ${shape.shapeScale?.toFixed(2) || 'Default'}`,
            `Vertices: ${shape.points.length}`,
            `Points: ${shape.points.map(p => `(${p[0].toFixed(2)}, ${p[1].toFixed(2)})`).join(', ')}`
        ];
        
        const startX = width - 10;
        const startY = 20;
        
        info.forEach((line, index) => {
            const y = startY + (index * 20);
            const textWidth = ctx.measureText(line).width;
            const x = startX - textWidth;
            
            ctx.strokeText(line, x, y);
            ctx.fillText(line, x, y);
        });
        
        const timestamp = new Date().toLocaleString();
        const timestampY = startY + (info.length * 20) + 10;
        const timestampText = `Generated: ${timestamp}`;
        const timestampWidth = ctx.measureText(timestampText).width;
        const timestampX = startX - timestampWidth;
        
        ctx.font = '12px Arial';
        ctx.strokeText(timestampText, timestampX, timestampY);
        ctx.fillText(timestampText, timestampX, timestampY);
        
        ctx.restore();
    }
    
    const saveMatrixBtn = document.getElementById("saveMatrixBtn") as HTMLButtonElement;
    saveMatrixBtn.addEventListener("click", saveTransformationMatrix);
    
    const saveImageBtn = document.getElementById("saveImageBtn") as HTMLButtonElement;
    saveImageBtn.addEventListener("click", saveShapeImage);
};
