var glnow = require('gl-now');
var glslify = require('glslify');
var skateboard = require('skateboard');

var createProgram = glslify({
  fragment: "./static/shaders/basic.frag",
  vertex: "./static/shaders/basic.vert"
});


var createClient = require('./core');

require('domready')(function() {

  // setup editor
  var jse = require('javascript-editor')({
    container: document.querySelector('#editor'),
    value: "// hello world\n",
  });

  // fight with javascript-editor to override theme
  jse.editor.setOption("theme", 'monakai')

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
