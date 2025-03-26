"use strict";
const canvas = document.getElementById('coordinateSystem');
const ctx = canvas.getContext('2d');
const displaySize = 550;
const gridSize = 25;
const scaleFactor = window.devicePixelRatio || 1;
canvas.width = displaySize * scaleFactor;
canvas.height = displaySize * scaleFactor;
canvas.style.width = displaySize + "px";
canvas.style.height = displaySize + "px";
ctx.scale(scaleFactor, scaleFactor);
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let startX = 0;
let startY = 0;
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
});
canvas.addEventListener('mousemove', (e) => {
    if (!isDragging)
        return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    drawCoordinateSystem();
});
canvas.addEventListener('mouseup', () => {
    isDragging = false;
});
function drawCoordinateSystem() {
    ctx.clearRect(0, 0, displaySize, displaySize);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    // Вісь X
    ctx.beginPath();
    ctx.moveTo(0, displaySize / 2 + offsetY);
    ctx.lineTo(displaySize, displaySize / 2 + offsetY);
    ctx.stroke();
    // Вісь Y
    ctx.beginPath();
    ctx.moveTo(displaySize / 2 + offsetX, 0);
    ctx.lineTo(displaySize / 2 + offsetX, displaySize);
    ctx.stroke();
    drawGrid();
    drawNumber();
}
// Малювання сітки
function drawGrid() {
    ctx.strokeStyle = '#c0c0c082';
    ctx.lineWidth = 1;
    for (let x = 0; x < displaySize * 2; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX % gridSize, 0);
        ctx.lineTo(x + offsetX % gridSize, displaySize);
        ctx.stroke();
    }
    for (let y = 0; y < displaySize * 2; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + offsetY % gridSize);
        ctx.lineTo(displaySize, y + offsetY % gridSize);
        ctx.stroke();
    }
}
function drawNumber() {
    const centerX = displaySize / 2 + offsetX;
    const centerY = displaySize / 2 + offsetY;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', centerX - 8, centerY + 12);
    for (let x = Math.floor(-centerX / gridSize); x <= Math.ceil((displaySize - centerX) / gridSize); x++) {
        if (x === 0)
            continue;
        const canvasX = centerX + x * gridSize;
        ctx.fillText(x.toString(), canvasX, centerY + 10);
    }
    for (let y = Math.floor(-centerY / gridSize); y <= Math.ceil((displaySize - centerY) / gridSize); y++) {
        if (y === 0)
            continue;
        const canvasY = centerY + y * gridSize;
        const num = y * (-1);
        ctx.fillText(num.toString(), centerX + 10, canvasY);
    }
}
const drawButton = document.getElementById('drawButton');
const circleButton = document.getElementById('circleButton');
const deleteButton = document.getElementById('deleteButton');
if (ctx) {
    ctx.imageSmoothingEnabled = false;
    drawCoordinateSystem();
}
else {
    console.error('Canvas context не знайдено!');
}
