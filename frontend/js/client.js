
// we're using promises to hide the mess that net-oce
// causes and opt for potential future enhancements:
//  - lazy evaluation
//  - batching
var oce = require('net-oce-protocol');
var saveAs = require('browser-filesaver');
var future = require('tmpvar-future');

module.exports = createClient;

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

var shapeMethods = [];
var realized = 0;
// TODO: error handling
function shape() {
  var promise = future();

  for (var j=0; j<shapeMethods.length; j++) {
    (function(method) {
      promise[method.name] = function() {
        var args = varargs(arguments);
        var s = shape();

        waitForArgs(args, function(e, resolvedArgs) {
          promise(function(e, result) {
            if (e) throw e;
            resolvedArgs.unshift(result);
            method.fn(resolvedArgs, s);
          });
        });

        return s;
      };
    })(shapeMethods[j])
  }

  return promise;
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
        shapeMethods.push({
          name : name,
          fn : methods[method]
        });
      } else if (system === 'prim') {
        commands[name] = function() {
          var p = shape();
          methods[method](varargs(arguments), p);
          return p;
        };
      } else { // state, extract, export, etc..
        commands[name] = function(a, fn) {
          var args;
          if (typeof a === 'function' && !a.isFuture && !fn) {
            return methods[method](null, a);
          } else if (!Array.isArray(a)) {
            args = varargs(arguments);
            if (args.length > 1) {
              fn = args.pop();
            } else {
              fn = function(e, r) {
                if (e) {
                  console.error(name, e);
                } else {
                  // TODO: this is where we could do interesting stuff
                  //       around auto-rendering and similar.
                  console.warn(name, 'resulted in', r);
                }
              }
            }
          } else {
            args = a;
          }

          var p = shape();
          waitForArgs(args, function argumentsSatisfiedCallback(e, r) {
            if (e) {
              return console.error('after waitForArgs', e);
            }

            methods[method](r, p);
          });

          p(fn || function(err, result) {
            if (system === 'export') {
              saveAs(new Blob([result], {type: 'application/octet-binary'}), args[0]);
            }
          });

          return p;
        };
      }
    });

    fn(null, commands);
  });
}
