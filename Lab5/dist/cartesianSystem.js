"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartesianSystem = void 0;
const point_js_1 = require("./point.js");
const animatedSquare_js_1 = require("./animatedSquare.js");
class CartesianSystem {
    constructor(canvas) {
        this.isPaused = true;
        this._canvas = canvas;
        this._context2D = canvas.getContext('2d');
        this._currentPosition = new point_js_1.Point(0, 0);
        this._scale = 50;
        this._shapes = [];
        this.initializeLoop();
    }
    get scale() {
        return this._scale;
    }
    get context2D() {
        return this._context2D;
    }
    get canvas() {
        return this._canvas;
    }
    get currentPosition() {
        return this._currentPosition;
    }
    initializeLoop() {
        setTimeout(this.initializeLoop.bind(this), 10);
        if (this.isPaused) {
            return;
        }
        this.drawFrame();
    }
    draw() {
        this._context2D.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this.drawShapes();
        this.drawGrid();
        this.drawAbscissaAxis();
        this.drawOrdinateAxis();
        this.drawLabels();
    }
    drawFrame() {
        this._shapes.forEach((shape) => {
            if (shape instanceof animatedSquare_js_1.AnimatedSquare) {
                shape.calculateFrame();
            }
            this.draw();
        });
    }
    resetAnimation() {
        this._shapes.forEach((shape) => {
            if (shape instanceof animatedSquare_js_1.AnimatedSquare) {
                shape.reset();
            }
        });
        this.draw();
    }
    move(position) {
        this._currentPosition = position;
    }
    rescale(scale) {
        this._scale = scale;
    }
    drawAbscissaAxis() {
        let viewWidth = this._canvas.width;
        let viewHeight = this._canvas.height;
        let transformedPosition = this._currentPosition.transform(viewWidth, viewHeight, this._scale);
        this._context2D.strokeStyle = '#000000';
        this._context2D.lineWidth = 2;
        this._context2D.beginPath();
        this._context2D.moveTo(0, transformedPosition.y);
        this._context2D.lineTo(viewWidth, transformedPosition.y);
        this._context2D.stroke();
        this._context2D.beginPath();
        this._context2D.moveTo(viewWidth - 10, transformedPosition.y - 5);
        this._context2D.lineTo(viewWidth, transformedPosition.y);
        this._context2D.lineTo(viewWidth - 10, transformedPosition.y + 5);
        this._context2D.stroke();
    }
    drawOrdinateAxis() {
        let viewWidth = this._canvas.width;
        let viewHeight = this._canvas.height;
        let transformedPosition = this._currentPosition.transform(viewWidth, viewHeight, this._scale);
        this._context2D.strokeStyle = '#000000';
        this._context2D.lineWidth = 2;
        this._context2D.beginPath();
        this._context2D.moveTo(transformedPosition.x, 0);
        this._context2D.lineTo(transformedPosition.x, viewHeight);
        this._context2D.stroke();
        this._context2D.beginPath();
        this._context2D.moveTo(transformedPosition.x - 5, 10);
        this._context2D.lineTo(transformedPosition.x, 0);
        this._context2D.lineTo(transformedPosition.x + 5, 10);
        this._context2D.stroke();
    }
    findStartPosition(start, end, step) {
        for (let i = start; i <= end; ++i) {
            if (i === 0) {
                continue;
            }
            if (i % step === 0) {
                start = i;
                break;
            }
        }
        return start;
    }
    calculatePoints() {
        let viewWidth = this._canvas.width;
        let viewHeight = this._canvas.height;
        let transformedPosition = this._currentPosition.transform(viewWidth, viewHeight, this._scale);
        let minLabelSpacing = 50;
        let step = Math.ceil(minLabelSpacing / this._scale);
        let startX = Math.floor(-transformedPosition.x / this._scale);
        let endX = Math.ceil((viewWidth - transformedPosition.x) / this._scale);
        let startY = -1 * Math.ceil((viewHeight - transformedPosition.y) / this._scale);
        let endY = Math.floor(transformedPosition.y / this._scale);
        let startPoint = new point_js_1.Point(startX, startY);
        let endPoint = new point_js_1.Point(endX, endY);
        return { transformedPosition, step, startPoint, endPoint };
    }
    drawGrid() {
        let viewWidth = this._canvas.width;
        let viewHeight = this._canvas.height;
        let { transformedPosition, step, startPoint, endPoint } = this.calculatePoints();
        startPoint.x = this.findStartPosition(startPoint.x, endPoint.x, step);
        startPoint.y = this.findStartPosition(startPoint.y, endPoint.y, step);
        this._context2D.strokeStyle = '#e0e0e0';
        this._context2D.lineWidth = 0.5;
        for (let i = startPoint.x; i <= endPoint.x; i += step) {
            let x = transformedPosition.x + i * this._scale;
            this._context2D.beginPath();
            this._context2D.moveTo(x, 0);
            this._context2D.lineTo(x, viewHeight);
            this._context2D.stroke();
        }
        for (let i = startPoint.y; i <= endPoint.y; i += step) {
            let y = transformedPosition.y - i * this._scale;
            this._context2D.beginPath();
            this._context2D.moveTo(0, y);
            this._context2D.lineTo(viewWidth, y);
            this._context2D.stroke();
        }
    }
    drawLabels() {
        let viewWidth = this._canvas.width;
        let viewHeight = this._canvas.height;
        let { transformedPosition, step, startPoint, endPoint } = this.calculatePoints();
        let labelXOffset = 15;
        let labelYOffset = -15;
        let transformedX = transformedPosition.x;
        let transformedY = transformedPosition.y;
        if (startPoint.y >= 0) {
            labelXOffset = -labelXOffset;
            transformedY = viewHeight;
        }
        else if (endPoint.y < 0) {
            transformedY = 0;
        }
        if (startPoint.x >= 0) {
            labelYOffset = -labelYOffset;
            transformedX = 0;
        }
        else if (endPoint.x <= 0) {
            transformedX = viewWidth;
        }
        startPoint.x = this.findStartPosition(startPoint.x, endPoint.x, step);
        startPoint.y = this.findStartPosition(startPoint.y, endPoint.y, step);
        this._context2D.font = '12px Arial';
        this._context2D.textAlign = 'center';
        this._context2D.textBaseline = 'middle';
        this._context2D.fillStyle = '#000000';
        for (let i = startPoint.x; i <= endPoint.x; i += step) {
            if (i === 0) {
                continue;
            }
            let x = transformedPosition.x + i * this._scale;
            this._context2D.beginPath();
            this._context2D.moveTo(x, transformedY - 3);
            this._context2D.lineTo(x, transformedY + 3);
            this._context2D.stroke();
            this._context2D.fillText(i.toString(), x, transformedY + labelXOffset);
        }
        for (let i = startPoint.y; i <= endPoint.y; i += step) {
            if (i === 0) {
                continue;
            }
            let y = transformedPosition.y - i * this._scale;
            this._context2D.beginPath();
            this._context2D.moveTo(transformedX - 3, y);
            this._context2D.lineTo(transformedX + 3, y);
            this._context2D.stroke();
            this._context2D.fillText(i.toString(), transformedX + labelYOffset, y);
        }
        this._context2D.fillText('0', transformedPosition.x - 15, transformedPosition.y + 15);
        this._context2D.fillText('X', viewWidth - 10, transformedPosition.y - 15);
        this._context2D.fillText('Y', transformedPosition.x + 15, 10);
    }
    addShape(shape) {
        this._shapes.push(shape);
    }
    removeShape(shape) {
        const index = this._shapes.findIndex(s => s.id === shape.id);
        if (index !== -1) {
            this._shapes.splice(index, 1);
        }
        else {
            console.error(`Shape with ID ${shape.id} not found for removal!`);
        }
    }
    findShapeById(id) {
        const shape = this._shapes.find(shape => shape.id == id);
        if (shape) {
            return shape;
        }
        else {
            console.error(`Shape with ID ${id} not found!`);
            return null;
        }
    }
    drawShapes() {
        if (this._shapes.length === 0) {
            return;
        }
        this._shapes.forEach(shape => {
            shape.draw(this);
        });
    }
    takeSnapshot() {
        this._context2D.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this.drawShapes();
        const link = document.createElement('a');
        link.download = 'canvas-snapshot-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') + '.png';
        link.href = this._canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.draw();
    }
}
exports.CartesianSystem = CartesianSystem;
