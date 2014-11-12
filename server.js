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
var async = require('async');
var request = require('hyperquest');
var concat = require('concat-stream');
var url = require('url');
var qs = require('querystring');

if (!argv.oce) {
  return console.log('usage: livecad --oce=/path/to/net-oce');
}

var port = parseInt(process.env.PORT || 9971, 10);
function noop() {}

var downgradeUser = 'livecad';
if (port > 1000) {
  downgradeUser = process.getuid();
}

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

    var base = path.join(__dirname, 'tmp', params.uuid);
    fs.stat(base, function statNpmInstallDir(e, r) {
      if (e) {
        res.writeHead(404);
        res.end('sandbox not found');
        return;
      }

      async.filter(
        deps,
        function exists(file, cb) {
          fs.stat(path.join(base, 'node_modules', file), function(e) {
            cb(!!e); // keep the ones that don't exist
          });
        }, function(npmDeps) {
          runBundler(base, res, deps, npmDeps)
        }
      );
    });
  }));
});

router.addRoute('/proxy*?', function(req, res, params) {
  var parts = url.parse(req.url, true);
  if (parts.query && parts.query.url && parts.query.url.indexOf('http') > -1) {
    var target = url.parse(parts.query.url);
    target = url.format(target);
    var proxy = request(target);

    proxy.on('error', function(e) {
      console.log(e.stack);
    });

    req.pipe(proxy, { end: false }).pipe(res);
  } else {
    res.writeHead(400);
    res.end('bad request');
  }
});

function runBundler(base, res, browserifyDeps, npmDeps) {
  var bundleCacheFile = path.join(base, 'bundle.cache');

  if (npmDeps.length) {

    request('http://npmsearch.com/exists?packages=' + npmDeps.join(',')).pipe(concat(function(d) {
      var donotexist = [];
      var existence = JSON.parse(d.toString());

      var toInstall = npmDeps.filter(function(dep, i) {
        if (existence[i]) {
          return true;
        } else {
          donotexist.push(dep);
          return false;
        }
      })


      var bundler = spawn('node', [
        path.join(__dirname, 'bin', 'chroot-npm-install.js'),
        '--dir=' + base,
        '--user=' + downgradeUser,
        '--deps=' + toInstall.join(',')
      ], { stdio : 'pipe' });

      if (!donotexist.length) {
        bundler.on('exit', runBrowserify);
      } else {
        var obj = {
          module : donotexist.join(',')
        };

        res.writeHead(404);
        res.end(JSON.stringify(obj));
      }
    }));
  } else {
    res.writeHead(200, {
      'content-type' : 'text/javascript'
    });

    fs.createReadStream(bundleCacheFile).pipe(res);
  }

  function runBrowserify() {
    var b = browserify([], {
      basedir: base
    });

    browserifyDeps.forEach(b.require.bind(b));

    b.bundle(function(e, r) {
      if (e) {
        var obj = {}
        var notfound = e.message.match(/cannot find module '([^']*)'/i);
        if (notfound) {
          obj.module = notfound[1];
        } else {
          obj.message = e.message;
        }

        res.writeHead(404);
        res.end(JSON.stringify(obj));
      } else {
        res.writeHead(200, {
          'content-type' : 'text/javascript'
        });
        res.end(r);
      }
    }).pipe(fs.createWriteStream(bundleCacheFile))
  }

}


function requestHandler(req, res) {
  var route = router.match(req.url);
  if (route) {
    route.fn(req, res, route.params);
  } else {
    res.writeHead(404);
    res.end('not found');
  }
}

