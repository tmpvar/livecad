
// we're using promises to hide the mess that net-oce
// causes and opt for potential future enhancements:
//  - lazy evaluation
//  - batching
var oce = require('net-oce-protocol');

module.exports = createClient;

function waitForArgs(args, fn) {
  if (!args || !args.length) {
    fn(null, args);
  }

  var resolved = Array(args.length);

  var pending = args.length;
  args.forEach(function(arg, i) {
    if (typeof arg === 'function') {
      arg(function waitForArgsListener(e, r) {
        console.log('in here...')
        // TODO: don't throw!
        if (e) {
          throw e;
        }

        resolved[i] = r;

        pending--;
        if (pending <= 0) {
          fn(null, resolved);
        }
      })
    } else {
      resolved[i] = args[i]
      pending--;
    }
  });

  // if we fell through immediately
  if (!pending) {
    fn(null, args);
  }
}

var shapeMethods = [];
var realized = 0;
// TODO: error handling
function shape() {

  var watchers = [];
  var resolved;
  var value;

  function promise(err, val) {

    if (typeof err === 'function') {
      if (!resolved) {
        console.log('add watcher', err.name)
        watchers.push(err);
      } else {
        console.log('already resolved!')
        err(null, value);
      }
    } else {
      process.nextTick(function() {
        resolved = true;
        value = val;
        for (var i=0; i<watchers.length; i++) {
          watchers[i](err, val);
        }
      });
    }
  }

  for (var j=0; j<shapeMethods.length; j++) {
    (function(method) {
      promise[method.name] = function() {
        var args = [];
        console.log('shape method %s: ', method.name, arguments);
        Array.prototype.push.apply(args, arguments);
        var s = shape();

        waitForArgs(args, function(e, resolvedArgs) {
          console.log('resolved args', resolvedArgs);
          promise(function(e, result) {
            if (e) throw e;
            resolvedArgs.unshift(result);
            console.log('calling', method.name, ' w/ ', resolvedArgs);

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
          var args = [];
          Array.prototype.push.apply(args, arguments);
          var p = shape();
          methods[method](args, p);
          return p;
        };
      } else if (system === 'export') {
        commands[name] = function(a, fn) {
          var args;
          if (!Array.isArray(a)) {
            args = [];
            Array.prototype.push.apply(args, arguments);
            fn = args.pop();
          } else {
            args = a;
          }

          waitForArgs(args, function(e, r) {
            console.log('wait for args worked!')
            methods[method](r, fn);
          });
        };
      }
    });

    fn(null, commands);
  });
}



/*
var c = cube(10)
translate(c, 5, 5, 5);
rotate(c, 0, 45, 0);
cut(c, cube(10))

cube(10).translate(5, 5, 5).rotate(0, 45, 0).cutWith(cube(10)).export_stl('test.stl');



var cubes = [];
for (var i=0; i<80; i++) {
  var r = i/80 * (Math.PI * 2);
  cubes.push(cube(1).rotate(0, 45, 0).translate(Math.sin(r), Math.cos(r), 0));
}

export_stl('cubes.stl', cubes)

*/


