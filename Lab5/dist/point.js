"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Point = void 0;
class Point {
    constructor(x, y) {
        this._x = x;
        this._y = y;
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    set x(value) {
        this._x = value;
    }
    set y(value) {
        this._y = value;
    }
    transform(viewWidth, viewHeight, scale) {
        let transformedX = viewWidth * 0.5 + this._x * scale;
        let transformedY = viewHeight * 0.5 - this._y * scale;
        return new Point(transformedX, transformedY);
    }
    offset(scale) {
        let offsetX = this._x * scale;
        let offsetY = -this._y * scale;
        return new Point(offsetX, offsetY);
    }
    distanceTo(point) {
        return Math.sqrt((point.x - this.x) * (point.x - this.x) +
            (point.y - this.y) * (point.y - this.y));
    }
}
exports.Point = Point;
