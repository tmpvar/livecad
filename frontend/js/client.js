
// we're using promises to hide the mess that net-oce
// causes and opt for potential future enhancements:
//  - lazy evaluation
//  - batching
var oce = require('net-oce-protocol');
var saveAs = require('browser-filesaver');
var Shape = require('./shape');
var varargs = require('varargs');
var extractLocation = require('./extract-location');

module.exports = createClient;

var usage;

function createShape() {
  var shape = new Shape();

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

function noop() { console.log('NOOP', arguments); }

function evalWrapper(fn, cb) {
  usage = {};
  fn();
  cb(null, usage);
}

var shapeMethods = [];
var realized = 0;

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

        Shape.prototype[name] = function shapeOperator() {
          var args = varargs(arguments);

          var fn = noop;
          if (typeof args[args.length-1] === 'function') {
            fn = args.pop();
          }

          var shape = createShape();

          args.unshift(this);
          methods[method].call(shape, args, fn);

          return shape;
        };

      } else if (system === 'prim') {
        commands[name] = function shapeGenerator() {
          var shape = createShape();

          var args = varargs(arguments);
          var fn = noop;
          if (typeof args[args.length-1] === 'function') {
            fn = args.pop();
          }

          methods[method].call(shape, args, function(e, r) {
            console.log(method, e, r);
            fn(e, r);
          });
          return shape;
        };

      } else {
        commands[name] = function unknownSystemMethod() {
          var args = varargs(arguments);
          var fn = noop;
          if (typeof args[args.length-1] === 'function') {
            fn = args.pop();
          }

          methods[method](args, fn);
        };
      }
    });

    fn(null, commands, evalWrapper);
  });
}
