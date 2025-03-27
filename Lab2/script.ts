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

let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let startX = 0;
let startY = 0;
let isMovingPoint = false;
let selectedPointIndex = -1;
let wasCanvasMoved = false; // Додаємо змінну для відстеження руху канвасу

// Define a structure to store points
interface Point {
  x: number;
  y: number;
  radius: number;
  selected: boolean;
}

// Array to store all points
let points: Point[] = [];

// Додаємо змінну для зберігання обраних точок для видалення
let pointToDelete = -1;

// Додаємо функцію для перевірки, чи курсор над точкою
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

canvas.addEventListener('mousedown', (e: MouseEvent) => {
    // Перевіряємо, чи це не правий клік (який обробляється окремим обробником)
    if (e.button !== 0) return;
    
    wasCanvasMoved = false; // Скидаємо прапорець руху канвасу при новому натисканні
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Перевіряємо, чи користувач клікнув на точку
    selectedPointIndex = getPointAtPosition(canvasX, canvasY);
    
    if (selectedPointIndex !== -1) {
        // Вибираємо точку для переміщення
        isMovingPoint = true;
        points[selectedPointIndex].selected = true;
        console.log(`Точка ${selectedPointIndex} вибрана для переміщення`);
        drawCoordinateSystem();
    } else {
        // Починаємо переміщення канвасу
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
        // Переміщуємо вибрану точку
        const gridX = (canvasX - displaySize / 2 - offsetX) / gridSize;
        const gridY = -(canvasY - displaySize / 2 - offsetY) / gridSize;
        
        points[selectedPointIndex].x = parseFloat(gridX.toFixed(2));
        points[selectedPointIndex].y = parseFloat(gridY.toFixed(2));
        
        // Оновлюємо криву в реальному часі
        updateBezierCurve();
        drawCoordinateSystem();
    } else if (isDragging) {
        // Переміщуємо канвас
        const newOffsetX = e.clientX - startX;
        const newOffsetY = e.clientY - startY;
        
        // Встановлюємо прапорець, якщо канвас був переміщений
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
        // Припиняємо переміщення точки і знімаємо її вибір
        points[selectedPointIndex].selected = false;
        console.log(`Точку ${selectedPointIndex} переміщено в (${points[selectedPointIndex].x}, ${points[selectedPointIndex].y})`);
        
        // Автоматично оновлюємо криву
        updateBezierCurve();
        
        isMovingPoint = false;
        selectedPointIndex = -1;
        drawCoordinateSystem();
        updatePointsList(); // Оновлюємо список точок після переміщення
    }
    
    isDragging = false;
});

// Додаємо новий обробник для одинарного кліка
canvas.addEventListener('click', (e: MouseEvent) => {
    // Ігноруємо, якщо перетягували канвас або точку
    if (isDragging || isMovingPoint || wasCanvasMoved) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Перевіряємо, чи користувач клікнув на існуючу точку
    if (getPointAtPosition(canvasX, canvasY) !== -1) {
        return; // Не створюємо нову точку, якщо клікнули на існуючу
    }
    
    // Convert canvas coordinates to grid coordinates without rounding
    const gridX = (canvasX - displaySize / 2 - offsetX) / gridSize;
    const gridY = -(canvasY - displaySize / 2 - offsetY) / gridSize;
    
    // Add the point to our array (with 2 decimal precision for cleaner display)
    points.push({ 
        x: parseFloat(gridX.toFixed(2)), 
        y: parseFloat(gridY.toFixed(2)),
        radius: 10,
        selected: false
    });
    
    // Автоматично оновлюємо криву
    updateBezierCurve();
    
    // Redraw everything
    drawCoordinateSystem();
    updatePointsList(); // Оновлюємо список точок
    
    console.log(`Додано точку в координатах (${gridX.toFixed(2)}, ${gridY.toFixed(2)})`);
});

// Додаємо порожній обробник для подвійного кліка (поки без функціональності)
canvas.addEventListener('dblclick', (e: MouseEvent) => {
    // Поки нічого не робимо при подвійному кліку
});

// Оновлюємо обробник для правого кліку - видалення точки без підтвердження
canvas.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Знаходимо точку, на яку користувач клікнув правою кнопкою миші
    pointToDelete = getPointAtPosition(canvasX, canvasY);
    
    if(pointToDelete !== -1) {
        deletePoint(pointToDelete);
    }
});

// Оновлена функція для автоматичного оновлення кривої Безьє
function updateBezierCurve() {
    if (points.length >= 2) {
        // Отримуємо поточні налаштування для кривої
        const numPointsInput = document.getElementById('numPoints') as HTMLInputElement;
        const rangeStartInput = document.getElementById('rangeStart') as HTMLInputElement;
        const rangeEndInput = document.getElementById('rangeEnd') as HTMLInputElement;
        const methodSelect = document.getElementById('methodSelect') as HTMLSelectElement;
        
        let numPoints = 100; // За замовчуванням
        if (numPointsInput && numPointsInput.value && !isNaN(parseInt(numPointsInput.value))) {
            numPoints = parseInt(numPointsInput.value);
            numPoints--;
        }
        
        // Змінюємо на null за замовчуванням щоб вказати, що фільтрація не потрібна
        let xStart = null;
        let xEnd = null;
        
        // Встановлюємо значення тільки якщо обидва поля заповнені
        if (rangeStartInput && rangeStartInput.value && !isNaN(parseFloat(rangeStartInput.value)) &&
            rangeEndInput && rangeEndInput.value && !isNaN(parseFloat(rangeEndInput.value))) {
            xStart = parseFloat(rangeStartInput.value);
            xEnd = parseFloat(rangeEndInput.value);
        }
        
        const method = methodSelect ? methodSelect.value : 'parametric';
        
        if (method === 'parametric') {
            // Параметричний метод з поліномами Бернштейна
            bezierCurvePoints = buildBezierCurveParametric(numPoints, xStart, xEnd);
        } else if (method === 'matrix') {
            // Матричний метод
            bezierCurvePoints = buildBezierCurveMatrix(numPoints, xStart, xEnd);
        } else {
            alert("Невідомий метод!");
            return;
        }
        
        console.log(`Автоматично оновлено криву Безьє з ${bezierCurvePoints.length} точок`);
    } else {
        bezierCurvePoints = []; // Очищаємо точки кривої, якщо недостатньо контрольних точок
    }
}

// Функція для пошуку значення параметра t, при якому x досягає заданого значення
function findTForX(targetX: number, controlPoints: Point[], eps: number = 0.0001): number | null {
    // Якщо x поза діапазоном кривої, повертаємо null
    const firstPoint = bezierPointParametric(0, controlPoints);
    const lastPoint = bezierPointParametric(1, controlPoints);
    const minX = Math.min(firstPoint.x, lastPoint.x);
    const maxX = Math.max(firstPoint.x, lastPoint.x);
    
    if (targetX < minX - eps || targetX > maxX + eps) {
        return null;
    }
    
    // Двійковий пошук для знаходження значення t
    let left = 0;
    let right = 1;
    let iterations = 0;
    const maxIterations = 100; // Обмеження кількості ітерацій
    
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

// Функція для побудови кривої Безьє за параметричною формулою

// Функція для створення точки за координатами
function createPointFromCoordinates(x: number, y: number) {
    points.push({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(2)),
        radius: 10,
        selected: false
    });
    
    console.log(`Додано точку в координатах (${x.toFixed(2)}, ${y.toFixed(2)})`);
    updateBezierCurve(); // Автоматично оновлюємо криву
    drawCoordinateSystem();
    updatePointsList(); // Оновлюємо список точок
}

// Функція для видалення точки за індексом
function deletePoint(index: number) {
    if(index >= 0 && index < points.length) {
        const point = points[index];
        points.splice(index, 1);
        console.log(`Видалено точку ${index}: (${point.x}, ${point.y})`);
        updateBezierCurve(); // Автоматично оновлюємо криву
        drawCoordinateSystem();
        updatePointsList(); // Оновлюємо список точок
    }
}

// Змінна для зберігання індексу точки, що редагується
let editingPointIndex = -1;

// Функція для оновлення списку точок в інтерфейсі
function updatePointsList() {
    const pointsList = document.getElementById('pointsContainer');
    if (!pointsList) return;
    
    // Очищаємо список перед оновленням
    pointsList.innerHTML = '';
    
    // Додаємо кожну точку до списку з можливістю редагування
    points.forEach((point, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `Точка ${index}: (${point.x}, ${point.y})`;
        listItem.style.cursor = 'pointer';
        
        // Додаємо обробник кліку для відкриття модального вікна
        listItem.addEventListener('click', () => openEditModal(index));
        
        pointsList.appendChild(listItem);
    });
}

// Функція для відкриття модального вікна редагування точки
function openEditModal(index: number) {
    const modal = document.getElementById('editForm') as HTMLElement;
    const closeBtn = modal.querySelector('.close') as HTMLElement;
    const saveBtn = document.getElementById('savePointBtn') as HTMLButtonElement;
    const editX = document.getElementById('editX') as HTMLInputElement;
    const editY = document.getElementById('editY') as HTMLInputElement;
    const overlay = document.querySelector(".modal-overlay") as HTMLElement;
    
    overlay.style.display = "block";
    
    if (index >= 0 && index < points.length) {
        // Зберігаємо індекс точки, що редагується
        editingPointIndex = index;
        
        // Заповнюємо поля значеннями поточної точки
        editX.value = points[index].x.toString();
        editY.value = points[index].y.toString();
        
        // Відображаємо модальне вікно
        modal.style.display = 'block';
        
        // Обробник для закриття модального вікна
        closeBtn.onclick = function() {
            overlay.style.display = "";
            modal.style.display = 'none';
        };
        
        // Закриття модального вікна при кліку поза ним
        window.onclick = function(event: MouseEvent) {
            if (event.target === modal) {
                overlay.style.display = "none";
                modal.style.display = 'none';
            }
        };
        
        // Обробник для збереження змін
        saveBtn.onclick = function() {
            savePointChanges();
            overlay.style.display = "none";
            modal.style.display = 'none';
        };
    }
}

// Функція для збереження змін координат точки
function savePointChanges() {
    const modal = document.getElementById('editForm') as HTMLElement;
    const editX = document.getElementById('editX') as HTMLInputElement;
    const editY = document.getElementById('editY') as HTMLInputElement;
    
    if (editingPointIndex >= 0 && editingPointIndex < points.length) {
        const newX = parseFloat(editX.value);
        const newY = parseFloat(editY.value);
        
        if (!isNaN(newX) && !isNaN(newY)) {
            // Оновлюємо координати точки
            points[editingPointIndex].x = parseFloat(newX.toFixed(2));
            points[editingPointIndex].y = parseFloat(newY.toFixed(2));
            
            console.log(`Точку ${editingPointIndex} змінено на координати (${points[editingPointIndex].x}, ${points[editingPointIndex].y})`);
            
            // Закриваємо модальне вікно
            modal.style.display = 'none';
            
            // Оновлюємо криву, канвас і список точок
            updateBezierCurve();
            drawCoordinateSystem();
            updatePointsList();
        }
    }
}

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
    if (showControlPolygon) drawControlPolygon(); // Малюємо характеристичну ламану
    drawBezierCurve(); // Малюємо криву Безьє
    drawPoints(); // Draw all points
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

// Updated function to draw all points
function drawPoints() {
    points.forEach((point, index) => {
        // Convert grid coordinates back to canvas coordinates
        const canvasX = displaySize / 2 + offsetX + point.x * gridSize;
        const canvasY = displaySize / 2 + offsetY - point.y * gridSize;
        
        // Змінюємо колір в залежності від того, вибрана точка чи ні
        ctx!.fillStyle = point.selected ? 'blue' : 'red';
        
        // Draw a circle for each point
        ctx!.beginPath();
        ctx!.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
        ctx!.fill();
        
        // Показуємо індекс точки поруч із нею
        ctx!.fillStyle = 'black';
        ctx!.font = '10px Arial';
        ctx!.fillText(`${index}: (${point.x}, ${point.y})`, canvasX + 8, canvasY - 8);
    });
}

// Оновлюємо посилання на DOM елементи з правильними id
const addPointButton = document.getElementById('addPointButton');
const clearCanvasButton = document.getElementById('clearCanvasButton');

// Оновлюємо обробник кнопки "Додати точку" для створення точок за координатами
if (addPointButton) {
    addPointButton.addEventListener('click', () => {
        // Отримуємо значення з полів введення з правильними id
        const xInput = document.getElementById('x') as HTMLInputElement;
        const yInput = document.getElementById('y') as HTMLInputElement;
        
        // Додаємо точку, якщо поля не порожні
        if(xInput.value && yInput.value) {
            const x = parseFloat(xInput.value);
            const y = parseFloat(yInput.value);
            
            if(!isNaN(x) && !isNaN(y)) {
                createPointFromCoordinates(x, y);
                
                // Очищаємо поля введення після додавання
                xInput.value = '';
                yInput.value = '';
            }
        }
    });
}

// Видаляємо обробник для кнопки "Застосувати параметри"

// Виправляємо обробник для кнопки очищення
if (clearCanvasButton) {
    // Додаємо новий обробник
    clearCanvasButton.addEventListener('click', () => {
        if(confirm('Ви впевнені, що хочете видалити всі точки?')) {
            points = []; // Очищуємо всі точки
            bezierCurvePoints = []; // Очищаємо точки кривої
            drawCoordinateSystem(); // Перемальовуємо координатну площину
            updatePointsList(); // Оновлюємо список точок
            console.log('Всі точки видалено, координатну площину перемальовано');
        }
    });
}

// Глобальні змінні для зберігання кривої Безьє
let bezierCurvePoints: { x: number, y: number }[] = [];
let showControlPolygon = true; // Показувати характеристичну ламану

// Ефективна ітеративна функція для обчислення біноміального коефіцієнта без рекурсії
function binomialCoefficient(n: number, k: number): number {
    // Оптимізація для крайових випадків
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

// Функція для обчислення многочлена Бернштейна
function bernsteinPolynomial(i: number, n: number, t: number): number {
    // B_i,n(t) = C(n,i) * t^i * (1-t)^(n-i)
    const binomCoef = binomialCoefficient(n, i);
    return binomCoef * Math.pow(t, i) * Math.pow(1 - t, n - i);
}

// Функція для обчислення точки на кривій Безьє при заданому параметрі t
// за допомогою параметричної формули з поліномами Бернштейна
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

// Функція для побудови кривої Безьє за параметричною формулою
function buildBezierCurveParametric(numPoints: number = 100, xStart: number | null = null, xEnd: number | null = null): { x: number, y: number }[] {
    if (points.length < 2) {
        alert("Для побудови кривої Безьє потрібно як мінімум 2 точки!");
        return [];
    }
    
    // Якщо діапазон x не заданий, будуємо криву з рівномірним розподілом за t
    if (xStart === null || xEnd === null) {
        const curvePoints: { x: number, y: number }[] = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const point = bezierPointParametric(t, points);
            curvePoints.push(point);
        }
        return curvePoints;
    }
    
    // Знаходимо значення t, що відповідають xStart та xEnd
    const tStart = findTForX(xStart, points);
    const tEnd = findTForX(xEnd, points);
    
    // Якщо не вдалося знайти значення t для заданих x, повертаємо порожній масив
    if (tStart === null || tEnd === null) {
        console.warn(`Не вдалося знайти точки з x = ${xStart} або x = ${xEnd} на кривій.`);
        return [];
    }
    
    // Будуємо точно numPoints точок з рівномірним розподілом за t у знайденому діапазоні
    const curvePoints: { x: number, y: number }[] = [];
    for (let i = 0; i <= numPoints; i++) {
        const t = tStart + (i / numPoints) * (tEnd - tStart);
        const point = bezierPointParametric(t, points);
        curvePoints.push(point);
    }
    
    console.log(`Побудовано криву Безьє з рівно ${curvePoints.length} точками на проміжку x від ${xStart} до ${xEnd}`);
    return curvePoints;
}

// Функція для малювання кривої Безьє
function drawBezierCurve() {
    if (bezierCurvePoints.length === 0) return;
    
    // Отримуємо колір кривої з інтерфейсу
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

// Оновлена функція для малювання характеристичної ламаної з двома кольорами
function drawControlPolygon() {
    if (points.length < 2) return;
    
    // Отримуємо колір для дотичних відрізків
    const segmentsColorInput = document.getElementById('colorSegments') as HTMLInputElement;
    const segmentsColor = segmentsColorInput ? segmentsColorInput.value : '#ff0000';
    
    // Отримуємо колір для інших відрізків
    const otherSegmentsColorInput = document.getElementById('colorOtherSegments') as HTMLInputElement;
    const otherSegmentsColor = otherSegmentsColorInput ? otherSegmentsColorInput.value : '#0000ff';
    
    // Визначаємо дотичні відрізки - це перший і останній відрізки
    for (let i = 0; i < points.length - 1; i++) {
        const isTangent = (i === 0 || i === points.length - 2);
        
        ctx!.beginPath();
        // Вибираємо колір залежно від того, чи є відрізок дотичним
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

// Додаємо обробники подій для інпутів параметрів, щоб оновлювати криву при їх зміні
const numPointsInput = document.getElementById('numPoints') as HTMLInputElement;
const rangeStartInput = document.getElementById('rangeStart') as HTMLInputElement;
const rangeEndInput = document.getElementById('rangeEnd') as HTMLInputElement;

// Функція для оновлення кривої при зміні параметрів
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

// Ініціалізуємо список точок та криву при запуску
if (ctx) {
    ctx!.imageSmoothingEnabled = false;
    updateBezierCurve(); // Додаємо ініціалізацію кривої Безьє
    drawCoordinateSystem();
    updatePointsList(); // Початкова ініціалізація списку точок
    addParameterChangeListeners(); // Додаємо обробники подій для параметрів
} else{
    console.error('Canvas context не знайдено!');   
}

// Глобальна змінна для зберігання матриці коефіцієнтів для аналізу
let bezierMatrix: number[][] = [];

// Функція для отримання матриці коефіцієнтів Безьє
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

// Множення вектора на матрицю
function multiplyVectorMatrix(vector: number[], matrix: number[][]): number[] {
    const result = Array(matrix[0].length).fill(0);
    
    for (let j = 0; j < matrix[0].length; j++) {
        for (let i = 0; i < vector.length; i++) {
            result[j] += vector[i] * matrix[i][j];
        }
    }
    
    return result;
}

// Множення вектора коефіцієнтів на контрольні точки
function multiplyVectorPoints(vector: number[], points: Point[]): { x: number, y: number } {
    let x = 0, y = 0;
    
    for (let i = 0; i < vector.length; i++) {
        x += vector[i] * points[i].x;
        y += vector[i] * points[i].y;
    }
    
    return { x, y };
}

// Обчислення точки на кривій Безьє за матричним методом
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

// Функція для пошуку значення параметра t, при якому x досягає заданого значення (для матричного методу)
function findTForXMatrix(targetX: number, controlPoints: Point[], eps: number = 0.0001): number | null {
    // Якщо x поза діапазоном кривої, повертаємо null
    const firstPoint = bezierPointMatrix(0, controlPoints);
    const lastPoint = bezierPointMatrix(1, controlPoints);
    const minX = Math.min(firstPoint.x, lastPoint.x);
    const maxX = Math.max(firstPoint.x, lastPoint.x);
    
    if (targetX < minX - eps || targetX > maxX + eps) {
        return null;
    }
    
    // Двійковий пошук для знаходження значення t
    let left = 0;
    let right = 1;
    let iterations = 0;
    const maxIterations = 100; // Обмеження кількості ітерацій
    
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

// Функція для побудови кривої Безьє за матричним методом
function buildBezierCurveMatrix(numPoints: number = 100, xStart: number | null = null, xEnd: number | null = null): { x: number, y: number }[] {
    if (points.length < 2) {
        alert("Для побудови кривої Безьє потрібно як мінімум 2 точки!");
        return [];
    }
    
    // Якщо діапазон x не заданий, будуємо криву з рівномірним розподілом за t
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
    
    // Для знаходження значень t, що відповідають xStart та xEnd,
    // нам потрібно знайти відповідні параметри
    const tStart = findTForXMatrix(xStart, points);
    const tEnd = findTForXMatrix(xEnd, points);
    
    // Якщо не вдалося знайти значення t для заданих x, повертаємо порожній масив
    if (tStart === null || tEnd === null) {
        console.warn(`Не вдалося знайти точки з x = ${xStart} або x = ${xEnd} на кривій.`);
        return [];
    }
    
    // Будуємо точно numPoints точок з рівномірним розподілом за t у знайденому діапазоні
    const curvePoints: { x: number, y: number }[] = [];
    for (let i = 0; i <= numPoints; i++) {
        const t = tStart + (i / numPoints) * (tEnd - tStart);
        const point = bezierPointMatrix(t, points);
        curvePoints.push(point);
    }
    
    // Видаляємо автоматичний аналіз матриці
    // analyzeMatrixOnDemand();
    
    console.log(`Побудовано криву Безьє за матричним методом з ${curvePoints.length} точками на проміжку x від ${xStart} до ${xEnd}`);
    return curvePoints;
}

// Функція для аналізу матриці коефіцієнтів та виведення результатів
function analyzeMatrixOnDemand() {
    if (bezierMatrix.length === 0) {
        console.log("Матриця коефіцієнтів не ініціалізована.");
        return;
    }
    
    // Підрахунок нульових елементів у матриці
    let zeroCount = 0;
    for (let i = 0; i < bezierMatrix.length; i++) {
        for (let j = 0; j < bezierMatrix[i].length; j++) {
            if (bezierMatrix[i][j] === 0) {
                zeroCount++;
            }
        }
    }
    
    // Запитуємо у користувача номер стовпця для виведення
    const columnIndex = parseInt(prompt("Введіть номер стовпця матриці для виведення (починаючи з 0):", "0") || "0");
    
    // Перевірка коректності введеного індексу
    if (isNaN(columnIndex) || columnIndex < 0 || columnIndex >= bezierMatrix[0].length) {
        alert(`Неправильний номер стовпця. Має бути від 0 до ${bezierMatrix[0].length - 1}.`);
        return;
    }
    
    // Формуємо рядок зі значеннями стовпця
    let columnValues = `Елементи стовпця ${columnIndex} матриці коефіцієнтів:\n`;
    for (let i = 0; i < bezierMatrix.length; i++) {
        columnValues += `${bezierMatrix[i][columnIndex]}\n`;
    }
    
    // Виводимо результати
    const analysisResult = `${columnValues}\nЗагальна кількість нульових елементів у матриці: ${zeroCount}`;
    alert(analysisResult);
    console.log(analysisResult);
}

// Додаємо обробник події для кнопки аналізу матриці
const outputColnButton = document.getElementById('outputColnButton');
if (outputColnButton) {
    outputColnButton.addEventListener('click', () => {
        const methodSelect = document.getElementById('methodSelect') as HTMLSelectElement;
        
        if (methodSelect && methodSelect.value === 'matrix') {
            // Переконуємося, що матриця коефіцієнтів ініціалізована 
            // (можливо криву ще не будували методом матриці)
            if (bezierMatrix.length === 0 && points.length >= 2) {
                // Викликаємо функцію обчислення точки, щоб ініціалізувати матрицю
                bezierPointMatrix(0, points);
            }
            
            // Виконуємо аналіз матриці
            analyzeMatrixOnDemand();
        } else {
            alert("Для аналізу матриці коефіцієнтів потрібно вибрати матричний метод побудови кривої.");
        }
    });
}

// Додаємо обробник подій для зміни методу
if (document.getElementById('methodSelect')) {
    document.getElementById('methodSelect')!.addEventListener('change', () => {
        updateBezierCurve();
        drawCoordinateSystem();
    });
}

