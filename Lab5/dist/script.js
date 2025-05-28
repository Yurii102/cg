"use strict";
// --- Математичний центр координатної системи ---
let _currentPosition = { x: 0, y: 0 }; // математичний центр (0,0)
let _scale = 50; // px per unit
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let drawnShapes = [];
// --- Змінні для анімації ---
let isAnimating = false;
let animationFrameId = null;
let originalPoints = [];
let currentAnimationTime = 0;
let animationStartTime = null;
let selectedShapeIndex = -1; // Індекс фігури, яка анімується
let mirrorVertexIndex = 0; // Індекс вершини для дзеркального відображення
let isPaused = false; // Чи анімація на паузі
let pausedProgress = 0; // Прогрес анімації на момент паузи
let animationDuration = 0; // Тривалість анімації
// Функція для малювання лінії відображення
let drawReflectionLine = null;
// Одинична матриця
const identityMatrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
];
// Множення матриць
function multiplyMatrices(m1, m2) {
    const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
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
function createTranslationMatrix(tx, ty) {
    return [
        [1, 0, tx],
        [0, 1, ty],
        [0, 0, 1]
    ];
}
// Створення матриці масштабування
function createScalingMatrix(sx, sy) {
    return [
        [sx, 0, 0],
        [0, sy, 0],
        [0, 0, 1]
    ];
}
// Створення матриці відображення відносно початку координат
function createMirrorMatrix() {
    return [
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, 1]
    ];
}
// Створення матриці дзеркального відображення відносно точки з масштабуванням
function createMirrorScaleMatrixRelativeToPoint(px, py, scale) {
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
function createMirrorMatrixRelativeToPoint(px, py) {
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
function createMirrorScaleMatrixRelativeToLine(px, py, // Точка на лінії
dirX, dirY, // Напрямний вектор лінії (нормалізований)
scale // Коефіцієнт масштабування
) {
    // 1. Перенесення точки на лінії до початку координат
    const T1 = createTranslationMatrix(-px, -py);
    // 2. Обертання, щоб вирівняти лінію з віссю X
    const angle = Math.atan2(dirY, dirX);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const R1 = [
        [cosA, sinA, 0],
        [-sinA, cosA, 0],
        [0, 0, 1]
    ];
    // 3. Відображення відносно осі X (y → -y)
    const F = [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 1]
    ];
    // 4. Масштабування
    const S = createScalingMatrix(scale, scale);
    // 5. Обертання назад
    const R2 = [
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
function createMirrorMatrixRelativeToLine(px, py, // Точка на лінії
dirX, dirY // Напрямний вектор лінії (нормалізований)
) {
    // 1. Перенесення точки на лінії до початку координат
    const T1 = createTranslationMatrix(-px, -py);
    // 2. Обертання, щоб вирівняти лінію з віссю X
    const angle = Math.atan2(dirY, dirX);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const R1 = [
        [cosA, sinA, 0],
        [-sinA, cosA, 0],
        [0, 0, 1]
    ];
    // 3. Відображення відносно осі X (y → -y)
    const F = [
        [1, 0, 0],
        [0, -1, 0],
        [0, 0, 1]
    ];
    // 4. Обертання назад
    const R2 = [
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
function transformPoint(matrix, x, y) {
    // Розширені координати точки
    const point = [x, y, 1];
    // Результат множення матриці на точку
    const resultX = matrix[0][0] * point[0] + matrix[0][1] * point[1] + matrix[0][2] * point[2];
    const resultY = matrix[1][0] * point[0] + matrix[1][1] * point[1] + matrix[1][2] * point[2];
    return [resultX, resultY];
}
// Функція для лінійної інтерполяції матриць
function interpolateMatrices(m1, m2, t) {
    const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i][j] = (1 - t) * m1[i][j] + t * m2[i][j];
        }
    }
    return result;
}
// --- Перетворення математичних координат у canvas ---
function transform(x, y, width, height) {
    const cx = width / 2 - _currentPosition.x * _scale;
    const cy = height / 2 + _currentPosition.y * _scale;
    return [cx + x * _scale, cy - y * _scale];
}
// --- Малювання координатної площини як у cartesianSystem ---
function drawPlane(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    // Центр у пікселях
    const cx = width / 2 - _currentPosition.x * _scale;
    const cy = height / 2 + _currentPosition.y * _scale;
    // Крок сітки (мінімум 50px між лініями)
    const minGridPx = 50;
    const step = Math.ceil(minGridPx / _scale);
    // Межі для сітки в математичних координатах
    const xStartMath = Math.floor(_currentPosition.x - (width / 2) / _scale);
    const xEndMath = Math.ceil(_currentPosition.x + (width / 2) / _scale);
    const yStartMath = Math.floor(_currentPosition.y - (height / 2) / _scale);
    const yEndMath = Math.ceil(_currentPosition.y + (height / 2) / _scale);
    // Корегуємо до кроку сітки
    const xStart = Math.floor(xStartMath / step) * step;
    const xEnd = Math.ceil(xEndMath / step) * step;
    const yStart = Math.floor(yStartMath / step) * step;
    const yEnd = Math.ceil(yEndMath / step) * step;
    // --- Сітка ---
    ctx.save();
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let x = xStart; x <= xEnd; x += step) {
        if (x % step !== 0)
            continue; // Малюємо тільки по кроку сітки
        const [px, _] = transform(x, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
    }
    for (let y = yStart; y <= yEnd; y += step) {
        if (y % step !== 0)
            continue; // Малюємо тільки по кроку сітки
        const [_, py] = transform(0, y, width, height);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
    }
    ctx.restore();
    // --- Ось X ---
    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();
    // Стрілка X
    ctx.beginPath();
    ctx.moveTo(width - 10, cy - 5);
    ctx.lineTo(width, cy);
    ctx.lineTo(width - 10, cy + 5);
    ctx.stroke();
    ctx.restore();
    // --- Ось Y ---
    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    // Стрілка Y
    ctx.beginPath();
    ctx.moveTo(cx - 5, 10);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx + 5, 10);
    ctx.stroke();
    ctx.restore();
    // --- Підписи на осях ---
    ctx.save();
    ctx.font = "12px Arial";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Визначення позицій для підписів
    const axisXVisible = cy >= 0 && cy <= height;
    const axisYVisible = cx >= 0 && cx <= width;
    // Позиція для X-підписів
    const labelPosY = axisXVisible ? cy + 18 : (cy < 0 ? 18 : height - 18);
    // Позиція для Y-підписів
    const labelPosX = axisYVisible ? cx - 18 : (cx < 0 ? 18 : width - 18);
    // X підписи
    for (let x = xStart; x <= xEnd; x += step) {
        if (x === 0)
            continue;
        // Малюємо тільки по кроку сітки
        const [px, _] = transform(x, 0, width, height);
        if (px >= 0 && px <= width) {
            // Підпис
            ctx.fillText(x.toString(), px, labelPosY);
            // Риска
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
    // Y підписи
    for (let y = yStart; y <= yEnd; y += step) {
        if (y === 0)
            continue;
        // Малюємо тільки по кроку сітки
        const [_, py] = transform(0, y, width, height);
        if (py >= 0 && py <= height) {
            // Підпис
            ctx.fillText(y.toString(), labelPosX, py);
            // Риска
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
    // Підписи 0, X, Y
    if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
        // Якщо початок координат видимий
        ctx.fillText("0", cx - 12, cy + 15);
    }
    else {
        // Розміщуємо 0 в одному з кутів
        const cornerX = cx < 0 ? 15 : width - 15;
        const cornerY = cy < 0 ? 15 : height - 15;
        ctx.fillText("0", cornerX, cornerY);
    }
    // X та Y підписи (завжди видимі)
    ctx.fillText("X", width - 15, cy >= 0 && cy <= height ? cy - 10 : (cy < 0 ? 15 : height - 10));
    ctx.fillText("Y", cx >= 0 && cx <= width ? cx + 15 : (cx < 0 ? 15 : width - 15), 10);
    ctx.restore();
}
// --- Малювання квадрата за чотирма точками з урахуванням заливки ---
function drawSquare(ctx, points, fillColor, width, height, shapeScale) {
    // Функція трансформації з урахуванням масштабу фігури
    const transformWithShapeScale = (x, y) => {
        if (shapeScale === undefined) {
            // Якщо масштаб фігури не вказано, використовуємо звичайну трансформацію
            return transform(x, y, width, height);
        }
        else {
            // Використовуємо фіксований масштаб фігури
            const cx = width / 2 - _currentPosition.x * _scale;
            const cy = height / 2 + _currentPosition.y * _scale;
            return [cx + x * shapeScale, cy - y * shapeScale];
        }
    };
    // Перетворення математичних координат у координати canvas
    const transformedPoints = points.map(([x, y]) => transformWithShapeScale(x, y));
    ctx.save();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.fillStyle = fillColor;
    // Малювання заповненого квадрата
    ctx.beginPath();
    ctx.moveTo(transformedPoints[0][0], transformedPoints[0][1]);
    for (let i = 1; i < transformedPoints.length; i++) {
        ctx.lineTo(transformedPoints[i][0], transformedPoints[i][1]);
    }
    ctx.closePath();
    ctx.fill(); // Заливка кольором
    ctx.stroke(); // Контур
    ctx.restore();
}
function showError(msg) {
    const errDiv = document.getElementById("error");
    if (errDiv)
        errDiv.textContent = msg;
}
// --- Функція для оновлення селектора фігур ---
function updateShapeSelector() {
    const shapeSelector = document.getElementById("shapeSelector");
    // Очищуємо поточні опції
    shapeSelector.innerHTML = '';
    // Додаємо опцію "Latest Shape"
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
function redrawCanvas(ctx, width, height) {
    drawPlane(ctx, width, height); // Малюємо координатну площину
    drawnShapes.forEach(shape => {
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
    const canvas = document.getElementById("plane");
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    redrawCanvas(ctx, width, height); // Початкове малювання
    document.getElementById("drawBtn").onclick = () => {
        showError("");
        // Не очищуємо канвас тут, redrawCanvas це зробить
        // Отримання координат двох діагональних точок
        const x1 = parseFloat(document.getElementById("x1").value);
        const y1 = parseFloat(document.getElementById("y1").value);
        const x2 = parseFloat(document.getElementById("x2").value);
        const y2 = parseFloat(document.getElementById("y2").value);
        // Отримання кольору заливки
        const fillColor = document.getElementById("fillColor").value; // Перевірка на правильність введення
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
            const errorMsg = "Будь ласка, введіть правильні числові значення для точок Top Left та Bottom Right.";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }
        // Перевірка, чи точки не однакові
        if (x1 === x2 && y1 === y2) {
            const errorMsg = "Помилка: Точки Top Left та Bottom Right не можуть бути однаковими! Квадрат неможливо побудувати.";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }
        // Перевірка, чи діагональ не занадто коротка
        const diagonalLength = Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));
        if (diagonalLength < 0.01) {
            const errorMsg = "Помилка: Діагональ занадто коротка! Точки знаходяться занадто близько одна до одної.";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }
        // Перевірка на некоректні значення (нескінченність, занадто великі числа)
        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
            const errorMsg = "Помилка: Некоректні значення координат (нескінченність або занадто великі числа).";
            showError(errorMsg);
            alert(errorMsg);
            return;
        }
        // Перевірка на розумні межі координат
        const maxCoord = 10000;
        if (Math.abs(x1) > maxCoord || Math.abs(y1) > maxCoord ||
            Math.abs(x2) > maxCoord || Math.abs(y2) > maxCoord) {
            const errorMsg = `Помилка: Координати занадто великі! Максимальне значення: ±${maxCoord}.`;
            showError(errorMsg);
            alert(errorMsg);
            return;
        }
        // Розрахунок координат вершин квадрата за діагоналлю
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const halfDiagX = (x2 - x1) / 2;
        const halfDiagY = (y2 - y1) / 2;
        const x3 = centerX - halfDiagY;
        const y3 = centerY + halfDiagX;
        const x4 = centerX + halfDiagY;
        const y4 = centerY - halfDiagX;
        const newShapePoints = [
            [x1, y1], // Перша діагональна точка
            [x3, y3], // Третя вершина квадрата
            [x2, y2], // Друга діагональна точка
            [x4, y4] // Четверта вершина квадрата
        ]; // Додаємо нову фігуру до масиву з поточним масштабом canvas
        drawnShapes.push({
            points: newShapePoints,
            fillColor: fillColor,
            shapeScale: _scale // Зберігаємо поточний масштаб canvas
        });
        // Скидаємо стан анімації при малюванні нової фігури
        isPaused = false;
        pausedProgress = 0;
        const animateBtn = document.getElementById("animateBtn");
        animateBtn.textContent = "Start Animation";
        // Оновлюємо originalPoints для анімації останньої намальованої фігури
        // Це важливо, щоб анімація завжди починалася з поточного стану останньої фігури
        originalPoints = [...newShapePoints];
        // Оновлюємо селектор фігур
        updateShapeSelector(); // Перемальовуємо все
        redrawCanvas(ctx, width, height);
        // Вмикаємо кнопку анімації
        animateBtn.disabled = false;
    }; // --- Анімація ---
    document.getElementById("animateBtn").onclick = () => {
        if (drawnShapes.length === 0) {
            showError("Please draw a shape first.");
            return;
        }
        // Отримуємо індекс вибраної фігури тільки якщо це початок нової анімації
        if (!isPaused) {
            const shapeSelector = document.getElementById("shapeSelector");
            selectedShapeIndex = parseInt(shapeSelector.value);
            // Якщо вибрано "Latest Shape" (-1), використовуємо останню фігуру
            if (selectedShapeIndex === -1) {
                selectedShapeIndex = drawnShapes.length - 1;
            }
            // Перевіряємо, чи індекс коректний
            if (selectedShapeIndex < 0 || selectedShapeIndex >= drawnShapes.length) {
                showError("Invalid shape selected.");
                return;
            }
            // Використовуємо вибрану фігуру тільки для нової анімації
            originalPoints = [...drawnShapes[selectedShapeIndex].points];
        } // Перевірка параметрів для анімації
        const duration = parseFloat(document.getElementById("animDuration").value);
        const animationType = document.getElementById("animationType").value;
        mirrorVertexIndex = parseInt(document.getElementById("mirrorVertex").value);
        if (isNaN(duration) || duration <= 0) {
            showError("Please enter valid animation duration.");
            return;
        }
        // Якщо анімація не на паузі, почати з початку
        if (!isPaused) {
            isAnimating = true;
            animationStartTime = null;
            currentAnimationTime = 0;
            pausedProgress = 0;
            animationDuration = duration;
        }
        else {
            // Якщо анімація на паузі, продовжити з поточного прогресу
            isAnimating = true;
            animationStartTime = null;
            currentAnimationTime = pausedProgress * duration;
            isPaused = false;
        } // Вимикаємо кнопку "Start" і вмикаємо кнопку "Stop"
        const animateBtn = document.getElementById("animateBtn");
        const stopBtn = document.getElementById("stopAnimBtn");
        animateBtn.disabled = true;
        stopBtn.disabled = false;
        const pivotVertex = originalPoints[mirrorVertexIndex]; // Функція для анімації
        function animateStep(timestamp) {
            if (!animationStartTime)
                animationStartTime = timestamp;
            currentAnimationTime = timestamp - animationStartTime + (pausedProgress * animationDuration);
            const progress = Math.min(currentAnimationTime / animationDuration, 1);
            // Отримуємо коефіцієнт масштабування (спільний для обох типів анімації)
            const scaleFactor = parseFloat(document.getElementById("scaleFactor").value);
            if (isNaN(scaleFactor) || scaleFactor <= 0) {
                showError("Please enter valid scale factor.");
                return;
            }
            // Підготовка результуючих точок
            let transformedPoints = [];
            if (animationType === "point") {
                // Анімація відносно точки з масштабуванням
                // Створюємо матрицю відображення з масштабуванням відносно точки
                const mirrorMatrix = createMirrorScaleMatrixRelativeToPoint(pivotVertex[0], pivotVertex[1], scaleFactor);
                // Обчислюємо відображені позиції
                const mirroredPoints = originalPoints.map((point, index) => {
                    if (index === mirrorVertexIndex) {
                        // Опорна точка не змінюється
                        return [...point];
                    }
                    else {
                        return transformPoint(mirrorMatrix, point[0], point[1]);
                    }
                });
                if (progress <= 0.5) {
                    // Фаза 1: Лінійний рух до дзеркального відображення з масштабуванням (0-50%)
                    const phaseProgress = progress / 0.5; // 0 -> 1
                    transformedPoints = originalPoints.map((point, i) => {
                        if (i === mirrorVertexIndex) {
                            return [...point];
                        }
                        else {
                            const x = point[0] + (mirroredPoints[i][0] - point[0]) * phaseProgress;
                            const y = point[1] + (mirroredPoints[i][1] - point[1]) * phaseProgress;
                            return [x, y];
                        }
                    });
                }
                else {
                    // Фаза 2: Лінійний рух назад до оригінального стану (50-100%)
                    const phaseProgress = (progress - 0.5) / 0.5; // 0 -> 1
                    transformedPoints = originalPoints.map((point, i) => {
                        if (i === mirrorVertexIndex) {
                            return [...point];
                        }
                        else {
                            const x = mirroredPoints[i][0] + (point[0] - mirroredPoints[i][0]) * phaseProgress;
                            const y = mirroredPoints[i][1] + (point[1] - mirroredPoints[i][1]) * phaseProgress;
                            return [x, y];
                        }
                    });
                }
                // Очищуємо функцію малювання лінії для цього типу анімації
                drawReflectionLine = null;
            }
            else {
                // Анімація відносно лінії з масштабуванням
                // Для дзеркального відображення відносно лінії, перпендикулярної до діагоналі,
                // нам потрібно знайти діагональ, що проходить через опорну вершину
                // Знайдемо індекс вершини, яка знаходиться на діагоналі з опорною
                const diagonalVertexIndex = (mirrorVertexIndex + 2) % 4; // Протилежна вершина
                // Отримаємо координати вершини на діагоналі
                const diagonalVertex = originalPoints[diagonalVertexIndex];
                // Вектор уздовж діагоналі від опорної точки
                const diagonalVector = [
                    diagonalVertex[0] - pivotVertex[0],
                    diagonalVertex[1] - pivotVertex[1]
                ];
                // Нормалізуємо вектор діагоналі
                const diagonalLength = Math.sqrt(Math.pow(diagonalVector[0], 2) + Math.pow(diagonalVector[1], 2));
                const normalizedDiagonal = [
                    diagonalVector[0] / diagonalLength,
                    diagonalVector[1] / diagonalLength
                ];
                // Вектор, перпендикулярний до діагоналі - це вісь для відображення
                // Повертаємо вектор діагоналі на 90 градусів
                const perpVector = [-normalizedDiagonal[1], normalizedDiagonal[0]];
                // Створюємо матрицю відображення з масштабуванням відносно лінії, перпендикулярної до діагоналі
                const mirrorMatrix = createMirrorScaleMatrixRelativeToLine(pivotVertex[0], pivotVertex[1], // Опорна точка
                perpVector[0], perpVector[1], // Напрям перпендикуляра до діагоналі
                scaleFactor // Коефіцієнт масштабування
                );
                // Для відображення червоної лінії через вершину, перпендикулярної до діагоналі
                drawReflectionLine = function (ctx, width, height) {
                    // Довжина лінії, можна підібрати за потребою
                    const lineLength = diagonalLength * 1.5;
                    // Від опорної точки відкладаємо вектор perpVector в обидві сторони
                    const lineStart = [
                        pivotVertex[0] - perpVector[0] * lineLength / 2,
                        pivotVertex[1] - perpVector[1] * lineLength / 2
                    ];
                    const lineEnd = [
                        pivotVertex[0] + perpVector[0] * lineLength / 2,
                        pivotVertex[1] + perpVector[1] * lineLength / 2
                    ];
                    // Перетворюємо математичні координати у canvas
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
                // Обчислюємо дзеркально відображені позиції для кожної точки відносно лінії,
                // перпендикулярної до діагоналі, використовуючи матричні перетворення з масштабуванням
                const mirroredPoints = originalPoints.map((point, index) => {
                    if (index === mirrorVertexIndex) {
                        // Опорна точка не змінюється
                        return [...point];
                    }
                    else {
                        // Використовуємо матрицю відображення з масштабуванням для трансформації точки
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
                        }
                        else {
                            const x = point[0] + (mirroredPoints[i][0] - point[0]) * phaseProgress;
                            const y = point[1] + (mirroredPoints[i][1] - point[1]) * phaseProgress;
                            return [x, y];
                        }
                    });
                }
                else {
                    // Фаза 2: Лінійний рух назад до оригінального стану (50-100%)
                    const phaseProgress = (progress - 0.5) / 0.5; // 0 -> 1
                    // Для кожної точки, лінійно інтерполюємо від дзеркальної з масштабуванням до оригінальної
                    transformedPoints = originalPoints.map((point, i) => {
                        if (i === mirrorVertexIndex) {
                            // Опорна точка не змінюється
                            return [...point];
                        }
                        else {
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
            }
            else {
                isAnimating = false;
                isPaused = false; // Скидаємо паузу після завершення
                pausedProgress = 0; // Скидаємо прогрес
                animationFrameId = null;
                drawReflectionLine = null; // Очищуємо функцію малювання лінії
                // Переконуємося, що фігура точно повернулася в оригінальний стан
                drawnShapes[selectedShapeIndex].points = [...originalPoints];
                redrawCanvas(ctx, width, height);
                const animateBtn = document.getElementById("animateBtn");
                const stopBtn = document.getElementById("stopAnimBtn");
                animateBtn.disabled = false;
                stopBtn.disabled = true;
                animateBtn.textContent = "Start Animation"; // Повертаємо оригінальний текст
            }
        }
        animationFrameId = requestAnimationFrame(animateStep);
    }; // Зупинка анімації
    document.getElementById("stopAnimBtn").onclick = () => {
        if (isAnimating) {
            // Зупиняємо анімацію та зберігаємо поточний прогрес
            isAnimating = false;
            isPaused = true;
            pausedProgress = Math.min(currentAnimationTime / animationDuration, 1);
            drawReflectionLine = null; // Очищуємо функцію малювання лінії
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            // НЕ повертаємо фігуру до початкового стану - залишаємо в поточному
            // Повертаємо стан кнопок
            const animateBtn = document.getElementById("animateBtn");
            const stopBtn = document.getElementById("stopAnimBtn");
            animateBtn.disabled = false;
            stopBtn.disabled = true;
            // Змінюємо текст кнопки Start на Continue якщо анімація не завершена
            if (pausedProgress < 1) {
                animateBtn.textContent = "Continue Animation";
            }
        }
    };
    // --- Панорамування (зсув) ---
    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("mousemove", (e) => {
        if (!isDragging)
            return;
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
        }
        else {
            _scale /= SCALE_SPEED;
        }
        // Zoom до позиції миші (як у прикладі)
        const currentCx = width / 2 - _currentPosition.x * prevScale; // Use current _currentPosition with prevScale
        const currentCy = height / 2 + _currentPosition.y * prevScale; // Use current _currentPosition with prevScale
        const mx = mouseX - currentCx;
        const my = mouseY - currentCy;
        _currentPosition.x -= mx / prevScale - mx / _scale;
        _currentPosition.y += my / prevScale - my / _scale;
        redrawCanvas(ctx, width, height); // Перемальовуємо все
    }, { passive: false });
    canvas.style.cursor = "grab";
    // --- Обробник зміни типу анімації ---
    const animationTypeSelect = document.getElementById("animationType");
    const scaleGroup = document.getElementById("scaleGroup");
    animationTypeSelect.addEventListener("change", () => {
        const animationType = animationTypeSelect.value;
        if (animationType === "point") {
            scaleGroup.style.display = "block";
        }
        else {
            scaleGroup.style.display = "none";
        }
    });
    // Встановлюємо початковий стан
    if (animationTypeSelect.value === "point") {
        scaleGroup.style.display = "block";
    }
    else {
        scaleGroup.style.display = "none";
    }
    // --- Обробник кнопки "Перемалювати" ---
    const redrawBtn = document.getElementById("redrawBtn");
    redrawBtn.addEventListener("click", () => {
        // Перетворюємо всі фігури під поточний масштаб
        transformShapesToCurrentScale();
        // Перемальовуємо canvas
        redrawCanvas(ctx, width, height);
        console.log("Фігури перемальовано під поточний масштаб");
    });
    // --- Функції збереження ---
    // Функція для збереження матриці у файл
    function saveTransformationMatrix() {
        if (drawnShapes.length === 0) {
            showError("Please draw a shape first.");
            return;
        }
        // Отримуємо параметри для створення матриці
        const animationType = document.getElementById("animationType").value;
        const mirrorVertexIndex = parseInt(document.getElementById("mirrorVertex").value);
        const scaleFactor = parseFloat(document.getElementById("scaleFactor").value);
        if (isNaN(scaleFactor) || scaleFactor <= 0) {
            showError("Please enter valid scale factor.");
            return;
        }
        // Отримуємо індекс вибраної фігури
        const shapeSelector = document.getElementById("shapeSelector");
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
        let transformationMatrix;
        if (animationType === "point") {
            // Створення матриці дзеркального відображення з масштабуванням відносно точки
            transformationMatrix = createMirrorScaleMatrixRelativeToPoint(pivotVertex[0], pivotVertex[1], scaleFactor);
        }
        else {
            // Створення матриці дзеркального відображення з масштабуванням відносно лінії
            const diagonalVertexIndex = (mirrorVertexIndex + 2) % 4;
            const diagonalVertex = selectedShape.points[diagonalVertexIndex];
            const diagonalVector = [
                diagonalVertex[0] - pivotVertex[0],
                diagonalVertex[1] - pivotVertex[1]
            ];
            const diagonalLength = Math.sqrt(Math.pow(diagonalVector[0], 2) + Math.pow(diagonalVector[1], 2));
            const normalizedDiagonal = [
                diagonalVector[0] / diagonalLength,
                diagonalVector[1] / diagonalLength
            ];
            const perpVector = [-normalizedDiagonal[1], normalizedDiagonal[0]];
            transformationMatrix = createMirrorScaleMatrixRelativeToLine(pivotVertex[0], pivotVertex[1], perpVector[0], perpVector[1], scaleFactor);
        }
        // Формування текстового представлення матриці
        const matrixText = formatMatrix(transformationMatrix, animationType, mirrorVertexIndex, scaleFactor, pivotVertex);
        // Створення та завантаження файлу
        const blob = new Blob([matrixText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transformation_matrix_${animationType}_vertex${mirrorVertexIndex}_scale${scaleFactor}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Transformation matrix saved successfully");
    }
    // Функція для форматування матриці
    function formatMatrix(matrix, animationType, vertexIndex, scaleFactor, pivotVertex) {
        const timestamp = new Date().toLocaleString();
        let matrixText = `Transformation Matrix Report\n`;
        matrixText += `Generated: ${timestamp}\n`;
        matrixText += `Animation Type: ${animationType === "point" ? "Mirror relative to point" : "Mirror relative to line"}\n`;
        matrixText += `Pivot Vertex Index: ${vertexIndex}\n`;
        matrixText += `Pivot Vertex Coordinates: (${pivotVertex[0].toFixed(3)}, ${pivotVertex[1].toFixed(3)})\n`;
        matrixText += `Scale Factor: ${scaleFactor}\n\n`;
        matrixText += `Transformation Matrix (3x3):\n`;
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
        return matrixText;
    }
    // Функція для збереження зображення фігури
    function saveShapeImage() {
        if (drawnShapes.length === 0) {
            showError("Please draw a shape first.");
            return;
        }
        // Створюємо тимчасовий canvas для збереження зображення
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const canvas = document.getElementById("plane");
        // Встановлюємо розмір тимчасового canvas
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        // Отримуємо індекс вибраної фігури
        const shapeSelector = document.getElementById("shapeSelector");
        let selectedShapeIndex = parseInt(shapeSelector.value);
        if (selectedShapeIndex === -1) {
            selectedShapeIndex = drawnShapes.length - 1;
        }
        if (selectedShapeIndex < 0 || selectedShapeIndex >= drawnShapes.length) {
            showError("Invalid shape selected.");
            return;
        }
        // Малюємо координатну площину
        drawPlane(tempCtx, tempCanvas.width, tempCanvas.height);
        // Малюємо тільки вибрану фігуру
        const selectedShape = drawnShapes[selectedShapeIndex];
        drawSquare(tempCtx, selectedShape.points, selectedShape.fillColor, tempCanvas.width, tempCanvas.height, selectedShape.shapeScale);
        // Додаємо інформацію про фігуру на зображення
        addShapeInfoToCanvas(tempCtx, selectedShape, selectedShapeIndex, tempCanvas.width, tempCanvas.height);
        // Конвертуємо canvas в зображення та завантажуємо
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
    // Функція для додавання інформації про фігуру на canvas
    function addShapeInfoToCanvas(ctx, shape, shapeIndex, width, height) {
        var _a;
        ctx.save();
        // Налаштування тексту
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        // Інформація про фігуру
        const info = [
            `Shape ${shapeIndex + 1}`,
            `Fill Color: ${shape.fillColor}`,
            `Scale: ${((_a = shape.shapeScale) === null || _a === void 0 ? void 0 : _a.toFixed(2)) || 'Default'}`,
            `Vertices: ${shape.points.length}`,
            `Points: ${shape.points.map(p => `(${p[0].toFixed(2)}, ${p[1].toFixed(2)})`).join(', ')}`
        ];
        // Позиція для тексту (в правому верхньому куті)
        const startX = width - 10;
        const startY = 20;
        // Малюємо кожен рядок інформації
        info.forEach((line, index) => {
            const y = startY + (index * 20);
            const textWidth = ctx.measureText(line).width;
            const x = startX - textWidth;
            // Обводка для кращої читабельності
            ctx.strokeText(line, x, y);
            ctx.fillText(line, x, y);
        });
        // Додаємо часову мітку
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
    // --- Обробники кнопок збереження ---
    const saveMatrixBtn = document.getElementById("saveMatrixBtn");
    saveMatrixBtn.addEventListener("click", saveTransformationMatrix);
    const saveImageBtn = document.getElementById("saveImageBtn");
    saveImageBtn.addEventListener("click", saveShapeImage);
};
