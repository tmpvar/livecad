module.exports = Shape;

function Shape() {
  this.id = Shape.shapeId++;
}

Shape.shapeId = 1;

Shape.prototype.id = 0;
Shape.prototype.line = 0;
Shape.prototype.column = 0;
Shape.prototype.isShape = true;
// TODO: either extend from renderable or compose over one
