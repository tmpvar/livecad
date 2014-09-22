
// we're using promises to hide the mess that net-oce
// causes and opt for potential future enhancements:
//  - lazy evaluation
//  - batching
var oce = require('net-oce-protocol');
var saveAs = require('browser-filesaver');
var _future = require('tmpvar-future');

module.exports = createClient;

var usage;
function future() {
  var f = _future.apply(null, arguments);

  var currentLine = (new Error()).stack.split('\n')[3];
  if (usage && currentLine.indexOf('<anonymous>') > -1) {
    var parts = currentLine.split(':');
    var col = Math.max(0, parseInt(parts.pop(), 10) - 3)
    var line = parseInt(parts.pop(), 10) - 6;

    f._column = col;

    if (!usage[line]) {
      usage[line] = [f];
    } else {
      usage[line].push(f);
    }
  }
  return f;
}

function noop() { console.log('NOOP', arguments); }

function varargs(args) {
  var a = [];
  Array.prototype.push.apply(a, args);
  return a;
}

function waitForArgs(args, fn) {
  if (!args || !args.length) {
    return fn(null, args);
  }

  var resolved = Array(args.length);

  var pending = args.length;
  args.forEach(function(arg, i) {
    if (typeof arg === 'function') {
      arg(function waitForArgsListener(e, r) {

        if (e) {
          return fn(e);
        }

        resolved[i] = r;

        pending--;
        if (pending <= 0) {
          fn(null, resolved);
        }
      })
    } else {
      resolved[i] = args[i];
      pending--;
    }
  });

  // if we fell through immediately
  if (pending <= 0) {
    fn(null, args);
  }
}

function addShapeMethods(p) {
  // bake shape methods onto the resulting future
  shapeMethods.forEach(function(method) {
    p[method.name] = function() {
      var s = future();

      waitForArgs(varargs(arguments), function(e, resolvedArgs) {
        p(function(e, result) {
          if (e) throw e;
          resolvedArgs.unshift(result);
          method.fn(resolvedArgs, s);
        });
      });

      return addShapeMethods(s);
    };
  });

  // sugar
  return p;
}

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
        shapeMethods.push({
          name : name,
          fn : methods[method]
        });

        // standalone ops (e.g. `translate(cube(10), 100, 100, 10)` )
        commands[name] = function() {
          var p = future();

          waitForArgs(varargs(arguments), function(e, resolvedArgs) {
            if (e) {
              return p(e);
            }

            methods[method](resolvedArgs, p);
          });

          return addShapeMethods(p);
        }

      } else if (system === 'prim') {
        commands[name] = function() {
          var p = future();
          methods[method](varargs(arguments), p);
          return addShapeMethods(p);
        };
      } else { // state, extract, export, etc..
        commands[name] = function(a) {
          var args;

          if (!Array.isArray(a)) {
            args = varargs(arguments);
          } else {
            args = a;
          }

          var l = args.length;
          var lastArg = args[l-1];

          if (typeof lastArg === 'function' && !lastArg.isFuture) {
            fn = args.pop();

          } else if (system === 'export') {

            if (Array.isArray(args[1])) {
              args = [args[0]].concat(args[1]);
            }

            fn = function exportCallback(e, r) {
              saveAs(new Blob([r], {type: 'application/octet-binary'}), args[0]);
            };
          } else {
            fn = function defaultCallback(e, r) {
              if (e) {
                console.error(name, e);
              } else {
                // TODO: this is where we could do interesting stuff
                //       around auto-rendering and similar.
                //
                //       will probably need to figure out which shapes
                //       have no dependants and automatically push those
                //       to display() if a call does not exist (from AST)
                console.warn(name, 'resulted in', r);
              }
            }
          }

          var p = future();
          waitForArgs(args, function argumentsSatisfiedCallback(e, r) {
            if (e) {
              return console.error('after waitForArgs', e);
            }

            methods[method](r, p);
          });

          p(fn);

          return p;
        };
      }
    });

    fn(null, commands, evalWrapper);
  });
}
