var argv = require('minimist')(process.argv.slice(2));
var spawn = require('child_process').spawn;
var path = require('path');
var skateboard = require('skateboard');
var Router = require('routes');
var createUUID = require('uuid').v4;
var concat = require('concat-stream');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var fs = require('fs');

if (!argv.oce) {
  return console.log('usage: livecad --oce=/path/to/net-oce');
}

var port = parseInt(process.env.PORT || 9971, 10);
function noop() {}

skateboard({
  port : port,
  dir: path.join(__dirname, 'dist'),
  requestHandler : requestHandler
}, function(stream) {
  stream.uuid = createUUID();
  stream.write(stream.uuid);

  var base = path.join(__dirname, 'tmp', stream.uuid);
  mkdirp(base, function createNpmInstallContainer(e, r) {
    if (e) {
      stream.end();
      console.error(e.stack);
      return;
    }

    var oce = spawn(path.resolve(process.cwd(), argv.oce), [], { stdio: 'pipe' });

    var ended = false;
    stream.on('end', function() {
      ended = true;
      rimraf(base, noop);
    });

    oce.on('exit', function() {
      !ended && console.log('OCE DIED!!!!')
    });

    oce.stderr.on('data', function(d) {
      d.toString().split('\n').forEach(function(line) {
        line = line.trim();
        line && process.stdout.write('net-oce> ' + line.trim() + '\n');
      });
    });

    stream.pipe(oce.stdin);
    oce.stdout.pipe(stream);
  });
});

var router = new Router();
var npm = require('npm');
var browserify = require('browserify');
router.addRoute('/bundle/:uuid', function(req, res, params) {
  if (req.method !== 'POST') {
    res.writeHead(400);
    res.end('post an array of requires: ["vec2","hyperquest"]');
    return;
  }

  req.pipe(concat(function(data) {
    var deps = JSON.parse(data.toString());

    res.writeHead(200);
    console.log('bundling deps:', deps);

    npm.load({}, function() {
      var base = path.join(__dirname, 'tmp', params.uuid);
      fs.stat(base, function statNpmInstallDir(e, r) {

        if (e) {
          res.writeHead(404);
          res.end('sandbox not found');
          return;
        }

        npm.commands.install(base, deps, function() {
          var b = browserify([], {
            basedir: base
          });

          deps.forEach(b.require.bind(b));

          b.bundle().pipe(res);

        });
      });
    });
  }));

});

function requestHandler(req, res) {
  var route = router.match(req.url);
  if (route) {
    route.fn(req, res, route.params);
  } else {
    res.writeHead(404);
    res.end('not found');
  }
}

