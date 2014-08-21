var argv = require('optimist').argv;
var spawn = require('child_process').spawn;
var path = require('path');
var skateboard = require('skateboard');

if (!argv.oce) {
  return console.log('usage: livecad --oce=/path/to/net-oce');
}

skateboard({
  port : 9971,
  dir: path.join(__dirname, 'static')
}, function(stream) {

  var oce = spawn(path.resolve(process.cwd(), argv.oce), [], { stdio: 'pipe' });
  stream.pipe(oce.stdin);
  oce.stdout.pipe(stream);
})
