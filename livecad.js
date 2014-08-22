var glnow = require('gl-now');
var glslify = require('glslify');
var skateboard = require('skateboard');

var createProgram = glslify({
  fragment: "./static/shaders/basic.frag",
  vertex: "./static/shaders/basic.vert"
});


var createClient = require('./core');

require('domready')(function() {

  // Hack around protocol-buffers and their magical
  // function generation.
  window.Buffer = Buffer;

  skateboard(function(stream) {

    stream.on('close', function() {
      console.log('reloading');
      window.location.reload();
    });


    createClient(stream, function(err, methods) {
      window.methods = methods;
    });
  });
});
