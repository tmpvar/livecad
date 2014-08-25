var argv = require('optimist').argv;
var spawn = require('child_process').spawn;
var path = require('path');
var skateboard = require('skateboard');

if (!argv.oce) {
  return console.log('usage: livecad --oce=/path/to/net-oce');
}

var port = process.env.PORT || 9971;

skateboard({
  port : port,
  dir: path.join(__dirname, 'static')
}, function(stream) {

  var oce = spawn(path.resolve(process.cwd(), argv.oce), [], { stdio: 'pipe' });

  var ended = false;
  stream.on('end', function() {
    ended = true;
  });

  oce.on('exit', function() {
    !ended && console.log('OCE DIED!!!!')
  });

  oce.stderr.on('data', function(d) {
    d.toString().split('\n').forEach(function(line) {
      console.log('>', line);
    });
  });


  stream.pipe(oce.stdin);
  oce.stdout.pipe(stream);
});

console.log("http://localhost:%s/", port)
