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
    value: "step('cylcut.step', cube(50).cut(cylinder(10, 50).translate(10, 0, 0)), function() { console.log('ok!') });",
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



      var header = Object.keys(methods).map(function(name) {
        return 'var ' + name + ' = ' + 'ops.' + name + ';';
      });

      function evaluate() {
        var fn = new Function('ops', header.join('\n') + '\n' + jse.getValue());
        fn(methods);
      }

      evaluate();


      jse.on('valid', function(valid) {
        if (valid) {
          evaluate();
        }
      });



      window.methods = methods;
    });
  });
});
