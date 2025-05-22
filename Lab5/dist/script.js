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
let isPaused = false; // Нова змінна стану для паузи
let animationFrameId = null;
let currentAnimationTime = 0;
let animationStartTime = null;
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
    ctx.strokeStyle = "#e0e0e0"; // Light Gray for grid lines
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
    ctx.strokeStyle = "#455a64"; // Blue Grey Darken-1 for axis lines
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
    ctx.strokeStyle = "#455a64"; // Blue Grey Darken-1 for axis lines
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
    ctx.fillStyle = "#37474f"; // Dark Slate Gray for axis text
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
            ctx.strokeStyle = "#455a64"; // Blue Grey Darken-1 for ticks
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
            ctx.strokeStyle = "#455a64"; // Blue Grey Darken-1 for ticks
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
function drawSquare(ctx, points, fillColor, width, height) {
    // Перетворення математичних координат у координати canvas
    const transformedPoints = points.map(([x, y]) => transform(x, y, width, height));
    ctx.save();
    ctx.strokeStyle = "#00695c"; // Dark Teal for square border
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
// --- Функція для перемальовки всього на канвасі ---
function redrawCanvas(ctx, width, height) {
    drawPlane(ctx, width, height); // Малюємо координатну площину
    drawnShapes.forEach(shape => {
        drawSquare(ctx, shape.points, shape.fillColor, width, height);
    });
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
        const fillColor = document.getElementById("fillColor").value;
        // Перевірка на правильність введення
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
            showError("Please enter valid numbers for both diagonal points.");
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
        ];
        // Додаємо нову фігуру до масиву
        drawnShapes.push({ points: newShapePoints, fillColor: fillColor, originalPoints: [...newShapePoints] }); // Зберігаємо originalPoints тут
        // Оновлюємо originalPoints для анімації останньої намальованої фігури
        // Це важливо, щоб анімація завжди починалася з поточного стану останньої фігури
        // originalPoints = [...newShapePoints]; // Видаляємо, бо тепер originalPoints зберігаються для кожної фігури
        // Перемальовуємо все
        redrawCanvas(ctx, width, height);
        // Вмикаємо кнопку анімації
        const animateBtn = document.getElementById("animateBtn");
        animateBtn.disabled = false;
    };
    // --- Анімація ---
    const animateBtn = document.getElementById("animateBtn");
    const pauseResumeBtn = document.getElementById("stopAnimBtn"); // Перейменовуємо для ясності
    let scaleX_anim, scaleY_anim, duration_anim, mirrorVertexIndex_anim;
    function animateStep(timestamp) {
        if (!isAnimating && !isPaused) { // Повністю зупинено або ще не почато
            if (animationFrameId)
                cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }
        if (isPaused) { // Якщо на паузі, нічого не робимо, але зберігаємо frameId для можливого скасування
            if (animationFrameId)
                cancelAnimationFrame(animationFrameId); // Скасувати попередній запит, якщо він був
            animationFrameId = requestAnimationFrame(animateStep); // Продовжуємо "слухати" для resume
            return;
        }
        if (!animationStartTime) {
            animationStartTime = timestamp; // Встановлюємо час початку для поточного сегменту
        }
        // Розраховуємо час, що минув з моменту останнього resume/start
        const deltaTime = timestamp - animationStartTime;
        // Додаємо до загального часу анімації
        // currentAnimationTime оновлюється тільки тут, коли анімація активна
        // При паузі, ми зберігаємо останнє значення currentAnimationTime
        // При resume, animationStartTime скидається, щоб deltaTime почався з 0 для нового сегменту,
        // але ми додаємо його до збереженого currentAnimationTime.
        // Краще: currentAnimationTime оновлюється тільки коли isAnimating = true
        // При паузі, ми зберігаємо останнє значення currentAnimationTime.
        // При resume, animationStartTime = timestamp; і ми продовжуємо з currentAnimationTime.
        // Переробка логіки часу:
        // currentAnimationTime - це загальний прогрес анімації.
        // animationStartTime - це точка відліку для поточного виклику requestAnimationFrame.
        // При паузі: зберігаємо currentAnimationTime.
        // При resume: animationStartTime = timestamp (початок нового активного відрізку)
        //              і ми додаємо deltaTime до збереженого currentAnimationTime.
        // Ще простіше:
        // `currentAnimationTime` - це загальний час, який анімація вже програлася.
        // `animationStartTime` - це `performance.now()` коли анімація почалася або продовжилася.
        // В `animateStep`, `elapsedSinceLastResume = timestamp - animationStartTime`.
        // `totalElapsedTime = timeBeforePause + elapsedSinceLastResume`.
        // Давайте використаємо `currentAnimationTime` як єдиний накопичувач часу.
        // При старті: currentAnimationTime = 0.
        // При паузі: нічого не робимо з currentAnimationTime, воно зберігає останнє значення.
        // При resume: animationStartTime = timestamp (щоб відняти від нього в наступному кадрі)
        //             і ми будемо додавати (timestamp - previousTimestamp) до currentAnimationTime.
        // Це стає складним.
        // Найпростіший підхід для pause/resume:
        // 1. Коли анімація починається (або продовжується): `animationStartTime = timestamp;`
        // 2. У кожному кадрі: `currentAnimationTime += (timestamp - lastFrameTimestamp);` (потрібен `lastFrameTimestamp`)
        // Або:
        // `currentAnimationTime` зберігає загальний час.
        // При паузі, `currentAnimationTime` фіксується.
        // При resume, `animationStartTime = timestamp;` (щоб `deltaTime` почався з 0 для нового сегменту)
        // Це виглядає правильно.
        // Повернемось до:
        // `currentAnimationTime` - це загальний час, який анімація вже програлася.
        // `animationStartTime` - це `performance.now()` коли анімація почалася або продовжилася.
        // В `animateStep`, `elapsedInThisSegment = timestamp - animationStartTime`.
        // `totalProgressTime = timeAtPause + elapsedInThisSegment`.
        // `timeAtPause` буде `currentAnimationTime` на момент паузи.
        // Поточна реалізація `currentAnimationTime = timestamp - animationStartTime;`
        // означає, що `currentAnimationTime` скидається при кожному resume, якщо `animationStartTime` оновлюється.
        // Це не те, що нам потрібно. `currentAnimationTime` має накопичуватись.
        // Виправлена логіка часу:
        // `currentAnimationTime` - загальний час анімації, що минув.
        // `animationStartTime` - використовується для розрахунку `deltaTime` в кожному активному сегменті.
        // При старті: `currentAnimationTime = 0; animationStartTime = timestamp;`
        // При паузі: `animationFrameId` скасовується. `currentAnimationTime` зберігає значення.
        // При resume: `animationStartTime = timestamp;` (щоб `deltaTime` почався з 0 для нового сегменту)
        //             `animateStep` продовжує додавати `deltaTime` до `currentAnimationTime`.
        // Ні, це не так. `currentAnimationTime` має бути тим, що передається в `Math.min`.
        // Давайте так:
        // `totalAnimatedTime` - зберігає час, який анімація вже відпрацювала до паузи.
        // `segmentStartTime` - час початку поточного активного сегменту (після старту або resume).
        // В `animateStep`:
        //   `elapsedInSegment = timestamp - segmentStartTime`.
        //   `currentAnimationProgress = totalAnimatedTime + elapsedInSegment`.
        //   `progress = Math.min(currentAnimationProgress / duration_anim, 1)`.
        // При старті: `totalAnimatedTime = 0; segmentStartTime = timestamp`.
        // При паузі: `totalAnimatedTime += (timestamp - segmentStartTime)`.
        // При resume: `segmentStartTime = timestamp`.
        // Це виглядає надійніше.
        // Перейменуємо `animationStartTime` на `segmentStartTime`
        // і `currentAnimationTime` на `totalAnimatedTime`.
        if (!segmentStartTime)
            segmentStartTime = timestamp; // segmentStartTime встановлюється при старті/resume
        const elapsedInSegment = timestamp - segmentStartTime;
        const currentAnimationProgress = totalAnimatedTime + elapsedInSegment;
        const progress = Math.min(currentAnimationProgress / duration_anim, 1);
        // ... (решта логіки animateStep як раніше, використовуючи scaleX_anim і т.д.) ...
        drawnShapes.forEach((shape, shapeIndex) => {
            if (!shape.originalPoints)
                return;
            const currentOriginalPoints = shape.originalPoints;
            const pivotVertex = currentOriginalPoints[mirrorVertexIndex_anim];
            const T_fromPivot = createTranslationMatrix(-pivotVertex[0], -pivotVertex[1]);
            const T_toPivot = createTranslationMatrix(pivotVertex[0], pivotVertex[1]);
            const M_mirror = createMirrorMatrix();
            const S_target = createScalingMatrix(scaleX_anim, scaleY_anim);
            let M_fullyTransformed = multiplyMatrices(S_target, T_fromPivot);
            M_fullyTransformed = multiplyMatrices(M_mirror, M_fullyTransformed);
            M_fullyTransformed = multiplyMatrices(T_toPivot, M_fullyTransformed);
            let transformMatrix;
            if (progress <= 0.5) {
                const phaseProgress = progress / 0.5;
                transformMatrix = interpolateMatrices(identityMatrix, M_fullyTransformed, phaseProgress);
            }
            else {
                const phaseProgress = (progress - 0.5) / 0.5;
                transformMatrix = interpolateMatrices(M_fullyTransformed, identityMatrix, phaseProgress);
            }
            const transformedPoints = currentOriginalPoints.map(([x, y]) => {
                return transformPoint(transformMatrix, x, y);
            });
            drawnShapes[shapeIndex].points = transformedPoints;
        });
        redrawCanvas(ctx, width, height);
        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animateStep);
        }
        else { // Анімація завершена
            isAnimating = false;
            isPaused = false;
            totalAnimatedTime = 0;
            segmentStartTime = null;
            drawnShapes.forEach(shape => {
                if (shape.originalPoints) {
                    shape.points = [...shape.originalPoints];
                }
            });
            redrawCanvas(ctx, width, height);
            animateBtn.disabled = false;
            pauseResumeBtn.disabled = true;
            pauseResumeBtn.textContent = "Pause Animation";
        }
    }
    let totalAnimatedTime = 0; // Загальний час, який анімація вже програлася
    let segmentStartTime = null; // Час початку поточного сегменту анімації
    animateBtn.onclick = () => {
        if (drawnShapes.length === 0) {
            showError("Please draw a shape first.");
            return;
        }
        scaleX_anim = parseFloat(document.getElementById("animScaleX").value);
        scaleY_anim = parseFloat(document.getElementById("animScaleY").value);
        duration_anim = parseFloat(document.getElementById("animDuration").value);
        mirrorVertexIndex_anim = parseInt(document.getElementById("mirrorVertex").value);
        if (isNaN(scaleX_anim) || isNaN(scaleY_anim) || scaleX_anim <= 0 || scaleY_anim <= 0 || isNaN(duration_anim) || duration_anim <= 0) {
            showError("Please enter valid animation parameters.");
            return;
        }
        isAnimating = true;
        isPaused = false;
        totalAnimatedTime = 0; // Починаємо анімацію з початку
        segmentStartTime = null; // Буде встановлено в першому кадрі animateStep
        animateBtn.disabled = true;
        pauseResumeBtn.disabled = false;
        pauseResumeBtn.textContent = "Pause Animation";
        drawnShapes.forEach(shape => {
            shape.originalPoints = [...shape.points];
        });
        if (animationFrameId)
            cancelAnimationFrame(animationFrameId); // На випадок швидких кліків
        animationFrameId = requestAnimationFrame(animateStep);
    };
    pauseResumeBtn.onclick = () => {
        if (isAnimating) { // Якщо анімація активна, ставимо на паузу
            isAnimating = false;
            isPaused = true;
            // Зберігаємо прогрес часу
            // segmentStartTime має бути встановлений, якщо isAnimating було true
            if (segmentStartTime) {
                totalAnimatedTime += (performance.now() - segmentStartTime);
            }
            segmentStartTime = null; // Скидаємо для наступного resume
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            pauseResumeBtn.textContent = "Resume Animation";
        }
        else if (isPaused) { // Якщо на паузі, продовжуємо
            isAnimating = true;
            isPaused = false;
            // segmentStartTime буде встановлено в animateStep, або тут:
            segmentStartTime = performance.now();
            pauseResumeBtn.textContent = "Pause Animation";
            if (animationFrameId)
                cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(animateStep);
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
};
