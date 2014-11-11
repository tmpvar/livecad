var oce = require('net-oce-protocol');
var saveAs = require('browser-filesaver');
var Shape = require('./shape');
var varargs = require('varargs');
var extractLocation = require('./extract-location');

module.exports = createClient;

var usage;

function createShape(name, parent) {
  var shape = new Shape();

  shape.name = name;
  shape.parent = parent;

  var a = extractLocation();
  var line = a[0];
  var column = a[1];

  shape.line = line;
  shape.column = column;

  if (!usage[line]) {
    usage[line] = [shape];
  } else {
    usage[line].push(shape);
  }

  return shape;
}

function createNoop(shape) {

  return function noop(e) {
    if (e) {
      e.shape = shape;
      Shape.emitter.emit('error', e);
    }
  }
}

function evalWrapper(fn, cb) {
  usage = {};
  fn();
  cb(null, usage);
}

function getCallbackOrNoop(shape, argArray) {
  var fn;
  if (typeof argArray[argArray.length-1] === 'function') {
    fn = argArray.pop();
  } else {
    fn = createNoop(shape);
  }
  return fn;
}

function createClient(stream, fn) {

  oce(stream, function(e, methods) {
    if (e) {
      return fn(e);
    }

    var commands = {};

    Object.keys(methods).forEach(function (method) {
      var parts = method.split('_');
      var system = parts[0];
      var name = parts[1];

      if (system === 'op') {

        // add shape operator <shape>.op() and commands.op(<shape>)
        commands[name] = Shape.prototype[name] = function shapeOperator() {
          var args = varargs(arguments);
          var shape = createShape(name, this.isShape ? this : null);
          shape.name = name;

          var fn = getCallbackOrNoop(shape, args);

          // this handles the cases:
          // shape.translate(...)
          //   `this` is a shape so we add it to the args
          //
          // vs
          //
          // translate(shape, ...)
          //   `this` is the `commands` object
          //   `shape` is passed as an arg
          //
          this.isShape && args.unshift(this);

          methods[method].call(shape, args, fn);

          return shape;
        };

      } else if (system === 'prim') {
        commands[name] = function shapeGenerator() {
          var shape = createShape(name);
          var args = varargs(arguments);
          var fn = getCallbackOrNoop(shape, args);

          methods[method].call(shape, args, fn);
          return shape;
        };

      } else {
        commands[name] = methods[method];
      }
    });

    fn(null, commands, evalWrapper);
  });
}
