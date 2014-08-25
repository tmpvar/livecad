var glnow = require('gl-now');
var glslify = require('glslify');
var skateboard = require('skateboard');

var createProgram = glslify({
  fragment: "./static/shaders/basic.frag",
  vertex: "./static/shaders/basic.vert"
});

var createClient = require('./core');

require('domready')(function() {

  var renderMesh = require('./3d');

  // setup editor
  var jse = require('javascript-editor')({
    container: document.querySelector('#editor'),
    value: [
  'var distanceBetweenHoles = 31;',
  'var centerCircleDiameter = 22;',
  'var dimension = 42; // width and height',
  'var materialWidth = 3;',
  '',
  '// compute hole pattern',
  'var triLeg = distanceBetweenHoles/2;',
  'var l = Math.sqrt(triLeg*triLeg*2);',
  '',
  'var b = box(dimension, materialWidth, dimension);',
  'b = b.cut(cylinder(centerCircleDiameter/2, materialWidth));',
  '',
  'var TAU = Math.PI*2;',
  'var a45 = Math.PI/4;',
  'var a90 = Math.PI/2',
  '',
  'for (var i=1; i<=4; i++) {',
  '  var c = cylinder(1.5, materialWidth).translate(',
  '    l * Math.sin(i * a90 + a45),',
  '    0,',
  '    l * Math.cos(i * a90 + a45)',
  '  );',
  '',
  '  b = b.cut(c)',
  '}',
  '',
  'verts(b)'
].join('\n')
  });

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


      // hijack extract_verts
      var _verts = methods.verts;
      methods.verts = function() {
        var p = _verts.apply(null, arguments)
        p(function(e, r) {
          renderMesh(e, r);
        });
        return p;
      };

      function evaluate() {
        methods.reset(function() {
          var fn = new Function('ops', header.join('\n') + '\n' + jse.getValue());
          fn(methods);
        });
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
