var EventEmitter = require('events').EventEmitter;

module.exports = Shape;

function Shape() {
  this.id = Shape.shapeId++;
}

Shape.shapeId = 1;
Shape.emitter = new EventEmitter();

Shape.prototype.id = 0;
Shape.prototype.line = 0;
Shape.prototype.column = 0;
Shape.prototype.isShape = true;
Shape.prototype.name = 'unknown';
Shape.prototype.parent = null;
// TODO: either extend from renderable or compose over one
